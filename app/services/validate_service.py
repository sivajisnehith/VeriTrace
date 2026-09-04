from fastapi import UploadFile, HTTPException
import cv2
import numpy as np


class ValidationService:

    ALLOWED_CONTENT_TYPES = {
        "image/jpeg",
        "image/png",
        "image/jpg"
    }


    def validate_image_type(
        self,
        uploaded_file: UploadFile
    ):
        if uploaded_file.content_type not in self.ALLOWED_CONTENT_TYPES:

            raise HTTPException(
                status_code=400,
                detail=(
                    "Invalid file type. "
                    "Only JPEG and PNG images are allowed."
                )
            )

    async def validate_image_content(
        self,
        uploaded_file: UploadFile
    ):
        file_bytes = await uploaded_file.read()

        if not file_bytes:
            raise HTTPException(
                status_code=400,
                detail="Uploaded image file is empty."
            )

        image_array = np.frombuffer(
            file_bytes,
            dtype=np.uint8
        )

        image = cv2.imdecode(
            image_array,
            cv2.IMREAD_COLOR
        )

        if image is None:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Uploaded file is not a valid "
                    "or readable image."
                )
            )

        uploaded_file.file.seek(0)

    async def validate_image(
        self,
        uploaded_file: UploadFile
    ):

        self.validate_image_type(
            uploaded_file
        )

        await self.validate_image_content(
            uploaded_file
        )