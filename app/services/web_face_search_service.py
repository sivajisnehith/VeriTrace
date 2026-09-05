import hashlib
import os
import tempfile
import cv2

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
        self.image_extraction_service = ImageExtractionService()
        self.image_download_service = ImageDownloadService()
        self.visualization_service = VisualizationService()
        self.result_storage_service = ResultStorageService()

    def search(self, reference_image_path: str):
        # 1. Extract reference face embedding
        print("\nProcessing reference image...")
        _, reference_faces = self.face_service.detect_faces(reference_image_path)
        reference_face = self.face_service.get_best_face(reference_faces)

        if reference_face is None:
            raise ValueError("No face detected in reference image")

        reference_embedding = self.face_service.get_embedding(reference_face)

        # 2. Pass 1: Search using full original image
        print("\nPass 1: Google Lens search on original image...")
        original_search_result = self.web_search_service.search_local_image(reference_image_path)
        original_candidates = self.web_search_service.get_candidates(original_search_result)
        print(f"Pass 1 candidates: {len(original_candidates)}")

        # 3. Pass 2: Search using isolated face crop
        print("\nPass 2: Google Lens search on face crop...")
        face_crop_path = os.path.join("results", "face_crop_temp.jpg")
        self.face_service.crop_best_face(reference_image_path, face_crop_path)

        face_search_result = self.web_search_service.search_local_image(face_crop_path)
        face_candidates = self.web_search_service.get_candidates(face_search_result)
        print(f"Pass 2 candidates: {len(face_candidates)}")

        # 4. Merge and deduplicate candidates by page URL
        all_candidates = original_candidates + face_candidates
        unique_candidates = []
        seen_urls = set()

        for candidate in all_candidates:
            page_url = candidate.get("page_url")
            if not page_url or page_url in seen_urls:
                continue
            seen_urls.add(page_url)
            unique_candidates.append(candidate)

        print(f"\nTotal unique candidates: {len(unique_candidates)}")

        # 5. Process candidate images and rank by face similarity
        all_results = []

        for index, candidate in enumerate(unique_candidates[:20], start=1):
            print(f"\nProcessing candidate {index}...")
            temp_path = None

            try:
                image_url = candidate.get("image_url") or candidate.get("thumbnail_url")
                if not image_url:
                    print("No image URL available. Skipping.")
                    continue

                print(f"Using candidate image: {image_url}")

                # Download image with thumbnail fallback
                try:
                    image_bytes = self.image_download_service.download_image(image_url)
                except Exception as error:
                    thumbnail_url = candidate.get("thumbnail_url")
                    if not thumbnail_url or thumbnail_url == image_url:
                        raise error
                    print("Full image download failed. Retrying with thumbnail...")
                    image_url = thumbnail_url
                    image_bytes = self.image_download_service.download_image(image_url)
                    print("Thumbnail download successful.")

                # Save temporary file for OpenCV decoding and face analysis
                with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as temp_file:
                    temp_file.write(image_bytes)
                    temp_path = temp_file.name

                # Validate image decodability and detect faces
                candidate_image, candidate_faces = self.face_service.detect_faces(temp_path)
                if not candidate_faces:
                    print("No faces found. Skipping.")
                    continue

                # Hash the confirmed valid image bytes
                image_sha256 = hashlib.sha256(image_bytes).hexdigest()
                print(f"Evidence image SHA-256: {image_sha256}")

                # Compare candidate faces against reference embedding
                comparison_results = self.comparison_service.compare_reference_to_candidates(
                    reference_embedding, candidate_faces
                )
                if not comparison_results:
                    continue

                best_match = comparison_results[0]
                similarity = best_match["similarity"]
                label = f"Match: {similarity:.4f}"

                # Annotate and persist result preview
                annotated_image = self.visualization_service.annotate_face(
                    candidate_image, best_match["bbox"], label
                )
                result_image_path = self.result_storage_service.save_result(annotated_image)

                all_results.append({
                    "candidate_number": index,
                    "title": candidate["title"],
                    "source": candidate["source"],
                    "page_url": candidate["page_url"],
                    "image_url": image_url,
                    "image_sha256": image_sha256,
                    "similarity": similarity,
                    "detection_confidence": best_match["detection_confidence"],
                    "bbox": best_match["bbox"],
                    "result_image_path": result_image_path,
                })

                print(f"Similarity: {round(similarity, 4)}")
                print(f"Saved result: {result_image_path}")

            except Exception as error:
                print(f"Candidate {index} failed: {error}")

            finally:
                if temp_path and os.path.exists(temp_path):
                    os.remove(temp_path)

        # Cleanup temporary face crop
        if os.path.exists(face_crop_path):
            os.remove(face_crop_path)

        # Sort matches by similarity descending
        all_results.sort(key=lambda r: r["similarity"], reverse=True)
        return all_results
