import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET /api/places/[id]/reviews — list reviews for a place
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const reviews = await prisma.placeReview.findMany({
    where: { placeId: id },
    include: { user: { select: { name: true, image: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return NextResponse.json(reviews);
}

// POST /api/places/[id]/reviews — create or update a review
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const rating = Math.min(5, Math.max(1, Math.round(Number(body.rating) || 5)));
  const comment = String(body.comment ?? '').trim().slice(0, 1000);

  // Verify the place exists
  const place = await prisma.place.findUnique({ where: { id } });
  if (!place) {
    return NextResponse.json({ error: 'Place not found' }, { status: 404 });
  }

  const review = await prisma.placeReview.upsert({
    where: { placeId_userId: { placeId: id, userId: session.user.id } },
    create: {
      placeId: id,
      userId: session.user.id,
      rating,
      comment,
    },
    update: {
      rating,
      comment,
    },
    include: { user: { select: { name: true, image: true } } },
  });

  return NextResponse.json(review);
}
