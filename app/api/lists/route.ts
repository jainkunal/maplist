import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const lists = await prisma.list.findMany({
    include: { places: { orderBy: { order: 'asc' } } },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(lists);
}

export async function POST(req: NextRequest) {
  const { title, description, isPublic, places } = await req.json();

  const list = await prisma.list.create({
    data: {
      title,
      description: description ?? '',
      isPublic: isPublic ?? false,
      places: {
        create: (places ?? []).map(
          (p: { name: string; lat: number; lng: number; tags?: string[]; notes?: string; recommendedBy?: string; visited?: boolean }, i: number) => ({
            name: p.name,
            lat: p.lat,
            lng: p.lng,
            tags: p.tags ?? [],
            notes: p.notes ?? '',
            recommendedBy: p.recommendedBy ?? '',
            visited: p.visited ?? false,
            order: i,
          })
        ),
      },
    },
    include: { places: { orderBy: { order: 'asc' } } },
  });

  return NextResponse.json(list, { status: 201 });
}
