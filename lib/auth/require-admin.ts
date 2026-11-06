import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { ROLES } from '@/lib/auth/roles';

export async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== ROLES.ADMIN) {
    return {
      session: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }
  return { session, error: null };
}
