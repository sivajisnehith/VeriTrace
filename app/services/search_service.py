from app.services.face_service import FaceService
from app.services.comparision_service import ComparisonService
from app.services.visualization_service import VisualizationService


class SearchService:

    def __init__(self):
        self.face_service = FaceService()
        self.comparison_service = ComparisonService()
        self.visualization_service = VisualizationService()

    def search(
        self,
        reference_image_path: str,
        candidate_image_path: str
    ):

        reference_image, reference_faces = (
            self.face_service.detect_faces(
                reference_image_path
            )
        )

        if not reference_faces:
            raise ValueError(
                "No face detected in reference image."
            )

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

        candidate_image, candidate_faces = (
            self.face_service.detect_faces(
                candidate_image_path
            )
        )

        if not candidate_faces:
            raise ValueError(
                "No faces detected in candidate image."
            )

        comparison_results = (
            self.comparison_service
            .compare_reference_to_candidates(
                reference_embedding,
                candidate_faces
            )
        )

        top_candidate = comparison_results[0]

        label = (
            f"TOP CANDIDATE: "
            f"{top_candidate['similarity']:.4f}"
        )

        annotated_image = (
            self.visualization_service
            .annotate_face(
                candidate_image,
                top_candidate["bbox"],
                label
            )
        )

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