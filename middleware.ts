import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { SESSION_COOKIE } from '@/lib/auth/session';
import { ROLES } from '@/lib/auth/roles';

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) return null;
  return new TextEncoder().encode(secret);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. API Admin Defense-in-Depth Guard: return clean JSON 401/403 (never HTML redirect)
  if (pathname.startsWith('/api/admin')) {
    const secret = getSecret();
    const token = request.cookies.get(SESSION_COOKIE)?.value;

    if (!secret || !token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const { payload } = await jwtVerify(token, secret);
      if (payload.role !== ROLES.ADMIN && payload.role !== ROLES.STAFF) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      // Staff management APIs are strictly ADMIN-only
      if (pathname.startsWith('/api/admin/staff') && payload.role !== ROLES.ADMIN) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      return NextResponse.next();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // 2. Admin UI Guard: redirect unauthenticated users to /login
  if (pathname.startsWith('/admin')) {
    const secret = getSecret();
    const token = request.cookies.get(SESSION_COOKIE)?.value;

    if (!secret || !token) {
      const login = new URL('/login', request.url);
      if (pathname !== '/admin') {
        login.searchParams.set('next', pathname);
      }
      return NextResponse.redirect(login);
    }

    try {
      const { payload } = await jwtVerify(token, secret);
      if (payload.role !== ROLES.ADMIN && payload.role !== ROLES.STAFF) {
        return NextResponse.redirect(new URL('/', request.url));
      }
      // Staff page is Admin-only (UI also hides it).
      if (
        pathname.startsWith('/admin/staff') &&
        payload.role !== ROLES.ADMIN
      ) {
        return NextResponse.redirect(new URL('/admin', request.url));
      }
      return NextResponse.next();
    } catch {
      const login = new URL('/login', request.url);
      if (pathname !== '/admin') {
        login.searchParams.set('next', pathname);
      }
      return NextResponse.redirect(login);
    }
  }

  // 3. Storefront / public routes: pass through with x-pathname header
  const headers = new Headers(request.headers);
  headers.set('x-pathname', pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  // Matches admin pages, admin APIs (for defense-in-depth), and all public store pages; skips other APIs and static assets.
  matcher: [
    '/admin',
    '/admin/:path*',
    '/api/admin',
    '/api/admin/:path*',
    '/((?!api|_next/static|_next/image|favicon\\.ico|.*\\..*).*)',
  ],
};
