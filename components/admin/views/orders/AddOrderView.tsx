'use client';

import React, { useMemo, useState } from 'react';
import { ArrowLeft, Minus, Plus, Trash2 } from 'lucide-react';
import type {
  DigitalProduct,
  SubscriberUser,
  VaultCredential,
} from '@/lib/admin/types';
import { Card, SearchableSelect } from '@/components/admin/ui';
import { formatBDT } from '@/components/admin/ui/format';

type Line = {
  key: string;
  productId: string;
  planId: string;
  qty: number;
  qtyText?: string;
  unitPrice: number;
  priceText: string;
  priceTouched: boolean;
};

type PayMode = 'unpaid' | 'partial' | 'paid';

const GATEWAYS = [
  'bKash',
  'Nagad',
  'Rocket',
  'Binance Pay',
  'Stripe',
  'Bank Transfer',
  'Cash',
  'Other',
];

const inputCls =
  'w-full h-10 px-3 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md focus:outline-none focus:border-emerald-600';
const labelCls = 'text-sm font-medium text-slate-700 dark:text-slate-300';

export interface AddOrderViewProps {
  products: DigitalProduct[];
  subscribers: SubscriberUser[];
  vault: VaultCredential[];
  initialCustomerId?: string | null;
  onBack: () => void;
  /** Called after the server created the order. */
  onCreated: (result: { orderId: string; firstDeliveryId?: string }) => void;
}

let lineSeq = 0;
const newLine = (): Line => ({
  key: `ln-${++lineSeq}`,
  productId: '',
  planId: '',
  qty: 1,
  unitPrice: 0,
  priceText: '',
  priceTouched: false,
});

