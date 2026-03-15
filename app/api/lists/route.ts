import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

async function getUser(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  return session?.user ?? null;
}

export async function GET(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const lists = await prisma.list.findMany({
    where: { userId: user.id },
    include: { places: { orderBy: { order: 'asc' } } },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(lists);
}

export async function POST(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { title, description, isPublic, places } = await req.json();

  const list = await prisma.list.create({
    data: {
      title,
      description: description ?? '',
      isPublic: isPublic ?? false,
      userId: user.id,
      places: {
        create: (places ?? []).map(
          (p: { name: string; lat: number; lng: number; tags?: string[]; notes?: string; recommendedBy?: string; visited?: boolean; googlePlaceId?: string }, i: number) => ({
            name: p.name,
            lat: p.lat,
            lng: p.lng,
            tags: p.tags ?? [],
            notes: p.notes ?? '',
            recommendedBy: p.recommendedBy ?? '',
            visited: p.visited ?? false,
            googlePlaceId: p.googlePlaceId ?? '',
            order: i,
          })
        ),
      },
    },
    include: { places: { orderBy: { order: 'asc' } } },
  });

  return NextResponse.json(list, { status: 201 });
}
