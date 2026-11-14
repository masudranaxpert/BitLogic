import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireFullAdmin } from '@/lib/auth/require-admin';
import { ROLES } from '@/lib/auth/roles';
import { recordActivity, requestIp } from '@/lib/audit/record';

const DEFAULT_LOGIN_DAYS = 30;
const DEFAULT_ACTION_DAYS = 90;

const CATEGORY_PREFIXES: Record<string, string[]> = {
  payments: ['payment', 'sms', 'device', 'coupon'],
  orders: ['order', 'delivery', 'warranty'],
  catalog: ['product', 'plan', 'vault', 'category', 'taxonomy', 'price'],
  customers: ['customer', 'ticket', 'user', 'subscriber'],
  logins: ['staff', 'auth', 'login', 'profile'],
  system: ['settings', 'supplier', 'email', 'banner', 'security', 'media'],
};

/**
 * Master Activity & Sign-In Audit Endpoint.
 * Supports:
 * - ?userId=all|<id>
 * - ?category=all|payments|orders|catalog|customers|logins|system
 * - ?days=7|30|90|365|0 (0 = permanent / all-time)
 */
export async function GET(request: Request) {
  const { error } = await requireFullAdmin();
  if (error) return error;

  const url = new URL(request.url);
  const rawUserId = url.searchParams.get('userId')?.trim();
  const isAll = !rawUserId || rawUserId === 'all';
  const category = (url.searchParams.get('category')?.trim() || 'all').toLowerCase();
  const includeAllLogins = url.searchParams.get('includeAllLogins') === '1' || category === 'logins';
  const daysParam = url.searchParams.get('days');
  const requestedDays = daysParam !== null ? parseInt(daysParam, 10) : DEFAULT_ACTION_DAYS;
  const actionDays = Number.isFinite(requestedDays) && requestedDays >= 0 ? requestedDays : DEFAULT_ACTION_DAYS;
  const loginDays = daysParam !== null ? actionDays : DEFAULT_LOGIN_DAYS;

  // Get all console staff/admin users for filter dropdown
  const staffUsers = await db.user.findMany({
    where: { role: { in: [ROLES.ADMIN, ROLES.STAFF] } },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { createdAt: 'asc' },
  });

  const staffUserMap = new Map<string, { id: string; name: string | null; email: string; role: 'ADMIN' | 'STAFF' | 'CUSTOMER' }>();
  const staffEmailMap = new Map<string, { id: string; name: string | null; email: string; role: 'ADMIN' | 'STAFF' | 'CUSTOMER' }>();
  for (const u of staffUsers) {
    const entry = { id: u.id, name: u.name, email: u.email, role: u.role as 'ADMIN' | 'STAFF' };
    staffUserMap.set(u.id, entry);
    staffEmailMap.set(u.email.toLowerCase(), entry);
  }

  let targetUser: { id: string; name: string | null; email: string; role: 'ADMIN' | 'STAFF' | 'CUSTOMER' } | null = null;
  if (!isAll && rawUserId) {
    targetUser = staffUserMap.get(rawUserId) ?? null;
    if (!targetUser) {
      const u = await db.user.findUnique({
        where: { id: rawUserId },
        select: { id: true, name: true, email: true, role: true },
      });
      if (!u) {
        return NextResponse.json({ error: 'User not found.' }, { status: 404 });
      }
      targetUser = { id: u.id, name: u.name, email: u.email, role: (u.role as any) || 'STAFF' };
    }
  }

  const sinceLogin = loginDays > 0 ? new Date(Date.now() - loginDays * 24 * 60 * 60 * 1000) : undefined;
  const sinceAction = actionDays > 0 ? new Date(Date.now() - actionDays * 24 * 60 * 60 * 1000) : undefined;

  const staffIds = staffUsers.map((u) => u.id);
  const staffEmails = staffUsers.map((u) => u.email.toLowerCase());

  const loginWhere: any = targetUser
    ? {
        userId: targetUser.id,
        ...(sinceLogin ? { createdAt: { gte: sinceLogin } } : {}),
      }
    : includeAllLogins
      ? {
          ...(sinceLogin ? { createdAt: { gte: sinceLogin } } : {}),
        }
      : {
          OR: [
            { userId: { in: staffIds } },
            { email: { in: staffEmails } },
            { user: { role: { in: [ROLES.ADMIN, ROLES.STAFF] } } },
          ],
          ...(sinceLogin ? { createdAt: { gte: sinceLogin } } : {}),
        };

  const categoryPrefixes = CATEGORY_PREFIXES[category];
  const categoryOrClause = categoryPrefixes
    ? categoryPrefixes.flatMap((prefix) => [
        { action: { startsWith: `${prefix}.` } },
        { action: { equals: prefix } },
        { entityType: { equals: prefix } },
      ])
    : undefined;

  const activityWhere: any = {
    ...(targetUser ? { userId: targetUser.id } : {}),
    ...(sinceAction ? { createdAt: { gte: sinceAction } } : {}),
    ...(categoryOrClause ? { OR: categoryOrClause } : {}),
  };

  const [logins, activity, totalStoredLogs] = await Promise.all([
    db.loginEvent.findMany({
      where: loginWhere,
      orderBy: { createdAt: 'desc' },
      take: 600,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    }),
    db.activityLog.findMany({
      where: activityWhere,
      orderBy: { createdAt: 'desc' },
      take: 800,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    }),
    db.activityLog.count(),
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
  const distinctActionIps = new Set(activity.map((a) => a.ip).filter(Boolean));

  return NextResponse.json({
    isAll,
    targetUser,
    users: staffUsers,
    days: loginDays,
    actionDays,
    totalStoredLogs,
    stats: {
      totalLogins: logins.length,
      successLogins: logins.filter((l) => l.success).length,
      failedLogins: logins.filter((l) => !l.success).length,
      uniqueIps: Math.max(ips.size, distinctActionIps.size),
      totalActivity: activity.length,
      actions24h,
      activeStaffCount: activeStaffIds.size,
    },
    ips: [...ips.values()].sort((a, b) => b.count - a.count),
    logins: logins.map((row) => {
      const knownStaff =
        (row.userId ? staffUserMap.get(row.userId) : null) ??
        (row.email ? staffEmailMap.get(row.email.toLowerCase()) : null);
      const user =
        row.user ??
        knownStaff ?? {
          id: row.userId || '',
          name: null,
          email: row.email,
          role: 'CUSTOMER' as const,
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

/**
 * Prunes activity logs older than `olderThanDays` (minimum 30 days) on explicit Admin request.
 */
export async function DELETE(request: Request) {
  const { session, error } = await requireFullAdmin();
  if (error) return error;

  const url = new URL(request.url);
  const olderThanDays = Math.max(30, parseInt(url.searchParams.get('olderThanDays') || '90', 10));
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

  const deleted = await db.activityLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });

  await recordActivity({
    userId: session.id,
    action: 'settings.logs_pruned',
    entityType: 'system',
    entityId: `>${olderThanDays}d`,
    summary: `Pruned ${deleted.count} activity log entries older than ${olderThanDays} days`,
    ip: requestIp(request),
  });

  return NextResponse.json({
    success: true,
    deletedCount: deleted.count,
    olderThanDays,
  });
}
