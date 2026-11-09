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
