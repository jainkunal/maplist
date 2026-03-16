import { NextResponse } from 'next/server';
import { extractPlacesFromInput } from '@/lib/extract-places';

export async function POST(req: Request) {
  try {
    const { text, captionContext, imageUrls } = await req.json();
    if (!text) return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    const result = await extractPlacesFromInput({ text, captionContext, imageUrls });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error extracting places:', error);
    return NextResponse.json({ error: 'Failed to extract places' }, { status: 500 });
  }
}
