import os
import uuid
import cv2


class ResultStorageService:

    def save_result(
        self,
        image,
        output_directory: str = "results"
    ) -> str:

        os.makedirs(
            output_directory,
            exist_ok=True
        )

        filename = f"{uuid.uuid4()}.jpg"

        output_path = os.path.join(
            output_directory,
            filename
        )

        success = cv2.imwrite(
            output_path,
            image
        )

        if not success:
            raise RuntimeError(
                "Failed to save result image."
            )

        return output_path