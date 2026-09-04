import cv2
from insightface.app import FaceAnalysis


class FaceService:

    def __init__(self):
        print("Initializing InsightFace model...")

        self.app = FaceAnalysis(
            name="buffalo_l",
            providers=["CPUExecutionProvider"]
        )

        self.app.prepare(
            ctx_id=0,
            det_size=(640, 640)
        )

        print("InsightFace model initialized successfully.")


    def detect_faces(self, image_path: str):
        """
        Load an image and detect all faces inside it.
        """

        image = cv2.imread(image_path)

        if image is None:
            raise ValueError(
                f"Could not load image: {image_path}"
            )

        faces = self.app.get(image)

        return image, faces


    def get_best_face(self, faces):
        """
        Return the face with the highest detection confidence.
        """

        if not faces:
            return None

        return max(
            faces,
            key=lambda face: face.det_score
        )


    def get_embedding(self, face):
        """
        Return the 512-dimensional embedding of a face.
        """

        return face.embedding