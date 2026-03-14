import { GoogleGenAI, Type } from '@google/genai';
import { NextResponse } from 'next/server';

const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });

export async function POST(req: Request) {
  try {
    const { text, captionContext } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
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
        responseSchema: {
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
        },
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
