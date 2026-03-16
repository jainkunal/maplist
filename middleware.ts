import { NextRequest, NextResponse } from 'next/server';

const protectedRoutes = ['/create', '/lists', '/profile', '/earnings', '/admin'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route));

  if (!isProtected) return NextResponse.next();

  // better-auth uses __Secure- prefix in HTTPS (production), plain name in HTTP (dev)
  const sessionCookie =
    request.cookies.get('__Secure-better-auth.session_token') ||
    request.cookies.get('better-auth.session_token');

  if (!sessionCookie) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/create', '/lists/:path*', '/profile', '/earnings', '/admin'],
};
