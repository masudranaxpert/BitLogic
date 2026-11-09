import { db } from '@/lib/db';
import { clientIp } from '@/lib/auth/rate-limit';

export type ActivityInput = {
  userId: string;
  action: string;
  summary: string;
  entityType?: string;
  entityId?: string;
  ip?: string;
};

export type SystemActivityInput = Omit<ActivityInput, 'userId'> & {
  userId?: string | null;
};

let cachedSystemUserId: string | null = null;

async function resolveSystemActorId(explicitUserId?: string | null): Promise<string | null> {
  if (explicitUserId) return explicitUserId;
  if (cachedSystemUserId) return cachedSystemUserId;
  try {
    const admin = await db.user.findFirst({
      where: { role: 'ADMIN' },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });
    if (admin?.id) {
      cachedSystemUserId = admin.id;
      return admin.id;
    }
    const anyUser = await db.user.findFirst({
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });
    if (anyUser?.id) {
      cachedSystemUserId = anyUser.id;
      return anyUser.id;
    }
  } catch {
    // Ignore DB lookup errors
  }
  return null;
}

function clip(value: string, max: number) {
  return value.replace(/\s+/g, ' ').trim().slice(0, max);
}

/** Never throws. A failed audit row must not block the action that caused it. */
export async function recordActivity(input: ActivityInput) {
  if (!input.userId || !input.summary.trim()) return;
  try {
    await db.activityLog.create({
      data: {
        userId: input.userId,
        action: clip(input.action, 80),
        entityType: clip(input.entityType || '', 40),
        entityId: clip(input.entityId || '', 80),
        summary: clip(input.summary, 300),
        ip: clip(input.ip || '', 64),
      },
    });
  } catch (err) {
    console.error('[audit]', err instanceof Error ? err.message : err);
  }
}

/**
 * Records system/automated/customer events into ActivityLog by attributing them
 * to the explicit userId if provided, or falling back to the primary ADMIN user
 * so 100% of platform events appear in the Admin Activity Logs view.
 */
export async function recordSystemActivity(input: SystemActivityInput) {
  try {
    const actorId = await resolveSystemActorId(input.userId);
    if (!actorId) return;
    await recordActivity({
      ...input,
      userId: actorId,
    });
  } catch (err) {
    console.error('[audit system]', err instanceof Error ? err.message : err);
  }
}

export async function recordActivities(rows: ActivityInput[]) {
  const data = rows
    .filter((row) => row.userId && row.summary.trim())
    .slice(0, 80)
    .map((row) => ({
      userId: row.userId,
      action: clip(row.action, 80),
      entityType: clip(row.entityType || '', 40),
      entityId: clip(row.entityId || '', 80),
      summary: clip(row.summary, 300),
      ip: clip(row.ip || '', 64),
    }));
  if (!data.length) return;
  try {
    await db.activityLog.createMany({ data });
  } catch (err) {
    console.error('[audit]', err instanceof Error ? err.message : err);
  }
}

export async function recordLogin(input: {
  userId?: string | null;
  email: string;
  success: boolean;
  ip: string;
  userAgent?: string;
  method?: string;
}) {
  try {
    await db.loginEvent.create({
      data: {
        userId: input.userId || null,
        email: clip(input.email.toLowerCase(), 120),
        method: clip(input.method || 'password', 40),
        success: input.success,
        ip: clip(input.ip, 64),
        userAgent: clip(input.userAgent || '', 180),
      },
    });
  } catch (err) {
    console.error('[audit login]', err instanceof Error ? err.message : err);
  }
}

export function requestIp(request: Request) {
  return clientIp(request);
}

export function requestAgent(request: Request) {
  return request.headers.get('user-agent') || '';
}
