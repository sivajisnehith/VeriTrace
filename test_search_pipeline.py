import os
import cv2

from app.services.search_service import SearchService


REFERENCE_IMAGE = "experiments/samples/image.jpg"
CANDIDATE_IMAGE = "experiments/samples/sulli.jpg"


print("Starting VeriTrace search...\n")


# =====================================
# INITIALIZE SEARCH SERVICE
# =====================================

search_service = SearchService()


# =====================================
# PERFORM SEARCH
# =====================================

result = search_service.search(
    REFERENCE_IMAGE,
    CANDIDATE_IMAGE
)


# =====================================
# DISPLAY RESULTS
# =====================================

print("\n========== SEARCH RESULTS ==========")

print(
    f"Reference faces detected: "
    f"{result['reference_faces_detected']}"
)

print(
    f"Candidate faces detected: "
    f"{result['candidate_faces_detected']}"
)


print("\n========== RANKED CANDIDATES ==========")

for rank, candidate in enumerate(
    result["all_candidates"],
    start=1
):

    print(
        f"Rank {rank} | "
        f"Face {candidate['face_number']} | "
        f"Similarity: {candidate['similarity']:.4f}"
    )


print("\n========== TOP CANDIDATE ==========")

top_candidate = result["top_candidate"]

print(
    f"Face number: "
    f"{top_candidate['face_number']}"
)

print(
    f"Similarity: "
    f"{top_candidate['similarity']:.4f}"
)

print(
    f"Bounding box: "
    f"{top_candidate['bbox']}"
)


# =====================================
# SAVE ANNOTATED RESULT
# =====================================

os.makedirs(
    "results",
    exist_ok=True
)

output_path = (
    "experiments/results/search_result.jpg"
)

cv2.imwrite(
    output_path,
    result["annotated_image"]
)


print(
    f"\nAnnotated result saved to: "
    f"{output_path}"
)

print("\nVeriTrace search completed!")