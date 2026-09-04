import os
import uuid
import shutil
from fastapi import UploadFile


class FileService:

    def save_upload(
        self,
        uploaded_file: UploadFile,
        upload_directory: str = "uploads"
    ) -> str:

        os.makedirs(
            upload_directory,
            exist_ok=True
        )

        file_extension = os.path.splitext(
            uploaded_file.filename
        )[1]

        unique_filename = (
            f"{uuid.uuid4()}{file_extension}"
        )

        file_path = os.path.join(
            upload_directory,
            unique_filename
        )

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(
                uploaded_file.file,
                buffer
            )

        return file_path