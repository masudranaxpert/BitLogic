import { isIpBlocked, recordSecurityEventAsync, recordViolationAsync } from '@/lib/security/ip-rules';

/**
 * Small fixed-window limiter for auth and order endpoints.
 * In-memory: sub-millisecond fast-path with zero database overhead.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 5000) {
      for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
    }
    return { ok: true, retryAfterSec: 0 };
  }
  b.count += 1;
  if (b.count > limit) return { ok: false, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) };
  return { ok: true, retryAfterSec: 0 };
}

function cleanIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const trimmed = ip.trim();
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(trimmed) || /^[0-9a-fA-F:]{2,39}$/.test(trimmed)) {
    return trimmed;
  }
  return null;
}

export function clientIp(request: Request): string {
  const cf = cleanIp(request.headers.get('cf-connecting-ip'));
  if (cf) return cf;

  const real = cleanIp(request.headers.get('x-real-ip'));
  if (real) return real;

  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = cleanIp(forwarded.split(',')[0]);
    if (first) return first;
  }

  return 'local';
}

/**
 * Combined high-speed guard: checks in-memory IP blocklist first,
 * then checks rate-limit, and asynchronously records telemetry on violations.
 */
export function guardRateLimit(
  request: Request,
  endpoint: string,
  limit: number,
  windowMs: number,
): { ok: boolean; blocked: boolean; retryAfterSec: number } {
  const ip = clientIp(request);
  const ua = request.headers.get('user-agent') || undefined;
  if (isIpBlocked(ip)) {
    recordSecurityEventAsync({
      ip,
      endpoint,
      action: 'ip_blocked_403',
      severity: 'critical',
      userAgent: ua,
      details: 'Rejected request from blocked IP address',
    });
    return { ok: false, blocked: true, retryAfterSec: 86400 };
  }
  const res = rateLimit(`${endpoint}:${ip}`, limit, windowMs);
  if (!res.ok) {
    recordViolationAsync(
      ip,
      endpoint,
      `Exceeded limit of ${limit} req/${Math.round(windowMs / 1000)}s`,
      ua,
    );
  }
  return { ok: res.ok, blocked: false, retryAfterSec: res.retryAfterSec };
}

export { isIpBlocked, recordViolationAsync };

