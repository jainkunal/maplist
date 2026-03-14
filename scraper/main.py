from resolver import resolve_url
from utils import extract_list_id
from list_parser import fetch_list_payload
from extractor import extract_places
from storage import save_places


def process_list(url):

    resolved_url = resolve_url(url)
    print(resolved_url)

    list_id = extract_list_id(resolved_url)
    print(list_id)

    payload = fetch_list_payload(list_id)
    print(payload)

    places = extract_places(payload)

    if not places:
        raise ValueError("No places extracted — regex may not match the response format")

    return places


if __name__ == "__main__":

    url = "https://maps.app.goo.gl/suCrjeUSoeqWffrS8"

    places = process_list(url)

    save_places(places)

    print(f"Saved {len(places)} places")
