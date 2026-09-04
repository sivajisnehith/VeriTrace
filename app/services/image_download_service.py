import requests


class ImageDownloadService:

    def download_image(self, image_url: str) -> bytes:
        response = requests.get(
            image_url,
            timeout=10
        )

        response.raise_for_status()

        return response.content