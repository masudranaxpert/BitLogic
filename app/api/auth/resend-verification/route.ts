import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { clientIp, rateLimit } from '@/lib/auth/rate-limit';
import { appUrl, issueAuthToken } from '@/lib/auth/tokens';
import { getEmailConfig, isEmailReady } from '@/lib/email/config';
import { sendEmail } from '@/lib/email/send';
import { verifyEmailMail } from '@/lib/email/templates';

/** Always answers the same way so it can't be used to discover accounts. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { email?: string };
  const email = String(body.email ?? '').trim().toLowerCase();
  const generic = NextResponse.json({ ok: true, message: 'If that account needs confirming, a new link is on its way.' });
  if (!email) return generic;
  if (!rateLimit(`resend:${clientIp(request)}:${email}`, 3, 15 * 60_000).ok) {
    return NextResponse.json({ error: 'Please wait a few minutes before asking again.' }, { status: 429 });
  }
  const cfg = await getEmailConfig();
  if (!isEmailReady(cfg)) return generic;
  const user = await db.user.findUnique({ where: { email } });
  if (user && !user.emailVerifiedAt) {
    const token = await issueAuthToken(user.id, 'verify_email');
    const sent = await sendEmail(verifyEmailMail(email, user.name, `${appUrl(request)}/api/auth/verify-email?token=${token}`), cfg);
    if (!sent.ok) console.error('resend verification failed', sent.error);
  }
  return generic;
}
