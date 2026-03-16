import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUser } from '@/lib/server-auth';
import { generateThumbnailUrl } from '@/lib/thumbnail';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; placeId: string }> }
) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: listId, placeId } = await params;

  const list = await prisma.list.findUnique({ where: { id: listId }, select: { userId: true } });
  if (!list) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (list.userId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const place = await prisma.place.update({
    where: { id: placeId },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.lat !== undefined && { lat: body.lat }),
      ...(body.lng !== undefined && { lng: body.lng }),
      ...(body.tags !== undefined && { tags: body.tags }),
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(body.recommendedBy !== undefined && { recommendedBy: body.recommendedBy }),
      ...(body.visited !== undefined && { visited: body.visited }),
    },
  });
  return NextResponse.json(place);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; placeId: string }> }
) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: listId, placeId } = await params;

  const list = await prisma.list.findUnique({ where: { id: listId }, select: { userId: true } });
  if (!list) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (list.userId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await prisma.place.delete({ where: { id: placeId } });

  // Regenerate thumbnail with remaining places
  const remaining = await prisma.place.findMany({ where: { listId } });
  const thumbnailUrl = generateThumbnailUrl(remaining);
  await prisma.list.update({ where: { id: listId }, data: { thumbnailUrl } });

  return NextResponse.json({ success: true });
}
