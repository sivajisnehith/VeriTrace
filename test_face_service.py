import os
import cv2
from app.services.face_service import FaceService
from app.services.comparision_service import ComparisonService
from app.services.visualization_service import VisualizationService

REFERENCE_IMAGE = "experiments/samples/image.jpg"
CANDIDATE_IMAGE = "experiments/samples/sulli.jpg"


print("Starting VeriTrace test...\n")


# Initialize services
face_service = FaceService()
comparison_service = ComparisonService()
visualization_service = VisualizationService()

# ==========================================
# PROCESS REFERENCE IMAGE
# ==========================================

print("\nProcessing reference image...")

reference_image, reference_faces = (
    face_service.detect_faces(REFERENCE_IMAGE)
)

print(f"Reference faces detected: {len(reference_faces)}")

if not reference_faces:
    print("No face detected in reference image.")
    exit()


reference_face = face_service.get_best_face(reference_faces)

reference_embedding = (
    face_service.get_embedding(reference_face)
)

print(
    f"Reference detection confidence: "
    f"{reference_face.det_score:.4f}"
)


# ==========================================
# PROCESS CANDIDATE IMAGE
# ==========================================

print("\nProcessing candidate image...")

candidate_image, candidate_faces = (
    face_service.detect_faces(CANDIDATE_IMAGE)
)

print(f"Candidate faces detected: {len(candidate_faces)}")

if not candidate_faces:
    print("No faces detected in candidate image.")
    exit()


# ==========================================
# COMPARE
# ==========================================

print("\nComparing faces...")

results = (
    comparison_service.compare_reference_to_candidates(
        reference_embedding,
        candidate_faces
    )
)


# ==========================================
# SHOW RANKED RESULTS
# ==========================================

print("\n========== RANKED RESULTS ==========")

for rank, result in enumerate(results, start=1):

    print(
        f"Rank {rank} | "
        f"Face {result['face_number']} | "
        f"Similarity: {result['similarity']:.4f}"
    )


# ==========================================
# BEST RESULT
# ==========================================

best_result = results[0]

print("\n========== BEST CANDIDATE ==========")

print(f"Face number: {best_result['face_number']}")
print(f"Similarity: {best_result['similarity']:.4f}")
print(f"Bounding box: {best_result['bbox']}")


print("\nVeriTrace service test completed!")

best_result = results[0]
label = (
    f"TOP CANDIDATE: "
    f"{best_result['similarity']:.4f}"
)

annotated_image = visualization_service.annotate_face(
    candidate_image,
    best_result["bbox"],
    label
)

os.makedirs("experiments/results", exist_ok=True)

output_path = "experiments/results/test_visualization.jpg"

cv2.imwrite(
    output_path,
    annotated_image
)

print(f"\nAnnotated result saved to: {output_path}")