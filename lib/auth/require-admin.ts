import { NextResponse } from 'next/server';
import { getSession, type SessionUser } from '@/lib/auth/session';
import { ROLES } from '@/lib/auth/roles';
import {
  canAccessPermission,
  type StaffPermissionKey,
} from '@/lib/auth/permissions';

type GateOk = { session: SessionUser; error: null };
type GateErr = { session: null; error: NextResponse };

/** Full Admin only (Staff page, promote users, etc.). */
export async function requireFullAdmin(): Promise<GateOk | GateErr> {
  const session = await getSession();
  if (!session || session.role !== ROLES.ADMIN) {
    return {
      session: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }
  return { session, error: null };
}

/** Admin or Staff may enter the console. */
export async function requireConsoleAccess(): Promise<GateOk | GateErr> {
  const session = await getSession();
  if (
    !session ||
    (session.role !== ROLES.ADMIN && session.role !== ROLES.STAFF)
  ) {
    return {
      session: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }
  return { session, error: null };
}

/** Admin always; Staff needs the given permission key. */
export async function requirePermission(
  key: StaffPermissionKey | 'staff',
): Promise<GateOk | GateErr> {
  const session = await getSession();
  if (!session) {
    return {
      session: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }
  if (!canAccessPermission(session.role, session.permissions, key)) {
    return {
      session: null,
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }
  return { session, error: null };
}

/**
 * Backward-compatible name: console access (Admin or Staff).
 * Prefer requireFullAdmin / requirePermission for sensitive routes.
 */
export async function requireAdmin(): Promise<GateOk | GateErr> {
  return requireConsoleAccess();
}
