import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const creatorLists = await prisma.list.findMany({
    where: { userId: session.user.id, isPremium: true },
    select: { id: true, title: true },
  });

  const listIds = creatorLists.map((l) => l.id);

  const purchases = await prisma.purchase.findMany({
    where: { listId: { in: listIds } },
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { name: true } }, list: { select: { title: true } } },
  });

  const payouts = await prisma.payout.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
  });

  const totalEarnings = purchases.reduce((sum, p) => sum + p.creatorShare, 0);
  const totalPaidOut = payouts.reduce((sum, p) => sum + p.amount, 0);
  const pendingBalance = totalEarnings - totalPaidOut;

  const perList = creatorLists.map((list) => {
    const listPurchases = purchases.filter((p) => p.listId === list.id);
    return {
      listId: list.id,
      title: list.title,
      salesCount: listPurchases.length,
      totalEarned: listPurchases.reduce((sum, p) => sum + p.creatorShare, 0),
    };
  });

  return NextResponse.json({
    totalEarnings,
    totalPaidOut,
    pendingBalance,
    perList,
    recentSales: purchases.slice(0, 20).map((p) => ({
      id: p.id,
      buyerName: p.user.name,
      listTitle: p.list.title,
      amount: p.amount,
      creatorShare: p.creatorShare,
      createdAt: p.createdAt,
    })),
  });
}
