import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

async function getUser(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  return session?.user ?? null;
}

// GET /api/lists/[id]/save — returns whether the current user has saved this list
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const currentUser = await getUser(req);

  const isSaved = currentUser
    ? !!(await prisma.savedList.findUnique({
        where: { userId_listId: { userId: currentUser.id, listId: id } },
      }))
    : false;

  return NextResponse.json({ isSaved });
}

// POST /api/lists/[id]/save — save the list
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getUser(req);
  if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  await prisma.savedList.upsert({
    where: { userId_listId: { userId: currentUser.id, listId: id } },
    create: { userId: currentUser.id, listId: id },
    update: {},
  });

  return NextResponse.json({ isSaved: true });
}

// DELETE /api/lists/[id]/save — unsave the list
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getUser(req);
  if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  await prisma.savedList.deleteMany({
    where: { userId: currentUser.id, listId: id },
  });

  return NextResponse.json({ isSaved: false });
}
