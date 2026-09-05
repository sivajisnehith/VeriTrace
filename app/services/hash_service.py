import hashlib
import json
from datetime import datetime, timezone
from typing import Any, Dict


def generate_observed_at() -> str:
    """
    Generate a deterministic UTC ISO-8601 timestamp representing
    when VeriTrace observed or selected this evidence.
    Format: YYYY-MM-DDTHH:MM:SS.ffffff+00:00
    """
    return datetime.now(timezone.utc).isoformat()


def is_valid_sha256(hex_str: str) -> bool:
    """
    Check if a string is a valid 64-character hexadecimal SHA-256 digest.
    """
    if not isinstance(hex_str, str) or len(hex_str) != 64:
        return False
    try:
        int(hex_str, 16)
        return True
    except ValueError:
        return False


def canonicalize_evidence(evidence: Dict[str, Any]) -> str:
    """
    Convert evidence into a deterministic JSON representation.

    The canonical representation contains:
    - image_sha256
    - observed_at
    - page_url
    - source
    - title

    The same evidence fields and timestamp will always produce
    the exact same canonical JSON string.
    """
    observed_at = evidence.get("observed_at", "")
    if isinstance(observed_at, datetime):
        if observed_at.tzinfo is None:
            observed_at = observed_at.replace(tzinfo=timezone.utc)
        observed_at = observed_at.isoformat()
    elif isinstance(observed_at, str):
        observed_at = observed_at.strip()
    else:
        observed_at = str(observed_at)

    canonical_evidence = {
        "page_url": str(evidence.get("page_url", "")).strip(),
        "title": str(evidence.get("title", "")).strip(),
        "source": str(evidence.get("source", "")).strip(),
        "image_sha256": str(evidence.get("image_sha256", "")).strip().lower(),
        "observed_at": observed_at,
    }

    return json.dumps(
        canonical_evidence,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
    )


def calculate_sha256(evidence: Dict[str, Any]) -> str:
    """
    Calculate SHA-256 fingerprint of the canonical evidence.
    """

    canonical_evidence = canonicalize_evidence(evidence)

    digest = hashlib.sha256(
        canonical_evidence.encode("utf-8")
    ).hexdigest()

    return digest


def fingerprint_to_bytes32(fingerprint: str) -> bytes:
    """
    Convert a SHA-256 hexadecimal fingerprint into
    the 32-byte value expected by Solidity bytes32.
    """

    if not is_valid_sha256(fingerprint):
        raise ValueError("SHA-256 fingerprint must contain 64 hexadecimal characters")

    try:
        return bytes.fromhex(fingerprint)
    except ValueError as exc:
        raise ValueError("Fingerprint must be a valid hexadecimal SHA-256 digest") from exc