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

        print(
            "InsightFace model initialized successfully."
        )

    def detect_faces(self, image_path: str):

        image = cv2.imread(image_path)

        if image is None:
            raise ValueError(
                f"Could not load image: {image_path}"
            )

        faces = self.app.get(image)

        return image, faces

    def get_best_face(self, faces):

        if not faces:
            return None

        return max(
            faces,
            key=lambda face: face.det_score
        )

    def get_embedding(self, face):

        return face.embedding

    def crop_best_face(
        self,
        image_path: str,
        output_path: str
    ):

        image, faces = self.detect_faces(
            image_path
        )

        best_face = self.get_best_face(
            faces
        )

        if best_face is None:
            raise ValueError(
                "No face detected in image"
            )

        bbox = best_face.bbox.astype(int)

        x1, y1, x2, y2 = bbox

        height, width = image.shape[:2]

        x1 = max(0, x1)
        y1 = max(0, y1)
        x2 = min(width, x2)
        y2 = min(height, y2)

        face_crop = image[
            y1:y2,
            x1:x2
        ]

        if face_crop.size == 0:
            raise ValueError(
                "Face crop is empty"
            )

        success = cv2.imwrite(
            output_path,
            face_crop
        )

        if not success:
            raise RuntimeError(
                "Failed to save face crop"
            )

        return output_path