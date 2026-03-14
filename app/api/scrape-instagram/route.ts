import { NextResponse } from 'next/server';
import https from 'https';
import http from 'http';

const INSTAGRAM_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache',
};

function httpsGetBody(url: string, hops = 0): Promise<string> {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { headers: INSTAGRAM_HEADERS }, (res) => {
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

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
}

function extractOgDescription(html: string): string {
  const patterns = [
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*?)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']*?)["'][^>]+property=["']og:description["'][^>]*>/i,
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*?)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']*?)["'][^>]+property=["']og:title["'][^>]*>/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return decodeHtmlEntities(m[1].trim());
  }
  return '';
}

// Extract carousel image IDs from the main page relay JSON.
// Returns numeric IDs like "626056612_17949401691091422_3404483742972684671".
// URLs from the main page are IP-signed and inaccessible from outside; we only
// use these IDs to look up the matching embed-page URLs (which are accessible).
function extractCarouselImageIds(html: string): string[] {
  const ids: string[] = [];
  // Main page relay JSON: forward slashes escaped as \/ (single backslash)
  const re = /\/t51\.82787-15\\\/(\d+_[\d_]+)_n\.jpg/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    if (!ids.includes(m[1])) ids.push(m[1]);
  }
  return ids;
}

// Decode a URL extracted from the embed page relay JSON.
// Each / in the URL appears as exactly 3 consecutive backslashes followed by a slash.
function decodeEmbedRelayUrl(s: string): string {
  let result = '';
  let i = 0;
  while (i < s.length) {
    if (s[i] === '\\' && s[i + 1] === '\\' && s[i + 2] === '\\' && s[i + 3] === '/') {
      result += '/';
      i += 4;
    } else if (s[i] === '\\' && s[i + 1] === 'u' && /[0-9a-fA-F]{4}/.test(s.slice(i + 2, i + 6))) {
      result += String.fromCharCode(parseInt(s.slice(i + 2, i + 6), 16));
      i += 6;
    } else {
      result += s[i];
      i++;
    }
  }
  return result;
}

// For each carousel image ID, find its accessible URL in the embed page HTML.
// The embed page returns URLs signed for the embed CDN (instagram.*.fbcdn.net with edm= param)
// which are publicly accessible without session tokens.
function extractEmbedUrls(embedHtml: string, imageIds: string[]): string[] {
  const results: string[] = [];

  for (const imgId of imageIds) {
    const idx = embedHtml.indexOf(imgId);
    if (idx < 0) continue;

    // Walk backwards up to 800 chars to find the 'https:' that starts this URL
    const lookback = embedHtml.slice(Math.max(0, idx - 800), idx);
    const httpsIdx = lookback.lastIndexOf('https:');
    if (httpsIdx < 0) continue;

    const urlStart = Math.max(0, idx - 800) + httpsIdx;
    const frag = embedHtml.slice(urlStart, urlStart + 1200);

    // URL ends at the next quote character
    const endIdx = frag.search(/['"]/);
    const rawUrl = endIdx >= 0 ? frag.slice(0, endIdx) : frag.slice(0, 800);

    // Decode based on encoding context
    let decoded: string;
    if (rawUrl[6] === '\\') {
      // Relay JSON: 3-backslash-per-slash encoding
      decoded = decodeEmbedRelayUrl(rawUrl);
    } else if (rawUrl.includes('&amp;')) {
      // HTML attribute: entity-encoded
      decoded = decodeHtmlEntities(rawUrl);
    } else {
      decoded = rawUrl;
    }

    if (decoded.startsWith('https://')) {
      results.push(decoded);
    }
  }
  return results;
}

async function fetchViaJina(url: string): Promise<string> {
  const res = await fetch(`https://r.jina.ai/${url}`, {
    headers: { 'Accept': 'text/plain' },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`Jina ${res.status}`);
  return (await res.text()).slice(0, 3000).trim();
}

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 });

    // Step 1: Fetch main page → get caption + carousel image IDs
    let caption = '';
    let imageIds: string[] = [];
    try {
      const html = await httpsGetBody(url);
      caption = extractOgDescription(html);
      imageIds = extractCarouselImageIds(html);
      console.log('[scrape-instagram] Main page: caption length:', caption.length, 'image IDs:', imageIds.length);
    } catch (err: any) {
      console.warn('[scrape-instagram] Main page fetch failed:', err.message);
    }

    // Step 2: Fetch embed page → get accessible URLs for all carousel slides
    let imageUrls: string[] = [];
    if (imageIds.length > 0) {
      try {
        const embedUrl = url.replace(/[?#].*/, '').replace(/\/?$/, '/') + 'embed/';
        const embedHtml = await httpsGetBody(embedUrl);
        imageUrls = extractEmbedUrls(embedHtml, imageIds);
        console.log('[scrape-instagram] Embed page: accessible URLs:', imageUrls.length);
      } catch (err: any) {
        console.warn('[scrape-instagram] Embed page fetch failed:', err.message);
      }
    }

    // Step 3: Jina.ai fallback for caption if main page failed
    if (!caption) {
      try {
        caption = await fetchViaJina(url);
        console.log('[scrape-instagram] Jina fallback caption length:', caption.length);
      } catch (err: any) {
        console.warn('[scrape-instagram] Jina fallback failed:', err.message);
      }
    }

    return NextResponse.json({ caption, imageUrls });
  } catch (error: any) {
    console.error('[scrape-instagram] Error:', error.message);
    return NextResponse.json({ caption: '', imageUrls: [] });
  }
}
