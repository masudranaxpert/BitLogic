import { randomInt } from 'node:crypto';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/auth/require-admin';
import { hashPassword } from '@/lib/auth/password';
import { passwordProblem } from '@/lib/auth/password-policy';
import { ROLES } from '@/lib/auth/roles';
import { appUrl, issueAuthToken } from '@/lib/auth/tokens';
import { getEmailConfig, isEmailReady } from '@/lib/email/config';
import { sendEmail } from '@/lib/email/send';
import { passwordChangedByAdminMail, resetPasswordMail } from '@/lib/email/templates';
import { recordActivity, requestIp } from '@/lib/audit/record';

/** Readable temporary password: no look-alike characters. */
function tempPassword() {
  const abc = 'abcdefghjkmnpqrstuvwxyz';
  const pick = (s: string) => s[randomInt(s.length)];
  let p = '';
  for (let i = 0; i < 8; i++) p += pick(abc);
  return `${p.slice(0, 4)}-${p.slice(4)}-${randomInt(10, 99)}`;
}

/** Account status for the customer page: does a login exist, is it verified, can we email? */
export async function GET(request: Request) {
  const { error } = await requirePermission('customers');
  if (error) return error;
  const email = new URL(request.url).searchParams.get('email')?.trim().toLowerCase() || '';
  const user = email ? await db.user.findUnique({ where: { email } }) : null;
  const cfg = await getEmailConfig();
  return NextResponse.json({
    hasAccount: Boolean(user && user.role === ROLES.CUSTOMER),
    isStaff: Boolean(user && user.role !== ROLES.CUSTOMER),
    emailVerified: Boolean(user?.emailVerifiedAt),
    emailReady: isEmailReady(cfg),
  });
}

/**
 * Admin helps a customer who forgot their password:
 * - mode "set": set a password now (typed or generated) and show it once to the admin;
 * - mode "email": email the customer a reset link (needs email setup).
 * Customers only — staff/admin passwords are never changed here.
 */
export async function POST(request: Request) {
  const { session, error } = await requirePermission('customers');
  if (error) return error;
  const body = (await request.json().catch(() => ({}))) as {
    email?: string;
    mode?: 'set' | 'email';
    password?: string;
    notify?: boolean;
  };
  const email = String(body.email ?? '').trim().toLowerCase();
  const user = email ? await db.user.findUnique({ where: { email } }) : null;
  if (!user) {
    return NextResponse.json({ error: 'This customer has no login account yet.' }, { status: 404 });
  }
  if (user.role !== ROLES.CUSTOMER) {
    return NextResponse.json({ error: 'Staff and admin passwords cannot be changed here.' }, { status: 403 });
  }
  const cfg = await getEmailConfig();

  if (body.mode === 'email') {
    if (!isEmailReady(cfg)) {
      return NextResponse.json({ error: 'Set up email in Settings first.' }, { status: 400 });
    }
    const token = await issueAuthToken(user.id, 'reset_password');
    const sent = await sendEmail(resetPasswordMail(email, `${appUrl(request)}/reset-password?token=${token}`), cfg);
    if (!sent.ok) return NextResponse.json({ error: `Could not send: ${sent.error}` }, { status: 502 });
    await recordActivity({
      userId: session.id,
      action: 'customer.password',
      entityType: 'user',
      entityId: user.id,
      summary: `Emailed a password reset to ${email}`,
      ip: requestIp(request),
    });
    return NextResponse.json({ ok: true, emailed: true });
  }

  const password = body.password?.trim() ? body.password.trim() : tempPassword();
  const weak = passwordProblem(password, email);
  if (weak) return NextResponse.json({ error: weak }, { status: 400 });
  await db.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(password),
      sessionVersion: { increment: 1 },
      emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
    },
  });
  let notified = false;
  if (body.notify && isEmailReady(cfg)) {
    notified = (await sendEmail(passwordChangedByAdminMail(email, `${appUrl(request)}/login`), cfg)).ok;
  }
  await recordActivity({
    userId: session.id,
    action: 'customer.password',
    entityType: 'user',
    entityId: user.id,
    summary: `Set a new password for ${email}`,
    ip: requestIp(request),
  });
  // Shown once to the admin to pass on; never stored in plain text.
  return NextResponse.json({ ok: true, password, notified });
}
