import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) return NextResponse.json([]);

  const saved = await prisma.savedList.findMany({
    where: { userId: session.user.id },
    select: { listId: true },
  });

  return NextResponse.json(saved.map((s) => s.listId));
}
