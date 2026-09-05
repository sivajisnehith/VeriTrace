import os
from fastapi import APIRouter, UploadFile, File

from app.services.file_service import FileService
from app.services.validate_service import ValidationService
from app.services.web_face_search_service import WebFaceSearchService

router = APIRouter(prefix="/api", tags=["Search"])

validation_service = ValidationService()
file_service = FileService()
web_face_search_service = WebFaceSearchService()


@router.post("/web-search")
async def web_search(reference_image: UploadFile = File(...)):
    await validation_service.validate_image(reference_image)
    reference_path = file_service.save_upload(reference_image)

    public_base_url = os.getenv("PUBLIC_BASE_URL")
    if not public_base_url:
        raise ValueError("PUBLIC_BASE_URL not configured in environment")

    filename = os.path.basename(reference_path)
    public_image_url = f"{public_base_url}/uploads/{filename}"
    print(f"Public image URL: {public_image_url}")

    results = web_face_search_service.search(reference_image_path=reference_path)

    formatted_results = []
    for result in results:
        result_filename = os.path.basename(result["result_image_path"])
        formatted_results.append({
            "candidate_number": result["candidate_number"],
            "title": result["title"],
            "source": result["source"],
            "page_url": result["page_url"],
            "image_sha256": result["image_sha256"],
            "similarity": result["similarity"],
            "detection_confidence": result["detection_confidence"],
            "bbox": result["bbox"],
            "result_image_url": f"/results/{result_filename}",
        })

    return {
        "reference_image": f"/uploads/{filename}",
        "total_matches": len(formatted_results),
        "top_candidate": formatted_results[0] if formatted_results else None,
        "results": formatted_results,
    }