import re
import requests

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

def fetch_list_payload(list_id: str) -> str:

    # Step 1: fetch the list page to discover the real API URL
    page_url = f"https://www.google.com/maps/placelists/list/{list_id}"
    page = requests.get(page_url, headers=HEADERS, timeout=15)
    page.raise_for_status()

    match = re.search(r'href="(/maps/preview/entitylist/getlist[^"]+)"', page.text)
    if not match:
        raise ValueError("Could not find entitylist API URL in page HTML")

    api_path = match.group(1).replace("&amp;", "&")
    api_url = f"https://www.google.com{api_path}"

    # Step 2: fetch the actual JSON data
    r = requests.get(api_url, headers=HEADERS, timeout=15)
    r.raise_for_status()

    return r.text
