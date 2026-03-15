import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ hasAccess: false });

  const { id } = await params;

  const list = await prisma.list.findUnique({
    where: { id },
    select: { userId: true, isPremium: true },
  });

  if (!list) return NextResponse.json({ hasAccess: false });
  if (!list.isPremium) return NextResponse.json({ hasAccess: true });
  if (list.userId === session.user.id) return NextResponse.json({ hasAccess: true });

  const purchase = await prisma.purchase.findUnique({
    where: { userId_listId: { userId: session.user.id, listId: id } },
  });

  return NextResponse.json({ hasAccess: !!purchase });
}
