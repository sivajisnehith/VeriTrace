# VeriTrace

AI-Powered Visual Identity Search and Forensic Face Verification System.

VeriTrace is an automated visual intelligence pipeline designed to find and verify occurrences of a person's face across the public web. Given a single reference face image, VeriTrace conducts a multi-pass reverse image search via Google Lens (powered by SerpApi), retrieves prospective web candidates, extracts candidate imagery, and performs deep facial feature extraction and cosine similarity verification using InsightFace (`buffalo_l`).

---

## Architecture Overview

```
Reference Image
      │
      ▼
InsightFace Detection & Embedding Extraction (buffalo_l)
      │
      ├──────────────────────────────────┬──────────────────────────────────┐
      │                                  │                                  │
      ▼                                  ▼                                  ▼
Extract Embedding               PASS 1: Full Image                PASS 2: Best-Face Crop
                               Direct SerpApi Upload              Direct SerpApi Upload
                                         │                                  │
                                         ▼                                  ▼
                                Google Lens Search                 Google Lens Search
                                         │                                  │
                                         └────────────────┬─────────────────┘
                                                          │
                                                          ▼
                                            Merge & Deduplicate Candidates
                                                          │
                                                          ▼
                                            Download Candidate Imagery
                                     (Direct Image URL / Fallback: OG Meta / Thumbnails)
                                                          │
                                                          ▼
                                              InsightFace Face Detection
                                                          │
                                                          ▼
                                            Cosine Similarity Verification
                                          (Normalized 512-d Dot Product)
                                                          │
                                                          ▼
                                            Rank Candidates & Annotate
                                          (Bounding Boxes + Match Score)
                                                          │
                                                          ▼
                                               Verified Result Set
                                    (Candidate Rank, URLs, Confidence, Annotated Image)
```

---

## Core Capabilities

1. **InsightFace Deep Representation**: Uses ArcFace (`w600k_r50` model within `buffalo_l`) to project detected faces into 512-dimensional normalized hyperspherical embeddings.
2. **Dual-Pass Visual Discovery**:
   - **Pass 1 (Context Search)**: Searches the full original image against Google Lens via direct SerpApi upload. Discovers visual scenes, exact matches, and context.
   - **Pass 2 (Biometric Crop Search)**: Automatically isolates and crops the highest-confidence reference face and submits the crop to Google Lens. Discovers identity matches even when the subject is depicted in completely different settings, lighting, or poses.
3. **Intelligent Deduplication**: Merges results from both passes and eliminates duplicates based on normalized page and image URLs.
4. **Robust Multi-Tier Image Resolution**:
   - Primary: Downloads candidate image directly from the visual match URL.
   - Fallback 1: Scrapes page OpenGraph (`og:image`) and Twitter Card (`twitter:image`) metadata via `ImageExtractionService`.
   - Fallback 2: Uses Google Lens preview thumbnails when source websites block hotlinking or rate-limit scraping.
5. **Similarity Verification & Ranking**: Re-detects faces on downloaded candidate media, extracts embeddings, computes cosine similarity against the reference face, and filters/ranks candidates by descending match confidence.
6. **Visual Evidence Annotation**: Draws bounding boxes and similarity scores on top candidate faces for forensic reporting.

---

## Technologies Used

- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Asynchronous web API) & [Uvicorn](https://www.uvicorn.org/) (ASGI Server)
- **Face Recognition & Detection**: [InsightFace](https://github.com/deepinsight/insightface) (`buffalo_l` model: RetinaFace detection + ArcFace recognition)
- **Execution Provider**: ONNX Runtime (CPUExecutionProvider)
- **Computer Vision**: OpenCV (`opencv-python`) & NumPy
- **Web Intelligence**: [SerpApi](https://serpapi.com/) (Google Lens Reverse Image Search Engine)
- **HTML Parsing & Fallbacks**: BeautifulSoup4 (`bs4`) & Requests

---

## Project Structure

```
VeriTrace/
├── app/
│   ├── api/
│   │   └── routes/
│   │       ├── health.py                 # Health check endpoint (GET /health)
│   │       └── search.py                 # Core API endpoints (/api/search, /api/web-search)
│   ├── services/
│   │   ├── comparision_service.py        # Embedding normalization & cosine similarity
│   │   ├── face_service.py               # InsightFace initialization, detection & cropping
│   │   ├── file_service.py               # Multipart file upload management
│   │   ├── image_download_service.py     # Resilient remote image downloading
│   │   ├── image_extraction_service.py   # Fallback metadata scraping (OG / Twitter cards)
│   │   ├── result_storage_service.py     # Local result image persistence
│   │   ├── search_service.py             # 1:N local face search engine
│   │   ├── validate_service.py           # Image format & integrity validation
│   │   ├── visualization_service.py      # Bounding box & confidence overlay annotation
│   │   ├── web_face_search_service.py    # Two-pass web search & verification orchestrator
│   │   └── web_search_service.py         # SerpApi Google Lens client
│   └── main.py                           # FastAPI application entrypoint & static mounting
├── experiments/
│   ├── samples/                          # Reference evaluation sample images
│   │   ├── image.jpg
│   │   ├── kajal.jpg
│   │   └── sulli.jpg
│   ├── compare_candidates.py             # Research script: Candidate comparisons
│   ├── compare_face.py                   # Research script: 1:1 Face comparison
│   └── test_face.py                      # Research script: InsightFace detection smoke test
├── results/                              # Generated annotated evidence images (Git-ignored)
├── uploads/                              # Temporary uploaded reference images (Git-ignored)
├── test_face_crop.py                     # Test: Face isolation & cropping
├── test_image_download.py                # Test: Candidate image download
├── test_image_extraction.py              # Test: Fallback image metadata extraction
├── test_search_pipeline.py               # Test: Local 1:N face search pipeline
├── test_web_face_search.py               # Test: Full end-to-end web search & verification pipeline
├── test_web_search.py                    # Test: SerpApi Google Lens integration
├── .env.example                          # Environment variable configuration template
├── .gitignore                            # Git exclusion rules
├── LICENSE                               # License terms
├── requirements.txt                      # Production Python dependencies
└── README.md                             # Documentation
```

---

## Installation & Setup

### 1. Prerequisites
- Python 3.10 to 3.12
- C++ build tools (required by InsightFace / ONNX Runtime if building from source)

### 2. Clone the Repository
```bash
git clone https://github.com/sivajisnehith/VeriTrace.git
cd VeriTrace
```

### 3. Create and Activate a Virtual Environment
```bash
# Windows (PowerShell)
python -m venv .venv
.venv\Scripts\Activate.ps1

# Linux / macOS
python3 -m venv .venv
source .venv/bin/activate
```

### 4. Install Dependencies
```bash
pip install -r requirements.txt
```

### 5. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Edit `.env` and provide your credentials:
```env
# Get an API key from https://serpapi.com/
SERPAPI_KEY=your_serpapi_api_key_here

# Local or public base URL for serving static result/upload URLs
PUBLIC_BASE_URL=http://127.0.0.1:8000
```

---

## Running the API Server

Start the FastAPI server using Uvicorn:
```bash
uvicorn app.main:app --reload --port 8000
```

Interactive API documentation will be available at:
- **Swagger UI**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

## API Endpoints

### 1. Health Check
- **Endpoint**: `GET /health`
- **Response**: `{"status": "healthy"}`

### 2. Local 1:1 Search & Verification
Compares a reference face against a candidate image containing one or more people:
- **Endpoint**: `POST /api/search`
- **Form Data**:
  - `reference_image`: Reference file (JPEG/PNG)
  - `candidate_image`: Candidate file (JPEG/PNG)
- **Sample Response**:
  ```json
  {
    "reference_faces_detected": 1,
    "candidate_faces_detected": 1,
    "top_candidate": {
      "face_number": 1,
      "similarity": 0.6687,
      "detection_confidence": 0.8756,
      "bbox": [400, 316, 646, 648]
    },
    "all_candidates": [ ... ],
    "result_image_url": "/results/4518125f-1af1-41a8-bc16-e037a2728460.jpg"
  }
  ```

### 3. Full Web Face Search Pipeline
Submits the reference image to the two-pass Google Lens discovery and verifies all retrieved online candidates:
- **Endpoint**: `POST /api/web-search`
- **Form Data**:
  - `reference_image`: Reference file (JPEG/PNG)
- **Sample Response**:
  ```json
  {
    "reference_image": "/uploads/6d9d3231-2845-4d02-8a78-cbb02c3f0bfd.jpg",
    "total_matches": 15,
    "results": [
      {
        "candidate_number": 1,
        "title": "Kajal Aggarwal - IMDb",
        "source": "IMDb",
        "page_url": "https://www.imdb.com/name/nm1807389/",
        "similarity": 0.9234,
        "detection_confidence": 0.8912,
        "bbox": [120, 85, 290, 310],
        "result_image_url": "/results/2b0fe104-3afa-476f-9d69-5c72de251c75.jpg"
      }
    ]
  }
  ```

---

## Running Verification Tests

Run any of the standalone pipeline tests:

- **End-to-End Web Search Verification**:
  ```bash
  python test_web_face_search.py
  ```
- **Local Face Search Pipeline**:
  ```bash
  python test_search_pipeline.py
  ```
- **Face Cropping Test**:
  ```bash
  python test_face_crop.py
  ```
- **Web Search Connectivity Test**:
  ```bash
  python test_web_search.py
  ```
- **Image Extraction Test**:
  ```bash
  python test_image_extraction.py
  ```

---

## Security & API Key Best Practices

- **Never Commit Secrets**: The `.env` file containing `SERPAPI_KEY` is explicitly ignored in `.gitignore`. Never commit `.env` or hardcode tokens in codebase files.
- **File Validation**: `ValidationService` verifies MIME types, guarantees files are non-empty, and validates image decode integrity before downstream processing to prevent corrupt payload exploits.
- **Local Isolation**: Uploaded and generated result images are stored in git-ignored directories (`uploads/` and `results/`).

---

## Limitations

- **Search Engine Coverage**: Google Lens indexes public, indexed web pages. Private social media profiles, password-protected sites, and non-indexed dynamic content are inaccessible.
- **Anti-Scraping Defenses**: Certain third-party candidate websites enforce Cloudflare/WAF challenges or hotlinking prevention; VeriTrace gracefully falls back to OpenGraph meta tags and Lens visual thumbnails when original images cannot be downloaded.
- **Biometric Variances**: Extreme occlusion (masks, sunglasses), severe low-resolution images (< 50x50 px face size), or heavy stylized filters may degrade cosine similarity scores.

---

## Next Steps: Blockchain Anchoring

The remaining major component in the VeriTrace architecture is **tamper-evident forensic evidence anchoring on the Ethereum blockchain**:
1. Generating a SHA-256 cryptographic hash of verified candidate evidence (matched URL, image payload, and similarity score).
2. Minting / recording the evidence timestamp and hash onto a smart contract to prove that a verified sighting existed at an immutable point in time.
