import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: listId } = await params;
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
      listId,
      order: count,
    },
  });

  return NextResponse.json(place, { status: 201 });
}
