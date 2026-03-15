'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Map, Search, Compass, TrendingUp, Clock, MapPin, ChevronDown } from 'lucide-react';
import PWAInstallCard from '../components/PWAInstallCard';

const MiniMap = dynamic(() => import('@/components/MiniMap'), { ssr: false });

type ExplorePlace = { id: string; lat: number; lng: number };

type ExploreList = {
  id: string;
  title: string;
  description: string;
  thumbnailUrl?: string | null;
  createdAt: string;
  places: ExplorePlace[];
  user?: { name?: string | null; image?: string | null } | null;
};

type ExploreResponse = {
  lists: ExploreList[];
  total: number;
  page: number;
  totalPages: number;
};

const SORT_OPTIONS = [
  { value: 'recent', label: 'Latest', icon: Clock },
  { value: 'popular', label: 'Most Places', icon: TrendingUp },
] as const;

type Sort = (typeof SORT_OPTIONS)[number]['value'];

export default function ExplorePage() {
  const [lists, setLists] = useState<ExploreList[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sort, setSort] = useState<Sort>('recent');
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q), 400);
    return () => clearTimeout(timer);
  }, [q]);

  const fetchLists = useCallback(
    async (currentPage: number, append: boolean) => {
      if (currentPage === 1) setLoading(true);
      else setLoadingMore(true);

      try {
        const params = new URLSearchParams({
          page: String(currentPage),
          sort,
          ...(debouncedQ ? { q: debouncedQ } : {}),
        });
        const res = await fetch(`/api/explore?${params}`);
        const data: ExploreResponse = await res.json();
        setLists((prev) => (append ? [...prev, ...data.lists] : data.lists));
        setTotal(data.total);
        setPage(data.page);
        setTotalPages(data.totalPages);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [sort, debouncedQ]
  );

  // Reset and refetch when sort or search changes
  useEffect(() => {
    fetchLists(1, false);
  }, [fetchLists]);

  const handleLoadMore = () => {
    fetchLists(page + 1, true);
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-slate-50 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center bg-white/80 backdrop-blur-md px-4 py-4 justify-between border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Map className="text-blue-600 w-8 h-8" />
          <h1 className="text-slate-900 text-xl font-extrabold tracking-tight">MapLists</h1>
        </div>
        <Link
          href="/lists"
          className="text-blue-600 text-sm font-bold hover:underline"
        >
          My Lists
        </Link>
      </header>

      {/* Search Section */}
      <section className="px-4 pt-6 pb-2 max-w-5xl mx-auto w-full">
        <div className="flex flex-col gap-1 mb-6">
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Find your next <span className="text-blue-600">adventure.</span>
          </h2>
          <p className="text-slate-500 font-medium">Discover curated maps from around the world.</p>
        </div>

        <label className="group flex flex-col w-full relative">
          <div className="flex w-full items-center rounded-xl h-14 bg-white border border-slate-200 focus-within:border-blue-600/50 focus-within:ring-2 focus-within:ring-blue-600/20 transition-all duration-300 shadow-sm">
            <div className="text-slate-400 flex items-center justify-center pl-4">
              <Search className="w-5 h-5" />
            </div>
            <input
              className="form-input flex w-full border-none bg-transparent focus:outline-0 focus:ring-0 h-full placeholder:text-slate-400 px-3 text-base font-medium"
              placeholder="Search list names or descriptions..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </label>
      </section>

      {/* Sort Filters */}
      <div className="flex gap-3 px-4 py-4 overflow-x-auto no-scrollbar max-w-5xl mx-auto w-full">
        {SORT_OPTIONS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => setSort(value)}
            className={`flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-full px-5 transition-colors ${
              sort === value
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'bg-white border border-slate-200 hover:border-blue-600/30 text-slate-700'
            }`}
          >
            <Icon className="w-4 h-4" />
            <p className="text-sm font-semibold">{label}</p>
          </button>
        ))}
        <button className="flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-full bg-white px-5 border border-slate-200 hover:border-blue-600/30 transition-colors text-slate-700">
          <Compass className="w-4 h-4 text-slate-500" />
          <p className="text-sm font-semibold">Explore All</p>
        </button>
      </div>

      {/* PWA Install Card */}
      <div className="px-4 max-w-5xl mx-auto w-full">
        <PWAInstallCard />
      </div>

      {/* Results Section */}
      <section className="mt-2 max-w-5xl mx-auto w-full px-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-900">
            {debouncedQ ? `Results for "${debouncedQ}"` : sort === 'popular' ? 'Most Places' : 'Latest Maps'}
          </h2>
          {!loading && (
            <span className="text-sm text-slate-500 font-medium">{total} {total === 1 ? 'list' : 'lists'}</span>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-slate-200 animate-pulse h-64" />
            ))}
          </div>
        ) : lists.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <MapPin className="w-12 h-12 text-slate-300 mb-4" />
            <p className="text-lg font-bold text-slate-700 mb-2">No public lists yet</p>
            <p className="text-slate-500 text-sm mb-6">
              {debouncedQ ? 'Try a different search term.' : 'Be the first to publish a curated map!'}
            </p>
            <Link
              href="/create"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-full font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
            >
              <Map className="w-5 h-5" />
              Create Your Map
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {lists.map((list) => {
                const validPlaces = list.places.filter((p) => p.lat !== 0 && p.lng !== 0);
                const authorInitial = list.user?.name?.charAt(0).toUpperCase() ?? '?';

                return (
                  <Link
                    key={list.id}
                    href={`/p/${list.id}`}
                    className="group flex flex-col bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200 hover:shadow-md hover:border-blue-200 transition-all"
                  >
                    {/* Thumbnail / Mini Map */}
                    <div className="relative aspect-video overflow-hidden bg-slate-100 flex items-center justify-center">
                      {validPlaces.length > 0 ? (
                        <MiniMap places={validPlaces} />
                      ) : (
                        <MapPin className="w-10 h-10 text-slate-300" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent pointer-events-none" />
                      <span className="absolute bottom-3 left-3 text-white text-xs font-bold bg-black/40 backdrop-blur-sm px-2 py-1 rounded-full">
                        {list.places.length} {list.places.length === 1 ? 'place' : 'places'}
                      </span>
                    </div>

                    {/* Card Body */}
                    <div className="p-4 flex flex-col flex-1">
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug mb-1 line-clamp-2">
                        {list.title}
                      </h3>
                      {list.description && (
                        <p className="text-sm text-slate-500 line-clamp-2 mb-3">{list.description}</p>
                      )}
                      <div className="mt-auto flex items-center justify-between pt-3 border-t border-slate-100">
                        <div className="flex items-center gap-2">
                          <div className="size-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600">
                            {authorInitial}
                          </div>
                          <span className="text-xs text-slate-500 font-medium truncate max-w-[100px]">
                            {list.user?.name ?? 'Anonymous'}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400">
                          {new Date(list.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Load More */}
            {page < totalPages && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="flex items-center gap-2 px-6 py-3 rounded-full bg-white border border-slate-200 text-slate-700 font-semibold hover:border-blue-600/30 hover:text-blue-600 transition-colors shadow-sm disabled:opacity-60"
                >
                  {loadingMore ? (
                    <div className="w-4 h-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                  Load more
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* CTA */}
      <section className="mt-10 px-4 max-w-5xl mx-auto w-full">
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 text-center">
          <h3 className="text-xl font-bold text-slate-900 mb-2">Have a list of places?</h3>
          <p className="text-slate-600 mb-6">
            Turn your text notes, WhatsApp messages, or Reddit finds into a beautiful interactive map.
          </p>
          <Link
            href="/create"
            className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-full font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
          >
            <Map className="w-5 h-5" />
            Create Your Map
          </Link>
        </div>
      </section>
    </div>
  );
}
