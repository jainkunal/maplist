'use client';

import { useParams, useRouter } from 'next/navigation';
import { useMapStore, Place } from '@/store/useMapStore';
import { ArrowLeft, Share, MoreVertical, MapPin, Navigation, Edit2, Check, X } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useState, useMemo } from 'react';

const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-slate-200 animate-pulse flex items-center justify-center text-slate-400">Loading Map...</div>
});

export default function ListDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const lists = useMapStore((state) => state.lists);
  const updatePlace = useMapStore((state) => state.updatePlace);
  
  const list = lists.find((l) => l.id === id);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [editingPlaceId, setEditingPlaceId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ notes: string; tags: string; recommendedBy: string }>({ notes: '', tags: '', recommendedBy: '' });

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
    updatePlace(list.id, placeId, { visited: !currentStatus });
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
    const tagsArray = editForm.tags.split(',').map(t => t.trim()).filter(t => t !== '');
    updatePlace(list.id, placeId, {
      notes: editForm.notes,
      tags: tagsArray,
      recommendedBy: editForm.recommendedBy
    });
    setEditingPlaceId(null);
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-slate-50 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center bg-white/80 backdrop-blur-md p-4 justify-between border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push('/lists')}
            className="text-slate-900 flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-slate-900 text-lg font-bold leading-tight tracking-tight truncate max-w-[200px]">{list.title}</h1>
            <p className="text-xs text-slate-500">{list.places.length} places</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex size-10 items-center justify-center rounded-full hover:bg-slate-100 text-slate-900">
            <Share className="w-5 h-5" />
          </button>
          <button className="flex size-10 items-center justify-center rounded-full hover:bg-slate-100 text-slate-900">
            <MoreVertical className="w-5 h-5" />
          </button>
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
