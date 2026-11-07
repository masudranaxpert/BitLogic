import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';
import type { Role } from '@/lib/auth/roles';
import type { StaffPermissionKey } from '@/lib/auth/permissions';
import { ROLES } from '@/lib/auth/roles';

export const SESSION_COOKIE = 'bitlogic_session';

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  /** Staff menu keys; empty/ignored for ADMIN. */
  permissions: StaffPermissionKey[];
  /** Must match User.sessionVersion; bumped on password change to sign out old sessions. */
  sessionVersion?: number;
};

const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('AUTH_SECRET must be set (min 16 characters)');
  }
  return new TextEncoder().encode(secret);
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  };
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    email: user.email,
    name: user.name,
    role: user.role,
    permissions: user.role === ROLES.STAFF ? user.permissions : [],
    sv: user.sessionVersion ?? 0,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret());
}

export async function readSessionToken(
  token: string,
): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const id = payload.sub;
    const email = payload.email;
    const role = payload.role;
    if (
      typeof id !== 'string' ||
      typeof email !== 'string' ||
      (role !== ROLES.CUSTOMER &&
        role !== ROLES.ADMIN &&
        role !== ROLES.STAFF)
    ) {
      return null;
    }
    const permissions = Array.isArray(payload.permissions)
      ? (payload.permissions.filter(
          (k): k is StaffPermissionKey => typeof k === 'string',
        ) as StaffPermissionKey[])
      : [];
    return {
      id,
      email,
      name: typeof payload.name === 'string' ? payload.name : null,
      role,
      permissions: role === ROLES.STAFF ? permissions : [],
      sessionVersion: typeof payload.sv === 'number' ? payload.sv : 0,
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const fromToken = await readSessionToken(token);
  if (!fromToken) return null;
  // Server-side truth: deleted users, password resets and role/permission changes apply at once.
  const { db } = await import('@/lib/db');
  const user = await db.user.findUnique({
    where: { id: fromToken.id },
    select: { email: true, name: true, role: true, permissionsJson: true, sessionVersion: true },
  });
  if (!user || user.sessionVersion !== (fromToken.sessionVersion ?? 0)) return null;
  const role = (user.role === ROLES.ADMIN || user.role === ROLES.STAFF ? user.role : ROLES.CUSTOMER) as Role;
  const { parsePermissionsJson } = await import('@/lib/auth/permissions');
  return {
    id: fromToken.id,
    email: user.email,
    name: user.name,
    role,
    permissions: role === ROLES.STAFF ? parsePermissionsJson(user.permissionsJson) : [],
    sessionVersion: user.sessionVersion,
  };
}

/** Attach session cookie on a Route Handler response (preferred over cookies().set). */
export function attachSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(SESSION_COOKIE, token, cookieOptions());
  return response;
}

export function clearSessionCookieOn(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, '', {
    ...cookieOptions(),
    maxAge: 0,
  });
  return response;
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}
