import { getSession } from '@/lib/auth/session';
import { ROLES } from '@/lib/auth/roles';

export type BuyerAccess =
  | { kind: 'admin' }
  | { kind: 'member'; email: string }
  | { kind: 'guest' };

/**
 * Who is calling a customer-facing endpoint?
 * - admin: signed-in admin (can see everything)
 * - member: signed-in customer — only their own email
 * - guest: no session cookie; must prove ownership per order (see callers)
 */
export async function getBuyerAccess(): Promise<BuyerAccess> {
  let session = null;
  try {
    session = await getSession();
  } catch {
    session = null;
  }
  if (!session) return { kind: 'guest' };
  // Only full Admin may elevate on buyer APIs. Staff must use permission-gated /api/admin/*.
  if (session.role === ROLES.ADMIN) {
    return { kind: 'admin' };
  }
  return { kind: 'member', email: session.email.trim().toLowerCase() };
}

export function sameEmail(a: string | null | undefined, b: string | null | undefined) {
  return (
    Boolean(a) && Boolean(b) && a!.trim().toLowerCase() === b!.trim().toLowerCase()
  );
}
