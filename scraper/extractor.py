import json


def extract_places(payload: str):

    # Strip Google's XSS protection prefix: )]}'\n
    text = payload.lstrip()
    for prefix in (")]}'\n", ")]}'"):
        if text.startswith(prefix):
            text = text[len(prefix):]
            break

    data = json.loads(text)

    # Structure: [[list_meta, count, url_info, owner, name, desc, null, null, [places...], ...]]
    places_array = data[0][8]

    places = []

    for entry in places_array:
        try:
            loc = entry[1]
            if not loc:
                continue

            coords = loc[5]  # [null, null, lat, lng]
            if not coords or len(coords) < 4 or coords[2] is None:
                continue

            ids = loc[6] if len(loc) > 6 and loc[6] else []

            places.append({
                "name": entry[2],
                "lat": coords[2],
                "lng": coords[3],
                "address": loc[4] if len(loc) > 4 else "",
                "place_id": ids[0] if ids else "",
                "place_path": loc[7] if len(loc) > 7 else "",
                "note": entry[3] if len(entry) > 3 else "",
            })
        except (IndexError, TypeError):
            continue

    return places
