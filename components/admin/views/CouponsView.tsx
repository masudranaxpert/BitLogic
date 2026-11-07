'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Check, ClipboardCopy, Plus, Power } from 'lucide-react';
import type { CouponCode } from '@/lib/admin-data';
import {
  Card,
  StatusIndicator,
  ModalShell,
  EmptyTableState,
  RowMenu,
  SegmentedTabs,
  PaginationFooter,
  formatBDT,
} from '@/components/admin/ui/primitives';

interface CouponsViewProps {
  coupons: CouponCode[];
  onAddCoupon: (coupon: CouponCode) => void;
  onToggleCoupon: (couponId: string) => void;
}

const field =
  'h-10 w-full rounded-md border border-slate-200 bg-white px-3 dark:border-slate-800 dark:bg-slate-950 focus:outline-none focus:border-emerald-600';

const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const digits = (v: string) => v.replace(/[^0-9]/g, '');

function couponState(c: CouponCode) {
  if (c.status === 'disabled') return { tone: 'zinc' as const, label: 'Disabled' };
  if (c.expiresAt && c.expiresAt.slice(0, 10) < today()) return { tone: 'red' as const, label: 'Expired' };
  if (c.maxUses > 0 && c.usedCount >= c.maxUses) return { tone: 'amber' as const, label: 'Used up' };
  return { tone: 'emerald' as const, label: 'Active' };
}

const discount = (c: CouponCode) =>
  c.discountType === 'percentage' ? `${c.discountValue}% off` : `${formatBDT(c.discountValue)} off`;

