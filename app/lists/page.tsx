'use client';

import { useEffect } from 'react';
import { useMapStore } from '@/store/useMapStore';
import { dbListToMapList } from '@/lib/mappers';
import Link from 'next/link';
import { Map as MapIcon, Search, Share, Lock, Globe, Plus } from 'lucide-react';

export default function ListsPage() {
  const lists = useMapStore((state) => state.lists);
  const setLists = useMapStore((state) => state.setLists);

  useEffect(() => {
    fetch('/api/lists')
      .then((r) => r.json())
      .then((data) => setLists(data.map(dbListToMapList)));
  }, [setLists]);

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
          <button className="flex flex-col items-center justify-center border-b-2 border-blue-600 text-blue-600 px-4 pb-3 pt-4 font-semibold text-sm">
            All Lists
          </button>
          <button className="flex flex-col items-center justify-center border-b-2 border-transparent text-slate-500 px-4 pb-3 pt-4 font-semibold text-sm hover:text-slate-700">
            Private
          </button>
          <button className="flex flex-col items-center justify-center border-b-2 border-transparent text-slate-500 px-4 pb-3 pt-4 font-semibold text-sm hover:text-slate-700">
            Shared
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
          {lists.map((list) => (
            <Link href={`/lists/${list.id}`} key={list.id} className="group flex flex-col bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200 transition-all hover:shadow-md">
              <div className="relative aspect-video overflow-hidden bg-slate-200 flex items-center justify-center">
                <MapIcon className="w-12 h-12 text-slate-400" />
                <div className="absolute top-3 right-3 flex gap-2">
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
                    {list.isPublic ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    <span>{list.isPublic ? 'Shared' : 'Only you'}</span>
                  </div>
                  <span className="text-blue-600 font-semibold text-sm hover:underline">View Map</span>
                </div>
              </div>
            </Link>
          ))}

          {lists.length === 0 && (
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
        </div>
      </main>
    </div>
  );
}
