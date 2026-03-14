'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMapStore } from '@/store/useMapStore';
import { dbListToMapList } from '@/lib/mappers';
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
  const setLists = useMapStore((state) => state.setLists);
  const lists = useMapStore((state) => state.lists);

  function extractGoogleMapsUrl(input: string): string | null {
    const match = input.match(/https?:\/\/(maps\.app\.goo\.gl\/[^\s]+|(?:www\.)?google\.com\/maps\/[^\s]+)/);
    return match ? match[0] : null;
  }

  function extractInstagramUrl(input: string): string | null {
    const match = input.match(/https?:\/\/(?:www\.)?instagram\.com\/(?:reel|p)\/[A-Za-z0-9_-]+[^\s]*/);
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
      let rawPlaces: { name: string; lat: number; lng: number; notes?: string }[] = [];
      let listTitle = 'New Curated Map';

      const gmapsUrl = extractGoogleMapsUrl(text);
      if (gmapsUrl) {
        const scrapeRes = await fetch('/api/scrape-gmaps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: gmapsUrl }),
        });

        if (scrapeRes.ok) {
          const data = await scrapeRes.json();
          rawPlaces = data.places ?? [];
          if (data.title) listTitle = data.title;
        }
      }

      if (!rawPlaces.length) {
        const igUrl = extractInstagramUrl(text);
        if (igUrl) {
          let captionContext: string | undefined;
          try {
            const igRes = await fetch('/api/scrape-instagram', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: igUrl }),
            });
            if (igRes.ok) {
              const igData = await igRes.json();
              captionContext = igData.caption || undefined;
            }
          } catch { /* silent fallthrough */ }

          const extractRes = await fetch('/api/extract-places', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, captionContext }),
          });
          if (!extractRes.ok) throw new Error('Failed to extract places from Instagram post.');
          const data = await extractRes.json();
          rawPlaces = data.places ?? [];
        }
      }

      if (!rawPlaces.length) {
        const extractRes = await fetch('/api/extract-places', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });

        if (!extractRes.ok) throw new Error('Failed to extract places from text.');
        const data = await extractRes.json();
        rawPlaces = data.places ?? [];
      }

      if (!rawPlaces.length) {
        const isInstagram = text.includes('instagram.com');
        const isSocialMedia = isInstagram || text.includes('tiktok.com') || text.includes('youtube.com');
        const hint = isInstagram
          ? 'No places found in this Instagram post. The reel may be private or may not mention specific places. Try pasting the caption text directly.'
          : isSocialMedia
          ? 'No places found. Social media posts may require login. Try pasting the caption or place names from the post.'
          : 'No places found. Try pasting the place names or caption text directly.';
        throw new Error(hint);
      }

      // Geocode places that are missing coordinates
      const geocodedPlaces: { name: string; lat: number; lng: number; notes: string }[] = [];
      for (const place of rawPlaces) {
        if (place.lat && place.lng) {
          geocodedPlaces.push({ name: place.name, lat: place.lat, lng: place.lng, notes: place.notes || '' });
        } else {
          try {
            const geocodeRes = await fetch('/api/geocode', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: place.name }),
            });
            const coords = await geocodeRes.json();
            if (coords.lat || coords.lng) {
              geocodedPlaces.push({ name: place.name, lat: coords.lat, lng: coords.lng, notes: place.notes || '' });
            }
          } catch (geocodeError) {
            console.error(`Failed to geocode ${place.name}:`, geocodeError);
          }
        }
      }

      // Save the list + all places to the database in one request
      const createRes = await fetch('/api/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: listTitle,
          description: 'Generated from text',
          isPublic: false,
          places: geocodedPlaces.map((p) => ({
            name: p.name,
            lat: p.lat,
            lng: p.lng,
            notes: p.notes,
            tags: [],
            recommendedBy: '',
            visited: false,
          })),
        }),
      });

      if (!createRes.ok) throw new Error('Failed to save the list.');
      const newList = await createRes.json();

      // Hydrate local store
      setLists([...lists, dbListToMapList(newList)]);

      router.push(`/lists/${newList.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred while generating the map.');
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
