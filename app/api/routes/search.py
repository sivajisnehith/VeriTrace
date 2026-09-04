import os

from fastapi import APIRouter, UploadFile, File

from app.services.file_service import FileService
from app.services.validate_service import ValidationService
from app.services.search_service import SearchService
from app.services.result_storage_service import ResultStorageService


from app.services.web_face_search_service import (
    WebFaceSearchService
)

router = APIRouter(
    prefix="/api",
    tags=["Search"]
)


validation_service = ValidationService()
file_service = FileService()
result_storage_service = ResultStorageService()
search_service = SearchService()
web_face_search_service = WebFaceSearchService()

@router.post("/search")
async def search_images(
    reference_image: UploadFile = File(...),
    candidate_image: UploadFile = File(...)
):
    await validation_service.validate_image(
        reference_image
    )

    await validation_service.validate_image(
        candidate_image
    )

    reference_path = file_service.save_upload(
        reference_image
    )

    candidate_path = file_service.save_upload(
        candidate_image
    )

    result = search_service.search(
        reference_path,
        candidate_path
    )

    result_image_path = (
        result_storage_service.save_result(
            result["annotated_image"]
        )
    )

    result_filename = os.path.basename(
        result_image_path
    )

    result_image_url = (
        f"/results/{result_filename}"
    )

    return {
        "reference_faces_detected":
            result["reference_faces_detected"],

        "candidate_faces_detected":
            result["candidate_faces_detected"],

        "top_candidate":
            result["top_candidate"],

        "all_candidates":
            result["all_candidates"],

        "result_image_url":
            result_image_url
    }

@router.post("/web-search")
async def web_search(
    reference_image: UploadFile = File(...)
):

    # ==============================
    # 1. VALIDATE IMAGE
    # ==============================

    await validation_service.validate_image(
        reference_image
    )


    # ==============================
    # 2. SAVE UPLOADED IMAGE
    # ==============================

    reference_path = (
        file_service.save_upload(
            reference_image
        )
    )


    # ==============================
    # 3. CREATE PUBLIC IMAGE URL
    # ==============================

    public_base_url = os.getenv(
        "PUBLIC_BASE_URL"
    )


    if not public_base_url:

        raise ValueError(
            "PUBLIC_BASE_URL not found"
        )


    filename = os.path.basename(
        reference_path
    )


    public_image_url = (
        f"{public_base_url}/uploads/{filename}"
    )


    print(
        "Public image URL:",
        public_image_url
    )


    # ==============================
    # 4. RUN FULL VERITRACE PIPELINE
    # ==============================

    results = (
        web_face_search_service.search(
            reference_image_path=reference_path
        )
    )


    # ==============================
    # 5. CONVERT LOCAL RESULT PATHS
    # ==============================

    formatted_results = []


    for result in results:

        result_filename = os.path.basename(
            result["result_image_path"]
        )


        result_image_url = (
            f"/results/{result_filename}"
        )


        formatted_results.append({

            "candidate_number":
                result["candidate_number"],

            "title":
                result["title"],

            "source":
                result["source"],

            "page_url":
                result["page_url"],

            "similarity":
                result["similarity"],

            "detection_confidence":
                result["detection_confidence"],

            "bbox":
                result["bbox"],

            "result_image_url":
                result_image_url

        })


    # ==============================
    # 6. RETURN RESULTS
    # ==============================

    return {

        "reference_image":
            f"/uploads/{filename}",

        "total_matches":
            len(formatted_results),

        "results":
            formatted_results

    }