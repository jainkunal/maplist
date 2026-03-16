import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';

export async function getUser(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  return session?.user ?? null;
}

export function isAdmin(userId: string): boolean {
  const adminIds = (process.env.ADMIN_USER_IDS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  return adminIds.includes(userId);
}
