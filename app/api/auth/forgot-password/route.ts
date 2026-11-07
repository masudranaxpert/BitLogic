import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { clientIp, rateLimit } from '@/lib/auth/rate-limit';
import { appUrl, issueAuthToken } from '@/lib/auth/tokens';
import { getEmailConfig, isEmailReady } from '@/lib/email/config';
import { sendEmail } from '@/lib/email/send';
import { resetPasswordMail } from '@/lib/email/templates';

/** Tells the UI whether self-service reset is possible (email configured). */
export async function GET() {
  const cfg = await getEmailConfig();
  return NextResponse.json({ available: isEmailReady(cfg) });
}

/** Same answer whether or not the account exists. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { email?: string };
  const email = String(body.email ?? '').trim().toLowerCase();
  const cfg = await getEmailConfig();
  if (!isEmailReady(cfg)) {
    return NextResponse.json(
      { error: 'Password reset by email is not available. Please contact support to reset it.' },
      { status: 503 },
    );
  }
  if (!rateLimit(`forgot:${clientIp(request)}`, 10, 15 * 60_000).ok || !rateLimit(`forgot:${email}`, 3, 15 * 60_000).ok) {
    return NextResponse.json({ error: 'Please wait a few minutes before asking again.' }, { status: 429 });
  }
  const user = email ? await db.user.findUnique({ where: { email } }) : null;
  if (user) {
    const token = await issueAuthToken(user.id, 'reset_password');
    const sent = await sendEmail(resetPasswordMail(email, `${appUrl(request)}/reset-password?token=${token}`), cfg);
    if (!sent.ok) console.error('reset email failed', sent.error);
  }
  return NextResponse.json({ ok: true, message: 'If an account uses that email, a reset link is on its way.' });
}
