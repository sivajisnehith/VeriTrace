from app.services.face_service import FaceService
from app.services.comparision_service import ComparisonService
from app.services.visualization_service import VisualizationService


class SearchService:

    def __init__(self):
        """
        Initialize all services required
        for the search pipeline.
        """

        self.face_service = FaceService()

        self.comparison_service = ComparisonService()

        self.visualization_service = VisualizationService()


    def search(
        self,
        reference_image_path: str,
        candidate_image_path: str
    ):
        """
        Complete face search pipeline.

        1. Process reference image
        2. Detect reference face
        3. Extract reference embedding
        4. Process candidate image
        5. Detect all candidate faces
        6. Compare reference against all candidates
        7. Rank candidates
        8. Annotate top candidate
        9. Return structured result
        """

        # =====================================
        # PROCESS REFERENCE IMAGE
        # =====================================

        reference_image, reference_faces = (
            self.face_service.detect_faces(
                reference_image_path
            )
        )

        if not reference_faces:
            raise ValueError(
                "No face detected in reference image."
            )

        # Select the face with the highest
        # detection confidence
        reference_face = (
            self.face_service.get_best_face(
                reference_faces
            )
        )

        reference_embedding = (
            self.face_service.get_embedding(
                reference_face
            )
        )


        # =====================================
        # PROCESS CANDIDATE IMAGE
        # =====================================

        candidate_image, candidate_faces = (
            self.face_service.detect_faces(
                candidate_image_path
            )
        )

        if not candidate_faces:
            raise ValueError(
                "No faces detected in candidate image."
            )


        # =====================================
        # COMPARE FACES
        # =====================================

        comparison_results = (
            self.comparison_service
            .compare_reference_to_candidates(
                reference_embedding,
                candidate_faces
            )
        )


        # =====================================
        # GET TOP CANDIDATE
        # =====================================

        top_candidate = comparison_results[0]


        # =====================================
        # CREATE LABEL
        # =====================================

        label = (
            f"TOP CANDIDATE: "
            f"{top_candidate['similarity']:.4f}"
        )


        # =====================================
        # CREATE ANNOTATED IMAGE
        # =====================================

        annotated_image = (
            self.visualization_service
            .annotate_face(
                candidate_image,
                top_candidate["bbox"],
                label
            )
        )


        # =====================================
        # RETURN COMPLETE RESULT
        # =====================================

        return {
            "reference_faces_detected":
                len(reference_faces),

            "candidate_faces_detected":
                len(candidate_faces),

            "reference_detection_confidence":
                float(reference_face.det_score),

            "top_candidate":
                top_candidate,

            "all_candidates":
                comparison_results,

            "annotated_image":
                annotated_image
        }