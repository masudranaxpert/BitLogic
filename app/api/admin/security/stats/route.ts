import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/auth/require-admin';

export async function GET() {
  const { error } = await requirePermission('settings');
  if (error) return error;

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // 1. Core metric counts
  const [blockedCount, flaggedCount, whitelistedCount, totalEvents24h] = await Promise.all([
    db.ipRule.count({ where: { status: 'blocked' } }),
    db.ipRule.count({ where: { status: 'flagged' } }),
    db.ipRule.count({ where: { status: 'whitelisted' } }),
    db.securityEvent.count({ where: { createdAt: { gte: oneDayAgo } } }),
  ]);

  // 2. Query 24h security events and real operational activity to build hourly timeline
  const [events24h, activity24h, logins24h, sms24h] = await Promise.all([
    db.securityEvent.findMany({
      where: { createdAt: { gte: oneDayAgo } },
      select: { action: true, endpoint: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
    db.activityLog.findMany({
      where: { createdAt: { gte: oneDayAgo } },
      select: { createdAt: true },
    }),
    db.loginEvent.findMany({
      where: { createdAt: { gte: oneDayAgo }, success: true },
      select: { createdAt: true },
    }),
    db.mfsSmsLog.findMany({
      where: { createdAt: { gte: oneDayAgo } },
      select: { createdAt: true },
    }),
  ]);

  // Group into 24 one-hour buckets
  const hourlyBuckets = new Map<string, { hour: string; allowed: number; rateLimited: number; blocked: number }>();
  for (let i = 23; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 60 * 60 * 1000);
    const hourKey = `${String(d.getHours()).padStart(2, '0')}:00`;
    hourlyBuckets.set(hourKey, { hour: hourKey, allowed: 0, rateLimited: 0, blocked: 0 });
  }

  for (const row of [...activity24h, ...logins24h, ...sms24h]) {
    const hourKey = `${String(row.createdAt.getHours()).padStart(2, '0')}:00`;
    const bucket = hourlyBuckets.get(hourKey);
    if (bucket) {
      bucket.allowed += 1;
    }
  }

  const endpointMap = new Map<string, number>();

  for (const ev of events24h) {
    const hourKey = `${String(ev.createdAt.getHours()).padStart(2, '0')}:00`;
    const bucket = hourlyBuckets.get(hourKey);
    if (bucket) {
      if (ev.action === 'rate_limit_429') {
        bucket.rateLimited += 1;
      } else if (ev.action === 'ip_blocked_403') {
        bucket.blocked += 1;
      }
    }
    endpointMap.set(ev.endpoint, (endpointMap.get(ev.endpoint) || 0) + 1);
  }

  const timeline = Array.from(hourlyBuckets.values());

  // Top targeted endpoints
  const topAttackEndpoints = Array.from(endpointMap.entries())
    .map(([endpoint, hits]) => ({ endpoint, hits }))
    .sort((a, b) => b.hits - a.hits)
    .slice(0, 5);

  // Latest 8 events
  const recentEvents = await db.securityEvent.findMany({
    take: 8,
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({
    metrics: {
      blockedIps: blockedCount,
      flaggedIps: flaggedCount,
      whitelistedIps: whitelistedCount,
      events24h: totalEvents24h,
    },
    timeline,
    topAttackEndpoints,
    recentEvents,
  });
}
