import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; placeId: string }> }
) {
  const { placeId } = await params;
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
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; placeId: string }> }
) {
  const { placeId } = await params;
  await prisma.place.delete({ where: { id: placeId } });
  return NextResponse.json({ success: true });
}
