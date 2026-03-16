import { NextRequest, NextResponse, after } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { processListAsync } from '@/lib/pipeline';

async function getUser(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  return session?.user ?? null;
}

export async function POST(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { input } = await req.json();
  if (!input?.trim()) return NextResponse.json({ error: 'Input is required' }, { status: 400 });

  const list = await prisma.list.create({
    data: {
      title: 'Processing...',
      status: 'processing',
      processingInput: input,
      userId: user.id,
      description: '',
      isPublic: false,
    },
  });

  after(async () => {
    await processListAsync(list.id, input);
  });

  return NextResponse.json({ id: list.id }, { status: 201 });
}
