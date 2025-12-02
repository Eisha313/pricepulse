import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // Protect dashboard routes
    if (pathname.startsWith('/dashboard') && !token) {
      return NextResponse.redirect(new URL('/api/auth/signin', req.url));
    }

    // Protect API routes (except auth)
    if (
      pathname.startsWith('/api') &&
      !pathname.startsWith('/api/auth') &&
      !pathname.startsWith('/api/webhooks') &&
      !token
    ) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        
        // Allow public routes
        if (
          pathname === '/' ||
          pathname.startsWith('/api/auth') ||
          pathname.startsWith('/api/webhooks') ||
          pathname.startsWith('/_next') ||
          pathname.includes('.')
        ) {
          return true;
        }

        // Require auth for protected routes
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/products/:path*',
    '/api/alerts/:path*',
    '/api/subscription/:path*',
    '/api/checkout/:path*',
    '/api/billing-portal/:path*',
    '/api/scrape/:path*',
  ],
};
