import requests

def resolve_url(url: str) -> str:
    r = requests.get(url, allow_redirects=True, timeout=15)
    return r.url
