import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const PAGE_SIZE = 12;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const sort = searchParams.get('sort') === 'popular' ? 'popular' : 'recent';
  const q = searchParams.get('q')?.trim() ?? '';

  const where = {
    isPublic: true,
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: 'insensitive' as const } },
            { description: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [lists, total] = await Promise.all([
    prisma.list.findMany({
      where,
      include: {
        places: { select: { id: true, lat: true, lng: true }, orderBy: { order: 'asc' } },
        user: { select: { name: true, image: true } },
      },
      orderBy:
        sort === 'popular'
          ? [{ places: { _count: 'desc' } }, { createdAt: 'desc' }]
          : { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.list.count({ where }),
  ]);

  return NextResponse.json({
    lists,
    total,
    page,
    totalPages: Math.ceil(total / PAGE_SIZE),
  });
}
