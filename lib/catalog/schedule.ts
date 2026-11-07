/**
 * Order window of a product (one place, used by the server and the UI).
 * - before `from`  → 'upcoming': listed, but cannot be ordered yet
 * - until `until`  → 'live': can be ordered (a countdown is shown when `until` is set)
 * - from `until`   → 'ended': listed as ended, cannot be ordered
 * Only NEW orders are affected. Renewals of items a customer already owns are never blocked.
 * Times are ISO strings (UTC).
 */

export type ScheduleFields = {
  availableFrom?: string | null;
  availableUntil?: string | null;
};

export type ScheduleState = {
  state: 'always' | 'upcoming' | 'live' | 'ended';
  /** Can a customer place a new order right now? */
  canOrder: boolean;
  /** Milliseconds until the next change (start or end), or null when nothing is scheduled. */
  msLeft: number | null;
};

const ms = (iso?: string | null) => {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : t;
};

export function scheduleState(p: ScheduleFields, now: number = Date.now()): ScheduleState {
  const from = ms(p.availableFrom);
  const until = ms(p.availableUntil);
  if (from === null && until === null) return { state: 'always', canOrder: true, msLeft: null };
  if (from !== null && now < from) return { state: 'upcoming', canOrder: false, msLeft: from - now };
  if (until !== null && now >= until) return { state: 'ended', canOrder: false, msLeft: 0 };
  return { state: 'live', canOrder: true, msLeft: until !== null ? until - now : null };
}

/** { d: 2, h: 4, m: 9, s: 30 } for a number of milliseconds. */
export function splitDuration(msLeft: number) {
  const total = Math.max(0, Math.floor(msLeft / 1000));
  return {
    d: Math.floor(total / 86_400),
    h: Math.floor((total % 86_400) / 3600),
    m: Math.floor((total % 3600) / 60),
    s: total % 60,
  };
}

/** "2d 4h", "5h 12m", "9m 30s": the two biggest units, for tight spaces. */
export function shortDuration(msLeft: number): string {
  const { d, h, m, s } = splitDuration(msLeft);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}
