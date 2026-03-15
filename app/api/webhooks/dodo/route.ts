import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDodo } from '@/lib/dodo';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const dodo = getDodo();
  let event: ReturnType<typeof dodo.webhooks.unwrap>;
  try {
    event = dodo.webhooks.unwrap(body, { headers });
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'payment.succeeded') {
    const data = event.data;
    const paymentId = data.payment_id;
    const totalAmount = data.total_amount;
    const metadata = data.metadata ?? {};
    const listId = metadata.listId;
    const buyerId = metadata.buyerId;

    if (!listId || !buyerId) {
      return NextResponse.json({ received: true });
    }

    const creatorShare = Math.round(totalAmount * 0.7);
    const platformShare = totalAmount - creatorShare;

    await prisma.purchase.upsert({
      where: { paymentId },
      create: {
        userId: buyerId,
        listId,
        paymentId,
        amount: totalAmount,
        currency: 'USD',
        creatorShare,
        platformShare,
      },
      update: {},
    });
  }

  if (event.type === 'refund.succeeded') {
    const data = event.data;
    const paymentId = data.payment_id;

    await prisma.purchase.deleteMany({
      where: { paymentId },
    });
  }

  return NextResponse.json({ received: true });
}
