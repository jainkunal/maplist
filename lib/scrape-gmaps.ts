import https from 'https';
import http from 'http';

function httpGet(url: string): Promise<{ statusCode: number; location: string | null }> {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, (res) => {
      res.resume();
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
  const dataMatch = url.match(/!2s([^!]+)!3e\d/);
  if (dataMatch) return dataMatch[1];
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

type GmapsPlace = { name: string; lat: number; lng: number; address: string; place_id: string; notes: string };

function extractPlaces(placesArray: any[]): GmapsPlace[] {
  const places: GmapsPlace[] = [];
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

function extractList(payload: string): { title: string; places: GmapsPlace[] } {
  let text = payload.trimStart();
  for (const prefix of [")]}'\n", ")]}'", ")]}\n"]) {
    if (text.startsWith(prefix)) { text = text.slice(prefix.length); break; }
  }
  const data = JSON.parse(text);
  const title = (data[0][4] as string) || 'Imported List';
  const rawPlaces = data[0][8];
  // DEBUG: log the first raw entry so we can find the ChIJ place_id field
  if (Array.isArray(rawPlaces) && rawPlaces[0]) {
    console.log('[scrape-gmaps] DEBUG first entry:', JSON.stringify(rawPlaces[0]));
  }
  const places = extractPlaces(Array.isArray(rawPlaces) ? rawPlaces : []);
  return { title, places };
}

export async function scrapeGoogleMapsList(url: string): Promise<{ title: string; places: GmapsPlace[] }> {
  const resolvedUrl = await resolveUrl(url);
  console.log('[scrape-gmaps] Resolved URL:', resolvedUrl);
  const listId = tryExtractListId(resolvedUrl);
  if (!listId) throw new Error('Could not extract list ID from URL');
  const payload = await fetchListPayload(listId);
  return extractList(payload);
}