export default function AddOrderView({
  products,
  subscribers,
  vault,
  initialCustomerId,
  onBack,
  onCreated,
}: AddOrderViewProps) {
  const initialCustomer = subscribers.find((s) => s.id === initialCustomerId);

  const [customerMode, setCustomerMode] = useState<'existing' | 'new'>(
    initialCustomer || subscribers.length > 0 ? 'existing' : 'new',
  );
  const [customerId, setCustomerId] = useState(initialCustomer?.id ?? '');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const [lines, setLines] = useState<Line[]>([newLine()]);

  const [payMode, setPayMode] = useState<PayMode>('paid');
  const [partialAmount, setPartialAmount] = useState(0);
  const [partialText, setPartialText] = useState('');
  const [gateway, setGateway] = useState('');
  const [trxId, setTrxId] = useState('');
  const [note, setNote] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const customer = subscribers.find((s) => s.id === customerId);

  const sellable = useMemo(
    () => products.filter((p) => p.status === 'active'),
    [products],
  );
  const productOptions = useMemo(
    () =>
      sellable.map((p) => {
        const defaultVar = p.variants.find((v) => v.isDefault) ?? p.variants[0];
        const stock = defaultVar
          ? vault.filter(
              (v) =>
                v.productId === p.id &&
                v.variantId === defaultVar.id &&
                v.status === 'available',
            ).length
          : 0;
        const autoVault = defaultVar?.deliveryMode === 'auto_vault';
        const empty = autoVault && stock < 1;
        return {
          value: p.id,
          label: empty
            ? p.allowOrderWhenOutOfStock
              ? `${p.name} (no creds · pending assign)`
              : `${p.name} (no credentials)`
            : p.name,
        };
      }),
    [sellable, vault],
  );
  const customerOptions = useMemo(
    () =>
      subscribers.map((s) => ({ value: s.id, label: `${s.name} — ${s.email}` })),
    [subscribers],
  );

  const stockFor = (productId: string, planId: string) =>
    vault.filter(
      (v) =>
        v.productId === productId &&
        v.variantId === planId &&
        v.status === 'available',
    ).length;

  const patchLine = (key: string, patch: Partial<Line>) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const selectProduct = (key: string, productId: string) => {
    const p = products.find((x) => x.id === productId);
    const v = p?.variants.find((x) => x.isDefault) ?? p?.variants[0];
    patchLine(key, {
      productId,
      planId: v?.id ?? '',
      unitPrice: v?.priceBDT ?? 0,
      priceText: String(v?.priceBDT ?? ''),
      priceTouched: false,
    });
  };

  const selectPlan = (key: string, productId: string, planId: string) => {
    const v = products
      .find((x) => x.id === productId)
      ?.variants.find((x) => x.id === planId);
    patchLine(key, {
      planId,
      unitPrice: v?.priceBDT ?? 0,
      priceText: String(v?.priceBDT ?? ''),
      priceTouched: false,
    });
  };

  const total = lines.reduce((n, l) => n + l.unitPrice * l.qty, 0);
  const totalUnits = lines.reduce((n, l) => n + l.qty, 0);
  const paid =
    payMode === 'paid' ? total : payMode === 'partial' ? partialAmount : 0;
  const due = Math.max(0, total - paid);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const buyer =
      customerMode === 'existing' && customer
        ? { name: customer.name, email: customer.email, phone: customer.phone }
        : { name: name.trim(), email: email.trim(), phone: phone.trim() };
    if (!buyer.name || !buyer.email) {
      setError('Select a customer, or enter a name and email.');
      return;
    }
    const incomplete = lines.some((l) => !l.productId || !l.planId);
    if (incomplete) {
      setError('Every line needs a product and a plan.');
      return;
    }
    if (payMode === 'partial' && (partialAmount <= 0 || partialAmount >= total)) {
      setError('Partial amount must be more than 0 and less than the total.');
      return;
    }

    setBusy(true);
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: buyer.name,
          customerEmail: buyer.email,
          customerPhone: buyer.phone,
          items: lines.map((l) => ({
            productId: l.productId,
            planId: l.planId,
            qty: l.qty,
            unitPriceBdt: l.unitPrice,
          })),
          paidBdt: paid,
          gateway: gateway || undefined,
          trxId: trxId.trim() || undefined,
          note: note.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(data.error || 'Could not create the order.');
        return;
      }
      onCreated({
        orderId: data.orderId,
        firstDeliveryId: data.deliveries?.[0]?.id,
      });
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to orders"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-600 text-slate-600 dark:text-slate-300 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden />
          </button>
          <div>
            <h1 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
              Add Order
            </h1>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-8 space-y-5">
          {/* Customer */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-3">
              <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                Customer
              </h2>
              <div className="inline-flex rounded-md border border-slate-200 dark:border-slate-800 overflow-hidden text-xs">
                {(['existing', 'new'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setCustomerMode(m)}
                    className={`px-3 h-7 cursor-pointer ${
                      customerMode === m
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {m === 'existing' ? 'Existing' : 'New customer'}
                  </button>
                ))}
              </div>
            </div>
            {customerMode === 'existing' ? (
              <div className="space-y-1.5">
                <label className={labelCls}>Select customer</label>
                <SearchableSelect
                  value={customerId}
                  options={customerOptions}
                  placeholder="Search by name or email…"
                  searchPlaceholder="Search customer…"
                  onChange={setCustomerId}
                />
                {customer ? (
                  <p className="text-xs text-slate-500">
                    {customer.email}
                    {customer.phone ? ` · ${customer.phone}` : ''}
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className={labelCls}>Name</label>
                  <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
                </div>
                <div className="space-y-1.5">
                  <label className={labelCls}>Email</label>
                  <input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
                </div>
                <div className="space-y-1.5">
                  <label className={labelCls}>Phone (optional)</label>
                  <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" />
                </div>
              </div>
            )}
          </Card>

          {/* Lines */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-3">
              <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                Products
              </h2>
              <button
                type="button"
                onClick={() => setLines((p) => [...p, newLine()])}
                className="inline-flex items-center gap-1 h-8 px-2.5 text-sm font-medium rounded-md border border-slate-200 dark:border-slate-800 hover:border-emerald-600 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden /> Add product
              </button>
            </div>

            <div className="space-y-3">
              {lines.map((l, idx) => {
                const product = products.find((p) => p.id === l.productId);
                const plan = product?.variants.find((v) => v.id === l.planId);
                const stock =
                  plan && plan.deliveryMode === 'auto_vault'
                    ? stockFor(l.productId, l.planId)
                    : null;
                const shortBy =
                  stock !== null && l.qty > stock ? l.qty - stock : 0;
                return (
                  <div
                    key={l.key}
                    className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Line {idx + 1}
                      </span>
                      {lines.length > 1 ? (
                        <button
                          type="button"
                          aria-label={`Remove line ${idx + 1}`}
                          onClick={() => setLines((p) => p.filter((x) => x.key !== l.key))}
                          className="p-1 rounded text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" aria-hidden />
                        </button>
                      ) : null}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className={labelCls}>Product</label>
                        <SearchableSelect
                          value={l.productId}
                          options={productOptions}
                          placeholder="Select product"
                          searchPlaceholder="Search product…"
                          onChange={(pid) => selectProduct(l.key, pid)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className={labelCls}>Plan</label>
                        <select
                          className={inputCls}
                          value={l.planId}
                          disabled={!product}
                          onChange={(e) => selectPlan(l.key, l.productId, e.target.value)}
                        >
                          {!product ? <option value="">Select a product first</option> : null}
                          {product?.variants.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.name} — {formatBDT(v.priceBDT)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 items-end">
                      <div className="space-y-1.5">
                        <label className={labelCls}>Quantity</label>
                        <div className="flex h-9 items-center overflow-hidden rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
                          <button type="button" aria-label="Decrease quantity" onClick={() => patchLine(l.key, { qty: Math.max(1, l.qty - 1), qtyText: undefined })} className="h-full w-9 inline-flex items-center justify-center border-r border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer">
                            <Minus className="w-3.5 h-3.5" aria-hidden />
                          </button>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={l.qtyText ?? String(l.qty)}
                            onChange={(e) => {
                              const t = e.target.value.replace(/[^0-9]/g, '').slice(0, 3);
                              patchLine(l.key, { qtyText: t, qty: Math.max(1, Math.min(100, Number(t) || 1)) });
                            }}
                            onBlur={() => patchLine(l.key, { qtyText: undefined })}
                            className="h-9 w-full bg-transparent px-2 text-center font-mono text-sm tabular-nums focus:outline-none"
                          />
                          <button type="button" aria-label="Increase quantity" onClick={() => patchLine(l.key, { qty: Math.min(100, l.qty + 1), qtyText: undefined })} className="h-full w-9 inline-flex items-center justify-center border-l border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer">
                            <Plus className="w-3.5 h-3.5" aria-hidden />
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className={labelCls}>Unit price (৳)</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          className={`${inputCls} font-mono tabular-nums`}
                          value={l.priceText}
                          onChange={(e) => {
                            const t = e.target.value.replace(/[^0-9]/g, '');
                            patchLine(l.key, { priceText: t, unitPrice: Number(t) || 0, priceTouched: true });
                          }}
                        />
                      </div>
                      <div className="col-span-2 sm:col-span-1 text-right">
                        <div className="text-xs text-slate-500">Line total</div>
                        <div className="font-mono text-sm font-semibold tabular-nums">
                          {formatBDT(l.unitPrice * l.qty)}
                        </div>
                      </div>
                    </div>
                    {plan ? (
                      <p className="text-xs text-slate-500">
                        {stock === null
                          ? 'Manual dispatch'
                          : shortBy > 0
                            ? `In stock ${stock} · ${shortBy} pending`
                            : `In stock ${stock}`}
                        {l.priceTouched && l.unitPrice !== plan.priceBDT
                          ? ` List price ${formatBDT(plan.priceBDT)}.`
                          : ''}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Payment */}
          <Card className="p-5 space-y-4">
            <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200/80 dark:border-slate-800 pb-3">
              Payment
            </h2>
            <div className="inline-flex rounded-md border border-slate-200 dark:border-slate-800 overflow-hidden text-sm">
              {([
                ['paid', 'Paid in full'],
                ['partial', 'Partially paid'],
                ['unpaid', 'Not paid yet'],
              ] as const).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setPayMode(v)}
                  className={`px-3 h-8 cursor-pointer ${
                    payMode === v
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {payMode === 'partial' ? (
                <div className="space-y-1.5">
                  <label className={labelCls}>Amount received (৳)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    className={`${inputCls} font-mono tabular-nums`}
                    value={partialText}
                    onChange={(e) => {
                      const t = e.target.value.replace(/[^0-9]/g, '');
                      setPartialText(t);
                      setPartialAmount(Number(t) || 0);
                    }}
                  />
                </div>
              ) : null}
              <div className="space-y-1.5">
                <label className={labelCls}>Gateway</label>
                <select className={inputCls} value={gateway} onChange={(e) => setGateway(e.target.value)}>
                  <option value="">Not specified</option>
                  {GATEWAYS.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>Transaction / Ref ID</label>
                <input className={`${inputCls} font-mono`} value={trxId} onChange={(e) => setTrxId(e.target.value)} placeholder="Optional" />
              </div>
            </div>
          </Card>

          {/* Note */}
          <Card className="p-5 space-y-3">
            <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200/80 dark:border-slate-800 pb-3">
              Order note <span className="font-normal text-slate-500">(optional)</span>
            </h2>
            <textarea
              rows={3}
              maxLength={2000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Internal note"
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md focus:outline-none focus:border-emerald-600"
            />
          </Card>
        </div>

        {/* Summary */}
        <div className="lg:col-span-4 lg:sticky lg:top-4">
          <Card className="p-5 space-y-3">
            <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
              Summary
            </h2>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Lines</dt><dd className="font-mono tabular-nums">{lines.length}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Units</dt><dd className="font-mono tabular-nums">{totalUnits}</dd></div>
              <div className="flex justify-between border-t border-slate-200 dark:border-slate-800 pt-2"><dt className="font-medium">Total</dt><dd className="font-mono tabular-nums font-semibold">{formatBDT(total)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Received</dt><dd className="font-mono tabular-nums">{formatBDT(paid)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Due</dt><dd className={`font-mono tabular-nums ${due > 0 ? 'text-amber-700 dark:text-amber-400' : ''}`}>{formatBDT(due)}</dd></div>
            </dl>
            {error ? (
              <p role="alert" className="rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={busy}
              className="w-full h-10 rounded-md bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-semibold cursor-pointer"
            >
              {busy ? 'Creating…' : 'Create order'}
            </button>
            <button
              type="button"
              onClick={onBack}
              className="w-full h-9 rounded-md border border-slate-200 dark:border-slate-800 text-sm font-medium cursor-pointer"
            >
              Cancel
            </button>
          </Card>
        </div>
      </div>
    </form>
  );
}
