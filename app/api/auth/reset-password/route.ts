import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth/password';
import { passwordProblem } from '@/lib/auth/password-policy';
import { consumeAuthToken, peekAuthToken } from '@/lib/auth/tokens';
import { recordActivity, requestIp } from '@/lib/audit/record';
import { clientIp, rateLimit } from '@/lib/auth/rate-limit';

/** Is this reset link still good? (So the page can say so before the user types.) */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token') || '';
  return NextResponse.json({ valid: await peekAuthToken(token, 'reset_password') });
}

export async function POST(request: Request) {
  const ip = clientIp(request);
  if (!rateLimit(`reset-pw:${ip}`, 10, 15 * 60_000).ok) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again in a few minutes.' },
      { status: 429 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as { token?: string; password?: string };
  const token = String(body.token ?? '');
  const password = String(body.password ?? '');
  const expired = NextResponse.json(
    { error: 'This reset link is invalid or has expired. Ask for a new one.' },
    { status: 400 },
  );
  if (!(await peekAuthToken(token, 'reset_password'))) return expired;
  // Check the new password before using up the single-use link.
  const weak = passwordProblem(password);
  if (weak) return NextResponse.json({ error: weak }, { status: 400 });

  const userId = await consumeAuthToken(token, 'reset_password');
  if (!userId) return expired;
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return expired;
  await recordActivity({
    userId,
    action: 'auth.reset',
    entityType: 'user',
    entityId: userId,
    summary: 'Reset their password',
    ip: requestIp(request),
  });
  await db.user.update({
    where: { id: userId },
    data: {
      passwordHash: await hashPassword(password),
      // Signs out every existing session.
      sessionVersion: { increment: 1 },
      // Receiving the reset email proves the address.
      emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
    },
  });
  return NextResponse.json({ ok: true });
}
