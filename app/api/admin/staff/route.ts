import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireFullAdmin } from '@/lib/auth/require-admin';
import { hashPassword } from '@/lib/auth/password';
import { ROLES } from '@/lib/auth/roles';
import { passwordProblem } from '@/lib/auth/password-policy';
import { attachSessionCookie, createSessionToken } from '@/lib/auth/session';
import {
  parsePermissionsJson,
  STAFF_PERMISSIONS,
  type StaffPermissionKey,
} from '@/lib/auth/permissions';
import { recordActivity, requestIp } from '@/lib/audit/record';

function sanitizePermissions(raw: unknown): StaffPermissionKey[] {
  if (!Array.isArray(raw)) return [];
  const allowed = new Set(STAFF_PERMISSIONS.map((p) => p.key));
  return raw.filter(
    (k): k is StaffPermissionKey =>
      typeof k === 'string' && allowed.has(k as StaffPermissionKey),
  );
}

/** List console users (Admin + Staff). Full Admin only. */
export async function GET() {
  const { error } = await requireFullAdmin();
  if (error) return error;

  const users = await db.user.findMany({
    where: { role: { in: [ROLES.ADMIN, ROLES.STAFF] } },
    orderBy: [{ role: 'asc' }, { email: 'asc' }],
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      permissionsJson: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    permissionsCatalog: STAFF_PERMISSIONS,
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      phone: u.phone,
      role: u.role,
      permissions: parsePermissionsJson(u.permissionsJson),
      createdAt: u.createdAt.toISOString(),
    })),
  });
}

/** Create Staff or additional Admin. */
export async function POST(request: Request) {
  const { session, error } = await requireFullAdmin();
  if (error) return error;

  let body: {
    email?: string;
    name?: string;
    phone?: string;
    password?: string;
    role?: string;
    permissions?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const email = String(body.email || '')
    .trim()
    .toLowerCase();
  const password = String(body.password || '');
  const name = String(body.name || '').trim() || null;
  const phone = String(body.phone || '').trim() || null;
  const role = body.role === ROLES.ADMIN ? ROLES.ADMIN : ROLES.STAFF;
  const permissions =
    role === ROLES.STAFF ? sanitizePermissions(body.permissions) : [];

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Valid email required.' }, { status: 400 });
  }
  const weak = passwordProblem(password, email);
  if (weak) return NextResponse.json({ error: weak }, { status: 400 });
  if (role === ROLES.STAFF && permissions.length === 0) {
    return NextResponse.json(
      { error: 'Pick at least one menu for staff.' },
      { status: 400 },
    );
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: 'An account with this email already exists.' },
      { status: 409 },
    );
  }

  const user = await db.user.create({
    data: {
      email,
      name,
      phone,
      role,
      permissionsJson: JSON.stringify(permissions),
      passwordHash: await hashPassword(password),
      emailVerifiedAt: new Date(),
    },
  });

  await recordActivity({
    userId: session.id,
    action: 'staff.create',
    entityType: 'user',
    entityId: user.id,
    summary: `Added ${role === ROLES.ADMIN ? 'admin' : 'staff'} ${email}`,
    ip: requestIp(request),
  });

  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      permissions,
      createdAt: user.createdAt.toISOString(),
    },
    createdBy: session.email,
  });
}

/** Update role / permissions / password. */
export async function PATCH(request: Request) {
  const { session, error } = await requireFullAdmin();
  if (error) return error;

  let body: {
    id?: string;
    name?: string;
    phone?: string;
    role?: string;
    permissions?: unknown;
    password?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const id = String(body.id || '').trim();
  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }

  const target = await db.user.findUnique({ where: { id } });
  if (!target || (target.role !== ROLES.ADMIN && target.role !== ROLES.STAFF)) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  }

  // Never demote yourself / lock yourself out.
  if (target.id === session.id && body.role === ROLES.STAFF) {
    return NextResponse.json(
      { error: 'You cannot demote your own admin account.' },
      { status: 400 },
    );
  }

  const role =
    body.role === ROLES.ADMIN
      ? ROLES.ADMIN
      : body.role === ROLES.STAFF
        ? ROLES.STAFF
        : (target.role as typeof ROLES.ADMIN | typeof ROLES.STAFF);

  const permissions =
    role === ROLES.STAFF
      ? sanitizePermissions(
          body.permissions !== undefined
            ? body.permissions
            : parsePermissionsJson(target.permissionsJson),
        )
      : [];

  if (role === ROLES.STAFF && permissions.length === 0) {
    return NextResponse.json(
      { error: 'Pick at least one menu for staff.' },
      { status: 400 },
    );
  }

  const data: {
    name?: string | null;
    phone?: string | null;
    role: string;
    permissionsJson: string;
    passwordHash?: string;
    sessionVersion?: { increment: number };
  } = {
    role,
    permissionsJson: JSON.stringify(permissions),
  };
  if (body.name !== undefined) data.name = String(body.name).trim() || null;
  if (body.phone !== undefined) data.phone = String(body.phone).trim() || null;
  if (body.password) {
    const weak = passwordProblem(String(body.password), target.email);
    if (weak) return NextResponse.json({ error: weak }, { status: 400 });
    data.passwordHash = await hashPassword(String(body.password));
  }
  // New password, or less access: their open sessions must sign in again.
  if (body.password || role !== target.role) data.sessionVersion = { increment: 1 };

  const user = await db.user.update({ where: { id }, data });
  await recordActivity({
    userId: session.id,
    action: 'staff.update',
    entityType: 'user',
    entityId: user.id,
    summary: body.password
      ? `Updated ${target.email} and set a new password`
      : `Updated ${target.email}`,
    ip: requestIp(request),
  });
  const res = NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      permissions: parsePermissionsJson(user.permissionsJson),
      createdAt: user.createdAt.toISOString(),
    },
  });
  if (user.id === session.id && data.sessionVersion) {
    // Keep the admin who changed their own password signed in on this device.
    const token = await createSessionToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as typeof ROLES.ADMIN,
      permissions: parsePermissionsJson(user.permissionsJson),
      sessionVersion: user.sessionVersion,
    });
    return attachSessionCookie(res, token);
  }
  return res;
}

/** Remove a staff/admin account (not yourself; keep at least one admin). */
export async function DELETE(request: Request) {
  const { session, error } = await requireFullAdmin();
  if (error) return error;

  const id = new URL(request.url).searchParams.get('id')?.trim();
  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }
  if (id === session.id) {
    return NextResponse.json(
      { error: 'You cannot delete your own account.' },
      { status: 400 },
    );
  }

  const target = await db.user.findUnique({ where: { id } });
  if (!target || (target.role !== ROLES.ADMIN && target.role !== ROLES.STAFF)) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  }

  if (target.role === ROLES.ADMIN) {
    const adminCount = await db.user.count({ where: { role: ROLES.ADMIN } });
    if (adminCount <= 1) {
      return NextResponse.json(
        { error: 'Cannot delete the last admin.' },
        { status: 400 },
      );
    }
  }

  await recordActivity({
    userId: session.id,
    action: 'staff.delete',
    entityType: 'user',
    entityId: id,
    summary: `Removed ${target.email}`,
    ip: requestIp(request),
  });
  await db.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
