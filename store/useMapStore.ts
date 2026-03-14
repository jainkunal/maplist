import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

export interface Place {
  id: string;
  name: string;
  lat: number;
  lng: number;
  tags: string[];
  notes: string;
  recommendedBy: string;
  visited: boolean;
}

export interface MapList {
  id: string;
  title: string;
  description: string;
  places: Place[];
  isPublic: boolean;
  createdAt: number;
}

interface MapStore {
  lists: MapList[];
  addList: (list: Omit<MapList, 'id' | 'createdAt'>) => string;
  updateList: (id: string, list: Partial<MapList>) => void;
  deleteList: (id: string) => void;
  addPlace: (listId: string, place: Omit<Place, 'id'>) => void;
  updatePlace: (listId: string, placeId: string, place: Partial<Place>) => void;
  deletePlace: (listId: string, placeId: string) => void;
}

export const useMapStore = create<MapStore>()(
  persist(
    (set) => ({
      lists: [],
      addList: (list) => {
        const id = uuidv4();
        set((state) => ({
          lists: [...state.lists, { ...list, id, createdAt: Date.now() }],
        }));
        return id;
      },
      updateList: (id, updatedList) =>
        set((state) => ({
          lists: state.lists.map((l) => (l.id === id ? { ...l, ...updatedList } : l)),
        })),
      deleteList: (id) =>
        set((state) => ({
          lists: state.lists.filter((l) => l.id !== id),
        })),
      addPlace: (listId, place) =>
        set((state) => ({
          lists: state.lists.map((l) =>
            l.id === listId
              ? { ...l, places: [...l.places, { ...place, id: uuidv4() }] }
              : l
          ),
        })),
      updatePlace: (listId, placeId, updatedPlace) =>
        set((state) => ({
          lists: state.lists.map((l) =>
            l.id === listId
              ? {
                  ...l,
                  places: l.places.map((p) =>
                    p.id === placeId ? { ...p, ...updatedPlace } : p
                  ),
                }
              : l
          ),
        })),
      deletePlace: (listId, placeId) =>
        set((state) => ({
          lists: state.lists.map((l) =>
            l.id === listId
              ? { ...l, places: l.places.filter((p) => p.id !== placeId) }
              : l
          ),
        })),
    }),
    {
      name: 'maplists-storage',
    }
  )
);
