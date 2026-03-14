import { GoogleGenAI, Type } from '@google/genai';
import { NextResponse } from 'next/server';

const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: `You are an expert travel curator. Extract a list of places from the following text or URL. 
      If a URL is provided (like a Google Maps list or Instagram post), attempt to use your tools to read the content of the URL and extract the places listed in it.
      
      CRITICAL INSTRUCTION: If you cannot access the URL (e.g., due to privacy restrictions, login walls, or insufficient permissions), DO NOT FAIL. Instead, fallback to extracting any place names, cities, or context mentioned directly in the text itself. Often, users share links that contain the place name right in the text (e.g., "Eiffel Tower \\n https://maps.app.goo.gl/...").
      
      For each place, provide its name and any context, notes, or descriptions associated with it.
      
      Text/URL:
      ${text}`,
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
