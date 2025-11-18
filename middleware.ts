import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
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

  // Site is enabled, allow normal access
  return NextResponse.next();
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.svg|.*\\.png|.*\\.jpg).*)',
  ],
};
