import os
import requests
from dotenv import load_dotenv

load_dotenv()


class WebSearchService:

    def __init__(self):

        self.api_key = os.getenv("SERPAPI_KEY")

        if not self.api_key:
            raise ValueError(
                "SERPAPI_KEY not found in .env file"
            )

    def search(self, image_url: str):

        params = {
            "engine": "google_lens",
            "url": image_url,
            "api_key": self.api_key,
            "type": "all"
        }

        response = requests.get(
            "https://serpapi.com/search",
            params=params,
            timeout=60
        )

        response.raise_for_status()

        return response.json()

    def search_local_image(
        self,
        image_path: str
    ):

        print(
            f"\nUploading local image: {image_path}"
        )

        # =====================================
        # 1. UPLOAD IMAGE TO SERPAPI
        # =====================================

        with open(
            image_path,
            "rb"
        ) as image_file:

            response = requests.post(
                "https://serpapi.com/image",
                files={
                    "image": image_file
                },
                data={
                    "api_key": self.api_key
                },
                timeout=30
            )

        response.raise_for_status()

        upload_data = response.json()

        image_id = upload_data.get(
            "image_id"
        )

        if not image_id:
            raise ValueError(
                "SerpApi did not return image_id"
            )

        print(
            "Image uploaded successfully."
        )

        # =====================================
        # 2. GOOGLE LENS SEARCH
        # =====================================

        print(
            "Searching Google Lens..."
        )

        params = {
            "engine": "google_lens",
            "image_id": image_id,
            "type": "all",
            "api_key": self.api_key
        }

        response = requests.get(
            "https://serpapi.com/search",
            params=params,
            timeout=60
        )

        response.raise_for_status()

        data = response.json()

        print(
            "Visual matches:",
            len(
                data.get(
                    "visual_matches",
                    []
                )
            )
        )

        return data

    def get_candidates(
        self,
        search_result
    ):

        candidates = []

        visual_matches = search_result.get(
            "visual_matches",
            []
        )

        for item in visual_matches:

            image_url = item.get(
                "image"
            )

            if not image_url:
                image_url = item.get(
                    "thumbnail"
                )

            candidates.append({

                "title": item.get(
                    "title"
                ),

                "source": item.get(
                    "source"
                ),

                "page_url": item.get(
                    "link"
                ),

                "image_url": image_url,

                "thumbnail_url": item.get(
                    "thumbnail"
                ),

                "image_width": item.get(
                    "image_width"
                ),

                "image_height": item.get(
                    "image_height"
                )
            })

        return candidates