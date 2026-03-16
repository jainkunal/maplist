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
  googlePlaceId?: string;
  photoUrl?: string | null;
};

type DbList = {
  id: string;
  title: string;
  description: string;
  isPublic: boolean;
  isPremium: boolean;
  premiumPrice: number | null;
  premiumDescription: string;
  createdAt: string | Date;
  thumbnailUrl?: string | null;
  status?: string;
  places: DbPlace[];
  user?: { id: string; name: string | null; image: string | null } | null;
};

export function dbListToMapList(list: DbList): MapList {
  return {
    id: list.id,
    title: list.title,
    description: list.description,
    isPublic: list.isPublic,
    isPremium: list.isPremium,
    premiumPrice: list.premiumPrice,
    premiumDescription: list.premiumDescription,
    createdAt: new Date(list.createdAt).getTime(),
    thumbnailUrl: list.thumbnailUrl,
    status: list.status,
    places: list.places.map(dbPlaceToPlace),
    user: list.user,
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
    photoUrl: place.photoUrl,
  };
}
