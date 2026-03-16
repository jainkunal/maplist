import { NextRequest, NextResponse } from 'next/server';
import https from 'https';
import http from 'http';
import { prisma } from '@/lib/prisma';
import { getUser } from '@/lib/server-auth';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
};

function httpsGetBody(url: string, hops = 0): Promise<string> {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { headers: HEADERS }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        if (hops > 5) return reject(new Error('Too many redirects'));
        const next = res.headers.location.startsWith('http')
          ? res.headers.location
          : new URL(res.headers.location, url).href;
        resolve(httpsGetBody(next, hops + 1));
        return;
      }
      const chunks: Buffer[] = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString()));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(new Error('timeout')); });
  });
}

// Extract a contributor photo URL from Google Maps HTML.
// Photos appear as lh5/lh3.googleusercontent.com/p/... CDN URLs embedded in the page data.
function extractPhotoFromHtml(html: string): string | null {
  // Pattern 1: escaped variant inside JSON blobs — https:\/\/lh5.googleusercontent.com\/p\/...
  const escapedMatches = html.matchAll(/https:\\\/\\\/lh[35]\.googleusercontent\.com\\\/p\\\/([A-Za-z0-9_-]+)/g);
  for (const m of escapedMatches) {
    return `https://lh5.googleusercontent.com/p/${m[1]}=w800-h600-k-no`;
  }

  // Pattern 2: plain variant — https://lh5.googleusercontent.com/p/...
  const plainMatches = html.matchAll(/https:\/\/lh[35]\.googleusercontent\.com\/p\/([A-Za-z0-9_-]+)/g);
  for (const m of plainMatches) {
    return `https://lh5.googleusercontent.com/p/${m[1]}=w800-h600-k-no`;
  }

  return null;
}

// Fetch photo using a known Google Place ID — most reliable, used for Google Maps imports.
async function fetchPhotoByPlaceId(googlePlaceId: string): Promise<string | null> {
  try {
    const html = await httpsGetBody(`https://www.google.com/maps/place/?q=place_id:${googlePlaceId}`);
    return extractPhotoFromHtml(html);
  } catch {
    return null;
  }
}

// Fetch photo by searching Google Maps with place name + coordinates — fallback for Instagram/text imports.
async function fetchPhotoBySearch(name: string, lat: number, lng: number): Promise<string | null> {
  try {
    const query = encodeURIComponent(name);
    // Search near the known coordinates so the first result is the right place
    const html = await httpsGetBody(`https://www.google.com/maps/search/${query}/@${lat},${lng},15z`);
    return extractPhotoFromHtml(html);
  } catch {
    return null;
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: listId } = await params;

  const listOwner = await prisma.list.findUnique({ where: { id: listId }, select: { userId: true } });
  if (!listOwner) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (listOwner.userId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const places = await prisma.place.findMany({
    where: { listId, photoUrl: null },
    select: { id: true, googlePlaceId: true, name: true, lat: true, lng: true },
  });

  if (places.length === 0) {
    return NextResponse.json({ updated: 0 });
  }

  const results = await Promise.allSettled(
    places.map(async (place) => {
      const photoUrl = place.googlePlaceId
        ? await fetchPhotoByPlaceId(place.googlePlaceId)
        : await fetchPhotoBySearch(place.name, place.lat, place.lng);

      if (photoUrl) {
        await prisma.place.update({
          where: { id: place.id },
          data: { photoUrl },
        });
      }
      return { id: place.id, photoUrl };
    })
  );

  const updated = results.filter(
    (r) => r.status === 'fulfilled' && r.value.photoUrl
  ).length;

  console.log(`[fetch-photos] list ${listId}: ${updated}/${places.length} photos fetched`);
  return NextResponse.json({ updated });
}
