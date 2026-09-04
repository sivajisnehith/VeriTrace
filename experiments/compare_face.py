import cv2
import numpy as np
from insightface.app import FaceAnalysis


IMAGE_1 = "samples/test_image.jpg"
IMAGE_2 = "samples/image.png"


def get_face_embedding(app, image_path):

    image = cv2.imread(image_path)

    if image is None:
        print(f"ERROR: Could not load {image_path}")
        return None

    faces = app.get(image)

    if len(faces) == 0:
        print(f"ERROR: No face detected in {image_path}")
        return None

    best_face = max(faces, key=lambda face: face.det_score)

    print(f"Face detected in: {image_path}")
    print(f"Detection confidence: {best_face.det_score:.4f}")

    return best_face.embedding


print("Initializing InsightFace...")

app = FaceAnalysis(
    name="buffalo_l",
    providers=["CPUExecutionProvider"]
)

app.prepare(
    ctx_id=0,
    det_size=(640, 640)
)

print("Model initialized successfully!\n")


print("Processing Image 1...")
embedding_1 = get_face_embedding(app, IMAGE_1)

print("\nProcessing Image 2...")
embedding_2 = get_face_embedding(app, IMAGE_2)


if embedding_1 is not None and embedding_2 is not None:

    embedding_1 = embedding_1 / np.linalg.norm(embedding_1)
    embedding_2 = embedding_2 / np.linalg.norm(embedding_2)

    similarity = np.dot(embedding_1, embedding_2)

    print("\n==============================")
    print("      FACE COMPARISON")
    print("==============================")

    print(f"\nCosine Similarity: {similarity:.4f}")

    print("\nComparison completed!")

else:
    print("\nComparison failed because a face could not be processed.")