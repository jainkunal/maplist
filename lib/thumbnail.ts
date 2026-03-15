type LatLng = { lat: number; lng: number };

function calculateZoom(places: LatLng[]): number {
  if (places.length <= 1) return 13;
  const lats = places.map((p) => p.lat);
  const lngs = places.map((p) => p.lng);
  const range = Math.max(
    Math.max(...lats) - Math.min(...lats),
    Math.max(...lngs) - Math.min(...lngs)
  );
  if (range < 0.01) return 14;
  if (range < 0.05) return 13;
  if (range < 0.1) return 12;
  if (range < 0.5) return 11;
  if (range < 1) return 10;
  if (range < 5) return 8;
  if (range < 10) return 7;
  return 5;
}

export function generateThumbnailUrl(places: LatLng[]): string | null {
  const valid = places.filter((p) => p.lat !== 0 && p.lng !== 0);
  if (valid.length === 0) return null;

  const lat = valid.reduce((s, p) => s + p.lat, 0) / valid.length;
  const lng = valid.reduce((s, p) => s + p.lng, 0) / valid.length;
  const zoom = calculateZoom(valid);
  // Limit markers to avoid exceeding URL length limits
  const markers = valid
    .slice(0, 10)
    .map((p) => `${p.lat},${p.lng},ol-marker-blue`)
    .join('|');

  return `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=${zoom}&size=640x360&markers=${markers}`;
}
