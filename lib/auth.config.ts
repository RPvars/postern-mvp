import type { NextAuthConfig } from 'next-auth';

// This file contains the edge-compatible auth configuration
// Used in middleware where Node.js APIs are not available

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: '/login',
    error: '/login',
    verifyRequest: '/verify-email',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnAuthPage =
        nextUrl.pathname.startsWith('/login') ||
        nextUrl.pathname.startsWith('/register') ||
        nextUrl.pathname.startsWith('/forgot-password') ||
        nextUrl.pathname.startsWith('/reset-password') ||
        nextUrl.pathname.startsWith('/verify-email');

      // Redirect authenticated users away from auth pages
      if (isLoggedIn && isOnAuthPage) {
        return Response.redirect(new URL('/', nextUrl));
      }

      // Person pages require authentication (GDPR — personal data protection)
      const isProtectedPage = nextUrl.pathname.startsWith('/person');
      if (isProtectedPage && !isLoggedIn) {
        return false; // Redirects to /login
      }

      return true;
    },
  },
  providers: [], // Providers are added in auth.ts
};
