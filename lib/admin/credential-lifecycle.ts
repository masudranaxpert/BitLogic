/** Helpers for order window vs credential window (same-order renewals). */

export function addDaysYmd(ymd: string, days: number): string {
  const base = parseYmd(ymd) || new Date();
  base.setDate(base.getDate() + days);
  return formatYmd(base);
}

export function formatYmd(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function formatStamp(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${formatYmd(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function parseYmd(ymd?: string | null): Date | null {
  if (!ymd) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd.trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function daysBetween(fromYmd: string, toYmd: string): number {
  const a = parseYmd(fromYmd);
  const b = parseYmd(toYmd);
  if (!a || !b) return 0;
  const ms = b.getTime() - a.getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

export function todayYmd(): string {
  return formatYmd(new Date());
}

/** Credential assign window: assignedAt + validDays. */
export function computeCredentialExpiresAt(
  assignedAt: string,
  validDays: number,
): string {
  const day = assignedAt.slice(0, 10);
  return addDaysYmd(day, Math.max(1, validDays));
}

export function isCredentialExpired(
  credentialExpiresAt?: string | null,
  asOf = todayYmd(),
): boolean {
  if (!credentialExpiresAt) return false;
  return credentialExpiresAt.slice(0, 10) <= asOf;
}

/** Renew typically opens a few days before credential ends. */
export function isInRenewWindow(
  credentialExpiresAt?: string | null,
  leadDays = 4,
  asOf = todayYmd(),
): boolean {
  if (!credentialExpiresAt) return false;
  const end = credentialExpiresAt.slice(0, 10);
  const openFrom = addDaysYmd(end, -leadDays);
  return asOf >= openFrom && asOf <= end;
}
