import re

def extract_list_id(url: str):

    # Format: /maps/@/data=...!2s{LIST_ID}!3e3...
    match = re.search(r'!2s([^!]+)!3e3', url)
    if match:
        return match.group(1)

    raise ValueError("Invalid Google Maps list URL")
