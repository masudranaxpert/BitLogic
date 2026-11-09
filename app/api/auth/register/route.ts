import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth/password';
import { attachSessionCookie, createSessionToken } from '@/lib/auth/session';
import { ROLES } from '@/lib/auth/roles';
import { passwordProblem, validateCustomerEmail } from '@/lib/auth/password-policy';
import { clientIp, guardRateLimit } from '@/lib/auth/rate-limit';
import { appUrl, issueAuthToken } from '@/lib/auth/tokens';
import { getEmailConfig, isEmailReady } from '@/lib/email/config';
import { sendEmail } from '@/lib/email/send';
import { verifyEmailMail } from '@/lib/email/templates';
import { recordLogin, recordSystemActivity } from '@/lib/audit/record';

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      name?: string;
      email?: string;
      password?: string;
      phone?: string;
    };
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');
    const name = String(body.name ?? '').trim().slice(0, 80) || null;
    const phone = String(body.phone ?? '').trim().slice(0, 20) || null;

    const ip = clientIp(request);
    const rl = guardRateLimit(request, '/api/auth/register', 10, 60 * 60_000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: rl.blocked ? 'Access denied from your IP address.' : 'Too many sign-ups from this network. Try again later.' },
        { status: rl.blocked ? 403 : 429 },
      );
    }

    const emailCheck = validateCustomerEmail(email);
    if (!emailCheck.ok) {
      return NextResponse.json({ error: emailCheck.error }, { status: 400 });
    }

    const weak = passwordProblem(password, { email, name, phone });
    if (weak) return NextResponse.json({ error: weak }, { status: 400 });

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Sign in or reset your password.' },
        { status: 409 },
      );
    }

    // First-user→admin only in non-production when explicitly allowed (prefer scripts/ensure-admin.ts).
    const allowBootstrap =
      process.env.ALLOW_ADMIN_BOOTSTRAP === '1' &&
      process.env.NODE_ENV !== 'production';
    const adminCount = allowBootstrap
      ? await db.user.count({ where: { role: ROLES.ADMIN } })
      : 1;
    const role =
      allowBootstrap && adminCount === 0 ? ROLES.ADMIN : ROLES.CUSTOMER;

    const cfg = await getEmailConfig();
    const mustVerify = role === ROLES.CUSTOMER && cfg.requireVerification && isEmailReady(cfg);

    const user = await db.user.create({
      data: {
        email,
        name,
        phone,
        role,
        passwordHash: await hashPassword(password),
        emailVerifiedAt: mustVerify ? null : new Date(),
      },
    });

    // Every customer account shows up in Admin → Customers, even before the first order.
    if (role === ROLES.CUSTOMER) {
      const today = new Date();
      const joinedAt = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      await db.adminSubscriber
        .upsert({
          where: { email },
          create: { id: `cust-${randomUUID().slice(0, 12)}`, name: name || email.split('@')[0], email, phone: phone || '', joinedAt },
          update: {},
        })
        .catch((e) => console.error('CRM row on register failed', e));
    }

    await recordSystemActivity({
      userId: user.id,
      action: 'customer.register',
      entityType: 'user',
      entityId: user.id,
      summary: `New customer account registered: ${name ? `${name} (${email})` : email}`,
      ip,
    });

    if (mustVerify) {
      const token = await issueAuthToken(user.id, 'verify_email');
      const sent = await sendEmail(
        verifyEmailMail(email, name, `${appUrl(request)}/api/auth/verify-email?token=${token}`),
        cfg,
      );
      if (!sent.ok) console.error('verification email failed', sent.error);
      return NextResponse.json({
        needsVerification: true,
        email,
        emailSent: sent.ok,
      });
    }

    const token = await createSessionToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role,
      permissions: [],
      sessionVersion: user.sessionVersion,
    });
    await recordLogin({
      userId: user.id,
      email: user.email,
      success: true,
      ip,
      userAgent: request.headers.get('user-agent') || '',
      method: 'register',
    });

    const response = NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, phone: user.phone, role },
    });
    return attachSessionCookie(response, token);
  } catch (error) {
    console.error('register failed', error);
    return NextResponse.json({ error: 'Could not create your account. Please try again.' }, { status: 500 });
  }
}
