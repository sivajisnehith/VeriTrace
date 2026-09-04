import os

from app.services.face_service import FaceService


IMAGE_PATH = "experiments/samples/kajal.jpg"

OUTPUT_PATH = (
    "results/face_crop_test.jpg"
)


face_service = FaceService()

print("\nCreating face crop...")

result = face_service.crop_best_face(
    IMAGE_PATH,
    OUTPUT_PATH
)

print("\nFace crop saved:")
print(result)

print(
    "\nFile exists:",
    os.path.exists(result)
)