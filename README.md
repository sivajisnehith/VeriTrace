# VeriTrace

> **Cryptographic Web Forensics & Biometric Identity Verification**  
> Discover online visual occurrences of a person, compute 512-dimensional facial biometric similarities, and anchor tamper-proof evidence onto the Ethereum blockchain.

[![Network: Ethereum Sepolia](https://img.shields.io/badge/Blockchain-Ethereum%20Sepolia%20(11155111)-627EEA?logo=ethereum&logoColor=white)](https://sepolia.etherscan.io/address/0xA86904bd58031564ED6431c519d0A633d9f15f14)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![InsightFace](https://img.shields.io/badge/Biometrics-InsightFace%20ArcFace%20512--D-FF6F00)](https://github.com/deepinsight/insightface)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## Table of Contents

- [1. Functionality](#1-functionality)
  - [System Architecture](#system-architecture)
  - [Core Pipeline Breakdown](#core-pipeline-breakdown)
  - [Frontend & Visualization](#frontend--visualization)
- [2. Which Blockchain?](#2-which-blockchain)
  - [Network & Smart Contract Details](#network--smart-contract-details)
  - [Why Ethereum Sepolia?](#why-ethereum-sepolia)
  - [Smart Contract Architecture (`VeriTraceRegistry.sol`)](#smart-contract-architecture-veritraceregistrysol)
  - [Dual Timestamp Separation & Canonical Hashing](#dual-timestamp-separation--canonical-hashing)
- [3. How to Run It](#3-how-to-run-it)
  - [Prerequisites](#prerequisites)
  - [Step 1: Clone Repository & Virtual Environment](#step-1-clone-repository--virtual-environment)
  - [Step 2: Install Dependencies](#step-2-install-dependencies)
  - [Step 3: Environment Configuration (`.env`)](#step-3-environment-configuration-env)
  - [Step 4: Start the FastAPI Backend](#step-4-start-the-fastapi-backend)
  - [Step 5: Launch the Frontend](#step-5-launch-the-frontend)
  - [Step 6: End-to-End Walkthrough](#step-6-end-to-end-walkthrough)
- [4. API Reference](#4-api-reference)
- [5. Known Limitations](#5-known-limitations)
- [License](#license)

---

## 1. Functionality

VeriTrace is an open-source OSINT (Open Source Intelligence) and forensic identity verification system designed to track digital media provenance across the surface web and permanently notarize digital evidence on an immutable blockchain ledger.

### System Architecture

```text
               ┌────────────────────────────────────────────────────────┐
               │              Reference Face Photo Upload               │
               └──────────────────────────┬─────────────────────────────┘
                                          │
                                          ▼
                      ┌──────────────────────────────────────┐
                      │   InsightFace Buffalo_L Detection    │
                      │  512-Dimensional ArcFace Embedding   │
                      └───────────────────┬──────────────────┘
                                          │
                  ┌───────────────────────┴───────────────────────┐
                  ▼                                               ▼
     ┌─────────────────────────┐                     ┌─────────────────────────┐
     │   Pass 1: Full Frame    │                     │ Pass 2: Face Crop Only  │
     │  (Google Lens Search)   │                     │  (Google Lens Search)   │
     └────────────┬────────────┘                     └────────────┬────────────┘
                  └───────────────────────┬───────────────────────┘
                                          ▼
                           ┌─────────────────────────────┐
                           │ Candidate Ingestion & Dedup │
                           └──────────────┬──────────────┘
                                          ▼
                           ┌─────────────────────────────┐
                           │ Download & OpenCV Validation │
                           └──────────────┬──────────────┘
                                          ▼
                           ┌─────────────────────────────┐
                           │ Candidate Face Biometrics & │
                           │  Cosine Distance Ranking    │
                           └──────────────┬──────────────┘
                                          ▼
                           ┌─────────────────────────────┐
                           │ SHA-256 Image Byte Hash &   │
                           │ Candidate Evidence Sorting  │
                           └──────────────┬──────────────┘
                                          │
                   User Selects Candidate / Top Evidence
                                          │
                                          ▼
                      ┌──────────────────────────────────────┐
                      │  Deterministic Canonical Serialization│
                      │   - page_url                         │
                      │   - title                            │
                      │   - source                           │
                      │   - image_sha256                     │
                      │   - observed_at (UTC ISO-8601)       │
                      └───────────────────┬──────────────────┘
                                          │
                                          ▼
                      ┌──────────────────────────────────────┐
                      │    Compute 32-Byte SHA-256 Digest    │
                      └───────────────────┬──────────────────┘
                                          │
                                          ▼
                      ┌──────────────────────────────────────┐
                      │    Ethereum Sepolia Smart Contract   │
                      │   (VeriTraceRegistry.sol Anchoring)  │
                      └───────────────────┬──────────────────┘
                                          │
                                          ▼
                      ┌──────────────────────────────────────┐
                      │ Independent Verification & Auditing  │
                      │  (Tamper Detection by Fingerprint)   │
                      └──────────────────────────────────────┘
```

### Core Pipeline Breakdown

1. **Biometric Landmark Detection & ArcFace Vectorization**
   - The query image is processed through the InsightFace `buffalo_l` model (`w600k_r50` backbone) running on ONNX Runtime.
   - Detects bounding boxes, facial landmarks, and computes a unit-normalized **512-dimensional biometric embedding** representing individual facial identity.

2. **Two-Pass Visual Surface Web Discovery**
   - **Pass 1 (Full Frame):** Searches the entire uploaded image using Google Lens (via SerpApi) to locate visually matching web pages, identical photo reposts, and contextual scenes.
   - **Pass 2 (Isolated Face Crop):** Isolates the tight bounding box of the principal face with safety margins and queries Google Lens on the cropped face alone. This identifies the target subject across entirely different scenes, outfits, backgrounds, and camera angles.
   - Candidate web links from both passes are merged and deduplicated by URL.

3. **Forensic Ingestion, Filtering & Similarity Computation**
   - Candidate URLs and thumbnail resources are safely retrieved, verified as valid decodable image streams via OpenCV (`cv2.imdecode`), and processed by the face analysis model.
   - For every candidate, the cosine similarity between its primary face embedding and the query embedding is computed:
     $$\text{Similarity} = \frac{\mathbf{u} \cdot \mathbf{v}}{\|\mathbf{u}\|_2 \|\mathbf{v}\|_2}$$
   - Candidate images are hashed using SHA-256 to ensure byte-level integrity.
   - Results are sorted in descending order of similarity score.

4. **Cryptographic Fingerprint Generation**
   - When an investigator notarizes evidence, VeriTrace constructs an RFC-compliant canonical representation sorting all metadata keys alphabetically:
     ```json
     {"image_sha256":"...","observed_at":"2026-09-06T09:28:14.123456Z","page_url":"...","source":"...","title":"..."}
     ```
   - A single 32-byte SHA-256 hash of this deterministic string is produced. Any future alteration of a single character in the title, URL, image hash, or observation timestamp invalidates the fingerprint.

5. **Blockchain Anchoring & Instant Tamper Detection**
   - The 32-byte digest is committed to the Ethereum Sepolia smart contract with the transaction caller's address and block timestamp.
   - Third-party auditors can supply either the raw fingerprint or the original evidence parameters to mathematically verify authenticity against Ethereum consensus.

### Frontend & Visualization

The frontend is a self-contained responsive cyber-forensic interface featuring:
- **Interactive 3D Biometric Canvas (`scene.js`):** Built with Three.js, rendering a rotating 68-landmark anatomical facial mesh with holographic reticles and ArcFace coordinate rings.
- **Investigation Console (`frontend/investigate/`):** Drag-and-drop reference photo dropzone, live multi-stage pipeline status progress tracker, ranked candidate card gallery with similarity meters, face crop bounding boxes, and direct "Notarize on Sepolia" integration.
- **Verification Terminal (`frontend/verify/`):** Dual-mode auditing interface supporting verification by direct 32-byte hash or by raw evidence fields, returning on-chain block numbers, timestamps, submitter addresses, and Etherscan transaction explorer links.

---

## 2. Which Blockchain?

### Network & Smart Contract Details

| Parameter | Value |
| :--- | :--- |
| **Blockchain Network** | **Ethereum Sepolia Testnet** |
| **Network Type** | Proof-of-Stake (PoS) Public Testnet |
| **Chain ID** | `11155111` |
| **Currency Symbol** | `SepoliaETH` |
| **Smart Contract Name** | `VeriTraceRegistry` |
| **Contract Address** | [`0xA86904bd58031564ED6431c519d0A633d9f15f14`](https://sepolia.etherscan.io/address/0xA86904bd58031564ED6431c519d0A633d9f15f14) |
| **Solidity Version** | `^0.8.20` |
| **Block Explorer** | [Sepolia Etherscan](https://sepolia.etherscan.io/) |

### Why Ethereum Sepolia?

1. **EVM Compatibility & Production Parity:** Sepolia is Ethereum's recommended primary testnet, replicating Ethereum mainnet EVM execution, opcode behavior, and consensus rules.
2. **Decentralized Public Verifiability:** Anyone can audit records without needing proprietary API keys, permissioned database access, or vendor trust.
3. **Immutability & Non-Repudiation:** Once a transaction is confirmed by Ethereum validators, the fingerprint and block timestamp cannot be revised, rolled back, or deleted.
4. **Zero Financial Risk for Experimentation:** Uses freely accessible SepoliaETH via public faucets, allowing full gas-metered blockchain validation without real-world monetary cost.

### Smart Contract Architecture (`VeriTraceRegistry.sol`)

The `VeriTraceRegistry` contract ([contracts/VeriTraceRegistry.sol](contracts/VeriTraceRegistry.sol)) is designed for minimal gas consumption and deterministic key-value lookups:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract VeriTraceRegistry {

    struct Evidence {
        bytes32 fingerprint;
        uint256 timestamp;
        address submitter;
    }

    mapping(bytes32 => Evidence) public evidenceRecords;

    event EvidenceRegistered(
        bytes32 indexed fingerprint,
        uint256 timestamp,
        address indexed submitter
    );

    function registerEvidence(bytes32 fingerprint) external {
        require(
            evidenceRecords[fingerprint].timestamp == 0,
            "Evidence already registered"
        );

        evidenceRecords[fingerprint] = Evidence(
            fingerprint,
            block.timestamp,
            msg.sender
        );

        emit EvidenceRegistered(
            fingerprint,
            block.timestamp,
            msg.sender
        );
    }

    function verifyEvidence(bytes32 fingerprint)
        external
        view
        returns (
            bool exists,
            uint256 timestamp,
            address submitter
        )
    {
        Evidence memory record = evidenceRecords[fingerprint];
        return (record.timestamp != 0, record.timestamp, record.submitter);
    }
}
```

### Dual Timestamp Separation & Canonical Hashing

To avoid circular dependencies between off-chain hashing and on-chain block mining, VeriTrace enforces a strict two-timestamp design:

1. **`observed_at` (Off-chain Application Timestamp):**
   - High-precision UTC timestamp (`YYYY-MM-DDTHH:MM:SS.ffffffZ`) stamped by the backend when the investigator selects or ingests the candidate.
   - Embedded directly inside the evidence JSON payload prior to generating the SHA-256 fingerprint.
   - Distinguishes independent investigations: observing the same webpage at different times produces distinct, valid fingerprints.
2. **`block.timestamp` (On-chain Consensus Timestamp):**
   - The immutable block timestamp recorded by Ethereum validators when `registerEvidence()` is mined.

---

## 3. How to Run It

### Prerequisites

- **Python 3.10+** (Python 3.11 or 3.12 recommended)
- **Node.js** or any static HTTP file server (e.g., Python `http.server`, VS Code Live Server)
- **SerpApi API Key:** Free account at [serpapi.com](https://serpapi.com) (provides 100 free searches/month)
- **Ethereum Sepolia RPC URL:** Free endpoint from [GetBlock](https://getblock.io/), [Alchemy](https://www.alchemy.com/), or [Infura](https://www.infura.io/)
- **Ethereum Sepolia Wallet:** A MetaMask / Web3 private key funded with testnet SepoliaETH (obtainable from [Google Cloud Sepolia Faucet](https://cloud.google.com/application/web3/faucet/ethereum/sepolia) or [Sepolia PoW Faucet](https://sepolia-faucet.pk910.de/))

---

### Step 1: Clone Repository & Virtual Environment

Open a terminal (PowerShell, Command Prompt, or Bash) and navigate to the project directory:

```bash
git clone https://github.com/sivajisnehith/VeriTrace.git
cd VeriTrace
```

Create and activate a virtual environment:

**Windows (PowerShell):**
```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

**macOS / Linux:**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

---

### Step 2: Install Dependencies

Install all required Python packages:

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

> **Note on InsightFace / ONNX Runtime:** On Windows, `insightface` downloads model weights automatically into `~/.insightface/models/buffalo_l/` on first execution. Ensure you have the Microsoft Visual C++ 14.0+ Build Tools installed if prompted during compilation.

---

### Step 3: Environment Configuration (`.env`)

Copy the example environment file or create a `.env` file in the project root:

```bash
cp .env.example .env
```

Populate the following variables inside `.env`:

```env
# SerpApi Key for Google Lens Dual-Pass Reverse Image Search
SERPAPI_KEY=your_serpapi_api_key_here

# Base URL for serving static image assets (uploads & results)
PUBLIC_BASE_URL=http://127.0.0.1:8000

# Ethereum Sepolia RPC Endpoint
SEPOLIA_RPC_URL=https://go.getblock.io/your_getblock_token/
# Alternative: https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY

# Ethereum Wallet Credentials for Submitting Transactions
WALLET_ADDRESS=0xYourWalletAddressHere
WALLET_PRIVATE_KEY=YourWalletPrivateKeyWithout0xPrefixOrWithIt

# Deployed VeriTrace Smart Contract on Sepolia
VERITRACE_CONTRACT_ADDRESS=0xA86904bd58031564ED6431c519d0A633d9f15f14
```

---

### Step 4: Start the FastAPI Backend

Run the backend server using Uvicorn:

```powershell
uvicorn app.main:app --reload --port 8000
```

Once running, verify backend health:
- **Swagger Interactive API Documentation:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc Documentation:** [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

### Step 5: Launch the Frontend

In a separate terminal window, serve the frontend directory:

**Option A (Using Python built-in server):**
```powershell
python -m http.server 3000 --directory frontend
```

**Option B (Using Node.js `serve` / `npx`):**
```bash
npx serve frontend -p 3000
```

Now open your browser and navigate to:
- **Landing Page:** [http://localhost:3000/index.html](http://localhost:3000/index.html)
- **Investigation Workspace:** [http://localhost:3000/investigate/index.html](http://localhost:3000/investigate/index.html)
- **Evidence Verification Portal:** [http://localhost:3000/verify/index.html](http://localhost:3000/verify/index.html)

---

### Step 6: End-to-End Walkthrough

1. **Conduct an Investigation:**
   - Go to `http://localhost:3000/investigate/index.html`.
   - Drag and drop a clear frontal reference photo (`.jpg`, `.png`, or `.webp`).
   - Click **Start Web Investigation**.
   - Monitor the 5-stage progress indicator:
     `Biometric Encoding` → `Dual-Pass Search` → `Candidate Ingestion` → `Cosine Verification` → `Forensic Fingerprint`.
2. **Review Ranked Candidates:**
   - Review discovered web matches ranked by facial similarity score (e.g., `85% Match`, `92% Match`).
   - Inspect the candidate page source, title, page URL, and calculated image SHA-256 hash.
3. **Anchor to Blockchain:**
   - Click **Anchor to Blockchain** on the strongest candidate.
   - The backend signs and dispatches the transaction to the Sepolia testnet.
   - Once mined, the UI displays the transaction receipt, block number, gas used, and a clickable link to Etherscan.
4. **Audit Evidence Integrity:**
   - Copy the generated 32-byte fingerprint or click **Verify On-Chain**.
   - In `http://localhost:3000/verify/index.html`, test both options:
     - **Option A (Direct Fingerprint):** Paste the 32-byte hex hash to view on-chain registration state and submitter.
     - **Option B (Full Evidence Metadata):** Enter the original `page_url`, `title`, `source`, `image_sha256`, and `observed_at`. VeriTrace dynamically reconstructs the canonical JSON, recalculates the fingerprint, and confirms whether the data remains authentic or has been tampered with.

---

## 4. API Reference

### `POST /api/web-search`
Uploads a reference image and executes the dual-pass search & facial ranking pipeline.
- **Request Body (Multipart Form):**
  - `reference_image`: Binary image file (`.jpg`, `.jpeg`, `.png`, `.webp`)
- **Response Example:**
  ```json
  {
    "reference_image": "/uploads/174ff8db-8127-4b5f.png",
    "total_matches": 5,
    "top_candidate": {
      "candidate_number": 1,
      "title": "Example Headline",
      "source": "example.com",
      "page_url": "https://example.com/article",
      "image_sha256": "4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a",
      "similarity": 0.8842,
      "detection_confidence": 0.998,
      "bbox": [120, 65, 340, 310],
      "result_image_url": "/results/0556f56a-2f44-4f02.jpg"
    },
    "results": [...]
  }
  ```

### `POST /api/evidence/register`
Canonicalizes evidence metadata, generates the authoritative UTC `observed_at` timestamp, computes the 32-byte fingerprint, and submits an on-chain transaction to the Sepolia smart contract.
- **Request Body:**
  ```json
  {
    "page_url": "https://example.com/article",
    "title": "Example Headline",
    "source": "example.com",
    "image_sha256": "4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a"
  }
  ```
- **Response Example:**
  ```json
  {
    "status": "success",
    "fingerprint": "0x1f80156a1c3c22c1bdeb52d5ea20055affd36dbf65e41fedfea72ef1fc1cded1",
    "tx_hash": "0x3f5c9e2b...",
    "block_number": 6482103,
    "observed_at": "2026-09-06T09:28:14.123456Z",
    "etherscan_url": "https://sepolia.etherscan.io/tx/0x3f5c9e2b..."
  }
  ```

### `POST /api/evidence/verify`
Performs an on-chain query to verify whether an evidence fingerprint exists on Sepolia.
- **Request Body (Option A - Direct Fingerprint):**
  ```json
  {
    "fingerprint": "0x1f80156a1c3c22c1bdeb52d5ea20055affd36dbf65e41fedfea72ef1fc1cded1"
  }
  ```
- **Request Body (Option B - Full Evidence):**
  ```json
  {
    "page_url": "https://example.com/article",
    "title": "Example Headline",
    "source": "example.com",
    "image_sha256": "4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a",
    "observed_at": "2026-09-06T09:28:14.123456Z"
  }
  ```

---

## 5. Known Limitations

While VeriTrace offers an end-to-end identity tracking and cryptographic notarization solution, several real-world engineering constraints and limitations apply:

1. **External Search Engine Quotas & Rate Limits:**
   - The dual-pass reverse visual search queries Google Lens through SerpApi. Each complete search consumes **2 API credits** (Pass 1 full frame + Pass 2 face crop).
   - Free-tier accounts have monthly query limits. Heavy investigative throughput requires paid API subscriptions.

2. **Web Scraping & Anti-Bot Protections:**
   - Candidate images hosted on third-party domains protected by strict Cloudflare Turnstile, Akamai bot managers, or HTTP 403 / hotlinking blocks may fail to download.
   - If a candidate image cannot be retrieved or decoded by OpenCV, it is skipped from biometric analysis and excluded from the candidate ranking list.

3. **2D Biometric Angle & Occlusion Constraints:**
   - The ArcFace (`buffalo_l`) model produces optimal 512-dimensional embeddings on frontal or near-frontal facial angles ($\pm 30^{\circ}$ yaw and pitch).
   - Profiles greater than $60^{\circ}$, severe motion blur, low pixel density ($<50\times50$ px face region), or heavy occlusions (e.g., sunglasses, medical masks) can significantly decrease cosine similarity or cause face detection failure.

4. **Public Exposure for Image Reverse Search:**
   - In environments where direct local file uploads to SerpApi cannot be used, Google Lens requires image URLs that are publicly reachable over the internet.
   - For local development, reverse image engines cannot crawl `http://localhost:8000`. In such workflows, a reverse proxy or tunnel tool (such as [ngrok](https://ngrok.com/) or Cloudflare Tunnel) must be assigned to `PUBLIC_BASE_URL`.

5. **Blockchain Confirmation Latency & Gas Dependencies:**
   - Transaction registration speed is bounded by Ethereum Sepolia block mining times (typically 12–15 seconds per block).
   - High network congestion or insufficient gas balance in the configured wallet will delay or fail evidence notarization until funded with SepoliaETH.
   - Sepolia RPC nodes (e.g., GetBlock, Alchemy, Infura) enforce throughput and rate limits on their free tiers.

---

## License

This project is open-source and licensed under the [MIT License](LICENSE).
