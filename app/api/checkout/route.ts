import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { getDodo } from '@/lib/dodo';

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { listId } = await req.json();
  if (!listId) return NextResponse.json({ error: 'listId is required' }, { status: 400 });

  const list = await prisma.list.findUnique({
    where: { id: listId },
    include: { user: { select: { id: true } } },
  });

  if (!list || !list.isPremium || !list.dodoProductId) {
    return NextResponse.json({ error: 'List is not available for purchase' }, { status: 400 });
  }

  const existing = await prisma.purchase.findUnique({
    where: { userId_listId: { userId: session.user.id, listId } },
  });
  if (existing) {
    return NextResponse.json({ error: 'Already purchased' }, { status: 400 });
  }

  const appUrl = process.env.APP_URL || 'http://localhost:3000';

  const checkout = await getDodo().checkoutSessions.create({
    product_cart: [{ product_id: list.dodoProductId, quantity: 1 }],
    customer: { email: session.user.email, name: session.user.name },
    metadata: { listId, buyerId: session.user.id },
    return_url: `${appUrl}/checkout/success?listId=${listId}`,
  });

  return NextResponse.json({ checkoutUrl: checkout.checkout_url });
}
