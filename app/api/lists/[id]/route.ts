import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { getDodo } from '@/lib/dodo';

async function getUser(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  return session?.user ?? null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const list = await prisma.list.findUnique({
    where: { id },
    include: {
      places: { orderBy: { order: 'asc' } },
      user: { select: { id: true, name: true, image: true } },
    },
  });
  if (!list) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Public lists are accessible to anyone; private lists require ownership
  if (!list.isPublic) {
    const user = await getUser(req);
    if (!user || list.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  return NextResponse.json(list);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.list.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (existing.userId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();

  // When enabling premium, verify monetization approval and create Dodo product
  let dodoProductId = existing.dodoProductId;
  if (body.isPremium === true) {
    const creator = await prisma.user.findUnique({ where: { id: user.id }, select: { monetizationStatus: true } });
    if (creator?.monetizationStatus !== 'approved') {
      return NextResponse.json({ error: 'Monetization not approved' }, { status: 403 });
    }

    const priceInCents = Math.round((body.premiumPrice ?? existing.premiumPrice ?? 0) * 100);
    const productName = body.title ?? existing.title;

    // Create new product if none exists or if price changed
    const existingPriceCents = existing.premiumPrice ? Math.round(existing.premiumPrice * 100) : 0;
    if (!dodoProductId || priceInCents !== existingPriceCents) {
      try {
        const product = await getDodo().products.create({
          name: productName,
          price: {
            type: 'one_time_price',
            price: priceInCents,
            currency: 'USD',
            discount: 0,
            purchasing_power_parity: false,
          },
          tax_category: 'digital_products',
        });
        dodoProductId = product.product_id;
      } catch (err) {
        console.error('Failed to create Dodo product:', err);
        return NextResponse.json({ error: 'Failed to create payment product' }, { status: 500 });
      }
    }
  }

  const list = await prisma.list.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.isPublic !== undefined && { isPublic: body.isPublic }),
      ...(body.isPremium !== undefined && { isPremium: body.isPremium }),
      ...(body.premiumPrice !== undefined && { premiumPrice: body.premiumPrice }),
      ...(body.premiumDescription !== undefined && { premiumDescription: body.premiumDescription }),
      ...(body.thumbnailUrl !== undefined && { thumbnailUrl: body.thumbnailUrl }),
      ...(dodoProductId !== existing.dodoProductId && { dodoProductId }),
    },
    include: { places: { orderBy: { order: 'asc' } } },
  });
  return NextResponse.json(list);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.list.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (existing.userId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await prisma.list.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
