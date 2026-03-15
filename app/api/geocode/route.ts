import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });

async function geocodeViaNominatim(name: string, context?: string): Promise<{ lat: number; lng: number } | null> {
  const query = context ? `${name}, ${context}` : name;
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
  const res = await fetch(url, { headers: { 'User-Agent': 'MapList/1.0' } });
  if (!res.ok) return null;
  const data = await res.json();
  const hit = data?.[0];
  if (!hit?.lat || !hit?.lon) return null;
  return { lat: parseFloat(hit.lat), lng: parseFloat(hit.lon) };
}

async function geocodeViaGemini(name: string, context?: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const contextHint = context ? ` This place is located in ${context}.` : '';
    // Ask Gemini to describe where the place is located so we can geocode the description
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `Search for "${name}".${contextHint} Tell me the nearest city, town, or district it is located in. Reply with ONLY a short location string suitable for geocoding, like "Sidemen, Karangasem, Bali" or "Nusa Penida, Klungkung, Bali". No other text.`,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });
    const rawText = response.text?.trim() ?? '';
    console.log('[geocode] Gemini raw:', rawText);
    // Extract last line that looks like a geocodable location (e.g. "Nusa Dua, Badung, Bali")
    // Try each line from last to first, pick the first that contains a comma
    const lines = rawText.split('\n').map(l => l.replace(/^[-*\d.\s]+/, '').trim()).filter(Boolean);
    const locationText = lines.reverse().find(l => l.includes(',')) ?? lines[0] ?? '';
    console.log('[geocode] Extracted location:', JSON.stringify(locationText));
    if (!locationText) return null;
    return geocodeViaNominatim(locationText);
  } catch (e: any) {
    console.error('[geocode] Gemini error:', e.message);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const { name, context } = await req.json();
    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });

    const nominatim = await geocodeViaNominatim(name, context);
    if (nominatim) return NextResponse.json(nominatim);

    const gemini = await geocodeViaGemini(name, context);
    if (gemini) return NextResponse.json(gemini);

    return NextResponse.json({ lat: 0, lng: 0 });
  } catch (error: any) {
    console.error('[geocode] Error:', error.message);
    return NextResponse.json({ lat: 0, lng: 0 });
  }
}
