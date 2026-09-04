from app.services.image_download_service import ImageDownloadService


image_url = "https://i.pinimg.com/736x/99/c1/a0/99c1a0586c253d702914eb0843a610e4.jpg"

service = ImageDownloadService()

image_bytes = service.download_image(image_url)

with open("results/downloaded_candidate.jpg", "wb") as file:
    file.write(image_bytes)

print("Image downloaded successfully!")
print("Size:", len(image_bytes), "bytes")