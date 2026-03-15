import type { MapList, Place } from '@/store/useMapStore';

// Prisma returns dates as ISO strings when serialized through JSON
type DbPlace = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  tags: string[];
  notes: string;
  recommendedBy: string;
  visited: boolean;
  order: number;
  listId: string;
};

type DbList = {
  id: string;
  title: string;
  description: string;
  isPublic: boolean;
  createdAt: string | Date;
  thumbnailUrl?: string | null;
  places: DbPlace[];
};

export function dbListToMapList(list: DbList): MapList {
  return {
    id: list.id,
    title: list.title,
    description: list.description,
    isPublic: list.isPublic,
    createdAt: new Date(list.createdAt).getTime(),
    thumbnailUrl: list.thumbnailUrl,
    places: list.places.map(dbPlaceToPlace),
  };
}

export function dbPlaceToPlace(place: DbPlace): Place {
  return {
    id: place.id,
    name: place.name,
    lat: place.lat,
    lng: place.lng,
    tags: place.tags,
    notes: place.notes,
    recommendedBy: place.recommendedBy,
    visited: place.visited,
  };
}
