from typing import Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field, field_validator

from app.services.hash_service import (
    canonicalize_evidence,
    calculate_sha256,
    fingerprint_to_bytes32,
    generate_observed_at,
    is_valid_sha256,
)
from app.services.blockchain_service import BlockchainService

router = APIRouter(prefix="/api/evidence", tags=["Evidence"])
blockchain_service = BlockchainService()


class EvidenceRegisterRequest(BaseModel):
    page_url: str = Field(..., description="URL where evidence was found")
    title: Optional[str] = Field(default="", description="Web page or post title")
    source: Optional[str] = Field(default="", description="Source domain or platform")
    image_sha256: str = Field(..., description="SHA-256 hash of the candidate image")
    candidate_number: Optional[int] = None
    similarity: Optional[float] = None
    result_image_url: Optional[str] = None

    @field_validator("page_url")
    @classmethod
    def validate_page_url(cls, v: str) -> str:
        v = v.strip()
        if not v.startswith(("http://", "https://")):
            raise ValueError("page_url must start with http:// or https://")
        return v

    @field_validator("image_sha256")
    @classmethod
    def validate_image_sha256(cls, v: str) -> str:
        v = v.strip().lower()
        if not is_valid_sha256(v):
            raise ValueError("image_sha256 must be a 64-character hexadecimal string")
        return v


class EvidenceVerifyRequest(BaseModel):
    fingerprint: Optional[str] = Field(default=None, description="Direct SHA-256 fingerprint")
    page_url: Optional[str] = None
    title: Optional[str] = ""
    source: Optional[str] = ""
    image_sha256: Optional[str] = None
    observed_at: Optional[str] = None

    @field_validator("fingerprint")
    @classmethod
    def validate_fingerprint(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip().lower()
            if not is_valid_sha256(v):
                raise ValueError("fingerprint must be a 64-character hexadecimal string")
        return v

    @field_validator("image_sha256")
    @classmethod
    def validate_image_sha256(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip().lower()
            if not is_valid_sha256(v):
                raise ValueError("image_sha256 must be a 64-character hexadecimal string")
        return v


@router.post("/register")
async def register_evidence(evidence: EvidenceRegisterRequest):
    # Authoritative backend timestamp for this observation
    observed_at = generate_observed_at()

    evidence_dict = {
        "page_url": evidence.page_url,
        "title": evidence.title or "",
        "source": evidence.source or "",
        "image_sha256": evidence.image_sha256,
        "observed_at": observed_at,
    }

    try:
        canonical_str = canonicalize_evidence(evidence_dict)
        fingerprint = calculate_sha256(evidence_dict)
        fingerprint_bytes = fingerprint_to_bytes32(fingerprint)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to generate fingerprint: {str(exc)}"
        )

    try:
        # Check if already registered
        verification = blockchain_service.verify_fingerprint(fingerprint_bytes)
        if verification["exists"]:
            return {
                "status": "already_registered",
                "message": "Evidence is already registered on Ethereum Sepolia.",
                "fingerprint": fingerprint,
                "observed_at": observed_at,
                "canonical_evidence": canonical_str,
                "blockchain_timestamp": verification["timestamp"],
                "submitter": verification["submitter"],
            }

        # Send transaction to Sepolia
        tx_info = blockchain_service.register_fingerprint(fingerprint_bytes)

        return {
            "status": "registered",
            "message": "Evidence successfully registered on Ethereum Sepolia.",
            "fingerprint": fingerprint,
            "observed_at": observed_at,
            "canonical_evidence": canonical_str,
            "transaction_hash": tx_info["transaction_hash"],
            "block_number": tx_info["block_number"],
            "gas_used": tx_info["gas_used"],
            "explorer_url": f"https://sepolia.etherscan.io/tx/{tx_info['transaction_hash']}",
        }

    except Exception as exc:
        error_msg = str(exc)
        if "revert" in error_msg.lower():
            clean_error = "Transaction reverted: Evidence already registered."
        elif "insufficient funds" in error_msg.lower():
            clean_error = "Insufficient Sepolia ETH for transaction gas."
        else:
            clean_error = f"Registration failed: {error_msg}"

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=clean_error
        )


@router.post("/verify")
async def verify_evidence(request: EvidenceVerifyRequest):
    canonical_str = None

    if request.fingerprint:
        fingerprint = request.fingerprint.strip()
    else:
        if not request.page_url or not request.image_sha256 or not request.observed_at:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification requires either 'fingerprint' or ('page_url', 'image_sha256', 'observed_at')."
            )

        evidence_dict = {
            "page_url": request.page_url,
            "title": request.title or "",
            "source": request.source or "",
            "image_sha256": request.image_sha256,
            "observed_at": request.observed_at,
        }

        try:
            canonical_str = canonicalize_evidence(evidence_dict)
            fingerprint = calculate_sha256(evidence_dict)
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to canonicalize evidence: {str(exc)}"
            )

    try:
        fingerprint_bytes = fingerprint_to_bytes32(fingerprint)
        verification = blockchain_service.verify_fingerprint(fingerprint_bytes)

        return {
            "exists": verification["exists"],
            "tampered": not verification["exists"],
            "fingerprint": fingerprint,
            "observed_at": request.observed_at,
            "canonical_evidence": canonical_str,
            "blockchain_timestamp": verification["timestamp"],
            "submitter": verification["submitter"],
            "message": (
                "Evidence verified authentic on Ethereum Sepolia"
                if verification["exists"]
                else "Evidence not found on Ethereum Sepolia (tampered or unregistered)"
            ),
        }

    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Verification failed: {str(exc)}"
        )
