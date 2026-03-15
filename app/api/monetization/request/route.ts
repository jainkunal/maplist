import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  if (user.monetizationStatus !== 'none' && user.monetizationStatus !== 'rejected') {
    return NextResponse.json({ error: 'Request already submitted' }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { monetizationStatus: 'pending' },
  });

  return NextResponse.json({ status: 'pending' });
}
