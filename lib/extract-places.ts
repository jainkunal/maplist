import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });

const PLACE_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: 'The name of the place.' },
      notes: { type: Type.STRING, description: 'Any notes, context, or recommendations associated with the place from the text or URL.' },
      locationContext: { type: Type.STRING, description: 'The city, district, region, and country where this specific place is located, e.g. "Da Lat, Lam Dong, Vietnam" or "Kuta, Bali, Indonesia". Be as specific as possible.' },
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

export async function generateListDescription(title: string, placeNames: string[]): Promise<string | null> {
  try {
    const placesPreview = placeNames.slice(0, 8).join(', ');
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `Write a concise 5-10 word description for a map list titled "${title}" containing these places: ${placesPreview}. Focus on the vibe, location, or theme. No quotes, no punctuation at end.

Reply with just the description.`,
    });
    const description = response.text?.trim().replace(/^["']|["']$/g, '').trim();
    return description || null;
  } catch {
    return null;
  }
}

export async function generateTitleFromArticle(articleUrl: string, placeNames: string[]): Promise<string | null> {
  try {
    const placesPreview = placeNames.slice(0, 6).join(', ');
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `Given this article URL and the places found in it, suggest a short, catchy title for a saved map list. Max 6 words, no quotes, no punctuation at the end.

Article URL: ${articleUrl}
Places found: ${placesPreview}

Reply with just the title.`,
      config: { tools: [{ urlContext: {} }] },
    });
    const title = response.text?.trim().replace(/^["']|["']$/g, '').trim();
    return title || null;
  } catch {
    return null;
  }
}

export async function generateListTitle(captionContext: string, placeNames: string[]): Promise<string | null> {
  try {
    const placesPreview = placeNames.slice(0, 6).join(', ');
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `Given this Instagram post caption and the places found in it, suggest a short, catchy title for a saved map list. Max 6 words, no quotes, no punctuation at the end.

Caption: ${captionContext.slice(0, 600)}
Places: ${placesPreview}

Reply with just the title.`,
    });
    const title = response.text?.trim().replace(/^["']|["']$/g, '').trim();
    return title || null;
  } catch {
    return null;
  }
}

async function extractPlacesFromImages(imageUrls: string[], captionContext?: string): Promise<{ name: string; notes?: string; locationContext?: string }[]> {
  const imageDataList = await Promise.all(imageUrls.slice(0, 10).map(fetchImageAsBase64));
  const validImages = imageDataList.filter(Boolean) as { mimeType: string; data: string }[];
  if (validImages.length === 0) return [];

  const captionHint = captionContext
    ? `\n\nAdditional context from the post caption (use this to infer the city/region for each place):\n${captionContext}`
    : '';

  const parts: object[] = [
    {
      text: `Look at these Instagram post images. Extract ALL place names, restaurant names, bar names, cafe names, hotel names, landmark names, or any location names that appear as text overlaid on the images or written in the images.

Return ONLY place names that are explicitly visible as text in the images. Do not guess or infer — only return what you can actually read.

If you see numbered lists or bullet points with place names in the images, extract all of them.

For each place, populate locationContext with the specific city, district, region, and country (e.g. "Da Lat, Lam Dong, Vietnam"). Infer it from any visible text, hashtags, or clues in the images AND the caption context below. This is critical for accurate geocoding.${captionHint}`,
    },
    ...validImages.map((img) => ({ inlineData: img })),
  ];

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: [{ role: 'user', parts }],
    config: { responseMimeType: 'application/json', responseSchema: PLACE_SCHEMA },
  });

  return JSON.parse(response.text || '[]');
}

export type RawPlace = { name: string; notes?: string; locationContext?: string; lat?: number; lng?: number; place_id?: string };

export async function extractPlacesFromInput(params: {
  text: string;
  captionContext?: string;
  imageUrls?: string[];
}): Promise<{ places: RawPlace[]; listTitle: string | null }> {
  const { text, captionContext, imageUrls } = params;

  // Vision-based extraction for images
  if (imageUrls?.length) {
    try {
      console.log('[extract-places] Trying vision extraction on', imageUrls.length, 'images');
      const visionPlaces = await extractPlacesFromImages(imageUrls, captionContext);
      if (visionPlaces.length > 0) {
        console.log('[extract-places] Vision extracted', visionPlaces.length, 'places');
        const listTitle = captionContext
          ? await generateListTitle(captionContext, visionPlaces.map(p => p.name))
          : null;
        return { places: visionPlaces, listTitle };
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
    model: 'gemini-2.5-pro',
    contents: `You are an expert travel curator. Extract a list of places from the following text or URL.

      STEP 1: If the input contains a URL, first try to access it directly using urlContext.

      STEP 2: If the URL is from Instagram, TikTok, YouTube, or another social media platform that requires login, DO NOT give up. Instead, use googleSearch to search for the content. For example:
      - For Instagram reels/posts: search for the reel/post ID or URL to find the caption and tagged places
      - Try queries like: site:instagram.com [post-id] places OR "[post-id]" instagram places restaurants
      - Also try searching for the username and common travel terms if visible in the URL

      STEP 3: If you still cannot find specific places via search, extract any place names, cities, or context mentioned directly in the text itself.

      CRITICAL: DO NOT return an empty list. If you truly cannot find any places, return at minimum the city or region you can infer from any context clues.

      For each place, provide its name, any context/notes, and a locationContext with the specific city, district, region, and country where that individual place is located. Each place may be in a different city or country — infer from any available clues (post caption, hashtags, place names themselves, etc.).

      Text/URL:
      ${promptInput}`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: PLACE_SCHEMA,
      tools: [{ googleSearch: {} }, { urlContext: {} }],
    },
  });

  const places = JSON.parse(response.text || '[]');
  const listTitle = captionContext && places.length > 0
    ? await generateListTitle(captionContext, places.map((p: { name: string }) => p.name))
    : null;
  return { places, listTitle };
}
