/**
 * Order window of a plan (one place, used by the server and the UI).
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

/**
 * Window a product card should show.
 * A card stays open when any plan can be ordered, so mixed plans don't stamp the whole product.
 */
export function listingWindow(plans: ScheduleFields[]): ScheduleFields {
  if (plans.some((p) => !p.availableFrom && !p.availableUntil)) return {};
  const dated = plans.filter((p) => p.availableFrom || p.availableUntil);
  if (dated.length === 0) return {};
  const open = dated.filter((p) => scheduleState(p).canOrder);
  if (open.length === 0) {
    const upcoming = dated
      .filter((p) => scheduleState(p).state === 'upcoming')
      .sort((a, b) => (ms(a.availableFrom) ?? 0) - (ms(b.availableFrom) ?? 0));
    const pick = upcoming[0] || dated[0];
    return { availableFrom: pick.availableFrom, availableUntil: pick.availableUntil };
  }
  const closing = open
    .filter((p) => p.availableUntil)
    .sort((a, b) => (ms(a.availableUntil) ?? 0) - (ms(b.availableUntil) ?? 0));
  return closing[0]
    ? { availableFrom: closing[0].availableFrom, availableUntil: closing[0].availableUntil }
    : {};
}
