import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword } from '@/lib/auth/password';
import { attachSessionCookie, createSessionToken } from '@/lib/auth/session';
import { ROLES, type Role } from '@/lib/auth/roles';
import { parsePermissionsJson } from '@/lib/auth/permissions';
import { clientIp, guardRateLimit } from '@/lib/auth/rate-limit';
import { recordLogin } from '@/lib/audit/record';
import { getEmailConfig, isEmailReady } from '@/lib/email/config';

// Compared against when the email is unknown so both paths take the same time.
const DUMMY_HASH = '$2b$10$fBG.yW7yMZLj2AASaRViCemOahEnScIQsF/ioOfbZ3WI/whZo97cW';

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { email?: string; password?: string };
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const ip = clientIp(request);
    const perPair = guardRateLimit(request, `/api/auth/login:${email}`, 8, 15 * 60_000);
    const perIp = guardRateLimit(request, '/api/auth/login', 40, 15 * 60_000);
    if (!perPair.ok || !perIp.ok) {
      const blocked = perPair.blocked || perIp.blocked;
      return NextResponse.json(
        { error: blocked ? 'Access denied from your IP address.' : 'Too many attempts. Try again in a few minutes.' },
        {
          status: blocked ? 403 : 429,
          headers: { 'Retry-After': String(Math.max(perPair.retryAfterSec, perIp.retryAfterSec)) },
        },
      );
    }

    const user = await db.user.findUnique({ where: { email } });
    const valid = await verifyPassword(password, user?.passwordHash || DUMMY_HASH);
    if (!user || !valid) {
      await recordLogin({
        userId: user?.id,
        email,
        success: false,
        ip,
        userAgent: request.headers.get('user-agent') || '',
      });
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    const role = (user.role === ROLES.ADMIN ? ROLES.ADMIN : user.role === ROLES.STAFF ? ROLES.STAFF : ROLES.CUSTOMER) as Role;

    if (role === ROLES.CUSTOMER) {
      const crm = await db.adminSubscriber.findFirst({ where: { email }, select: { status: true } });
      if (crm?.status === 'suspended') {
        return NextResponse.json(
          { error: 'This account is suspended. Please contact support.', code: 'ACCOUNT_SUSPENDED' },
          { status: 403 },
        );
      }
    }

    // Customers must confirm their email first when the store can send email.
    if (role === ROLES.CUSTOMER && !user.emailVerifiedAt) {
      const cfg = await getEmailConfig();
      if (cfg.requireVerification && isEmailReady(cfg)) {
        return NextResponse.json(
          { error: 'Please confirm your email first. Check your inbox for the link.', code: 'EMAIL_NOT_VERIFIED' },
          { status: 403 },
        );
      }
    }

    const permissions = role === ROLES.STAFF ? parsePermissionsJson(user.permissionsJson) : [];
    const token = await createSessionToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role,
      permissions,
      sessionVersion: user.sessionVersion,
    });

    await recordLogin({
      userId: user.id,
      email: user.email,
      success: true,
      ip,
      userAgent: request.headers.get('user-agent') || '',
    });

    const response = NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, phone: user.phone, role, permissions },
    });
    return attachSessionCookie(response, token);
  } catch (error) {
    console.error('login failed', error);
    return NextResponse.json({ error: 'Could not sign you in. Please try again.' }, { status: 500 });
  }
}
