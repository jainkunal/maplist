'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useMapStore } from '@/store/useMapStore';
import { dbListToMapList } from '@/lib/mappers';

type Step = 'parsing' | 'geocoding' | 'saving' | 'done' | 'error';

interface StepState {
  parsing: 'pending' | 'active' | 'done';
  geocoding: 'pending' | 'active' | 'done';
  saving: 'pending' | 'active' | 'done';
}

interface ExtractedPlace {
  name: string;
  lat: number;
  lng: number;
  notes: string;
  googlePlaceId?: string;
}

// Carries whether the user can fix the error or it's on us
class CuratingError extends Error {
  constructor(message: string, public kind: 'input' | 'system') {
    super(message);
  }
}

function extractGoogleMapsUrl(input: string): string | null {
  const match = input.match(/https?:\/\/(maps\.app\.goo\.gl\/[^\s]+|(?:www\.)?google\.com\/maps\/[^\s]+)/);
  return match ? match[0] : null;
}

function extractInstagramUrl(input: string): string | null {
  const match = input.match(/https?:\/\/(?:www\.)?instagram\.com\/(?:reel|p)\/[A-Za-z0-9_-]+[^\s]*/);
  return match ? match[0] : null;
}

export default function CuratingPage() {
  const router = useRouter();
  const setLists = useMapStore((state) => state.setLists);
  const lists = useMapStore((state) => state.lists);

  const [progress, setProgress] = useState(0);
  const [geocodedCount, setGeocodedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [statusLabel, setStatusLabel] = useState('Analyzing your list...');
  const [currentStep, setCurrentStep] = useState<Step>('parsing');
  const [steps, setSteps] = useState<StepState>({
    parsing: 'active',
    geocoding: 'pending',
    saving: 'pending',
  });
  const [error, setError] = useState('');
  const [errorKind, setErrorKind] = useState<'input' | 'system'>('input');
  // Places we successfully extracted — preserved so a save-failure doesn't lose the user's work
  const [extractedPlaces, setExtractedPlaces] = useState<ExtractedPlace[]>([]);
  const [listTitle, setListTitle] = useState('New Curated Map');
  const [retrying, setRetrying] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const text = sessionStorage.getItem('curating_input');
    if (!text) {
      router.replace('/create');
      return;
    }

    run(text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save(places: ExtractedPlace[], title: string): Promise<string> {
    const createRes = await fetch('/api/lists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description: 'Generated from text',
        isPublic: false,
        places: places.map((p) => ({
          name: p.name,
          lat: p.lat,
          lng: p.lng,
          notes: p.notes,
          tags: [],
          recommendedBy: '',
          visited: false,
          googlePlaceId: p.googlePlaceId ?? '',
        })),
      }),
    });

    if (!createRes.ok) throw new CuratingError('Failed to save the list.', 'system');
    const newList = await createRes.json();
    setLists([...lists, dbListToMapList(newList)]);
    return newList.id;
  }

  async function retrySave() {
    if (!extractedPlaces.length) return;
    setRetrying(true);
    try {
      const id = await save(extractedPlaces, listTitle);
      sessionStorage.removeItem('curating_input');
      router.push(`/lists/${id}`);
    } catch {
      // stays on error screen — user can try again
    } finally {
      setRetrying(false);
    }
  }

  async function run(text: string) {
    try {
      let rawPlaces: { name: string; lat: number; lng: number; notes?: string; place_id?: string }[] = [];
      let title = 'New Curated Map';

      // --- Step 1: Parsing ---
      setSteps({ parsing: 'active', geocoding: 'pending', saving: 'pending' });
      setProgress(5);
      setStatusLabel('Detecting source type...');

      const gmapsUrl = extractGoogleMapsUrl(text);
      if (gmapsUrl) {
        setStatusLabel('Scraping Google Maps list...');
        setProgress(15);
        const scrapeRes = await fetch('/api/scrape-gmaps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: gmapsUrl }),
        });
        if (!scrapeRes.ok) {
          const errData = await scrapeRes.json().catch(() => ({}));
          throw new CuratingError(
            errData.error === 'Could not extract list ID from URL'
              ? "This Google Maps link doesn't point to a saved list. Open Google Maps → Saved → Lists, then share the list and paste that link."
              : `Google Maps returned an error: ${errData.error ?? 'unknown'}. Try again, or paste the place names as plain text.`,
            errData.error === 'Could not extract list ID from URL' ? 'input' : 'system'
          );
        }
        const data = await scrapeRes.json();
        rawPlaces = data.places ?? [];
        if (data.title) title = data.title;
      }

      if (!rawPlaces.length) {
        const igUrl = extractInstagramUrl(text);
        if (igUrl) {
          setStatusLabel('Scraping Instagram post...');
          setProgress(15);
          let captionContext: string | undefined;
          let imageUrls: string[] = [];
          try {
            const igRes = await fetch('/api/scrape-instagram', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: igUrl }),
            });
            if (igRes.ok) {
              const igData = await igRes.json();
              captionContext = igData.caption || undefined;
              imageUrls = igData.imageUrls || [];
            }
          } catch { /* silent — fall through to extract-places */ }

          setStatusLabel('Extracting places from post...');
          setProgress(25);
          const extractRes = await fetch('/api/extract-places', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, captionContext, imageUrls }),
          });
          if (!extractRes.ok) throw new CuratingError('Our AI couldn\'t read this Instagram post. The post may be private. Try pasting the caption text directly.', 'input');
          const data = await extractRes.json();
          rawPlaces = data.places ?? [];
        }
      }

      if (!rawPlaces.length) {
        setStatusLabel('Parsing places with AI...');
        setProgress(20);
        const extractRes = await fetch('/api/extract-places', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });
        if (!extractRes.ok) throw new CuratingError('Our AI service is temporarily unavailable. Please try again in a moment.', 'system');
        const data = await extractRes.json();
        rawPlaces = data.places ?? [];
      }

      if (!rawPlaces.length) {
        const isInstagram = text.includes('instagram.com');
        throw new CuratingError(
          isInstagram
            ? 'No places found in this Instagram post. It may be private or not mention specific locations. Try pasting the caption text directly.'
            : 'No places were found in your text. Make sure it contains place names, addresses, or landmarks — our AI will do the rest.',
          'input'
        );
      }

      // --- Step 2: Geocoding ---
      setSteps({ parsing: 'done', geocoding: 'active', saving: 'pending' });
      setCurrentStep('geocoding');
      setTotalCount(rawPlaces.length);
      setProgress(35);

      const geocodedPlaces: ExtractedPlace[] = [];
      for (let i = 0; i < rawPlaces.length; i++) {
        const place = rawPlaces[i];
        const done = i + 1;
        setGeocodedCount(done);
        setStatusLabel(`Geocoding ${done} of ${rawPlaces.length} locations`);
        setProgress(35 + Math.round((done / rawPlaces.length) * 45));

        if (place.lat && place.lng) {
          geocodedPlaces.push({ name: place.name, lat: place.lat, lng: place.lng, notes: place.notes || '', googlePlaceId: place.place_id || '' });
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
          } catch {
            console.error(`Failed to geocode ${place.name}`);
          }
        }
      }

      // Stash extracted places in state — if saving fails the user still sees their data
      setExtractedPlaces(geocodedPlaces);
      setListTitle(title);

      // --- Step 3: Saving ---
      setSteps({ parsing: 'done', geocoding: 'done', saving: 'active' });
      setCurrentStep('saving');
      setStatusLabel('Saving your map...');
      setProgress(85);

      const id = await save(geocodedPlaces, title);

      setSteps({ parsing: 'done', geocoding: 'done', saving: 'done' });
      setProgress(100);
      setStatusLabel('Done! Opening your map...');
      setCurrentStep('done');

      sessionStorage.removeItem('curating_input');

      await new Promise((r) => setTimeout(r, 600));
      router.push(`/lists/${id}`);
    } catch (err: unknown) {
      const isCuratingError = err instanceof CuratingError;
      setError(isCuratingError ? err.message : 'Something went wrong on our end. Your extracted places are shown below.');
      setErrorKind(isCuratingError ? err.kind : 'system');
      setCurrentStep('error');
    }
  }

  const stepIcon = (state: 'pending' | 'active' | 'done') => {
    if (state === 'done') return { icon: 'check_circle', color: 'text-emerald-500' };
    if (state === 'active') return { icon: 'pending', color: 'text-blue-500' };
    return { icon: 'circle', color: 'text-slate-400' };
  };

  if (currentStep === 'error') {
    const isSystemError = errorKind === 'system';
    const hasPlaces = extractedPlaces.length > 0;

    return (
      <div className="flex flex-col min-h-[calc(100vh-4rem)]">
        {/* Header */}
        <div className="flex items-center p-4 border-b border-slate-200 bg-white/80 backdrop-blur-md">
          <button
            onClick={() => router.push('/create')}
            className="flex size-10 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h2 className="flex-1 text-center pr-10 text-lg font-bold text-slate-900">MapLists</h2>
        </div>

        <div className="flex flex-1 flex-col px-6 py-8 max-w-sm mx-auto w-full">
          {/* Icon + title */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${isSystemError ? 'bg-amber-50' : 'bg-red-50'}`}>
              <span
                className={`material-symbols-outlined text-3xl ${isSystemError ? 'text-amber-500' : 'text-red-500'}`}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {isSystemError ? 'warning' : 'help'}
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-2">
              {isSystemError ? "Something went wrong on our end" : "We couldn't find any places"}
            </h1>
            <p className="text-slate-500 text-sm leading-relaxed">{error}</p>
          </div>

          {/* System error with extracted places — show the data so it's not lost */}
          {isSystemError && hasPlaces && (
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                Places we found ({extractedPlaces.length})
              </p>
              <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-48 overflow-y-auto">
                {extractedPlaces.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    <span className="material-symbols-outlined text-slate-400 text-base">location_on</span>
                    <span className="text-sm text-slate-700 truncate">{p.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3">
            {isSystemError && hasPlaces && (
              <button
                onClick={retrySave}
                disabled={retrying}
                className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 disabled:bg-blue-400 transition-colors flex items-center justify-center gap-2"
              >
                {retrying
                  ? <><span className="material-symbols-outlined text-base animate-spin">sync</span> Retrying...</>
                  : <><span className="material-symbols-outlined text-base">save</span> Retry saving</>
                }
              </button>
            )}
            {isSystemError && !hasPlaces && (
              <button
                onClick={() => { started.current = false; const text = sessionStorage.getItem('curating_input'); if (text) run(text); }}
                className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-base">refresh</span> Try again
              </button>
            )}
            <button
              onClick={() => router.push('/create')}
              className={`w-full font-semibold py-3 rounded-xl transition-colors ${
                isSystemError
                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isSystemError ? 'Change input' : 'Edit and try again'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const parsingIcon = stepIcon(steps.parsing);
  const geocodingIcon = stepIcon(steps.geocoding);
  const savingIcon = stepIcon(steps.saving);

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] flex-col overflow-hidden bg-slate-50">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex items-center p-4 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <button
          onClick={() => router.push('/create')}
          className="flex size-10 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="flex-1 text-center pr-10 text-lg font-bold text-slate-900">MapLists</h2>
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center py-12">
        <div className="relative mb-10 flex items-center justify-center">
          <div className="absolute w-44 h-44 bg-blue-500/15 rounded-full animate-pulse blur-3xl" />
          <div className="relative w-36 h-36 flex items-center justify-center border-2 border-blue-500/30 rounded-full">
            <div className="absolute inset-0 border-t-2 border-blue-600 rounded-full animate-spin" />
            <span
              className="material-symbols-outlined text-blue-600 text-6xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              explore
            </span>
          </div>
        </div>

        <h1 className="text-2xl font-extrabold text-slate-900 mb-2">Curating your world...</h1>
        <p className="text-slate-500 text-base max-w-xs mx-auto mb-10">
          We&apos;re extracting the best spots from your list and placing them on the map.
        </p>

        <div className="w-full max-w-sm bg-white border border-slate-200 rounded-xl p-6 shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <span className="text-slate-900 font-semibold text-sm truncate pr-2">
              {currentStep === 'done' ? 'All done!' : statusLabel}
            </span>
            <span className="text-blue-600 font-bold text-sm shrink-0">{progress}%</span>
          </div>

          <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden mb-4">
            <div
              className="bg-blue-600 h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center gap-3 text-slate-500">
            {currentStep === 'geocoding' ? (
              <>
                <span className="material-symbols-outlined text-lg animate-spin">sync</span>
                <p className="text-sm font-medium">
                  Geocoding {geocodedCount} of {totalCount} locations
                </p>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-lg animate-spin">sync</span>
                <p className="text-sm font-medium">{statusLabel}</p>
              </>
            )}
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 w-full max-w-xs">
          <div className={`flex items-center gap-3 ${parsingIcon.color}`}>
            <span className={`material-symbols-outlined text-sm ${steps.parsing === 'active' ? 'animate-pulse' : ''}`} style={{ fontVariationSettings: steps.parsing === 'done' ? "'FILL' 1" : "'FILL' 0" }}>
              {parsingIcon.icon}
            </span>
            <span className="text-xs font-medium uppercase tracking-wider">Parsing List Data</span>
          </div>
          <div className={`flex items-center gap-3 ${geocodingIcon.color}`}>
            <span className={`material-symbols-outlined text-sm ${steps.geocoding === 'active' ? 'animate-pulse' : ''}`} style={{ fontVariationSettings: steps.geocoding === 'done' ? "'FILL' 1" : "'FILL' 0" }}>
              {geocodingIcon.icon}
            </span>
            <span className="text-xs font-medium uppercase tracking-wider">Matching Coordinates</span>
          </div>
          <div className={`flex items-center gap-3 ${savingIcon.color}`}>
            <span className={`material-symbols-outlined text-sm ${steps.saving === 'active' ? 'animate-pulse' : ''}`} style={{ fontVariationSettings: steps.saving === 'done' ? "'FILL' 1" : "'FILL' 0" }}>
              {savingIcon.icon}
            </span>
            <span className="text-xs font-medium uppercase tracking-wider">Saving Your Map</span>
          </div>
        </div>
      </div>
    </div>
  );
}
