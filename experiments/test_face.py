import cv2
from insightface.app import FaceAnalysis

IMAGE_PATH = "samples/image.png"

print("Initializing InsightFace model")

app = FaceAnalysis(
    name = "buffalo_l",
    providers=["CPUExecutionProvider"]
)

app.prepare(ctx_id=0, det_size=(640,640))

print("Model initialized successfully!")
print("\n loading image")

image = cv2.imread(IMAGE_PATH)

if image is None:
    print(f"ERROR: Could not load image: {IMAGE_PATH}")
    exit()

print("Image loaded successfully")
print("\n Detecting faces....")

faces = app.get(image)

print(f"\nFaces detected: {len(faces)}")

if(len(faces)==0):
    print("No face detected.")
else:
    for i,face in enumerate(faces,start=1):
        print(f"\n--- Face {i} ---")
        print(f"Detection confidence: {face.det_score:.4f}")
        print(f"Bounding box: {face.bbox.astype(int)}")
        print(f"Embedding dimension: {len(face.embedding)}")

print("\n Face analysis completed brooo")