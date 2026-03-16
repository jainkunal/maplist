import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUser } from '@/lib/server-auth';
import { generateThumbnailUrl } from '@/lib/thumbnail';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: listId } = await params;

  const list = await prisma.list.findUnique({ where: { id: listId }, select: { userId: true } });
  if (!list) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (list.userId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();

  const count = await prisma.place.count({ where: { listId } });

  const place = await prisma.place.create({
    data: {
      name: body.name,
      lat: body.lat,
      lng: body.lng,
      tags: body.tags ?? [],
      notes: body.notes ?? '',
      recommendedBy: body.recommendedBy ?? '',
      visited: body.visited ?? false,
      googlePlaceId: body.googlePlaceId ?? '',
      listId,
      order: count,
    },
  });

  // Regenerate thumbnail with updated places
  const allPlaces = await prisma.place.findMany({ where: { listId } });
  const thumbnailUrl = generateThumbnailUrl(allPlaces);
  await prisma.list.update({ where: { id: listId }, data: { thumbnailUrl } });

  return NextResponse.json(place, { status: 201 });
}
