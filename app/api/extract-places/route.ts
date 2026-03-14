import { GoogleGenAI, Type } from '@google/genai';
import { NextResponse } from 'next/server';

const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });

const PLACE_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      name: {
        type: Type.STRING,
        description: 'The name of the place.',
      },
      notes: {
        type: Type.STRING,
        description: 'Any notes, context, or recommendations associated with the place from the text or URL.',
      },
    },
    required: ['name'],
  },
};

async function fetchImageAsBase64(url: string): Promise<{ mimeType: string; data: string } | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const mimeType = contentType.split(';')[0].trim();
    if (!mimeType.startsWith('image/')) return null;
    const buffer = await res.arrayBuffer();
    const data = Buffer.from(buffer).toString('base64');
    return { mimeType, data };
  } catch {
    return null;
  }
}

async function extractPlacesFromImages(imageUrls: string[]): Promise<{ name: string; notes?: string }[]> {
  const imageDataList = await Promise.all(imageUrls.slice(0, 10).map(fetchImageAsBase64));
  const validImages = imageDataList.filter(Boolean) as { mimeType: string; data: string }[];

  if (validImages.length === 0) return [];

  const parts: object[] = [
    {
      text: `Look at these Instagram post images. Extract ALL place names, restaurant names, bar names, cafe names, hotel names, landmark names, or any location names that appear as text overlaid on the images or written in the images.

Return ONLY place names that are explicitly visible as text in the images. Do not guess or infer — only return what you can actually read.

If you see numbered lists or bullet points with place names in the images, extract all of them.`,
    },
    ...validImages.map((img) => ({ inlineData: img })),
  ];

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: [{ role: 'user', parts }],
    config: {
      responseMimeType: 'application/json',
      responseSchema: PLACE_SCHEMA,
    },
  });

  return JSON.parse(response.text || '[]');
}

export async function POST(req: Request) {
  try {
    const { text, captionContext, imageUrls } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // If we have image URLs, try vision-based extraction first
    if (imageUrls?.length) {
      try {
        console.log('[extract-places] Trying vision extraction on', imageUrls.length, 'images');
        const visionPlaces = await extractPlacesFromImages(imageUrls);
        if (visionPlaces.length > 0) {
          console.log('[extract-places] Vision extracted', visionPlaces.length, 'places');
          return NextResponse.json({ places: visionPlaces });
        }
        console.log('[extract-places] Vision found no places, falling through to text extraction');
      } catch (err: any) {
        console.warn('[extract-places] Vision extraction failed:', err.message);
      }
    }

    const promptInput = captionContext
      ? `The following is caption/description text extracted from: ${text}\n\nCaption text:\n${captionContext}`
      : text;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: `You are an expert travel curator. Extract a list of places from the following text or URL.

      STEP 1: If the input contains a URL, first try to access it directly using urlContext.

      STEP 2: If the URL is from Instagram, TikTok, YouTube, or another social media platform that requires login, DO NOT give up. Instead, use googleSearch to search for the content. For example:
      - For Instagram reels/posts: search for the reel/post ID or URL to find the caption and tagged places
      - Try queries like: site:instagram.com [post-id] places OR "[post-id]" instagram places restaurants
      - Also try searching for the username and common travel terms if visible in the URL

      STEP 3: If you still cannot find specific places via search, extract any place names, cities, or context mentioned directly in the text itself.

      CRITICAL: DO NOT return an empty list. If you truly cannot find any places, return at minimum the city or region you can infer from any context clues.

      For each place, provide its name and any context, notes, or descriptions associated with it.

      Text/URL:
      ${promptInput}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: PLACE_SCHEMA,
        tools: [{ googleSearch: {} }, { urlContext: {} }],
      },
    });

    const places = JSON.parse(response.text || '[]');
    return NextResponse.json({ places });
  } catch (error) {
    console.error('Error extracting places:', error);
    return NextResponse.json({ error: 'Failed to extract places' }, { status: 500 });
  }
}
