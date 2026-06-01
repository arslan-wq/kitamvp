import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Public routes - no protection
  if (pathname === '/auth/login' || pathname === '/auth/signup' || pathname === '/auth/test' || pathname.startsWith('/api/auth') || pathname.startsWith('/api/debug')) {
    return NextResponse.next();
  }

  // Check authentication for protected routes
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token && pathname !== '/auth/login') {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  if (token && (pathname === '/auth/login' || pathname === '/auth/signup')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
