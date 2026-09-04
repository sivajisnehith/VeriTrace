import os
import tempfile
import cv2
import uuid

from app.services.face_service import FaceService
from app.services.comparision_service import ComparisonService
from app.services.web_search_service import WebSearchService
from app.services.image_extraction_service import ImageExtractionService
from app.services.image_download_service import ImageDownloadService
from app.services.visualization_service import VisualizationService
from app.services.result_storage_service import ResultStorageService


class WebFaceSearchService:

    def __init__(self):

        self.face_service = FaceService()

        self.comparison_service = ComparisonService()

        self.web_search_service = WebSearchService()

        self.image_extraction_service = (
            ImageExtractionService()
        )

        self.image_download_service = (
            ImageDownloadService()
        )

        self.visualization_service = (
            VisualizationService()
        )

        self.result_storage_service = (
            ResultStorageService()
        )


    def search(
        self,
        reference_image_path: str,
    ):

        # =====================================
        # 1. PROCESS REFERENCE IMAGE
        # =====================================

        print("\nProcessing reference image...")

        _, reference_faces = (
            self.face_service.detect_faces(
                reference_image_path
            )
        )

        reference_face = (
            self.face_service.get_best_face(
                reference_faces
            )
        )

        if reference_face is None:
            raise ValueError(
                "No face detected in reference image"
            )

        reference_embedding = (
            self.face_service.get_embedding(
                reference_face
            )
        )


        # =====================================
        # 2. PASS 1 - ORIGINAL IMAGE SEARCH
        # =====================================

        print("\n========== PASS 1: ORIGINAL IMAGE ==========")

        original_search_result = (
            self.web_search_service.search_local_image(
                reference_image_path
            )
        )

        original_candidates = (
            self.web_search_service.get_candidates(
                original_search_result
            )
        )

        print(
            f"Pass 1 candidates: {len(original_candidates)}"
        )


        # =====================================
        # 3. PASS 2 - FACE CROP SEARCH
        # =====================================

        print("\n========== PASS 2: FACE CROP ==========")

        face_crop_path = os.path.join(
            "results",
            "face_crop_temp.jpg"
        )

        self.face_service.crop_best_face(
            reference_image_path,
            face_crop_path
        )

        face_search_result = (
            self.web_search_service.search_local_image(
                face_crop_path
            )
        )

        face_candidates = (
            self.web_search_service.get_candidates(
                face_search_result
            )
        )

        print(
            f"Pass 2 candidates: {len(face_candidates)}"
        )


        # =====================================
        # 4. MERGE + DEDUPLICATE
        # =====================================

        all_candidates = (
            original_candidates
            + face_candidates
        )

        unique_candidates = []

        seen_urls = set()

        for candidate in all_candidates:

            page_url = candidate.get(
                "page_url"
            )

            if not page_url:
                continue

            if page_url in seen_urls:
                continue

            seen_urls.add(page_url)

            unique_candidates.append(
                candidate
            )


        print(
            f"\nTotal unique candidates: "
            f"{len(unique_candidates)}"
        )


        all_results = []


        # =====================================
        # 3. PROCESS CANDIDATES
        # =====================================

        for index, candidate in enumerate(
            unique_candidates[:20],
            start=1
        ):

            print(
                f"\nProcessing candidate {index}..."
            )

            temp_path = None

            try:

                page_url = candidate["page_url"]


                # =================================
                # GET CANDIDATE IMAGE
                # =================================

                image_url = candidate.get("image_url")

                if not image_url:
                    image_url = candidate.get("thumbnail_url")

                if not image_url:
                    print("No image URL available. Skipping.")
                    continue

                print(
                    "Using candidate image:",
                    image_url
                )


                # =================================
                # DOWNLOAD IMAGE
                # =================================

                try:

                    image_bytes = (
                        self.image_download_service
                        .download_image(
                            image_url
                        )
                    )

                except Exception as error:

                    print(
                        "Full image failed. Trying thumbnail..."
                    )

                    thumbnail_url = candidate.get(
                        "thumbnail_url"
                    )

                    if (
                        not thumbnail_url
                        or thumbnail_url == image_url
                    ):
                        raise error

                    image_url = thumbnail_url

                    image_bytes = (
                        self.image_download_service
                        .download_image(
                            image_url
                        )
                    )

                    print(
                        "Thumbnail download successful."
                    )

               


                # =================================
                # SAVE TEMPORARY IMAGE
                # =================================

                with tempfile.NamedTemporaryFile(
                    suffix=".jpg",
                    delete=False
                ) as temp_file:

                    temp_file.write(
                        image_bytes
                    )

                    temp_path = temp_file.name


                # =================================
                # DETECT FACES
                # =================================

                candidate_image, candidate_faces = (
                    self.face_service.detect_faces(
                        temp_path
                    )
                )


                if not candidate_faces:

                    print(
                        "No faces found. Skipping."
                    )

                    continue


                # =================================
                # COMPARE ALL FACES
                # =================================

                comparison_results = (
                    self.comparison_service
                    .compare_reference_to_candidates(
                        reference_embedding,
                        candidate_faces
                    )
                )


                if not comparison_results:

                    continue


                best_match = (
                    comparison_results[0]
                )


                # =================================
                # CREATE LABEL
                # =================================

                similarity = (
                    best_match["similarity"]
                )

                label = (
                    f"Match: {similarity:.4f}"
                )


                # =================================
                # DRAW BOUNDING BOX
                # =================================

                annotated_image = (
                    self.visualization_service
                    .annotate_face(
                        candidate_image,
                        best_match["bbox"],
                        label
                    )
                )


                # =================================
                # SAVE RESULT IMAGE
                # =================================

                result_image_path = (
                    self.result_storage_service
                    .save_result(
                        annotated_image
                    )
                )


                # =================================
                # SAVE RESULT DATA
                # =================================

                all_results.append({

                    "candidate_number": index,

                    "title": candidate["title"],

                    "source": candidate["source"],

                    "page_url": candidate["page_url"],

                    "image_url": image_url,

                    "similarity": similarity,

                    "detection_confidence": (
                        best_match[
                            "detection_confidence"
                        ]
                    ),

                    "bbox": (
                        best_match[
                            "bbox"
                        ]
                    ),

                    "result_image_path": (
                        result_image_path
                    )

                })


                print(
                    "Similarity:",
                    round(
                        similarity,
                        4
                    )
                )

                print(
                    "Saved result:",
                    result_image_path
                )


            except Exception as error:

                print(
                    f"Candidate {index} failed:"
                )

                print(error)


            finally:

                # =================================
                # DELETE TEMP FILE
                # =================================

                if (
                    temp_path
                    and os.path.exists(
                        temp_path
                    )
                ):

                    os.remove(
                        temp_path
                    )

        # =====================================
        # CLEAN FACE CROP
        # =====================================

        if os.path.exists(face_crop_path):

            os.remove(
                face_crop_path
            )
        # =====================================
        # 4. SORT RESULTS
        # =====================================

        all_results.sort(

            key=lambda result:
                result["similarity"],

            reverse=True

        )


        return all_results