export default function CouponsView({ coupons, onAddCoupon, onToggleCoupon }: CouponsViewProps) {
  const [filter, setFilter] = useState<'all' | 'live' | 'off'>('all');
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [type, setType] = useState<CouponCode['discountType']>('percentage');
  const [value, setValue] = useState('10');
  const [minSpend, setMinSpend] = useState('0');
  const [maxUses, setMaxUses] = useState('');
  const [expires, setExpires] = useState(plusDays(30));
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const rows = useMemo(
    () =>
      coupons.filter((c) => {
        const live = couponState(c).label === 'Active';
        return filter === 'all' ? true : filter === 'live' ? live : !live;
      }),
    [coupons, filter],
  );
  useEffect(() => setPage(1), [filter, rows.length]);
  const paged = rows.slice((page - 1) * pageSize, page * pageSize);
  const liveCount = coupons.filter((c) => couponState(c).label === 'Active').length;

  const resetForm = () => {
    setCode('');
    setType('percentage');
    setValue('10');
    setMinSpend('0');
    setMaxUses('');
    setExpires(plusDays(30));
    setError('');
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = code.trim().toUpperCase().replace(/\s+/g, '');
    const v = Number(value);
    if (!/^[A-Z0-9_-]{3,24}$/.test(clean)) {
      setError('Code must be 3–24 letters or numbers.');
      return;
    }
    if (coupons.some((c) => c.code === clean)) {
      setError(`${clean} already exists.`);
      return;
    }
    if (!v || (type === 'percentage' && v > 100)) {
      setError(type === 'percentage' ? 'Percent must be 1–100.' : 'Enter an amount.');
      return;
    }
    if (expires && expires < today()) {
      setError('Expiry date is in the past.');
      return;
    }
    onAddCoupon({
      id: `cpn-${Date.now()}`,
      code: clean,
      discountType: type,
      discountValue: v,
      minSpendBDT: Number(minSpend) || 0,
      usedCount: 0,
      maxUses: Number(maxUses) || 0,
      expiresAt: expires,
      status: 'active',
    });
    resetForm();
    setOpen(false);
  };

  const copy = (c: CouponCode) => {
    void navigator.clipboard?.writeText(c.code);
    setCopied(c.id);
    window.setTimeout(() => setCopied((x) => (x === c.id ? null : x)), 1400);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1>Coupons</h1>
        <button
          type="button"
          onClick={() => {
            resetForm();
            setOpen(true);
          }}
          className="inline-flex h-10 items-center gap-1.5 rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 cursor-pointer"
        >
          <Plus className="h-4 w-4" aria-hidden />
          New coupon
        </button>
      </div>

      <SegmentedTabs
        options={[
          { value: 'all', label: 'All', count: coupons.length },
          { value: 'live', label: 'Active', count: liveCount },
          { value: 'off', label: 'Inactive', count: coupons.length - liveCount },
        ]}
        value={filter}
        onChange={setFilter}
      />

      <Card className="overflow-hidden">
        {coupons.length === 0 ? (
          <EmptyTableState title="No coupons yet" />
        ) : rows.length === 0 ? (
          <EmptyTableState title="Nothing here" onReset={() => setFilter('all')} resetLabel="Show all" />
        ) : (
          <>
            <div className="admin-th hidden md:grid grid-cols-[minmax(9rem,1.2fr)_minmax(7rem,1fr)_minmax(6rem,0.8fr)_minmax(7rem,1fr)_minmax(7rem,1fr)_7rem_3rem] gap-4 border-b border-slate-200/80 bg-slate-50/70 px-5 py-2.5 dark:border-slate-800 dark:bg-slate-900/50">
              <span>Code</span>
              <span>Discount</span>
              <span>Min spend</span>
              <span>Used</span>
              <span>Expires</span>
              <span>Status</span>
              <span className="sr-only">Actions</span>
            </div>
            <ul className="divide-y divide-slate-200/70 dark:divide-slate-800">
              {paged.map((c) => {
                const st = couponState(c);
                return (
                  <li key={c.id} className="px-4 py-3.5 sm:px-5">
                    <div className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 md:grid-cols-[minmax(9rem,1.2fr)_minmax(7rem,1fr)_minmax(6rem,0.8fr)_minmax(7rem,1fr)_minmax(7rem,1fr)_7rem_3rem]">
                      <button
                        type="button"
                        onClick={() => copy(c)}
                        title="Copy code"
                        className="inline-flex items-center gap-1.5 justify-self-start font-mono text-sm font-bold tracking-wide text-slate-900 hover:text-emerald-700 dark:text-slate-100 cursor-pointer"
                      >
                        {c.code}
                        {copied === c.id ? <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden /> : null}
                      </button>
                      <span className="hidden md:block font-semibold">{discount(c)}</span>
                      <span className="hidden md:block text-sm text-slate-600 dark:text-slate-300">{c.minSpendBDT > 0 ? formatBDT(c.minSpendBDT) : '—'}</span>
                      <span className="hidden md:block tabular-nums text-sm">{c.usedCount} / {c.maxUses > 0 ? c.maxUses : '∞'}</span>
                      <span className="hidden md:block text-sm text-slate-600 dark:text-slate-300">{c.expiresAt || '—'}</span>
                      <div className="hidden md:block"><StatusIndicator tone={st.tone} label={st.label} /></div>
                      <div className="row-span-2 flex items-center gap-2 justify-self-end md:row-span-1">
                        <span className="md:hidden"><StatusIndicator tone={st.tone} label={st.label} /></span>
                        <RowMenu
                          label={`Actions for ${c.code}`}
                          items={[
                            { label: 'Copy code', icon: ClipboardCopy, onSelect: () => copy(c) },
                            {
                              label: c.status === 'active' ? 'Disable' : 'Enable',
                              icon: Power,
                              tone: c.status === 'active' ? 'danger' : 'default',
                              onSelect: () => onToggleCoupon(c.id),
                            },
                          ]}
                        />
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-300 md:hidden">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{discount(c)}</span>
                        {c.minSpendBDT > 0 ? ` · min ${formatBDT(c.minSpendBDT)}` : ''} · {c.usedCount}/{c.maxUses > 0 ? c.maxUses : '∞'} used
                        {c.expiresAt ? ` · until ${c.expiresAt}` : ''}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
            <PaginationFooter
              totalItems={rows.length}
              pageSize={pageSize}
              currentPage={page}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </>
        )}
      </Card>

      <ModalShell open={open} onClose={() => setOpen(false)} title="New coupon" maxWidth="max-w-md">
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="cpn-code">Code</label>
            <input id="cpn-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="EID25" className={`${field} font-mono uppercase`} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="cpn-type">Type</label>
              <select id="cpn-type" value={type} onChange={(e) => setType(e.target.value as CouponCode['discountType'])} className={field}>
                <option value="percentage">Percent</option>
                <option value="fixed_bdt">Fixed ৳</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="cpn-value">{type === 'percentage' ? 'Percent' : 'Amount (৳)'}</label>
              <input id="cpn-value" inputMode="numeric" value={value} onChange={(e) => setValue(digits(e.target.value))} className={`${field} font-mono`} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="cpn-min">Min spend (৳)</label>
              <input id="cpn-min" inputMode="numeric" value={minSpend} onChange={(e) => setMinSpend(digits(e.target.value))} className={`${field} font-mono`} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="cpn-max">Max uses</label>
              <input id="cpn-max" inputMode="numeric" value={maxUses} onChange={(e) => setMaxUses(digits(e.target.value))} placeholder="Unlimited" className={`${field} font-mono`} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="cpn-exp">Expires</label>
            <input id="cpn-exp" type="date" value={expires} min={today()} onChange={(e) => setExpires(e.target.value)} className={field} />
          </div>
          {error ? <p role="alert" className="text-sm text-rose-600">{error}</p> : null}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setOpen(false)} className="h-10 rounded-md border border-slate-200 px-4 text-sm font-medium dark:border-slate-700 cursor-pointer">Cancel</button>
            <button type="submit" className="h-10 rounded-md bg-emerald-600 px-5 text-sm font-semibold text-white hover:bg-emerald-700 cursor-pointer">Create coupon</button>
          </div>
        </form>
      </ModalShell>
    </div>
  );
}
