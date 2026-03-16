import { NextResponse } from 'next/server';
import { scrapeInstagramPost } from '@/lib/scrape-instagram';

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    const { caption, imageUrls } = await scrapeInstagramPost(url);
    return NextResponse.json({ caption, imageUrls });
  } catch (error: any) {
    console.error('[scrape-instagram] Error:', error.message);
    return NextResponse.json({ caption: '', imageUrls: [] });
  }
}
