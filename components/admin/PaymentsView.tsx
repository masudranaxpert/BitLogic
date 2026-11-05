'use client';

import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { PaymentTransaction, CouponCode } from '@/lib/admin-data';
import {
  Card,
  StatMetric,
  formatBDT,
  StatusIndicator,
  SegmentedTabs,
  SwitchToggle,
  ShadcnCheckbox,
  PaginationFooter,
  ModalShell,
  EmptyTableState,
} from '@/components/ui/primitives';

interface PaymentsViewProps {
  payments: PaymentTransaction[];
  coupons: CouponCode[];
  onVerifyPayment: (paymentId: string) => void;
  onRejectOrRefundPayment: (paymentId: string, nextStatus: 'rejected' | 'refunded') => void;
  onAddCoupon: (coupon: CouponCode) => void;
  onToggleCoupon: (couponId: string) => void;
}

export default function PaymentsView({
  payments,
  coupons,
  onVerifyPayment,
  onRejectOrRefundPayment,
  onAddCoupon,
  onToggleCoupon,
}: PaymentsViewProps) {
  const [payFilter, setPayFilter] = useState<'all' | 'pending_verification' | 'verified' | 'refunded'>('all');
  const [showStatistics, setShowStatistics] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isNewCouponOpen, setIsNewCouponOpen] = useState(false);
  const [cpnCode, setCpnCode] = useState('');
  const [cpnType, setCpnType] = useState<'percentage' | 'fixed_bdt'>('percentage');
  const [cpnValue, setCpnValue] = useState(15);
  const [cpnMinSpend, setCpnMinSpend] = useState(500);
  const [cpnMaxUses, setCpnMaxUses] = useState(100);

  const filteredPayments = payments.filter((p) =>
    payFilter === 'all'
      ? true
      : payFilter === 'refunded'
      ? p.status === 'refunded' || p.status === 'rejected'
      : p.status === payFilter
  );

  const handleCreateCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cpnCode.trim()) return;
    onAddCoupon({
      id: `cpn-${Date.now()}`,
      code: cpnCode.trim().toUpperCase(),
      discountType: cpnType,
      discountValue: cpnValue,
      minSpendBDT: cpnMinSpend,
      usedCount: 0,
      maxUses: cpnMaxUses,
      expiresAt: '2027-01-31',
      status: 'active',
    });
    setCpnCode('');
    setIsNewCouponOpen(false);
  };

  const verifiedTotal = payments
    .filter((p) => p.status === 'verified')
    .reduce((s, p) => s + p.amountBDT, 0);
  const pendingCount = payments.filter((p) => p.status === 'pending_verification').length;
  const refundedOrRejectedCount = payments.filter(
    (p) => p.status === 'refunded' || p.status === 'rejected'
  ).length;
  const totalCouponUses = coupons.reduce((s, c) => s + c.usedCount, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="font-display text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          Payments
        </h1>

        <button
          type="button"
          onClick={() => setIsNewCouponOpen(true)}
          className="px-3.5 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white rounded-md shadow-2xs inline-flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Coupon</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <SegmentedTabs
          options={[
            { value: 'all', label: 'All', count: payments.length },
            {
              value: 'pending_verification',
              label: 'Pending TrxID',
              count: pendingCount,
            },
            {
              value: 'verified',
              label: 'Verified',
              count: payments.filter((p) => p.status === 'verified').length,
            },
            {
              value: 'refunded',
              label: 'Refunded',
              count: refundedOrRejectedCount,
            },
          ]}
          value={payFilter}
          onChange={setPayFilter}
        />

        <SwitchToggle
          checked={showStatistics}
          onChange={setShowStatistics}
          label="Show Statistics"
        />
      </div>

      {showStatistics && (
        <Card className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/80 dark:divide-slate-800 overflow-hidden">
          <StatMetric label="Verified Revenue" value={formatBDT(verifiedTotal)} badge="↑ 22%" />
          <StatMetric
            label="Pending TrxID"
            value={String(pendingCount)}
            badge="Review"
            tone={pendingCount > 0 ? 'amber' : 'emerald'}
          />
          <StatMetric
            label="Active Coupons"
            value={String(coupons.filter((c) => c.status === 'active').length)}
            badge={`${totalCouponUses} used`}
          />
          <StatMetric
            label="Refunded"
            value={String(refundedOrRejectedCount)}
            badge="Closed"
          />
        </Card>
      )}

      <Card className="overflow-hidden">
        {filteredPayments.length === 0 ? (
          <EmptyTableState
            title="No payments in this tab"
            description="Switch to All to inspect the payment ledger."
            onReset={() => setPayFilter('all')}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[740px] text-left border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 text-xs text-slate-500 font-medium">
                  <th className="py-3 px-4 w-9">
                    <ShadcnCheckbox
                      checked={
                        filteredPayments.length > 0 &&
                        selectedIds.length === filteredPayments.length
                      }
                      onChange={(c) =>
                        setSelectedIds(c ? filteredPayments.map((p) => p.id) : [])
                      }
                    />
                  </th>
                  <th className="py-3 px-3">Order ID</th>
                  <th className="py-3 px-3">Product</th>
                  <th className="py-3 px-3">Customer</th>
                  <th className="py-3 px-3">Gateway</th>
                  <th className="py-3 px-3">TrxID</th>
                  <th className="py-3 px-3">Amount</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                {filteredPayments.map((pay) => {
                  const checked = selectedIds.includes(pay.id);
                  return (
                    <tr
                      key={pay.id}
                      className={`transition-colors ${
                        checked
                          ? 'bg-emerald-50/50 dark:bg-emerald-950/25'
                          : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-3 px-4">
                        <ShadcnCheckbox
                          checked={checked}
                          onChange={() =>
                            setSelectedIds((prev) =>
                              prev.includes(pay.id)
                                ? prev.filter((i) => i !== pay.id)
                                : [...prev, pay.id]
                            )
                          }
                        />
                      </td>

                      <td className="py-3 px-3 font-mono text-xs font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {pay.orderId}
                      </td>

                      <td className="py-3 px-3 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {pay.productSummary}
                      </td>

                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {pay.buyerName}
                      </td>

                      <td className="py-3 px-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {pay.gateway}
                      </td>

                      <td className="py-3 px-3 font-mono text-xs text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {pay.trxId}
                      </td>

                      <td className="py-3 px-3 font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {formatBDT(pay.amountBDT)}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        {pay.status === 'verified' && (
                          <StatusIndicator tone="emerald" label="Verified" />
                        )}
                        {pay.status === 'pending_verification' && (
                          <StatusIndicator tone="amber" label="Pending" />
                        )}
                        {pay.status === 'refunded' && (
                          <StatusIndicator tone="blue" label="Refunded" />
                        )}
                        {pay.status === 'rejected' && (
                          <StatusIndicator tone="red" label="Rejected" />
                        )}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {pay.status === 'pending_verification' ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onVerifyPayment(pay.id)}
                              className="px-2.5 py-1 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-md cursor-pointer"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => onRejectOrRefundPayment(pay.id, 'rejected')}
                              className="px-2.5 py-1 text-xs font-medium border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 rounded-md cursor-pointer"
                            >
                              Reject
                            </button>
                          </div>
                        ) : pay.status === 'verified' ? (
                          <button
                            type="button"
                            onClick={() => onRejectOrRefundPayment(pay.id, 'refunded')}
                            className="px-2.5 py-1 text-xs font-medium border border-slate-200 dark:border-slate-700 hover:border-slate-400 text-slate-600 dark:text-slate-400 rounded-md cursor-pointer"
                          >
                            Refund
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">Closed</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <PaginationFooter totalItems={filteredPayments.length} pageSize={10} currentPage={1} />
      </Card>

      <div className="space-y-3">
        <h2 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100">
          Coupons
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {coupons.map((cpn) => (
            <Card key={cpn.id} className="p-4 flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-sm text-emerald-700 dark:text-emerald-400">
                    {cpn.code}
                  </span>
                  <StatusIndicator
                    tone={cpn.status === 'active' ? 'emerald' : 'zinc'}
                    label={cpn.status === 'active' ? 'Active' : 'Disabled'}
                  />
                </div>
                <div className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100 mt-2">
                  {cpn.discountType === 'percentage'
                    ? `${cpn.discountValue}% OFF`
                    : `${formatBDT(cpn.discountValue)} OFF`}
                </div>
              </div>

              <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="font-mono tabular-nums text-slate-500">
                  {cpn.usedCount} / {cpn.maxUses} used
                </span>
                <button
                  type="button"
                  onClick={() => onToggleCoupon(cpn.id)}
                  className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  {cpn.status === 'active' ? 'Disable' : 'Enable'}
                </button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <ModalShell
        open={isNewCouponOpen}
        onClose={() => setIsNewCouponOpen(false)}
        title="Add Coupon"
      >
        <form onSubmit={handleCreateCoupon} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Coupon Code
            </label>
            <input
              type="text"
              required
              value={cpnCode}
              onChange={(e) => setCpnCode(e.target.value)}
              placeholder="GREEN25"
              className="w-full px-3 py-2 font-mono uppercase bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Discount Type
              </label>
              <select
                value={cpnType}
                onChange={(e) => setCpnType(e.target.value as 'percentage' | 'fixed_bdt')}
                className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed_bdt">Fixed (BDT ৳)</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Value
              </label>
              <input
                type="number"
                required
                value={cpnValue}
                onChange={(e) => setCpnValue(Number(e.target.value))}
                className="w-full px-3 py-2 font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Min Spend (BDT)
              </label>
              <input
                type="number"
                value={cpnMinSpend}
                onChange={(e) => setCpnMinSpend(Number(e.target.value))}
                className="w-full px-3 py-2 font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Max Uses
              </label>
              <input
                type="number"
                value={cpnMaxUses}
                onChange={(e) => setCpnMaxUses(Number(e.target.value))}
                className="w-full px-3 py-2 font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsNewCouponOpen(false)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-md cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md cursor-pointer"
            >
              Save Coupon
            </button>
          </div>
        </form>
      </ModalShell>
    </div>
  );
}
