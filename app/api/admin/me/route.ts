import { NextResponse } from 'next/server';
import { requireConsoleAccess } from '@/lib/auth/require-admin';
import { ROLES } from '@/lib/auth/roles';

/** Current console user (Admin or Staff) for sidebar filtering. */
export async function GET() {
  const { session, error } = await requireConsoleAccess();
  if (error) return error;

  return NextResponse.json({
    user: {
      id: session.id,
      email: session.email,
      name: session.name,
      role: session.role,
      permissions: session.role === ROLES.ADMIN ? [] : session.permissions,
      isFullAdmin: session.role === ROLES.ADMIN,
    },
  });
}
