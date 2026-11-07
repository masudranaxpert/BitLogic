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
  if (!pathname.startsWith('/admin')) {
    // Lets the store layout know the path (maintenance mode keeps /login reachable).
    const headers = new Headers(request.headers);
    headers.set('x-pathname', pathname);
    return NextResponse.next({ request: { headers } });
  }

  const secret = getSecret();
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (!secret || !token) {
    const login = new URL('/login', request.url);
    login.searchParams.set('next', pathname);
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
    login.searchParams.set('next', pathname);
    return NextResponse.redirect(login);
  }
}

export const config = {
  // Every page route (admin guard + store path header); skips API, Next assets and files with an extension.
  matcher: ['/admin', '/admin/:path*', '/((?!api|_next/static|_next/image|favicon\\.ico|.*\\..*).*)'],
};
