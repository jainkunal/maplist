import { NextResponse } from 'next/server';
import { geocodePlace } from '@/lib/geocode';

export async function POST(req: Request) {
  try {
    const { name, context } = await req.json();
    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });
    const coords = await geocodePlace(name, context);
    return NextResponse.json(coords);
  } catch (error: any) {
    console.error('[geocode] Error:', error.message);
    return NextResponse.json({ lat: 0, lng: 0 });
  }
}
