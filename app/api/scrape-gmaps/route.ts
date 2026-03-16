import { NextResponse } from 'next/server';
import { scrapeGoogleMapsList } from '@/lib/scrape-gmaps';

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    const { title, places } = await scrapeGoogleMapsList(url);
    if (!places.length) return NextResponse.json({ error: 'No places found in list' }, { status: 404 });
    return NextResponse.json({ title, places });
  } catch (error: any) {
    console.error('[scrape-gmaps] Error:', error.message);
    return NextResponse.json({ error: error.message ?? 'Failed to scrape list' }, { status: 500 });
  }
}
