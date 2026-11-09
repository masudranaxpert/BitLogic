import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireFullAdmin } from '@/lib/auth/require-admin';
import { ROLES } from '@/lib/auth/roles';

const LOGIN_DAYS = 7;
const ACTION_DAYS = 90;

/** Logins (7 days) and actions for one or all console users. Full admin only. */
export async function GET(request: Request) {
  const { error } = await requireFullAdmin();
  if (error) return error;

  const url = new URL(request.url);
  const rawUserId = url.searchParams.get('userId')?.trim();
  const isAll = !rawUserId || rawUserId === 'all';

  // Get all console staff/admin users
  const staffUsers = await db.user.findMany({
    where: { role: { in: [ROLES.ADMIN, ROLES.STAFF] } },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { createdAt: 'asc' },
  });

  const staffUserMap = new Map<string, { id: string; name: string | null; email: string; role: 'ADMIN' | 'STAFF' }>();
  const staffEmailMap = new Map<string, { id: string; name: string | null; email: string; role: 'ADMIN' | 'STAFF' }>();
  for (const u of staffUsers) {
    const entry = { id: u.id, name: u.name, email: u.email, role: u.role as 'ADMIN' | 'STAFF' };
    staffUserMap.set(u.id, entry);
    staffEmailMap.set(u.email.toLowerCase(), entry);
  }

  let targetUser: { id: string; name: string | null; email: string; role: 'ADMIN' | 'STAFF' } | null = null;
  if (!isAll) {
    targetUser = staffUserMap.get(rawUserId) ?? null;
    if (!targetUser) {
      const u = await db.user.findUnique({
        where: { id: rawUserId },
        select: { id: true, name: true, email: true, role: true },
      });
      if (!u || (u.role !== ROLES.ADMIN && u.role !== ROLES.STAFF)) {
        return NextResponse.json({ error: 'Staff user not found.' }, { status: 404 });
      }
      targetUser = { id: u.id, name: u.name, email: u.email, role: u.role as 'ADMIN' | 'STAFF' };
    }
  }

  const sinceLogin = new Date(Date.now() - LOGIN_DAYS * 24 * 60 * 60 * 1000);
  const sinceAction = new Date(Date.now() - ACTION_DAYS * 24 * 60 * 60 * 1000);

  const staffIds = staffUsers.map((u) => u.id);
  const staffEmails = staffUsers.map((u) => u.email.toLowerCase());

  const loginWhere = targetUser
    ? { userId: targetUser.id, createdAt: { gte: sinceLogin } }
    : {
        OR: [
          { userId: { in: staffIds } },
          { email: { in: staffEmails } },
          { user: { role: { in: [ROLES.ADMIN, ROLES.STAFF] } } },
        ],
        createdAt: { gte: sinceLogin },
      };

  const activityWhere = targetUser
    ? { userId: targetUser.id, createdAt: { gte: sinceAction } }
    : {
        OR: [
          { userId: { in: staffIds } },
          { user: { role: { in: [ROLES.ADMIN, ROLES.STAFF] } } },
        ],
        createdAt: { gte: sinceAction },
      };

  const [logins, activity] = await Promise.all([
    db.loginEvent.findMany({
      where: loginWhere,
      orderBy: { createdAt: 'desc' },
      take: 500,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    }),
    db.activityLog.findMany({
      where: activityWhere,
      orderBy: { createdAt: 'desc' },
      take: 500,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    }),
  ]);

  const ips = new Map<string, { ip: string; count: number; failed: number; lastAt: string }>();
  for (const row of logins) {
    const ip = row.ip || 'unknown';
    const cur = ips.get(ip) || { ip, count: 0, failed: 0, lastAt: row.createdAt.toISOString() };
    cur.count += 1;
    if (!row.success) cur.failed += 1;
    if (row.createdAt.toISOString() > cur.lastAt) cur.lastAt = row.createdAt.toISOString();
    ips.set(ip, cur);
  }

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const actions24h = activity.filter((a) => a.createdAt >= oneDayAgo).length;
  const activeStaffIds = new Set(activity.map((a) => a.userId));

  return NextResponse.json({
    isAll,
    targetUser,
    users: staffUsers,
    days: LOGIN_DAYS,
    actionDays: ACTION_DAYS,
    stats: {
      totalLogins: logins.length,
      successLogins: logins.filter((l) => l.success).length,
      failedLogins: logins.filter((l) => !l.success).length,
      uniqueIps: ips.size,
      totalActivity: activity.length,
      actions24h,
      activeStaffCount: activeStaffIds.size,
    },
    ips: [...ips.values()].sort((a, b) => b.count - a.count),
    logins: logins.map((row) => {
      const user =
        row.user ??
        (row.userId ? staffUserMap.get(row.userId) : null) ??
        (row.email ? staffEmailMap.get(row.email.toLowerCase()) : null) ?? {
          id: row.userId || '',
          name: null,
          email: row.email,
          role: 'STAFF' as const,
        };
      return {
        id: row.id,
        at: row.createdAt.toISOString(),
        ip: row.ip || 'unknown',
        method: row.method,
        success: row.success,
        userAgent: row.userAgent,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      };
    }),
    activity: activity.map((row) => {
      const user =
        row.user ??
        staffUserMap.get(row.userId) ?? {
          id: row.userId,
          name: null,
          email: '',
          role: 'STAFF' as const,
        };
      return {
        id: row.id,
        at: row.createdAt.toISOString(),
        action: row.action,
        entityType: row.entityType,
        entityId: row.entityId,
        summary: row.summary,
        ip: row.ip,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      };
    }),
  });
}
