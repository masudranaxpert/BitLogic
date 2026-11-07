'use client';

import { BadgeCheck, CircleAlert, CircleDashed } from 'lucide-react';

/** Visual for User.emailVerifiedAt joined onto a customer row. */
export function EmailVerifiedBadge({
  verified,
  compact = false,
}: {
  verified: boolean | null;
  compact?: boolean;
}) {
  if (verified === true) {
    return (
      <span
        className={
          compact
            ? 'inline-flex shrink-0 text-emerald-600 dark:text-emerald-400'
            : 'inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
        }
        title="Email verified"
      >
        <BadgeCheck className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {compact ? null : <span>Verified</span>}
        <span className="sr-only">Email verified</span>
      </span>
    );
  }
  if (verified === false) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
        title="Has a login — email not verified"
      >
        <CircleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden />
        Unverified
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400"
      title="No login account for this email"
    >
      <CircleDashed className="h-3.5 w-3.5 shrink-0" aria-hidden />
      No login
    </span>
  );
}
