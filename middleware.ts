import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';

const { auth } = NextAuth(authConfig);

export default auth((request) => {
  // Check if site is enabled via environment variable
  const siteEnabled = process.env.SITE_ENABLED !== 'false';

  // If already on maintenance page, allow access
  if (request.nextUrl.pathname === '/maintenance') {
    return NextResponse.next();
  }

  // If site is disabled, redirect to maintenance page
  if (!siteEnabled) {
    return NextResponse.redirect(new URL('/maintenance', request.url));
  }

  // Auth-related redirects
  const isLoggedIn = !!request.auth;
  const isOnAuthPage =
    request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/register') ||
    request.nextUrl.pathname.startsWith('/forgot-password') ||
    request.nextUrl.pathname.startsWith('/reset-password') ||
    request.nextUrl.pathname.startsWith('/verify-email');

  // Redirect authenticated users away from auth pages
  if (isLoggedIn && isOnAuthPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Site is enabled, allow normal access
  return NextResponse.next();
});

// Configure which routes to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api/auth (NextAuth routes)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/auth|.*\\.svg|.*\\.png|.*\\.jpg).*)',
  ],
};
