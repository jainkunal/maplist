'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMapStore } from '@/store/useMapStore';
import { Map, Sparkles, Loader2 } from 'lucide-react';

function CreateMapForm() {
  const searchParams = useSearchParams();
  const [text, setText] = useState(() => {
    const sharedTitle = searchParams.get('title');
    const sharedText = searchParams.get('text');
    const sharedUrl = searchParams.get('url');
    if (sharedTitle || sharedText || sharedUrl) {
      return [sharedTitle, sharedText, sharedUrl].filter(Boolean).join('\n\n');
    }
    return '';
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const addList = useMapStore((state) => state.addList);
  const addPlace = useMapStore((state) => state.addPlace);

  function extractGoogleMapsUrl(input: string): string | null {
    const match = input.match(/https?:\/\/(maps\.app\.goo\.gl\/[^\s]+|(?:www\.)?google\.com\/maps\/[^\s]+)/);
    return match ? match[0] : null;
  }

  const handleGenerate = async () => {
    if (!text.trim()) {
      setError('Please enter some text to extract places from.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let places: { name: string; lat: number; lng: number; notes?: string }[] = [];
      let listTitle = 'New Curated Map';

      const gmapsUrl = extractGoogleMapsUrl(text);
      if (gmapsUrl) {
        // Use the scraper for Google Maps list links
        const scrapeRes = await fetch('/api/scrape-gmaps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: gmapsUrl }),
        });

        if (scrapeRes.ok) {
          const data = await scrapeRes.json();
          places = data.places ?? [];
          if (data.title) listTitle = data.title;
        }
        // Fall through to Gemini if scraper fails or returns nothing
      }

      if (!places.length) {
        // Fall back to Gemini for plain text or unsupported URLs
        const extractRes = await fetch('/api/extract-places', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });

        if (!extractRes.ok) throw new Error('Failed to extract places from text.');
        const data = await extractRes.json();
        places = data.places ?? [];
      }

      if (!places.length) {
        throw new Error('No places found in the text or URL. If sharing a private list, try pasting the place names directly.');
      }

      // Create a new list
      const listId = addList({
        title: listTitle,
        description: 'Generated from text',
        places: [],
        isPublic: false,
      });

      // Add places — scraped results already have coords, Gemini results need geocoding
      for (const place of places) {
        if (place.lat && place.lng) {
          addPlace(listId, {
            name: place.name,
            lat: place.lat,
            lng: place.lng,
            tags: [],
            notes: place.notes || '',
            recommendedBy: '',
            visited: false,
          });
        } else {
          try {
            const geocodeRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(place.name)}&limit=1`);
            const geocodeData = await geocodeRes.json();
            const coords = geocodeData?.[0];
            addPlace(listId, {
              name: place.name,
              lat: coords ? parseFloat(coords.lat) : 0,
              lng: coords ? parseFloat(coords.lon) : 0,
              tags: [],
              notes: place.notes || '',
              recommendedBy: '',
              visited: false,
            });
          } catch (geocodeError) {
            console.error(`Failed to geocode ${place.name}:`, geocodeError);
          }
        }
      }

      router.push(`/lists/${listId}`);
    } catch (err: any) {
      setError(err.message || 'An error occurred while generating the map.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 flex flex-col items-center px-6 max-w-2xl mx-auto w-full pb-24 pt-8">
      <section className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-100 mb-6">
          <Map className="text-blue-600 w-8 h-8" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-4">Craft Your Collection</h1>
        <p className="text-slate-500 text-lg max-w-md mx-auto leading-relaxed">
          Transform your list of destinations into a premium, interactive map experience.
        </p>
      </section>

      <div className="w-full space-y-8">
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <label className="text-sm font-semibold uppercase tracking-wider text-slate-500">Places List</label>
            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">Smart Detection On</span>
          </div>
          
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-200 to-transparent rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
            <textarea 
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="relative w-full min-h-[320px] rounded-2xl p-6 bg-white text-lg leading-relaxed focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all border-slate-200 placeholder:text-slate-400" 
              placeholder="Paste your list here...&#10;&#10;Example:&#10;1. Eiffel Tower, Paris&#10;2. Louvre Museum&#10;3. Notre Dame Cathedral&#10;4. Sacré-Cœur, Montmartre..."
              disabled={loading}
            />
          </div>
          <p className="text-xs text-slate-500 px-1 italic">
            Tip: You can paste names, addresses, or even messy notes. Our AI will clean it up.
          </p>
          {error && <p className="text-sm text-red-500 px-1 bg-red-50 p-3 rounded-lg border border-red-100">{error}</p>}
        </div>

        <div className="pt-4">
          <button 
            onClick={handleGenerate}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-5 rounded-2xl shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3 transition-all transform active:scale-[0.98]"
          >
            {loading ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="text-lg">Curating your world...</span>
              </>
            ) : (
              <>
                <span className="text-lg">Generate Visual Map</span>
                <Sparkles className="w-6 h-6" />
              </>
            )}
          </button>
        </div>
      </div>
    </main>
  );
}

export default function CreateMapPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>}>
      <CreateMapForm />
    </Suspense>
  );
}
