'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useSession } from '@/lib/auth-client';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Share, Bookmark, MapPin, Navigation, Map, List, User, BookmarkCheck } from 'lucide-react';
import { dbListToMapList } from '@/lib/mappers';
import type { MapList } from '@/store/useMapStore';

const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-slate-200 dark:bg-slate-800 animate-pulse" />,
});

export default function PublicListPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { data: session, isPending: sessionPending } = useSession();

  const [list, setList] = useState<MapList | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/lists/${id}`)
      .then((r) => {
        if (!r.ok) { setNotFound(true); setLoading(false); return null; }
        return r.json();
      })
      .then((data) => {
        if (data) setList(dbListToMapList(data));
        setLoading(false);
      })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [id]);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: list?.title ?? 'MapList', url });
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSave = () => {
    if (!session) {
      router.push(`/login?callbackUrl=/p/${id}`);
      return;
    }
    // Toggle saved state (future: persist to user's saved lists)
    setSaved((s) => !s);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-background-dark">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
          <p className="text-sm text-slate-500">Loading list…</p>
        </div>
      </div>
    );
  }

  if (notFound || !list) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-background-dark px-4 text-center">
        <MapPin className="w-12 h-12 text-slate-300 mb-4" />
        <h1 className="text-2xl font-bold mb-2">List not found</h1>
        <p className="text-slate-500 mb-6">This list may be private or no longer exists.</p>
        <button
          onClick={() => router.push('/')}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm"
        >
          Go to MapLists
        </button>
      </div>
    );
  }

  // Wait for session to resolve before deciding auth state
  const isAuthenticated = !sessionPending && !!session;
  const sessionResolved = !sessionPending;

  return (
    <div
      className="bg-slate-50 dark:bg-background-dark min-h-screen font-[var(--font-plus-jakarta)]"
      style={{ paddingBottom: sessionResolved ? 'calc(5rem + env(safe-area-inset-bottom))' : '0' }}
    >
      {/* Top Nav */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-slate-50/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <Link
            href={isAuthenticated ? '/explore' : '/'}
            className="flex items-center justify-center size-10 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
          >
            <Map className="w-5 h-5" />
          </Link>
          <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">MapLists</span>
        </div>
        <button
          onClick={handleShare}
          className="flex items-center justify-center size-10 rounded-full bg-blue-600/10 text-blue-600 relative"
        >
          <Share className="w-5 h-5" />
          {copied && (
            <span className="absolute -bottom-8 right-0 bg-slate-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
              Copied!
            </span>
          )}
        </button>
      </nav>

      {/* Map */}
      <div className="relative w-full h-[40vh] overflow-hidden">
        <MapComponent places={list.places} />
      </div>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4">
        {/* List Header */}
        <header className="py-8 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 text-blue-600 mb-3">
            <span className="material-symbols-outlined text-sm">stars</span>
            <span className="text-xs font-bold uppercase tracking-widest">Curated List</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3 text-slate-900 dark:text-white">
            {list.title}
          </h1>
          {list.description && (
            <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
              {list.description}
            </p>
          )}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {list.places.length} {list.places.length === 1 ? 'place' : 'places'} in this list
            </p>
            {sessionResolved && isAuthenticated && (
              <button
                onClick={handleSave}
                className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all shadow-lg text-sm ${
                  saved
                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'
                }`}
              >
                {saved ? (
                  <>
                    <BookmarkCheck className="w-5 h-5" />
                    Saved
                  </>
                ) : (
                  <>
                    <Bookmark className="w-5 h-5" />
                    Save to My Lists
                  </>
                )}
              </button>
            )}
          </div>
        </header>

        {/* Places */}
        <section className="py-8 space-y-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
            {list.places.length} {list.places.length === 1 ? 'Place' : 'Places'} in this list
          </h3>

          {list.places.map((place, index) => (
            <article
              key={place.id}
              className="group flex flex-col md:flex-row gap-5 p-4 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="w-full md:w-40 h-40 rounded-xl overflow-hidden shrink-0 bg-blue-50 dark:bg-slate-800 flex items-center justify-center">
                {place.photoUrl ? (
                  <img
                    src={place.photoUrl}
                    alt={place.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-blue-400">
                    <MapPin className="w-10 h-10" />
                    <span className="text-xs font-bold text-blue-500">#{index + 1}</span>
                  </div>
                )}
              </div>
              <div className="flex-1 flex flex-col justify-between py-1">
                <div>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{place.name}</h4>
                  {place.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {place.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded bg-blue-600/10 text-blue-600 text-[10px] font-bold uppercase tracking-wider"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {place.notes && (
                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{place.notes}</p>
                  )}
                </div>
                <div className="mt-4 flex items-center gap-4">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-600/10 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors"
                  >
                    <Navigation className="w-3 h-3" />
                    Open in Maps
                  </a>
                  {place.recommendedBy && (
                    <span className="flex items-center gap-1.5 text-xs text-slate-500">
                      <div className="size-5 rounded-full bg-blue-100 flex items-center justify-center text-[9px] font-bold text-blue-600">
                        {place.recommendedBy.charAt(0).toUpperCase()}
                      </div>
                      {place.recommendedBy}
                    </span>
                  )}
                </div>
              </div>
            </article>
          ))}

          {list.places.length === 0 && (
            <div className="text-center py-16 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
              <MapPin className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No places in this list yet.</p>
            </div>
          )}
        </section>

      </main>

      {/* Sticky bottom bar */}
      {sessionResolved && !isAuthenticated && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-t-2 border-slate-100 dark:border-slate-800 px-5 pt-4 shadow-[0_-8px_24px_rgba(0,0,0,0.08)]"
          style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
        >
          <p className="text-base font-bold text-slate-900 dark:text-white mb-0.5">Want to save this list?</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Join MapLists to save and navigate on your trips.</p>
          <div className="flex gap-3">
            <Link
              href={`/login?callbackUrl=/p/${id}`}
              className="flex-1 bg-blue-600 text-white py-3.5 rounded-xl font-bold text-sm text-center hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
            >
              Sign Up Free
            </Link>
            <Link
              href={`/login?callbackUrl=/p/${id}`}
              className="flex-1 border-2 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white py-3.5 rounded-xl font-bold text-sm text-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Log In
            </Link>
          </div>
        </div>
      )}

      {/* Bottom Nav — only for authenticated users */}
      {sessionResolved && isAuthenticated && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 pt-2"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <Link href="/explore" className="flex flex-1 flex-col items-center justify-center gap-1 py-1 text-slate-400">
            <Map className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Explore</span>
          </Link>
          <Link href="/lists" className="flex flex-1 flex-col items-center justify-center gap-1 py-1 text-slate-400">
            <List className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-wider">My Lists</span>
          </Link>
          <Link href="/profile" className="flex flex-1 flex-col items-center justify-center gap-1 py-1 text-slate-400">
            <User className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Profile</span>
          </Link>
        </div>
      )}
    </div>
  );
}
