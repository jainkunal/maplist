'use client';

import { useParams, useRouter } from 'next/navigation';
import { useMapStore, Place } from '@/store/useMapStore';
import { dbListToMapList } from '@/lib/mappers';
import { ArrowLeft, Share, MoreVertical, MapPin, Navigation, Edit2, Check, X, Trash2, Pencil } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useState, useMemo, useRef, useEffect } from 'react';

const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-slate-200 animate-pulse flex items-center justify-center text-slate-400">Loading Map...</div>
});

export default function ListDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const lists = useMapStore((state) => state.lists);
  const setLists = useMapStore((state) => state.setLists);
  const updatePlace = useMapStore((state) => state.updatePlace);
  const updateList = useMapStore((state) => state.updateList);
  const deleteList = useMapStore((state) => state.deleteList);

  const list = lists.find((l) => l.id === id);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [editingPlaceId, setEditingPlaceId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ notes: string; tags: string; recommendedBy: string }>({ notes: '', tags: '', recommendedBy: '' });
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  // Fetch list from DB on mount if not already in store
  useEffect(() => {
    if (list) return;
    fetch(`/api/lists/${id}`)
      .then((r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((data) => {
        if (data) setLists([...lists, dbListToMapList(data)]);
      });
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const allTags = useMemo(() => {
    if (!list) return [];
    const tags = new Set<string>();
    list.places.forEach(p => p.tags.forEach(t => tags.add(t)));
    return Array.from(tags);
  }, [list]);

  if (!list) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold mb-4">List not found</h1>
        <button onClick={() => router.push('/lists')} className="text-blue-600 hover:underline">
          Go back to lists
        </button>
      </div>
    );
  }

  const filteredPlaces = activeTag
    ? list.places.filter(p => p.tags.includes(activeTag))
    : list.places;

  const handleToggleVisited = (placeId: string, currentStatus: boolean) => {
    const visited = !currentStatus;
    updatePlace(list.id, placeId, { visited });
    fetch(`/api/lists/${list.id}/places/${placeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visited }),
    });
  };

  const startEditing = (place: Place) => {
    setEditingPlaceId(place.id);
    setEditForm({
      notes: place.notes,
      tags: place.tags.join(', '),
      recommendedBy: place.recommendedBy || ''
    });
  };

  const saveEditing = (placeId: string) => {
    const tags = editForm.tags.split(',').map(t => t.trim()).filter(t => t !== '');
    const update = { notes: editForm.notes, tags, recommendedBy: editForm.recommendedBy };
    updatePlace(list.id, placeId, update);
    fetch(`/api/lists/${list.id}/places/${placeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update),
    });
    setEditingPlaceId(null);
  };

  const handleRenameList = (title: string) => {
    updateList(id, { title });
    fetch(`/api/lists/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    setEditingTitle(false);
  };

  const handleDeleteList = () => {
    deleteList(id);
    fetch(`/api/lists/${id}`, { method: 'DELETE' });
    router.push('/lists');
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-slate-50 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center bg-white/80 backdrop-blur-md p-4 justify-between border-b border-slate-200">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => router.push('/lists')}
            className="text-slate-900 flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="min-w-0">
            {editingTitle ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRenameList(titleDraft);
                    if (e.key === 'Escape') setEditingTitle(false);
                  }}
                  className="text-lg font-bold rounded px-2 py-0.5 border border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-40"
                />
                <button onClick={() => handleRenameList(titleDraft)} className="text-blue-600"><Check className="w-4 h-4" /></button>
                <button onClick={() => setEditingTitle(false)} className="text-slate-400"><X className="w-4 h-4" /></button>
              </div>
            ) : (
              <h1 className="text-slate-900 text-lg font-bold leading-tight tracking-tight truncate max-w-[200px]">{list.title}</h1>
            )}
            <p className="text-xs text-slate-500">{list.places.length} places</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              const url = window.location.href;
              if (navigator.share) {
                await navigator.share({ title: list.title, url });
              } else {
                await navigator.clipboard.writeText(url);
              }
            }}
            className="flex size-10 items-center justify-center rounded-full hover:bg-slate-100 text-slate-900"
          >
            <Share className="w-5 h-5" />
          </button>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex size-10 items-center justify-center rounded-full hover:bg-slate-100 text-slate-900"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-12 w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-50">
                <button
                  onClick={() => { setTitleDraft(list.title); setEditingTitle(true); setMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Pencil className="w-4 h-4" /> Rename list
                </button>
                <button
                  onClick={handleDeleteList}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> Delete list
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Map Section */}
      <section className="relative h-[35vh] w-full overflow-hidden z-0 border-b border-slate-200">
        <MapComponent places={filteredPlaces} />
      </section>

      {/* Filter Chips */}
      {allTags.length > 0 && (
        <div className="flex gap-2 p-4 overflow-x-auto no-scrollbar bg-white border-b border-slate-200">
          <button
            onClick={() => setActiveTag(null)}
            className={`flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-full px-4 text-sm font-medium transition-colors ${
              activeTag === null
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All Places
          </button>
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setActiveTag(tag)}
              className={`flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-full px-4 text-sm font-medium transition-colors ${
                activeTag === tag
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Places List */}
      <main className="flex-1 px-4 py-6 space-y-4 max-w-3xl mx-auto w-full">
        {filteredPlaces.map((place) => (
          <div key={place.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm transition-all hover:shadow-md">
            <div className="flex gap-4 p-4">
              <div className="w-16 h-16 rounded-lg bg-blue-50 shrink-0 flex items-center justify-center text-blue-600">
                <MapPin className="w-8 h-8" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-bold truncate pr-2">{place.name}</h3>
                  <div className="flex items-center gap-3 shrink-0">
                    {place.visited && (
                      <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-2 py-1 rounded">
                        Visited
                      </span>
                    )}
                    <input
                      type="checkbox"
                      checked={place.visited}
                      onChange={() => handleToggleVisited(place.id, place.visited)}
                      className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-600 cursor-pointer"
                    />
                  </div>
                </div>

                {editingPlaceId === place.id ? (
                  <div className="mt-3 space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Notes</label>
                      <textarea
                        value={editForm.notes}
                        onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                        className="w-full mt-1 text-sm rounded-lg border-slate-200 focus:ring-blue-600 focus:border-blue-600"
                        rows={2}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tags (comma separated)</label>
                      <input
                        type="text"
                        value={editForm.tags}
                        onChange={(e) => setEditForm({...editForm, tags: e.target.value})}
                        className="w-full mt-1 text-sm rounded-lg border-slate-200 focus:ring-blue-600 focus:border-blue-600"
                        placeholder="e.g. wifi, scenic, cheap"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Recommended By</label>
                      <input
                        type="text"
                        value={editForm.recommendedBy}
                        onChange={(e) => setEditForm({...editForm, recommendedBy: e.target.value})}
                        className="w-full mt-1 text-sm rounded-lg border-slate-200 focus:ring-blue-600 focus:border-blue-600"
                        placeholder="e.g. Rahul, Instagram"
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => saveEditing(place.id)}
                        className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1"
                      >
                        <Check className="w-4 h-4" /> Save
                      </button>
                      <button
                        onClick={() => setEditingPlaceId(null)}
                        className="flex-1 bg-slate-100 text-slate-700 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1"
                      >
                        <X className="w-4 h-4" /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {place.notes && (
                      <p className="text-sm text-slate-600 mt-1">{place.notes}</p>
                    )}
                    {place.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {place.tags.map(tag => (
                          <span key={tag} className="px-2 py-1 bg-slate-100 text-[10px] font-bold uppercase rounded text-slate-600 tracking-tight">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="mt-4 flex items-center justify-between">
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline bg-blue-50 px-3 py-1.5 rounded-full"
                      >
                        <Navigation className="w-3 h-3" />
                        Navigate
                      </a>
                      <button
                        onClick={() => startEditing(place)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-900 px-3 py-1.5 rounded-full hover:bg-slate-100 transition-colors"
                      >
                        <Edit2 className="w-3 h-3" />
                        Edit
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {place.recommendedBy && editingPlaceId !== place.id && (
              <div className="px-4 py-3 bg-slate-50 border-t border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="size-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600 border border-blue-200">
                    {place.recommendedBy.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs text-slate-500 font-medium">
                    Recommended by <span className="font-bold text-slate-900">{place.recommendedBy}</span>
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}

        {filteredPlaces.length === 0 && (
          <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
            <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No places found.</p>
          </div>
        )}
      </main>
    </div>
  );
}
