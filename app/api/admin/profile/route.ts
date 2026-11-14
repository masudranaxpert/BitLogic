import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireConsoleAccess } from '@/lib/auth/require-admin';
import { canChangeOwnEmail, parsePermissionsJson } from '@/lib/auth/permissions';
import { ROLES } from '@/lib/auth/roles';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { passwordProblem } from '@/lib/auth/password-policy';
import { clientIp, rateLimit } from '@/lib/auth/rate-limit';
import { attachSessionCookie, createSessionToken } from '@/lib/auth/session';
import { recordActivity, requestIp } from '@/lib/audit/record';

/** Signed-in console user (Admin or Staff) updates their own name, email (if permitted), or password. */
export async function PATCH(request: Request) {
  const { session, error } = await requireConsoleAccess();
  if (error) return error;

  let body: {
    name?: string;
    email?: string;
    currentPassword?: string;
    newPassword?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { id: session.id } });
  if (!user) {
    return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
  }

  const nextName =
    body.name !== undefined ? String(body.name).trim() || null : user.name;
  const nextEmail =
    body.email !== undefined
      ? String(body.email).trim().toLowerCase()
      : user.email.toLowerCase();
  const nextPassword = String(body.newPassword ?? '');

  const emailChanging = nextEmail !== user.email.toLowerCase();
  const passwordChanging = nextPassword.length > 0;
  const nameChanging = nextName !== user.name;

  if (!emailChanging && !passwordChanging && !nameChanging) {
    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: session.role,
        permissions: session.role === ROLES.ADMIN ? [] : session.permissions,
        isFullAdmin: session.role === ROLES.ADMIN,
      },
    });
  }

  if (emailChanging) {
    if (!canChangeOwnEmail(session.role, session.permissions)) {
      return NextResponse.json(
        { error: 'You do not have permission to change your email.' },
        { status: 403 },
      );
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
      return NextResponse.json({ error: 'Valid email is required.' }, { status: 400 });
    }
  }

  if (emailChanging || passwordChanging) {
    if (!rateLimit(`adminprofile:${session.id}:${clientIp(request)}`, 10, 15 * 60_000).ok) {
      return NextResponse.json(
        { error: 'Too many attempts. Try again in a few minutes.' },
        { status: 429 },
      );
    }
    if (!(await verifyPassword(String(body.currentPassword ?? ''), user.passwordHash))) {
      return NextResponse.json(
        { error: 'Current password is incorrect.' },
        { status: 400 },
      );
    }
  }

  if (emailChanging) {
    const taken = await db.user.findUnique({
      where: { email: nextEmail },
      select: { id: true },
    });
    if (taken && taken.id !== user.id) {
      return NextResponse.json(
        { error: 'An account with this email already exists.' },
        { status: 409 },
      );
    }
  }

  if (passwordChanging) {
    const weak = passwordProblem(nextPassword, nextEmail);
    if (weak) return NextResponse.json({ error: weak }, { status: 400 });
    if (await verifyPassword(nextPassword, user.passwordHash)) {
      return NextResponse.json(
        { error: 'Pick a new password different from your current one.' },
        { status: 400 },
      );
    }
  }

  const updateData: {
    name?: string | null;
    email?: string;
    passwordHash?: string;
    sessionVersion?: { increment: number };
  } = {};
  if (nameChanging) updateData.name = nextName;
  if (emailChanging) updateData.email = nextEmail;
  if (passwordChanging) updateData.passwordHash = await hashPassword(nextPassword);
  if (emailChanging || passwordChanging) {
    updateData.sessionVersion = { increment: 1 };
  }

  const updated = await db.user.update({
    where: { id: user.id },
    data: updateData,
  });

  const changes: string[] = [];
  if (nameChanging) changes.push('updated display name');
  if (emailChanging) changes.push(`changed email (${user.email} → ${updated.email})`);
  if (passwordChanging) changes.push('changed password');

  const action =
    emailChanging && passwordChanging
      ? 'profile.credentials'
      : emailChanging
        ? 'profile.email_change'
        : passwordChanging
          ? 'profile.password_change'
          : 'profile.update';

  await recordActivity({
    userId: session.id,
    action,
    entityType: 'user',
    entityId: updated.id,
    summary: `Profile updated: ${changes.join(', ')}`,
    ip: requestIp(request),
  });

  const role = (updated.role === ROLES.ADMIN ? ROLES.ADMIN : ROLES.STAFF) as typeof session.role;
  const permissions =
    role === ROLES.STAFF ? parsePermissionsJson(updated.permissionsJson) : [];
  const consoleUser = {
    id: updated.id,
    email: updated.email,
    name: updated.name,
    role,
    permissions,
    isFullAdmin: role === ROLES.ADMIN,
  };

  const token = await createSessionToken({
    id: consoleUser.id,
    email: consoleUser.email,
    name: consoleUser.name,
    role: consoleUser.role,
    permissions: consoleUser.permissions,
    sessionVersion: updated.sessionVersion,
  });

  return attachSessionCookie(
    NextResponse.json({ ok: true, user: consoleUser }),
    token,
  );
}
