from app.services.web_face_search_service import (
    WebFaceSearchService
)


REFERENCE_IMAGE = "experiments/samples/kajal.jpg"




service = WebFaceSearchService()


results = service.search(
    reference_image_path=REFERENCE_IMAGE,
)


print("\n")
print("=" * 60)

print("FINAL RANKED RESULTS")

print("=" * 60)


for result in results:

    print()

    print(
        "Candidate:",
        result["candidate_number"]
    )

    print(
        "Title:",
        result["title"]
    )

    print(
        "Source:",
        result["source"]
    )

    print(
        "Similarity:",
        round(
            result["similarity"],
            4
        )
    )
    print(
        "Result Image:",
        result["result_image_path"]
    )
    print(
        "Page URL:",
        result["page_url"]
    )

    print("-" * 60)