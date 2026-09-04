from app.services.web_search_service import WebSearchService


service = WebSearchService()


result = service.search(
    "https://wallpapercave.com/wp/wp7251454.jpg"
)


candidates = service.get_candidates(result)


print("\n========== CANDIDATES ==========\n")


for i, candidate in enumerate(candidates[:10], start=1):

    print(f"CANDIDATE {i}")

    print("Title:", candidate["title"])
    print("Source:", candidate["source"])
    print("Page URL:", candidate["page_url"])
    print("Thumbnail URL:", candidate["thumbnail_url"])

    print("-" * 60)