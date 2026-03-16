import { prisma } from './prisma';
import { geocodePlace } from './geocode';
import { scrapeGoogleMapsList } from './scrape-gmaps';
import { scrapeInstagramPost } from './scrape-instagram';
import { extractPlacesFromInput, generateListDescription, generateTitleFromArticle, RawPlace } from './extract-places';
import { generateThumbnailUrl } from './thumbnail';

function extractGoogleMapsUrl(input: string): string | null {
  const match = input.match(/https?:\/\/(maps\.app\.goo\.gl\/[^\s]+|(?:www\.)?google\.com\/maps\/[^\s]+)/);
  return match ? match[0] : null;
}

function extractInstagramUrl(input: string): string | null {
  const match = input.match(/https?:\/\/(?:www\.)?instagram\.com\/(?:reel|p)\/[A-Za-z0-9_-]+[^\s]*/);
  return match ? match[0] : null;
}

export async function processListAsync(listId: string, input: string): Promise<void> {
  try {
    let rawPlaces: RawPlace[] = [];
    let title = 'New Curated Map';

    // Step 1: Extract places based on input type
    const gmapsUrl = extractGoogleMapsUrl(input);
    if (gmapsUrl) {
      console.log('[pipeline] Detected Google Maps URL');
      const result = await scrapeGoogleMapsList(gmapsUrl);
      rawPlaces = result.places;
      title = result.title;
    }

    if (!rawPlaces.length) {
      const igUrl = extractInstagramUrl(input);
      if (igUrl) {
        console.log('[pipeline] Detected Instagram URL');
        const { caption, imageUrls } = await scrapeInstagramPost(igUrl);
        const result = await extractPlacesFromInput({ text: input, captionContext: caption || undefined, imageUrls });
        rawPlaces = result.places;
        if (result.listTitle) title = result.listTitle;
      }
    }

    if (!rawPlaces.length) {
      console.log('[pipeline] Extracting from plain text/URL');
      const result = await extractPlacesFromInput({ text: input });
      rawPlaces = result.places;
      // Generate title from article URL if input looks like one
      if (rawPlaces.length) {
        const articleUrlMatch = input.trim().match(/^https?:\/\/[^\s]+$/);
        if (articleUrlMatch) {
          const generatedTitle = await generateTitleFromArticle(articleUrlMatch[0], rawPlaces.map(p => p.name));
          if (generatedTitle) title = generatedTitle;
        }
      }
    }

    if (!rawPlaces.length) {
      console.warn('[pipeline] No places found for list', listId);
      await prisma.list.update({ where: { id: listId }, data: { status: 'error' } });
      return;
    }

    // Step 2: Geocode all places
    console.log('[pipeline] Geocoding', rawPlaces.length, 'places for list', listId);
    const geocodedPlaces: { name: string; lat: number; lng: number; notes: string; googlePlaceId: string }[] = [];

    for (const place of rawPlaces) {
      if (place.lat && place.lng) {
        geocodedPlaces.push({ name: place.name, lat: place.lat, lng: place.lng, notes: place.notes || '', googlePlaceId: place.place_id || '' });
      } else {
        try {
          const coords = await geocodePlace(place.name, place.locationContext);
          if (coords.lat || coords.lng) {
            geocodedPlaces.push({ name: place.name, lat: coords.lat, lng: coords.lng, notes: place.notes || '', googlePlaceId: '' });
          }
        } catch {
          console.error('[pipeline] Failed to geocode', place.name);
        }
      }
    }

    if (!geocodedPlaces.length) {
      console.warn('[pipeline] No geocoded places for list', listId);
      await prisma.list.update({ where: { id: listId }, data: { status: 'error' } });
      return;
    }

    // Step 3: Save places and mark list ready
    const placesData = geocodedPlaces.map((p, i) => ({
      name: p.name,
      lat: p.lat,
      lng: p.lng,
      tags: [],
      notes: p.notes,
      recommendedBy: '',
      visited: false,
      googlePlaceId: p.googlePlaceId,
      order: i,
    }));

    const thumbnailUrl = generateThumbnailUrl(placesData);
    const description = await generateListDescription(title, geocodedPlaces.map(p => p.name));

    await prisma.list.update({
      where: { id: listId },
      data: {
        title,
        status: 'ready',
        thumbnailUrl,
        ...(description && { description }),
        places: { create: placesData },
      },
    });

    console.log('[pipeline] List', listId, 'ready with', geocodedPlaces.length, 'places');
  } catch (err: any) {
    console.error('[pipeline] Error processing list', listId, err?.message ?? err);
    await prisma.list.update({ where: { id: listId }, data: { status: 'error' } }).catch(() => {});
  }
}
