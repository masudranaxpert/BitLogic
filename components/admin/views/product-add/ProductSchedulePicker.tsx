'use client';

import React, { useEffect, useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { Card, StatusIndicator, SwitchToggle } from '@/components/admin/ui/primitives';
import { scheduleState, shortDuration } from '@/lib/catalog/schedule';

const pad = (n: number) => String(n).padStart(2, '0');

/** ISO (UTC) → value for <input type="datetime-local"> in the admin's own time zone. */
function toLocalInput(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** datetime-local value → ISO (UTC). Empty or invalid → ''. */
function fromLocalInput(v: string): string {
  if (!v) return '';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

/** Problem with a window, or '' when it is fine. Used by the form to block saving. */
export function scheduleProblem(from: string, until: string): string {
  if (from && until && new Date(until).getTime() <= new Date(from).getTime()) {
    return 'The closing time must be after the opening time.';
  }
  return '';
}

const PRESETS: Array<{ label: string; ms: number }> = [
  { label: '+1 day', ms: 86_400_000 },
  { label: '+3 days', ms: 3 * 86_400_000 },
  { label: '+7 days', ms: 7 * 86_400_000 },
  { label: '+30 days', ms: 30 * 86_400_000 },
];

const input =
  'h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-950 focus:outline-none focus:border-emerald-600';

export default function ProductSchedulePicker({
  from,
  until,
  onChange,
}: {
  /** ISO strings (UTC); '' = not set. */
  from: string;
  until: string;
  onChange: (next: { from: string; until: string }) => void;
}) {
  const [on, setOn] = useState(Boolean(from || until));
  // Keep the switch in step when another product is loaded into the form.
  useEffect(() => {
    if (from || until) setOn(true);
  }, [from, until]);
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const problem = scheduleProblem(from, until);
  const st = scheduleState({ availableFrom: from || null, availableUntil: until || null }, now ?? 0);
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  let summary: { tone: 'emerald' | 'amber' | 'blue' | 'zinc'; label: string; text: string } | null = null;
  if (on && now !== null && !problem && (from || until)) {
    if (st.state === 'upcoming') {
      summary = { tone: 'blue', label: 'Not open yet', text: `Opens ${fmt(from)} (in ${shortDuration(st.msLeft ?? 0)}). Until then customers see a countdown and cannot order.` };
    } else if (st.state === 'ended') {
      summary = { tone: 'amber', label: 'Closed', text: `Closed on ${fmt(until)}. Customers can see the product but cannot order it. Change the closing time to reopen.` };
    } else if (until) {
      summary = { tone: 'emerald', label: 'On sale', text: `Customers can order until ${fmt(until)} (${shortDuration(st.msLeft ?? 0)} from now). A countdown shows on the product.` };
    } else {
      summary = { tone: 'emerald', label: 'On sale', text: 'Open now with no closing time.' };
    }
  }

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-start justify-between gap-3 border-b border-slate-200/80 pb-3 dark:border-slate-800">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
            <CalendarClock className="h-4 w-4 text-slate-500" aria-hidden />
            Order window
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Limit when customers can place <strong className="font-semibold">new</strong> orders, for limited-time
            offers or a future launch. People who already own it can still renew.
          </p>
        </div>
        <SwitchToggle
          checked={on}
          label={on ? 'On' : 'Off'}
          onChange={(next) => {
            setOn(next);
            if (!next) onChange({ from: '', until: '' });
          }}
        />
      </div>

      {on ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="admin-label block">Opens <span className="font-normal text-slate-400">(optional)</span></span>
              <input
                type="datetime-local"
                value={toLocalInput(from)}
                onChange={(e) => onChange({ from: fromLocalInput(e.target.value), until })}
                className={input}
              />
              <span className="block text-[11px] text-slate-500">Empty = already open.</span>
            </label>
            <label className="space-y-1.5">
              <span className="admin-label block">Closes <span className="font-normal text-slate-400">(optional)</span></span>
              <input
                type="datetime-local"
                value={toLocalInput(until)}
                onChange={(e) => onChange({ from, until: fromLocalInput(e.target.value) })}
                className={input}
              />
              <span className="block text-[11px] text-slate-500">Empty = never closes.</span>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs text-slate-500">Close in</span>
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  const d = new Date(Date.now() + p.ms);
                  d.setSeconds(0, 0);
                  onChange({ from, until: d.toISOString() });
                }}
                className="h-8 rounded-md border border-slate-200 px-2.5 text-xs font-medium hover:border-emerald-600 dark:border-slate-700 cursor-pointer"
              >
                {p.label}
              </button>
            ))}
            {from || until ? (
              <button
                type="button"
                onClick={() => onChange({ from: '', until: '' })}
                className="h-8 rounded-md px-2.5 text-xs font-medium text-slate-500 hover:text-rose-600 cursor-pointer"
              >
                Clear
              </button>
            ) : null}
          </div>

          {problem ? (
            <p role="alert" className="m-0 text-sm font-medium text-rose-600">
              {problem}
            </p>
          ) : summary ? (
            <div className="flex items-start gap-2.5 rounded-lg bg-slate-50 px-3 py-2.5 dark:bg-slate-900/60">
              <StatusIndicator tone={summary.tone} label={summary.label} />
              <p className="m-0 text-sm text-slate-600 dark:text-slate-300">{summary.text}</p>
            </div>
          ) : (
            <p className="m-0 text-sm text-slate-500">Pick an opening and/or closing time.</p>
          )}
          <p className="m-0 text-[11px] text-slate-400">Times are in your time zone ({tz}).</p>
        </div>
      ) : null}
    </Card>
  );
}
