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

    // Method A: Direct OG tag scrape
    let caption = '';
    try {
      const html = await httpsGetBody(url);
      caption = extractOgDescription(html);
      console.log('[scrape-instagram] Method A caption length:', caption.length);
    } catch (err: any) {
      console.warn('[scrape-instagram] Method A failed:', err.message);
    }

    // Method B: Jina.ai fallback
    if (!caption) {
      try {
        caption = await fetchViaJina(url);
        console.log('[scrape-instagram] Method B caption length:', caption.length);
      } catch (err: any) {
        console.warn('[scrape-instagram] Method B failed:', err.message);
      }
    }

    return NextResponse.json({ caption });
  } catch (error: any) {
    console.error('[scrape-instagram] Error:', error.message);
    return NextResponse.json({ caption: '' });
  }
}
