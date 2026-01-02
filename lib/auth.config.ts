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

      // Currently all pages are public, no protection needed
      // Add protected routes here in the future:
      // const isOnProtectedPage = nextUrl.pathname.startsWith('/dashboard');
      // if (isOnProtectedPage && !isLoggedIn) {
      //   return false; // Redirect to login
      // }

      return true;
    },
  },
  providers: [], // Providers are added in auth.ts
};
