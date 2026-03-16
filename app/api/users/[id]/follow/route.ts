import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUser } from '@/lib/server-auth';

// GET /api/users/[id]/follow — returns follower/following counts and whether the current user follows
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const currentUser = await getUser(req);

  const [followers, following, isFollowing] = await Promise.all([
    prisma.follow.count({ where: { followingId: id } }),
    prisma.follow.count({ where: { followerId: id } }),
    currentUser
      ? prisma.follow.findUnique({
          where: { followerId_followingId: { followerId: currentUser.id, followingId: id } },
        })
      : null,
  ]);

  return NextResponse.json({ followers, following, isFollowing: !!isFollowing });
}

// POST /api/users/[id]/follow — follow the user
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getUser(req);
  if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  if (currentUser.id === id) return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 });

  await prisma.follow.upsert({
    where: { followerId_followingId: { followerId: currentUser.id, followingId: id } },
    create: { followerId: currentUser.id, followingId: id },
    update: {},
  });

  const followers = await prisma.follow.count({ where: { followingId: id } });
  return NextResponse.json({ followers, isFollowing: true });
}

// DELETE /api/users/[id]/follow — unfollow the user
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getUser(req);
  if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  await prisma.follow.deleteMany({
    where: { followerId: currentUser.id, followingId: id },
  });

  const followers = await prisma.follow.count({ where: { followingId: id } });
  return NextResponse.json({ followers, isFollowing: false });
}
