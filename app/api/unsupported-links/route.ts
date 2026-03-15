import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const { url, platform } = await req.json();
  if (!url || !platform) {
    return NextResponse.json({ error: 'url and platform are required' }, { status: 400 });
  }

  const record = await prisma.unsupportedLink.create({
    data: { url, platform },
  });

  return NextResponse.json(record, { status: 201 });
}
