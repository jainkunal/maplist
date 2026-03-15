'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useMapStore } from '@/store/useMapStore';
import { dbListToMapList } from '@/lib/mappers';
import Link from 'next/link';
import { Map as MapIcon, Search, Share, Lock, Globe, Plus, DollarSign, Bookmark } from 'lucide-react';
import type { MapList } from '@/store/useMapStore';

const MiniMap = dynamic(() => import('@/components/MiniMap'), { ssr: false });

type Tab = 'created' | 'saved';

export default function ListsPage() {
  const lists = useMapStore((state) => state.lists);
  const setLists = useMapStore((state) => state.setLists);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('created');
  const [savedLists, setSavedLists] = useState<MapList[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);

  useEffect(() => {
    fetch('/api/lists')
      .then((r) => r.json())
      .then((data) => {
        setLists(data.map(dbListToMapList));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [setLists]);

  useEffect(() => {
    if (tab !== 'saved') return;
    setSavedLoading(true);
    fetch('/api/lists?saved=true')
      .then((r) => r.json())
      .then((data) => {
        setSavedLists(data.map(dbListToMapList));
        setSavedLoading(false);
      })
      .catch(() => setSavedLoading(false));
  }, [tab]);

  return (
    <div className="bg-slate-50 pb-6">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="flex items-center justify-between p-4 max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg text-white">
              <MapIcon className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">My Lists</h1>
          </div>
        </div>

        <div className="flex border-b border-slate-200 px-4 max-w-5xl mx-auto">
          <button
            onClick={() => setTab('created')}
            className={`flex flex-col items-center justify-center border-b-2 px-4 pb-3 pt-4 font-semibold text-sm ${tab === 'created' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            Created
          </button>
          <button
            onClick={() => setTab('saved')}
            className={`flex items-center gap-1.5 border-b-2 px-4 pb-3 pt-4 font-semibold text-sm ${tab === 'saved' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            Saved
          </button>
        </div>
      </header>

      <main className="p-4 max-w-5xl mx-auto">
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search your maps..."
              className="w-full bg-slate-100 border-none rounded-xl py-3 pl-11 pr-4 focus:ring-2 focus:ring-blue-600 text-base"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(tab === 'created' ? loading : savedLoading) && Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-col bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200 animate-pulse">
              <div className="aspect-video bg-slate-200" />
              <div className="p-4 space-y-3">
                <div className="h-5 bg-slate-200 rounded w-3/4" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
                <div className="pt-3 border-t border-slate-100 flex justify-between">
                  <div className="h-3 bg-slate-100 rounded w-1/4" />
                  <div className="h-3 bg-slate-100 rounded w-1/5" />
                </div>
              </div>
            </div>
          ))}

          {!(tab === 'created' ? loading : savedLoading) && (tab === 'created' ? lists : savedLists).map((list) => (
            <Link href={tab === 'saved' ? `/p/${list.id}` : `/lists/${list.id}`} key={list.id} className="group flex flex-col bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200 transition-all hover:shadow-md">
              <div className="relative aspect-video overflow-hidden bg-slate-100 flex items-center justify-center">
                {list.isPremium && list.thumbnailUrl ? (
                  <img
                    src={list.thumbnailUrl}
                    alt={list.title}
                    className="w-full h-full object-cover"
                  />
                ) : list.places.some((p) => p.lat !== 0 && p.lng !== 0) ? (
                  <MiniMap places={list.places} />
                ) : (
                  <MapIcon className="w-12 h-12 text-slate-400" />
                )}
                <div className="absolute top-3 right-3 flex gap-1.5">
                  {list.isPremium && (
                    <span className="bg-yellow-400 text-slate-900 text-[10px] font-black px-2 py-1 rounded-full flex items-center gap-1">
                      <DollarSign className="w-2.5 h-2.5" />
                      {list.premiumPrice != null ? `$${list.premiumPrice.toFixed(2)}` : 'Paid'}
                    </span>
                  )}
                  <span className="bg-black/50 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
                    {list.isPublic ? 'Public' : 'Private'}
                  </span>
                </div>
              </div>

              <div className="p-4 flex flex-col flex-1">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="text-lg font-bold leading-tight group-hover:text-blue-600 transition-colors">{list.title}</h3>
                  <button className="text-slate-400 hover:text-blue-600 transition-colors">
                    <Share className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex items-center gap-2 text-slate-500 text-xs mb-4">
                  <MapIcon className="w-4 h-4" />
                  <span>{list.places.length} places</span>
                  <span className="mx-1">•</span>
                  <span>{new Date(list.createdAt).toLocaleDateString()}</span>
                </div>

                <div className="mt-auto pt-4 border-t border-slate-100 flex justify-between items-center">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    {list.isPremium ? (
                      <>
                        <DollarSign className="w-4 h-4 text-yellow-500" />
                        <span className="font-semibold text-slate-700">
                          Monetized · ${list.premiumPrice?.toFixed(2) ?? '—'}
                        </span>
                      </>
                    ) : list.isPublic ? (
                      <><Globe className="w-4 h-4" /><span>Shared</span></>
                    ) : (
                      <><Lock className="w-4 h-4" /><span>Only you</span></>
                    )}
                  </div>
                  <span className="text-blue-600 font-semibold text-sm hover:underline">View Map</span>
                </div>
              </div>
            </Link>
          ))}

          {!loading && !savedLoading && tab === 'created' && lists.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-12 text-slate-500 bg-white rounded-xl border border-dashed border-slate-300">
              <MapIcon className="w-12 h-12 mb-4 text-slate-300" />
              <p className="text-lg font-medium mb-2">No maps yet</p>
              <p className="text-sm mb-6">Create your first curated map from a list of places.</p>
              <Link href="/create" className="bg-blue-600 text-white px-6 py-2 rounded-full font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Create Map
              </Link>
            </div>
          )}
          {!savedLoading && tab === 'saved' && savedLists.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-12 text-slate-500 bg-white rounded-xl border border-dashed border-slate-300">
              <Bookmark className="w-12 h-12 mb-4 text-slate-300" />
              <p className="text-lg font-medium mb-2">No saved lists yet</p>
              <p className="text-sm">Browse public lists and tap &quot;Save to My Lists&quot; to save them here.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
