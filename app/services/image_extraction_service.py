import requests
from bs4 import BeautifulSoup


class ImageExtractionService:

    def extract_image_url(self, page_url: str):

        try:

            headers = {
                "User-Agent": (
                    "Mozilla/5.0 "
                    "(Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 "
                    "(KHTML, like Gecko) "
                    "Chrome/120.0.0.0 Safari/537.36"
                )
            }

            response = requests.get(
                page_url,
                headers=headers,
                timeout=10
            )

            response.raise_for_status()

            soup = BeautifulSoup(
                response.text,
                "html.parser"
            )


            # Try Open Graph image first
            og_image = soup.find(
                "meta",
                property="og:image"
            )

            if og_image and og_image.get("content"):

                return og_image.get("content")


            # Try Twitter image
            twitter_image = soup.find(
                "meta",
                attrs={"name": "twitter:image"}
            )

            if (
                twitter_image
                and twitter_image.get("content")
            ):

                return twitter_image.get("content")


            return None


        except requests.RequestException as error:

            print(
                f"Could not extract image: {error}"
            )

            return None