from app.services.image_extraction_service import (
    ImageExtractionService
)


page_url = "https://es.pinterest.com/pin/1136666393458319489/"


service = ImageExtractionService()


image_url = service.extract_image_url(
    page_url
)


print("\n========== RESULT ==========\n")

print("Page URL:")
print(page_url)

print("\nExtracted Image URL:")
print(image_url)