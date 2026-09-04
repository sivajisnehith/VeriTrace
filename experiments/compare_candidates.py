import cv2
import os
import numpy as np
from insightface.app import FaceAnalysis

REFERENCE_IMAGE = "samples/image.jpg"
CANDIDATE_IMAGE = "samples/sulli.jpg"
OUTPUT_DIR = "results"
OUTPUT_IMAGE = "results/match_result.jpg"

def normalize_embedding(embedding):
    """Normalize an embedding so we can compare it consistently"""
    return embedding / np.linalg.norm(embedding)

def cosine_similarity(embedding_1,embedding_2):
    """Calculate cosing similarity between two face embeddings."""
    embedding_1 = normalize_embedding(embedding_1)
    embedding_2 = normalize_embedding(embedding_2)

    return float(np.dot(embedding_1,embedding_2))

print("Initializing InsightFace")

app = FaceAnalysis(
    name="buffalo_l",
    providers=["CPUExecutionProvider"]
)

app.prepare(ctx_id=0, det_size=(640, 640))

print("model initialized successfully")

#This is basically for create the embedding of the image which we will be giving reference and the thing is basically we will take only the one which has more detection score 
print("processing image 1")
reference_image = cv2.imread(REFERENCE_IMAGE)

if reference_image is None:
    print(f"Error: could not load {REFERENCE_IMAGE}")
    exit()

reference_faces = app.get(reference_image)

if len(reference_faces)==0:
    print("Error: No face detected in reference image.")
    exit()

reference_face = max(
    reference_faces,
    key = lambda face: face.det_score
)

reference_embedding = reference_face.embedding

print(f"Reference faces detected: {len(reference_faces)}")
print(f"Reference face confidence: {reference_face.det_score:.4f}")

#now lets start processing of candidate image the problem we overcame from the last deleted file is that that file only checks the ref with the highest detection score in the given image but now it works with the ref gets checked with ever face so that everything works perfectly

print("\n processing candidate image right now")

candidate_image = cv2.imread(CANDIDATE_IMAGE)

if candidate_image is None:
    print(f"Error: could not load {CANDIDATE_IMAGE}")
    exit()

candidate_face = app.get(candidate_image)

if len(candidate_face)==0:
    print(f"Error: No face detected in {CANDIDATE_IMAGE}")
    exit()

#now lets compare against every face extracted from there now
best_similarity = -1
best_face_number = None

for i, candidate_face in enumerate(candidate_face, start = 1):
    similarity = cosine_similarity(
        reference_embedding,
        candidate_face.embedding
    )

    print(f"\nCandidate Face {i}")
    print(f"Detection confidence: {candidate_face.det_score:.4f}")
    print(f"Similarity score: {similarity:.4f}")

    if similarity > best_similarity:
        best_similarity = similarity
        best_face_number = i
        best_face = candidate_face

x1,y1,x2,y2 = best_face.bbox.astype(int)

cv2.rectangle(
    candidate_image,
    (x1,y1),
    (x2,y2),
    (0,255,0),
    5
)


label = f"BEST MATCH: {best_similarity:.4f}"

cv2.putText(
    candidate_image,
    label,
    (x1, max(y1 - 15, 30)),
    cv2.FONT_HERSHEY_SIMPLEX,
    1,
    (0, 255, 0),
    3
)


#save result now
os.makedirs(OUTPUT_DIR, exist_ok=True)

cv2.imwrite(
    OUTPUT_IMAGE,
    candidate_image
)

#now that matching is done and the best matched are kept aside now lets do print it 
print(f"best matching face: Face {best_face_number}")
print(f"similiary score is {best_similarity}")

print("\n candidate comparision completed!!")