'use client';

import { useParams, useRouter } from 'next/navigation';
import { useMapStore, Place } from '@/store/useMapStore';
import { dbListToMapList } from '@/lib/mappers';
import { ArrowLeft, Share, MoreVertical, MapPin, Navigation, Edit2, Check, X, Trash2, Pencil, Globe, Lock, DollarSign, Star, MessageSquare } from 'lucide-react';
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
  const [fetchLoading, setFetchLoading] = useState(!list);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [editingPlaceId, setEditingPlaceId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ notes: string; tags: string; recommendedBy: string }>({ notes: '', tags: '', recommendedBy: '' });
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  // Reviews state
  type Review = { id: string; rating: number; comment: string; visited: boolean; createdAt: string; user: { name: string; image: string | null } };
  const [placeReviews, setPlaceReviews] = useState<Record<string, Review[]>>({});
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set());

  // Fetch list from DB on mount if not already in store
  useEffect(() => {
    if (list) return;
    setFetchLoading(true);
    fetch(`/api/lists/${id}`)
      .then((r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((data) => {
        if (data) setLists([...lists, dbListToMapList(data)]);
        setFetchLoading(false);
      })
      .catch(() => setFetchLoading(false));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll for updates while the list is being processed in the background
  useEffect(() => {
    if (!list || list.status !== 'processing') return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/lists/${id}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.status !== 'processing') {
          clearInterval(interval);
          const mapped = dbListToMapList(data);
          setLists(lists.map((l) => (l.id === id ? mapped : l)));
        }
      } catch { /* keep polling */ }
    }, 2500);

    return () => clearInterval(interval);
  }, [list?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  // Fetch reviews for all places in this list
  useEffect(() => {
    if (!list) return;
    list.places.forEach((place) => {
      fetch(`/api/places/${place.id}/reviews`)
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            setPlaceReviews((prev) => ({ ...prev, [place.id]: data }));
          }
        })
        .catch(() => {});
    });
  }, [list]);

  const totalReviewCount = Object.values(placeReviews).reduce((sum, r) => sum + r.length, 0);

  const allTags = useMemo(() => {
    if (!list) return [];
    const tags = new Set<string>();
    list.places.forEach(p => p.tags.forEach(t => tags.add(t)));
    return Array.from(tags);
  }, [list]);

  if (list?.status === 'processing') {
    return (
      <div className="relative flex flex-col overflow-x-hidden bg-slate-50 pb-6">
        <header className="sticky top-0 z-50 flex items-center bg-white/80 backdrop-blur-md p-4 justify-between border-b border-slate-200">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/lists')}
              className="text-slate-900 flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-slate-900 text-lg font-bold leading-tight tracking-tight">Building your map...</h1>
              <p className="text-xs text-slate-500">This usually takes 20–60 seconds</p>
            </div>
          </div>
        </header>

        <div className="flex flex-1 flex-col items-center justify-center min-h-[60vh] px-6 text-center">
          <div className="relative mb-8 flex items-center justify-center">
            <div className="absolute w-40 h-40 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
            <div className="relative w-32 h-32 flex items-center justify-center border-2 border-blue-500/30 rounded-full">
              <div className="absolute inset-0 border-t-2 border-blue-600 rounded-full animate-spin" />
              <span className="material-symbols-outlined text-blue-600 text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                explore
              </span>
            </div>
          </div>

          <h2 className="text-xl font-bold text-slate-900 mb-2">Curating your world</h2>
          <p className="text-slate-500 text-sm max-w-xs leading-relaxed mb-8">
            We&apos;re extracting places, geocoding them, and building your map in the background. Feel free to do something else — this page will update automatically.
          </p>

          <div className="w-full max-w-xs space-y-3">
            {['Parsing your list', 'Geocoding locations', 'Saving your map'].map((step, i) => (
              <div key={i} className="flex items-center gap-3 text-slate-400">
                <span className="material-symbols-outlined text-base animate-pulse text-blue-500">pending</span>
                <span className="text-sm font-medium">{step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (list?.status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center bg-slate-50">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-red-500 text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">Something went wrong</h1>
        <p className="text-slate-500 text-sm mb-6">We couldn&apos;t extract places from your input. Try again with a different link or paste the place names directly.</p>
        <button onClick={() => router.push('/create')} className="bg-blue-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors">
          Try again
        </button>
      </div>
    );
  }

  if (!list) {
    if (fetchLoading) {
      return (
        <div className="relative flex flex-col overflow-x-hidden bg-slate-50 pb-6 animate-pulse">
          <header className="sticky top-0 z-50 flex items-center bg-white/80 backdrop-blur-md p-4 justify-between border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-slate-200" />
              <div className="space-y-2">
                <div className="h-5 w-32 bg-slate-200 rounded" />
                <div className="h-3 w-16 bg-slate-100 rounded" />
              </div>
            </div>
          </header>
          <div className="h-[35vh] w-full bg-slate-200" />
          <main className="flex-1 px-4 py-6 space-y-4 max-w-3xl mx-auto w-full">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 flex gap-4">
                <div className="w-16 h-16 rounded-lg bg-slate-200 shrink-0" />
                <div className="flex-1 space-y-3">
                  <div className="h-5 bg-slate-200 rounded w-1/2" />
                  <div className="h-3 bg-slate-100 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 rounded w-1/3" />
                </div>
              </div>
            ))}
          </main>
        </div>
      );
    }
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

  const handleTogglePublish = () => {
    const isPublic = !list.isPublic;
    updateList(id, { isPublic });
    fetch(`/api/lists/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPublic }),
    });
    setMenuOpen(false);
    if (isPublic) {
      const url = `${window.location.origin}/p/${id}`;
      if (navigator.share) {
        navigator.share({ title: list.title, url });
      } else {
        navigator.clipboard.writeText(url);
      }
    }
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

  const handleUpdateDescription = (description: string) => {
    updateList(id, { description });
    fetch(`/api/lists/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description }),
    });
    setEditingDescription(false);
  };

  const handleDeleteList = () => {
    deleteList(id);
    fetch(`/api/lists/${id}`, { method: 'DELETE' });
    router.push('/lists');
  };

  return (
    <div className="relative flex flex-col overflow-x-hidden bg-slate-50 pb-6">
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
              <h1 className="text-slate-900 text-lg font-bold leading-tight tracking-tight truncate max-w-[160px] xs:max-w-[200px] sm:max-w-xs">{list.title}</h1>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs text-slate-500">{list.places.length} places</p>
              {list.isPublic && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">
                  <Globe className="w-2.5 h-2.5" /> Public
                </span>
              )}
              {list.isPremium && (
                <span className="flex items-center gap-1 text-[10px] font-black text-yellow-800 bg-yellow-100 px-1.5 py-0.5 rounded-full">
                  <DollarSign className="w-2.5 h-2.5" /> ${list.premiumPrice?.toFixed(2)}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              const url = list.isPublic
                ? `${window.location.origin}/p/${id}`
                : window.location.href;
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
              <div className="absolute right-0 top-12 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-50">
                <button
                  onClick={() => { setTitleDraft(list.title); setEditingTitle(true); setMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Pencil className="w-4 h-4" /> Rename list
                </button>
                <button
                  onClick={handleTogglePublish}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  {list.isPublic ? (
                    <><Lock className="w-4 h-4" /> Make private</>
                  ) : (
                    <><Globe className="w-4 h-4" /> Publish list</>
                  )}
                </button>
                <button
                  onClick={() => { setMenuOpen(false); router.push(`/lists/${id}/monetize`); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <DollarSign className="w-4 h-4" />
                  {list.isPremium
                    ? `Edit pricing · $${list.premiumPrice?.toFixed(2) ?? '—'}`
                    : 'Monetize list'}
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

      {/* Monetization info bar */}
      {list.isPremium && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-yellow-50 border-b border-yellow-200">
          <div className="flex items-center gap-2 min-w-0">
            <DollarSign className="w-4 h-4 text-yellow-600 shrink-0" />
            <span className="text-sm font-bold text-yellow-900">
              Premium · ${list.premiumPrice?.toFixed(2) ?? '—'}
            </span>
            {list.premiumDescription && (
              <span className="text-xs text-yellow-700 truncate hidden sm:block">
                · {list.premiumDescription}
              </span>
            )}
          </div>
          <button
            onClick={() => router.push(`/lists/${id}/monetize`)}
            className="text-xs font-bold text-blue-600 hover:underline shrink-0"
          >
            Edit pricing
          </button>
        </div>
      )}

      {/* Description */}
      <div className="px-4 py-3 bg-white border-b border-slate-200">
        {editingDescription ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={descriptionDraft}
              onChange={(e) => setDescriptionDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleUpdateDescription(descriptionDraft);
                if (e.key === 'Escape') setEditingDescription(false);
              }}
              className="flex-1 text-sm rounded-lg border border-blue-400 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Add a short description..."
            />
            <button onClick={() => handleUpdateDescription(descriptionDraft)} className="text-blue-600"><Check className="w-4 h-4" /></button>
            <button onClick={() => setEditingDescription(false)} className="text-slate-400"><X className="w-4 h-4" /></button>
          </div>
        ) : (
          <button
            onClick={() => { setDescriptionDraft(list.description || ''); setEditingDescription(true); }}
            className="group flex items-center gap-2 text-left w-full"
          >
            <span className={`text-sm flex-1 ${list.description ? 'text-slate-600' : 'text-slate-400 italic'}`}>
              {list.description || 'Add a description...'}
            </span>
            <Pencil className="w-3 h-3 text-slate-300 group-hover:text-slate-500 shrink-0 transition-colors" />
          </button>
        )}
      </div>

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
        {totalReviewCount > 0 && (
          <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl">
            <MessageSquare className="w-5 h-5 text-blue-600 shrink-0" />
            <div>
              <p className="text-sm font-bold text-slate-800">
                {totalReviewCount} {totalReviewCount === 1 ? 'review' : 'reviews'} from visitors
              </p>
              <p className="text-xs text-slate-500">People who visited places from your list left feedback below.</p>
            </div>
          </div>
        )}
        {filteredPlaces.map((place) => (
          <div key={place.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm transition-all hover:shadow-md">
            <div className="flex gap-4 p-4">
              <div className="w-16 h-16 rounded-lg bg-blue-50 shrink-0 overflow-hidden flex items-center justify-center text-blue-600">
                {place.photoUrl
                  ? <img src={place.photoUrl} alt={place.name} className="w-full h-full object-cover" />
                  : <MapPin className="w-8 h-8" />}
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
                        className="w-full mt-1 text-base rounded-lg border-slate-200 focus:ring-blue-600 focus:border-blue-600"
                        rows={2}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tags (comma separated)</label>
                      <input
                        type="text"
                        value={editForm.tags}
                        onChange={(e) => setEditForm({...editForm, tags: e.target.value})}
                        className="w-full mt-1 text-base rounded-lg border-slate-200 focus:ring-blue-600 focus:border-blue-600"
                        placeholder="e.g. wifi, scenic, cheap"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Recommended By</label>
                      <input
                        type="text"
                        value={editForm.recommendedBy}
                        onChange={(e) => setEditForm({...editForm, recommendedBy: e.target.value})}
                        className="w-full mt-1 text-base rounded-lg border-slate-200 focus:ring-blue-600 focus:border-blue-600"
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

            {/* Visitor Reviews */}
            {(placeReviews[place.id]?.length ?? 0) > 0 && (
              <div className="border-t border-slate-200">
                <button
                  onClick={() => setExpandedReviews((prev) => {
                    const next = new Set(prev);
                    if (next.has(place.id)) next.delete(place.id);
                    else next.add(place.id);
                    return next;
                  })}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-slate-700">
                      {placeReviews[place.id].length} {placeReviews[place.id].length === 1 ? 'review' : 'reviews'} from visitors
                    </span>
                    <div className="flex gap-0.5 ml-1">
                      {(() => {
                        const avg = placeReviews[place.id].reduce((s, r) => s + r.rating, 0) / placeReviews[place.id].length;
                        return Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`w-3 h-3 ${i < Math.round(avg) ? 'text-yellow-400 fill-yellow-400' : 'text-slate-300'}`} />
                        ));
                      })()}
                    </div>
                  </div>
                  <span className="text-xs text-slate-400">{expandedReviews.has(place.id) ? 'Hide' : 'Show'}</span>
                </button>
                {expandedReviews.has(place.id) && (
                  <div className="px-4 pb-4 space-y-3">
                    {placeReviews[place.id].map((review) => (
                      <div key={review.id} className="flex gap-3 p-3 bg-slate-50 rounded-xl">
                        <div className="size-7 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600 shrink-0 overflow-hidden">
                          {review.user.image ? (
                            <img src={review.user.image} alt={review.user.name ?? ''} className="size-7 rounded-full object-cover" />
                          ) : (
                            review.user.name?.charAt(0).toUpperCase() ?? '?'
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-slate-700">{review.user.name}</span>
                            <div className="flex gap-0.5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star key={i} className={`w-3 h-3 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-300'}`} />
                              ))}
                            </div>
                            <span className="text-[10px] text-slate-400 ml-auto">
                              {new Date(review.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                          {review.comment && (
                            <p className="text-xs text-slate-600 leading-relaxed">{review.comment}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {!fetchLoading && filteredPlaces.length === 0 && (
          <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
            <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No places found.</p>
          </div>
        )}
      </main>
    </div>
  );
}
