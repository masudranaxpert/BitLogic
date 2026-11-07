import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, attachSessionCookie, createSessionToken } from '@/lib/auth/session';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { passwordProblem } from '@/lib/auth/password-policy';
import { clientIp, rateLimit } from '@/lib/auth/rate-limit';

/** Signed-in customer changes their own password (needs the current one). */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
  if (!rateLimit(`pwchange:${session.id}:${clientIp(request)}`, 6, 15 * 60_000).ok) {
    return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });
  }
  const body = (await request.json().catch(() => ({}))) as { currentPassword?: string; newPassword?: string };
  const user = await db.user.findUnique({ where: { id: session.id } });
  if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
  if (!(await verifyPassword(String(body.currentPassword ?? ''), user.passwordHash))) {
    return NextResponse.json({ error: 'Current password is wrong.' }, { status: 400 });
  }
  const next = String(body.newPassword ?? '');
  const weak = passwordProblem(next, user.email);
  if (weak) return NextResponse.json({ error: weak }, { status: 400 });
  if (await verifyPassword(next, user.passwordHash)) {
    return NextResponse.json({ error: 'Pick a password you have not used here.' }, { status: 400 });
  }
  const updated = await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(next), sessionVersion: { increment: 1 } },
  });
  // Other devices are signed out; this one gets a fresh session.
  const token = await createSessionToken({ ...session, sessionVersion: updated.sessionVersion });
  return attachSessionCookie(NextResponse.json({ ok: true }), token);
}
