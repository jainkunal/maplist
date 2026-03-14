import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });

async function test() {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: `Extract a list of places from the following text or URL. If a URL is provided, use your tools to read the content of the URL and extract the places listed in it. For each place, provide its name and any context or notes associated with it in the text.\n\nText/URL:\nhttps://maps.app.goo.gl/dz3ubTGEjvFNnkTA6`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              notes: { type: Type.STRING },
            },
            required: ['name'],
          },
        },
        tools: [{ googleSearch: {} }, { urlContext: {} }],
      },
    });
    console.log(response.text);
  } catch (error) {
    console.error(error);
  }
}

test();
