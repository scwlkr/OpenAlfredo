import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// OAX API security middleware.
// Requires a Bearer token or X-OAX-Key header on all /api/* routes.
// The key is loaded from the OAX_API_KEY environment variable, which is
// set automatically by the auth-key bootstrap in src/lib/auth.ts.

export function proxy(request: NextRequest) {
  // Only protect /api/* routes (except /api/auth/key which provides the key
  // to the trusted local client)
  const pathname = request.nextUrl.pathname;
  if (!pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // /api/auth/key is the bootstrap endpoint — it's only accessible from
  // localhost (enforced by Next.js binding to 127.0.0.1) and returns the
  // API key so the web UI can authenticate subsequent requests.
  if (pathname === '/api/auth/key') {
    return NextResponse.next();
  }

  const apiKey = process.env.OAX_API_KEY;
  if (!apiKey) {
    // If no key is configured, allow requests (dev fallback)
    return NextResponse.next();
  }

  // Check Bearer token
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : null;

  // Also accept X-OAX-Key header (for simpler curl usage)
  const headerKey = request.headers.get('x-oax-key');

  if (token !== apiKey && headerKey !== apiKey) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
      { status: 401 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
