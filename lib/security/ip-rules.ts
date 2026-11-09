import { db } from '@/lib/db';

type CachedIpRule = {
  status: 'blocked' | 'flagged' | 'whitelisted';
  expiresAt: number | null;
};

// In-memory fast cache for O(1) lookups without database hits
const ipCache = new Map<string, CachedIpRule>();
let lastCacheSync = 0;
const CACHE_TTL_MS = 30_000; // 30 seconds

/**
 * Sync active IP rules from the database to memory cache.
 */
export async function syncIpRulesCache(): Promise<void> {
  try {
    const rules = await db.ipRule.findMany({
      select: { ip: true, status: true, expiresAt: true },
    });
    const now = Date.now();
    ipCache.clear();
    for (const r of rules) {
      if (r.expiresAt && r.expiresAt.getTime() <= now) continue;
      ipCache.set(r.ip, {
        status: r.status as 'blocked' | 'flagged' | 'whitelisted',
        expiresAt: r.expiresAt ? r.expiresAt.getTime() : null,
      });
    }
    lastCacheSync = Date.now();
  } catch (err) {
    console.error('[syncIpRulesCache] Failed to load rules from db:', err);
  }
}

/**
 * Fast O(1) check if an IP is currently blocked.
 * Triggers background cache refresh if expired, never blocks request.
 */
export function isIpBlocked(ip: string): boolean {
  if (ip === 'local' || ip === '127.0.0.1' || ip === '::1') return false;

  const now = Date.now();
  if (now - lastCacheSync > CACHE_TTL_MS) {
    // Non-blocking background sync
    void syncIpRulesCache();
  }

  const rule = ipCache.get(ip);
  if (!rule) return false;
  if (rule.status !== 'blocked') return false;
  if (rule.expiresAt && rule.expiresAt <= now) {
    ipCache.delete(ip);
    return false;
  }
  return true;
}

/**
 * Add or update an IP in the local memory cache immediately.
 */
export function updateIpCacheMemory(ip: string, status: 'blocked' | 'flagged' | 'whitelisted', expiresAt: number | null) {
  ipCache.set(ip, { status, expiresAt });
}

/**
 * Remove an IP from local memory cache.
 */
export function removeIpFromCacheMemory(ip: string) {
  ipCache.delete(ip);
}

// -------------------------------------------------------------
// Asynchronous Security Telemetry Buffer (Zero Request Delay)
// -------------------------------------------------------------

type PendingSecurityEvent = {
  ip: string;
  endpoint: string;
  action: string;
  severity: string;
  userAgent?: string | null;
  details?: string | null;
};

const eventBuffer: PendingSecurityEvent[] = [];
let flushTimeout: NodeJS.Timeout | null = null;

async function flushBuffer() {
  if (eventBuffer.length === 0) return;
  const batch = eventBuffer.splice(0, 100);
  try {
    await db.securityEvent.createMany({
      data: batch.map((e) => ({
        ip: e.ip,
        endpoint: e.endpoint,
        action: e.action,
        severity: e.severity,
        userAgent: e.userAgent || null,
        details: e.details || null,
      })),
    });
  } catch (err) {
    console.error('[flushBuffer] Failed to persist security events:', err);
  }
}

/**
 * Record a security incident asynchronously without awaiting database writes.
 */
export function recordSecurityEventAsync(event: PendingSecurityEvent): void {
  eventBuffer.push(event);
  if (!flushTimeout) {
    flushTimeout = setTimeout(() => {
      flushTimeout = null;
      void flushBuffer();
    }, 1500);
  }
}

/**
 * Record a rate-limit violation and auto-escalate offending IP if threshold exceeded.
 */
export function recordViolationAsync(
  ip: string,
  endpoint: string,
  reason: string,
  userAgent?: string,
): void {
  if (ip === 'local' || ip === '127.0.0.1' || ip === '::1') return;

  // 1. Queue telemetry log
  recordSecurityEventAsync({
    ip,
    endpoint,
    action: 'rate_limit_429',
    severity: 'warning',
    userAgent,
    details: reason,
  });

  // 2. Non-blocking IP rule upsert in background
  setImmediate(async () => {
    try {
      const existing = await db.ipRule.findUnique({ where: { ip } });
      if (existing) {
        const nextHits = existing.hitCount + 1;
        // Auto-block if flagged and hits exceed 15 violations
        const shouldAutoBlock = existing.status === 'flagged' && nextHits >= 15;
        await db.ipRule.update({
          where: { ip },
          data: {
            hitCount: nextHits,
            status: shouldAutoBlock ? 'blocked' : existing.status,
            reason: shouldAutoBlock ? 'Auto-blocked: Repeated rate limit abuse' : existing.reason,
          },
        });
        if (shouldAutoBlock) {
          updateIpCacheMemory(ip, 'blocked', null);
        }
      } else {
        // Flag for admin review
        await db.ipRule.create({
          data: {
            ip,
            status: 'flagged',
            reason,
            hitCount: 1,
          },
        });
        updateIpCacheMemory(ip, 'flagged', null);
      }
    } catch {
      // Ignore background write errors
    }
  });
}
