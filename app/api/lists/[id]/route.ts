import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const list = await prisma.list.findUnique({
    where: { id },
    include: { places: { orderBy: { order: 'asc' } } },
  });
  if (!list) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(list);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const list = await prisma.list.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.isPublic !== undefined && { isPublic: body.isPublic }),
    },
    include: { places: { orderBy: { order: 'asc' } } },
  });
  return NextResponse.json(list);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.list.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
