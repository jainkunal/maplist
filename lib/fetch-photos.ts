import https from 'https';
import http from 'http';
import { prisma } from './prisma';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept': 'application/json,text/html,*/*;q=0.8',
};

// JSON GET — follows redirects, returns parsed JSON.
function jsonGet(url: string, hops = 0): Promise<any> {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { headers: HEADERS }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        if (hops > 5) return reject(new Error('Too many redirects'));
        const next = res.headers.location.startsWith('http')
          ? res.headers.location
          : new URL(res.headers.location, url).href;
        resolve(jsonGet(next, hops + 1));
        return;
      }
      const chunks: Buffer[] = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
        catch { resolve(null); }
      });
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(new Error('timeout')); });
  });
}

// HEAD/GET without following redirects — used to capture the CDN redirect from the Places Photo API.
function headNoFollow(url: string): Promise<{ statusCode: number; location: string | null }> {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: 'HEAD', headers: HEADERS }, (res) => {
      res.resume();
      resolve({
        statusCode: res.statusCode ?? 0,
        location: Array.isArray(res.headers.location)
          ? res.headers.location[0]
          : (res.headers.location ?? null),
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(new Error('timeout')); });
    req.end();
  });
}

// ── Google Places API (Legacy) ────────────────────────────────────────────────

// Get the first photo_reference for a place by its Google Place ID or CID.
async function fetchPhotoRefByPlaceId(googlePlaceId: string, apiKey: string): Promise<string | null> {
  // Numeric-only IDs are CIDs; standard place IDs are alphanumeric (ChIJ…)
  const param = /^\d+$/.test(googlePlaceId) ? `cid=${googlePlaceId}` : `place_id=${googlePlaceId}`;
  const data = await jsonGet(
    `https://maps.googleapis.com/maps/api/place/details/json?${param}&fields=photos&key=${apiKey}`
  );
  if (data?.status !== 'OK') {
    console.warn(`[fetch-photos] place/details status=${data?.status} error=${data?.error_message ?? ''} id=${googlePlaceId}`);
  }
  return data?.result?.photos?.[0]?.photo_reference ?? null;
}

// Get the first photo_reference by searching for the place by name near coordinates.
async function fetchPhotoRefBySearch(name: string, lat: number, lng: number, apiKey: string): Promise<string | null> {
  const input = encodeURIComponent(name);
  const data = await jsonGet(
    `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${input}&inputtype=textquery&locationbias=point:${lat},${lng}&fields=photos&key=${apiKey}`
  );
  if (data?.status !== 'OK') {
    console.warn(`[fetch-photos] findplacefromtext status=${data?.status} error=${data?.error_message ?? ''} name=${name}`);
  }
  return data?.candidates?.[0]?.photos?.[0]?.photo_reference ?? null;
}

// Exchange a photo_reference for the actual CDN image URL by following the Places Photo redirect.
async function photoRefToCdnUrl(photoReference: string, apiKey: string): Promise<string | null> {
  const url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoReference}&key=${apiKey}`;
  const { statusCode, location } = await headNoFollow(url);
  if ((statusCode === 301 || statusCode === 302) && location) return location;
  console.warn(`[fetch-photos] photo redirect got statusCode=${statusCode} (expected 301/302)`);
  return null;
}

async function fetchPhotoUrl(
  googlePlaceId: string | null,
  name: string,
  lat: number,
  lng: number,
  apiKey: string,
): Promise<string | null> {
  try {
    // Try place/details with the stored ID first (works for both ChIJ… place IDs
    // and numeric CIDs from the entitylist), then fall back to text search.
    let ref: string | null = null;
    if (googlePlaceId) ref = await fetchPhotoRefByPlaceId(googlePlaceId, apiKey);
    if (!ref) ref = await fetchPhotoRefBySearch(name, lat, lng, apiKey);
    if (!ref) return null;
    return await photoRefToCdnUrl(ref, apiKey);
  } catch (err: any) {
    console.warn(`[fetch-photos] error fetching photo for "${name}": ${err?.message ?? err}`);
    return null;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

// Fetch and save photos for all places in a list that don't have one yet.
// Requires GOOGLE_MAPS_API_KEY to be set (Google Places API, Legacy).
export async function fetchPhotosForList(listId: string): Promise<number> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.warn('[fetch-photos] GOOGLE_MAPS_API_KEY not set — skipping photo fetch');
    return 0;
  }

  const places = await prisma.place.findMany({
    where: { listId, photoUrl: null },
    select: { id: true, googlePlaceId: true, name: true, lat: true, lng: true },
  });

  if (places.length === 0) return 0;

  const results = await Promise.allSettled(
    places.map(async (place) => {
      const photoUrl = await fetchPhotoUrl(
        place.googlePlaceId || null,
        place.name,
        place.lat,
        place.lng,
        apiKey,
      );
      if (photoUrl) {
        await prisma.place.update({ where: { id: place.id }, data: { photoUrl } });
      }
      return { id: place.id, photoUrl };
    })
  );

  const updated = results.filter(
    (r) => r.status === 'fulfilled' && r.value.photoUrl
  ).length;

  console.log(`[fetch-photos] list ${listId}: ${updated}/${places.length} photos fetched`);
  return updated;
}
