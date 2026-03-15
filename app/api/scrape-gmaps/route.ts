import { NextResponse } from 'next/server';
import https from 'https';
import http from 'http';

// Use Node's http/https modules — unlike fetch, they don't inject Sec-Fetch-* headers.
// Google varies its response on those headers: browsers get a JS page, plain clients get a 302.
function httpGet(url: string): Promise<{ statusCode: number; location: string | null }> {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, (res) => {
      res.resume(); // drain body so socket is reused
      resolve({
        statusCode: res.statusCode ?? 0,
        location: Array.isArray(res.headers.location)
          ? res.headers.location[0]
          : (res.headers.location ?? null),
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(new Error('timeout')); });
  });
}

function tryExtractListId(url: string): string | null {
  // Format 1: data blob  →  !2s{LIST_ID}!3eN  (N varies: 1, 3, etc.)
  const dataMatch = url.match(/!2s([^!]+)!3e\d/);
  if (dataMatch) return dataMatch[1];

  // Format 2: /maps/placelists/list/{LIST_ID}
  const listMatch = url.match(/\/maps\/placelists\/list\/([^/?&#\s"'<]+)/);
  if (listMatch) return listMatch[1];

  return null;
}

async function resolveUrl(url: string): Promise<string> {
  let current = url;
  for (let hop = 0; hop < 8; hop++) {
    const { statusCode, location } = await httpGet(current);
    if (statusCode >= 300 && statusCode < 400 && location) {
      current = location.startsWith('http') ? location : new URL(location, current).href;
      if (tryExtractListId(current)) return current;
    } else {
      break;
    }
  }
  return current;
}

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

async function fetchListPayload(listId: string): Promise<string> {
  const pageUrl = `https://www.google.com/maps/placelists/list/${listId}`;
  const html = await httpsGetBody(pageUrl);

  const match = html.match(/href="(\/maps\/preview\/entitylist\/getlist[^"]+)"/);
  if (!match) throw new Error('Could not find entitylist API URL in page HTML');

  const apiPath = match[1].replace(/&amp;/g, '&');
  const apiUrl = `https://www.google.com${apiPath}`;

  return httpsGetBody(apiUrl);
}

function extractList(payload: string): { title: string; places: ReturnType<typeof extractPlaces> } {
  let text = payload.trimStart();
  for (const prefix of [")]}'\n", ")]}'", ")]}\n"]) {
    if (text.startsWith(prefix)) {
      text = text.slice(prefix.length);
      break;
    }
  }

  const data = JSON.parse(text);
  const title = (data[0][4] as string) || 'Imported List';
  const places = extractPlaces(data[0][8]);
  return { title, places };
}

function extractPlaces(placesArray: any[]) {
  const places = [];

  for (const entry of placesArray) {
    try {
      const loc = entry[1];
      if (!loc) continue;

      const coords = loc[5];
      if (!coords || coords.length < 4 || coords[2] == null) continue;

      const ids = loc[6] ?? [];

      places.push({
        name: entry[2] as string,
        lat: coords[2] as number,
        lng: coords[3] as number,
        address: loc[4] ?? '',
        place_id: ids[0] ?? '',
        notes: entry[3] ?? '',
      });
    } catch {
      continue;
    }
  }

  return places;
}

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 });

    const resolvedUrl = await resolveUrl(url);
    console.log('[scrape-gmaps] Resolved URL:', resolvedUrl);

    const listId = tryExtractListId(resolvedUrl);
    if (!listId) throw new Error('Could not extract list ID from URL');

    const payload = await fetchListPayload(listId);
    const { title, places } = extractList(payload);

    if (!places.length) {
      return NextResponse.json({ error: 'No places found in list' }, { status: 404 });
    }

    return NextResponse.json({ title, places });
  } catch (error: any) {
    console.error('[scrape-gmaps] Error:', error.message);
    return NextResponse.json({ error: error.message ?? 'Failed to scrape list' }, { status: 500 });
  }
}
