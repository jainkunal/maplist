import { NextRequest, NextResponse } from 'next/server';

const protectedRoutes = ['/create', '/lists', '/profile'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route));

  if (!isProtected) return NextResponse.next();

  // better-auth sets a session cookie named "better-auth.session_token"
  const sessionCookie = request.cookies.get('better-auth.session_token');

  if (!sessionCookie) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/create', '/lists/:path*', '/profile'],
};
