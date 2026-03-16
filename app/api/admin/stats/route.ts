import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { isAdmin } from '@/lib/server-auth';

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session || !isAdmin(session.user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const purchases = await prisma.purchase.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { name: true } },
      list: { select: { title: true, userId: true } },
    },
  });

  const payouts = await prisma.payout.findMany();

  const totalRevenue = purchases.reduce((sum, p) => sum + p.platformShare, 0);
  const totalCreatorEarnings = purchases.reduce((sum, p) => sum + p.creatorShare, 0);
  const totalPaidOut = payouts.reduce((sum, p) => sum + p.amount, 0);

  return NextResponse.json({
    totalRevenue,
    totalCreatorEarnings,
    totalPaidOut,
    totalSales: purchases.length,
    recentPurchases: purchases.slice(0, 20).map((p) => ({
      id: p.id,
      buyerName: p.user.name,
      listTitle: p.list.title,
      amount: p.amount,
      creatorShare: p.creatorShare,
      platformShare: p.platformShare,
      createdAt: p.createdAt,
    })),
  });
}
