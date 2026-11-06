'use client';

import React from 'react';
import type { CredentialType } from '@/lib/admin-data';

export type AdminBadgeTone =
  | 'emerald'
  | 'amber'
  | 'red'
  | 'zinc'
  | 'blue'
  | 'purple';

const TONE_CLASSES: Record<AdminBadgeTone, string> = {
  emerald:
    'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800/60',
  amber:
    'bg-amber-50 text-amber-800 border-amber-200/80 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60',
  red: 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800/60',
  blue: 'bg-sky-50 text-sky-700 border-sky-200/80 dark:bg-sky-950/60 dark:text-sky-400 dark:border-sky-800/60',
  purple:
    'bg-indigo-50 text-indigo-700 border-indigo-200/80 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800/60',
  zinc: 'bg-slate-100 text-slate-700 border-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
};

/** Status / type chip — use for plan type, stock, default, role. Not for toolbars. */
export function AdminBadge({
  label,
  tone = 'zinc',
  icon,
}: {
  label: string;
  tone?: AdminBadgeTone;
  icon?: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border whitespace-nowrap shrink-0 ${TONE_CLASSES[tone]}`}
    >
      {icon}
      <span>{label}</span>
    </span>
  );
}

export function credentialTypeBadgeTone(type: CredentialType): AdminBadgeTone {
  switch (type) {
    case 'token':
      return 'blue';
    case 'email_login':
      return 'emerald';
    case 'license_key':
      return 'amber';
    case 'invite_link':
      return 'purple';
    default:
      return 'zinc';
  }
}
