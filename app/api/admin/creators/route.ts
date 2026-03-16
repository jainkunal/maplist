import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { isAdmin } from '@/lib/is-admin';

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session || !await isAdmin(session.user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const creators = await prisma.user.findMany({
    where: { monetizationStatus: { in: ['pending', 'approved', 'rejected'] } },
    select: {
      id: true,
      name: true,
      email: true,
      monetizationStatus: true,
      createdAt: true,
      _count: { select: { lists: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(creators);
}

export async function PUT(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session || !await isAdmin(session.user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { userId, status } = await req.json();
  if (!userId || !['approved', 'rejected'].includes(status)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { monetizationStatus: status },
  });

  return NextResponse.json({ success: true });
}
