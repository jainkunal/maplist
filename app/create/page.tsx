'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Map, Sparkles } from 'lucide-react';

function CreateMapForm() {
  const searchParams = useSearchParams();
  const [text, setText] = useState(() => {
    const sharedTitle = searchParams.get('title');
    const sharedText = searchParams.get('text');
    const sharedUrl = searchParams.get('url');
    if (sharedTitle || sharedText || sharedUrl) {
      return [sharedTitle, sharedText, sharedUrl].filter(Boolean).join('\n\n');
    }
    // Restore input if the user came back from an error on the curating page
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('curating_input') ?? '';
    }
    return '';
  });
  const [error, setError] = useState('');
  const router = useRouter();

  const handleGenerate = () => {
    const trimmed = text.trim();
    if (!trimmed) {
      setError('Please enter some text to extract places from.');
      return;
    }

    // Detect any URL in the input
    const urlMatch = trimmed.match(/https?:\/\/[^\s]+/);
    if (urlMatch) {
      const url = urlMatch[0].toLowerCase();
      const isGoogleMaps = /maps\.app\.goo\.gl|google\.com\/maps/.test(url);
      const isInstagram = /instagram\.com\/(reel|p)\//.test(url);

      if (!isGoogleMaps && !isInstagram) {
        // Block platforms that require login and can't be scraped
        const isUnsocial =
          /youtube\.com|youtu\.be/.test(url) ||
          /tiktok\.com/.test(url) ||
          /twitter\.com|x\.com/.test(url) ||
          /facebook\.com|fb\.com/.test(url);

        if (isUnsocial) {
          let platform = 'YouTube';
          if (/tiktok\.com/.test(url)) platform = 'TikTok';
          else if (/twitter\.com|x\.com/.test(url)) platform = 'Twitter / X';
          else if (/facebook\.com|fb\.com/.test(url)) platform = 'Facebook';

          fetch('/api/unsupported-links', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: urlMatch[0], platform }),
          }).catch(() => {});

          setError(
            `${platform} isn't supported yet. Try pasting a Google Maps list link, an Instagram post, an article URL, or just plain text with place names.`
          );
          return;
        }
        // All other URLs (articles, blogs, etc.) are supported — fall through
      }
    }

    setError('');
    sessionStorage.setItem('curating_input', trimmed);
    router.push('/curating');
  };

  return (
    <main className="flex-1 flex flex-col items-center px-4 sm:px-6 max-w-2xl mx-auto w-full pb-8 pt-6 sm:pt-8">
      <section className="text-center mb-6 sm:mb-12">
        <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-blue-100 mb-4 sm:mb-6">
          <Map className="text-blue-600 w-7 h-7 sm:w-8 sm:h-8" />
        </div>
        <h1 className="text-2xl sm:text-4xl font-bold tracking-tight mb-2 sm:mb-4">Craft Your Collection</h1>
        <p className="text-slate-500 text-base sm:text-lg max-w-md mx-auto leading-relaxed">
          Paste an article, Google Maps list, Instagram post, or plain text — we'll pull out the places and build your map.
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
              className="relative w-full min-h-[180px] sm:min-h-[320px] rounded-2xl p-4 sm:p-6 bg-white text-base sm:text-lg leading-relaxed focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all border-slate-200 placeholder:text-slate-400"
              placeholder="Paste your list here...&#10;&#10;Try:&#10;• A travel article URL (e.g. nytimes.com/travel/...)&#10;• A Google Maps list link&#10;• An Instagram post link&#10;• Plain text with place names"
            />
          </div>
          <p className="text-xs text-slate-500 px-1 italic">
            Tip: Article URLs work great — paste a "best restaurants in NYC" blog post and we'll map every place.
          </p>
          {error && <p className="text-sm text-red-500 px-1 bg-red-50 p-3 rounded-lg border border-red-100">{error}</p>}
        </div>

        <div className="pt-4">
          <button
            onClick={handleGenerate}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-5 rounded-2xl shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3 transition-all transform active:scale-[0.98]"
          >
            <span className="text-lg">Generate Visual Map</span>
            <Sparkles className="w-6 h-6" />
          </button>
        </div>
      </div>
    </main>
  );
}

export default function CreateMapPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><span className="text-blue-600 text-sm">Loading...</span></div>}>
      <CreateMapForm />
    </Suspense>
  );
}
