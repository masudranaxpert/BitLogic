/**
 * Warranty model (one place, used by server and UI):
 * - The clock starts when the item is delivered (or when an admin sets it), not at order time.
 * - It never runs past the paid access period: end = min(start + days, accessEnd).
 * - An early renewal queues the next period's warranty in `next*`; it takes over when
 *   that period starts. Warranties never stack or overlap.
 * Stamps are local 'YYYY-MM-DD HH:mm' strings (a bare 'YYYY-MM-DD' means start of day).
 */

export type WarrantyFields = {
  hasWarranty?: boolean | null;
  warrantyDays?: number | null;
  warrantyStartsAt?: string | null;
  warrantyEndsAt?: string | null;
  nextWarrantyStartsAt?: string | null;
  nextWarrantyEndsAt?: string | null;
  orderExpiresAt?: string | null;
};

export type WarrantyState = {
  /** none: plan has no warranty · pending: not delivered yet · scheduled: starts later ·
   *  active · ended */
  state: 'none' | 'pending' | 'scheduled' | 'active' | 'ended';
  startsAt: string | null;
  endsAt: string | null;
  /** Whole days left (ceil) while active; 0 otherwise. */
  daysLeft: number;
  /** Queued warranty of an already-paid next period, if any. */
  nextStartsAt: string | null;
};

const pad = (n: number) => String(n).padStart(2, '0');

export function toStamp(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function parseStamp(s?: string | null): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/.exec(s.trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4] || 0), Number(m[5] || 0));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Access end dates are whole days: the item is usable through that day. */
function accessEndOf(orderExpiresAt?: string | null): Date | null {
  const d = parseStamp(orderExpiresAt);
  if (!d) return null;
  if (!/\d{2}:\d{2}/.test(orderExpiresAt || '')) d.setHours(23, 59, 0, 0);
  return d;
}

/** Warranty window for a period that starts at `start`. */
export function warrantyWindow(
  start: Date,
  warrantyDays: number,
  accessEnd?: string | null,
): { startsAt: string; endsAt: string } {
  const end = new Date(start.getTime() + Math.max(0, warrantyDays) * 86_400_000);
  const cap = accessEndOf(accessEnd);
  return { startsAt: toStamp(start), endsAt: toStamp(cap && cap < end ? cap : end) };
}

export function warrantyState(u: WarrantyFields, now = new Date()): WarrantyState {
  const nextStart = parseStamp(u.nextWarrantyStartsAt);
  const useNext = Boolean(nextStart && nextStart <= now);
  const startsAt = useNext ? u.nextWarrantyStartsAt ?? null : u.warrantyStartsAt ?? null;
  const endsAt = useNext ? u.nextWarrantyEndsAt ?? null : u.warrantyEndsAt ?? null;
  const queued = !useNext && nextStart ? u.nextWarrantyStartsAt ?? null : null;

  if (!u.hasWarranty || !u.warrantyDays) {
    return { state: 'none', startsAt: null, endsAt: null, daysLeft: 0, nextStartsAt: null };
  }
  const s = parseStamp(startsAt);
  const e = parseStamp(endsAt);
  if (!s || !e) return { state: 'pending', startsAt: null, endsAt: null, daysLeft: 0, nextStartsAt: queued };
  if (now < s) return { state: 'scheduled', startsAt, endsAt, daysLeft: 0, nextStartsAt: queued };
  if (now >= e) return { state: 'ended', startsAt, endsAt, daysLeft: 0, nextStartsAt: queued };
  return {
    state: 'active',
    startsAt,
    endsAt,
    daysLeft: Math.max(1, Math.ceil((e.getTime() - now.getTime()) / 86_400_000)),
    nextStartsAt: queued,
  };
}

/** Renewal window around an item's end date. */
export function renewWindow(
  orderExpiresAt: string | null | undefined,
  openDaysBefore: number,
  graceDaysAfter: number,
  now = new Date(),
): { state: 'open' | 'not_yet' | 'closed' | 'unknown'; opensOn: string | null; closesOn: string | null } {
  const end = parseStamp(orderExpiresAt);
  if (!end) return { state: 'unknown', opensOn: null, closesOn: null };
  const day = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const opens = new Date(end);
  opens.setDate(opens.getDate() - openDaysBefore);
  const closes = new Date(end);
  closes.setDate(closes.getDate() + graceDaysAfter);
  closes.setHours(23, 59, 0, 0);
  const state = now < opens ? 'not_yet' : now > closes ? 'closed' : 'open';
  return { state, opensOn: day(opens), closesOn: day(closes) };
}

export type DurationUnit = 'hours' | 'days' | 'months';

export function normalizeDurationUnit(
  raw?: string | null,
  days?: number,
): DurationUnit {
  if (raw === 'hours' || raw === 'months') return raw;
  if (raw === 'days') {
    if (typeof days === 'number' && days > 0 && days < 1) return 'hours';
    return 'days';
  }
  if (typeof days === 'number' && days > 0) {
    if (days < 1) return 'hours';
    if (days >= 30 && days % 30 === 0) return 'months';
  }
  return 'days';
}

export function calculateDays(value: number, unit: DurationUnit): number {
  const val = Math.max(0, Number.isFinite(value) ? value : 0);
  if (unit === 'hours') return Number((val / 24).toFixed(6));
  if (unit === 'months') return Math.round(val * 30);
  return Number(val.toFixed(6));
}

export function unitFromDays(
  days: number,
  preferredUnit?: string | null,
): { value: number; unit: DurationUnit } {
  const safeDays = Math.max(0, Number.isFinite(days) ? days : 0);
  const unit = normalizeDurationUnit(preferredUnit, safeDays);
  if (safeDays <= 0) return { value: 0, unit };
  if (unit === 'hours') {
    return { value: Number((safeDays * 24).toFixed(2)), unit: 'hours' };
  }
  if (unit === 'months') {
    return { value: Number((safeDays / 30).toFixed(2)), unit: 'months' };
  }
  return { value: Number(safeDays.toFixed(2)), unit: 'days' };
}

export function formatDurationDays(
  days: number,
  preferredUnit?: string | null,
): string {
  const { value, unit } = unitFromDays(days, preferredUnit);
  if (value <= 0) return '0 Days';
  if (unit === 'hours') return `${value} ${value === 1 ? 'Hour' : 'Hours'}`;
  if (unit === 'months') return `${value} ${value === 1 ? 'Month' : 'Months'}`;
  return `${value} ${value === 1 ? 'Day' : 'Days'}`;
}

