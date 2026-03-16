import { NextRequest, NextResponse } from 'next/server';
import { fetchPhotosForList } from '@/lib/fetch-photos';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: listId } = await params;
  const updated = await fetchPhotosForList(listId);
  return NextResponse.json({ updated });
}
