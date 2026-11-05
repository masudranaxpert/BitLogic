'use client';

import React, { useState } from 'react';
import {
  ArrowLeft,
  CalendarPlus,
  Plus,
  UserPlus,
} from 'lucide-react';
import {
  SubscriberUser,
  DigitalProduct,
  DigitalDelivery,
  PaymentTransaction,
} from '@/lib/admin-data';
import {
  Card,
  StatMetric,
  formatBDT,
  getCredentialTypeLabel,
  StatusIndicator,
  SegmentedTabs,
  SwitchToggle,
  ShadcnCheckbox,
  PaginationFooter,
  EmptyTableState,
} from '@/components/ui/primitives';

interface UsersSubscriptionsViewProps {
  mode: 'list' | 'detail' | 'add';
  subscribers: SubscriberUser[];
  products: DigitalProduct[];
  deliveries: DigitalDelivery[];
  payments: PaymentTransaction[];
  selectedCustomerId: string | null;
  onSelectCustomer: (userId: string) => void;
  onOpenAddCustomer: () => void;
  onBackToList: () => void;
  onAddCustomer: (newCustomer: SubscriberUser) => void;
  onExtendSubscription: (userId: string, subId: string, extraDays: number) => void;
  onAssignSubscription: (userId: string, productId: string, variantId: string) => void;
  onToggleUserStatus: (userId: string) => void;
  onChangeUserRole: (userId: string, role: SubscriberUser['role']) => void;
}

export default function UsersSubscriptionsView({
  mode,
  subscribers,
  products,
  deliveries,
  payments,
  selectedCustomerId,
  onSelectCustomer,
  onOpenAddCustomer,
  onBackToList,
  onAddCustomer,
  onExtendSubscription,
  onAssignSubscription,
  onToggleUserStatus,
  onChangeUserRole,
}: UsersSubscriptionsViewProps) {
  const [filter, setFilter] = useState<'all' | 'active' | 'past_due' | 'reseller'>('all');
  const [showStatistics, setShowStatistics] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // Add Customer form state
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('+880 17');
  const [newRole, setNewRole] = useState<SubscriberUser['role']>('subscriber');
  const [newStatus, setNewStatus] = useState<SubscriberUser['status']>('active');
  const [assignInitialPlan, setAssignInitialPlan] = useState(true);
  const [initialProdId, setInitialProdId] = useState<string>(products[0]?.id || '');
  const [initialVarId, setInitialVarId] = useState<string>(products[0]?.variants[0]?.id || '');

  // Detail View assign plan state
  const [detailProdId, setDetailProdId] = useState<string>(products[0]?.id || '');
  const [detailVarId, setDetailVarId] = useState<string>(products[0]?.variants[0]?.id || '');

  const filteredUsers = subscribers.filter((u) => {
    const matchesTab =
      filter === 'all'
        ? true
        : filter === 'reseller'
        ? u.role === 'reseller' || u.role === 'vip'
        : u.status === filter;
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.phone.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const totalLifetimeSpend = subscribers.reduce((s, u) => s + u.totalSpentBDT, 0);
  const totalActivePlans = subscribers.reduce(
    (s, u) => s + u.activeSubscriptions.filter((sub) => sub.remainingDays > 0).length,
    0
  );

  // 1. ADD CUSTOMER DEDICATED PAGE
  if (mode === 'add') {
    const selectedInitialProd = products.find((p) => p.id === initialProdId) || products[0];
    const selectedInitialVar =
      selectedInitialProd?.variants.find((v) => v.id === initialVarId) ||
      selectedInitialProd?.variants[0];

    const handleCreateCustomer = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newName.trim() || !newEmail.trim()) return;

      const initialSubs: SubscriberUser['activeSubscriptions'] = [];
      let initialSpend = 0;

      if (assignInitialPlan && selectedInitialProd && selectedInitialVar) {
        initialSpend = selectedInitialVar.priceBDT;
        initialSubs.push({
          id: `sub-${Date.now()}`,
          productName: selectedInitialProd.name,
          variantName: selectedInitialVar.name,
          credentialType: selectedInitialVar.credentialType,
          startedAt: '2026-10-30',
          expiresAt: '2026-11-29',
          remainingDays: selectedInitialVar.durationDays,
          autoRenew: true,
          warrantyActive: selectedInitialVar.hasWarranty,
        });
      }

      const created: SubscriberUser = {
        id: `usr-${Date.now()}`,
        name: newName.trim(),
        email: newEmail.trim(),
        phone: newPhone.trim() || '+880 1700-000000',
        joinedAt: '2026-10-30',
        status: newStatus,
        role: newRole,
        activeSubscriptions: initialSubs,
        totalSpentBDT: initialSpend,
        ordersCount: initialSubs.length,
        warrantyClaimsCount: 0,
      };

      onAddCustomer(created);
      setNewName('');
      setNewEmail('');
    };

    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBackToList}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-600 text-slate-600 dark:text-slate-300 cursor-pointer"
              aria-label="Back to Customers"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              Add Customer
            </h1>
          </div>
        </div>

        <form onSubmit={handleCreateCustomer} className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <Card className="lg:col-span-7 p-5 space-y-4 text-xs">
            <h2 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200/80 dark:border-slate-800 pb-3">
              Customer Profile
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., Tariqul Islam"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="tariqul.dev@gmail.com"
                  className="w-full px-3 py-2 font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-emerald-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+880 1711-000000"
                  className="w-full px-3 py-2 font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Account Tier
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as SubscriberUser['role'])}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                >
                  <option value="subscriber">Subscriber</option>
                  <option value="vip">VIP</option>
                  <option value="reseller">Reseller</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Account Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as SubscriberUser['status'])}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                >
                  <option value="active">Active</option>
                  <option value="past_due">Expired</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onBackToList}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer inline-flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Create Customer</span>
              </button>
            </div>
          </Card>

          <Card className="lg:col-span-5 p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-3">
              <h2 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100">
                Assign Subscription Plan
              </h2>
              <SwitchToggle
                checked={assignInitialPlan}
                onChange={setAssignInitialPlan}
                label="Assign"
              />
            </div>

            {assignInitialPlan && (
              <div className="space-y-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Product
                  </label>
                  <select
                    value={initialProdId}
                    onChange={(e) => {
                      setInitialProdId(e.target.value);
                      const p = products.find((item) => item.id === e.target.value);
                      if (p && p.variants[0]) setInitialVarId(p.variants[0].id);
                    }}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Option
                  </label>
                  <select
                    value={initialVarId}
                    onChange={(e) => setInitialVarId(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                  >
                    {selectedInitialProd?.variants.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} — {formatBDT(v.priceBDT)}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedInitialVar && (
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Type</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {getCredentialTypeLabel(selectedInitialVar.credentialType)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Duration</span>
                      <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                        {selectedInitialVar.durationDays}d
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Price</span>
                      <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatBDT(selectedInitialVar.priceBDT)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        </form>
      </div>
    );
  }

  // 2. CUSTOMER DETAIL DEDICATED PAGE
  if (mode === 'detail') {
    const activeUser =
      subscribers.find((u) => u.id === selectedCustomerId) || subscribers[0];

    if (!activeUser) return null;

    const userDeliveries = deliveries.filter(
      (d) =>
        d.buyerEmail.toLowerCase() === activeUser.email.toLowerCase() ||
        d.buyerName.toLowerCase() === activeUser.name.toLowerCase()
    );
    const userPayments = payments.filter(
      (p) =>
        p.buyerEmail.toLowerCase() === activeUser.email.toLowerCase() ||
        p.buyerName.toLowerCase() === activeUser.name.toLowerCase()
    );

    const selectedDetailProd = products.find((p) => p.id === detailProdId) || products[0];

    return (
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBackToList}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-600 text-slate-600 dark:text-slate-300 cursor-pointer"
              aria-label="Back to Customers"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-display font-bold text-xs flex items-center justify-center">
                {activeUser.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)}
              </div>
              <div>
                <h1 className="font-display text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                  {activeUser.name}
                </h1>
                <div className="font-mono text-xs text-slate-500">
                  {activeUser.email} · {activeUser.phone}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <StatusIndicator
              tone={
                activeUser.status === 'active'
                  ? 'emerald'
                  : activeUser.status === 'past_due'
                  ? 'amber'
                  : 'red'
              }
              label={
                activeUser.status === 'active'
                  ? 'Active'
                  : activeUser.status === 'past_due'
                  ? 'Expired'
                  : 'Suspended'
              }
            />

            <select
              value={activeUser.role}
              onChange={(e) =>
                onChangeUserRole(activeUser.id, e.target.value as SubscriberUser['role'])
              }
              className="px-2.5 py-1.5 text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer"
            >
              <option value="subscriber">Subscriber</option>
              <option value="vip">VIP</option>
              <option value="reseller">Reseller</option>
            </select>

            <button
              type="button"
              onClick={() => onToggleUserStatus(activeUser.id)}
              className="px-3 py-1.5 text-xs font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-rose-500 text-slate-700 dark:text-slate-300 rounded-lg cursor-pointer"
            >
              {activeUser.status === 'suspended' ? 'Reactivate' : 'Suspend'}
            </button>
          </div>
        </div>

        <Card className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/80 dark:divide-slate-800 overflow-hidden">
          <StatMetric
            label="Lifetime Spent"
            value={formatBDT(activeUser.totalSpentBDT)}
            badge="Verified"
          />
          <StatMetric
            label="Active Plans"
            value={activeUser.activeSubscriptions.length}
            badge="Subscribed"
          />
          <StatMetric
            label="Total Orders"
            value={activeUser.ordersCount}
            badge={`Joined ${activeUser.joinedAt}`}
          />
          <StatMetric
            label="Warranty Claims"
            value={activeUser.warrantyClaimsCount}
            badge="Covered"
          />
        </Card>

        <Card className="overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <h2 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100">
              Active Subscriptions ({activeUser.activeSubscriptions.length})
            </h2>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <select
                value={detailProdId}
                onChange={(e) => {
                  setDetailProdId(e.target.value);
                  const prod = products.find((p) => p.id === e.target.value);
                  if (prod && prod.variants[0]) setDetailVarId(prod.variants[0].id);
                }}
                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              <select
                value={detailVarId}
                onChange={(e) => setDetailVarId(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
              >
                {selectedDetailProd?.variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({formatBDT(v.priceBDT)})
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => onAssignSubscription(activeUser.id, detailProdId, detailVarId)}
                className="px-3 py-1.5 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Assign Plan</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 text-xs text-slate-500 font-medium">
                  <th className="py-3 px-4">Product &amp; Option</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Started</th>
                  <th className="py-3 px-3">Expires</th>
                  <th className="py-3 px-3">Remaining</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                {activeUser.activeSubscriptions.map((sub) => (
                  <tr key={sub.id} className="whitespace-nowrap">
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                      {sub.productName}{' '}
                      <span className="text-slate-400 font-normal">— {sub.variantName}</span>
                    </td>
                    <td className="py-3 px-3">
                      <StatusIndicator
                        tone="purple"
                        label={getCredentialTypeLabel(sub.credentialType)}
                      />
                    </td>
                    <td className="py-3 px-3 font-mono text-xs text-slate-600 dark:text-slate-400">
                      {sub.startedAt}
                    </td>
                    <td className="py-3 px-3 font-mono text-xs text-slate-600 dark:text-slate-400">
                      {sub.expiresAt}
                    </td>
                    <td className="py-3 px-3 font-mono text-xs font-semibold">
                      <span
                        className={
                          sub.remainingDays === 0
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }
                      >
                        {sub.remainingDays}d left
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => onExtendSubscription(activeUser.id, sub.id, 30)}
                        className="px-2.5 py-1 text-xs font-medium bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-600 hover:text-white rounded-md inline-flex items-center gap-1 cursor-pointer"
                      >
                        <CalendarPlus className="w-3 h-3" />
                        <span>+30d</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card className="overflow-hidden">
            <div className="p-4 border-b border-slate-200/80 dark:border-slate-800">
              <h2 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100">
                Delivered Credentials ({userDeliveries.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 text-xs text-slate-500 font-medium">
                    <th className="py-2.5 px-4">Order</th>
                    <th className="py-2.5 px-3">Product</th>
                    <th className="py-2.5 px-3">Warranty</th>
                    <th className="py-2.5 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                  {userDeliveries.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-xs text-slate-400">
                        No deliveries recorded for this customer.
                      </td>
                    </tr>
                  ) : (
                    userDeliveries.map((del) => (
                      <tr key={del.id} className="whitespace-nowrap">
                        <td className="py-2.5 px-4 font-mono text-xs text-slate-700 dark:text-slate-300">
                          {del.orderId}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-100">
                          {del.productName} — {del.variantName}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-xs text-slate-500">
                          {del.warrantyRemainingDays}d
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <StatusIndicator
                            tone={del.status === 'delivered' ? 'emerald' : 'amber'}
                            label={del.status === 'delivered' ? 'Delivered' : 'Claim'}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="p-4 border-b border-slate-200/80 dark:border-slate-800">
              <h2 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100">
                Payment Ledger ({userPayments.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 text-xs text-slate-500 font-medium">
                    <th className="py-2.5 px-4">TrxID</th>
                    <th className="py-2.5 px-3">Gateway</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                  {userPayments.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-xs text-slate-400">
                        No payment records found.
                      </td>
                    </tr>
                  ) : (
                    userPayments.map((pay) => (
                      <tr key={pay.id} className="whitespace-nowrap">
                        <td className="py-2.5 px-4 font-mono text-xs text-slate-800 dark:text-slate-200">
                          {pay.trxId}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                          {pay.gateway}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-semibold text-slate-900 dark:text-slate-100">
                          {formatBDT(pay.amountBDT)}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <StatusIndicator
                            tone={pay.status === 'verified' ? 'emerald' : 'amber'}
                            label={pay.status === 'verified' ? 'Verified' : 'Pending'}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // 3. ALL CUSTOMERS TABLE VIEW (DEFAULT)
  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          Customer
        </h1>

        <button
          type="button"
          onClick={onOpenAddCustomer}
          className="pl-3 pr-3.5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-2xs inline-flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Customer</span>
        </button>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <SegmentedTabs
            options={[
              { value: 'all', label: 'All', count: subscribers.length },
              {
                value: 'active',
                label: 'Active',
                count: subscribers.filter((s) => s.status === 'active').length,
              },
              {
                value: 'past_due',
                label: 'Expired',
                count: subscribers.filter((s) => s.status === 'past_due').length,
              },
              {
                value: 'reseller',
                label: 'Resellers',
                count: subscribers.filter((s) => s.role !== 'subscriber').length,
              },
            ]}
            value={filter}
            onChange={setFilter}
          />
          <SwitchToggle
            checked={showStatistics}
            onChange={setShowStatistics}
            label="Show Statistics"
          />
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search customer, email, or phone..."
          className="h-9 px-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-emerald-500 w-full md:w-64 shadow-2xs"
        />
      </div>

      {showStatistics && (
        <Card className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/80 dark:divide-slate-800 overflow-hidden">
          <StatMetric label="Total Customers" value={String(subscribers.length)} badge="↑ 18%" />
          <StatMetric label="Active Plans" value={String(totalActivePlans)} badge="↑ 14%" />
          <StatMetric label="Lifetime Revenue" value={formatBDT(totalLifetimeSpend)} badge="↑ 21%" />
          <StatMetric
            label="Resellers"
            value={String(subscribers.filter((s) => s.role !== 'subscriber').length)}
            badge="+ 2 tier"
          />
        </Card>
      )}

      <Card className="overflow-hidden">
        {filteredUsers.length === 0 ? (
          <EmptyTableState
            title="No customers found"
            description="Reset filters to view all customers."
            onReset={() => {
              setFilter('all');
              setSearch('');
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[740px] text-left border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 text-xs text-slate-500 font-medium">
                  <th className="py-3 px-4 w-9">
                    <ShadcnCheckbox
                      checked={
                        filteredUsers.length > 0 &&
                        selectedUserIds.length === filteredUsers.length
                      }
                      onChange={(c) =>
                        setSelectedUserIds(c ? filteredUsers.map((u) => u.id) : [])
                      }
                    />
                  </th>
                  <th className="py-3 px-3">Customer</th>
                  <th className="py-3 px-3">Email</th>
                  <th className="py-3 px-3">Phone</th>
                  <th className="py-3 px-3">Tier</th>
                  <th className="py-3 px-3">Plans</th>
                  <th className="py-3 px-3">Total Spent</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                {filteredUsers.map((user) => {
                  const checked = selectedUserIds.includes(user.id);
                  return (
                    <tr
                      key={user.id}
                      onClick={() => onSelectCustomer(user.id)}
                      className={`transition-colors whitespace-nowrap cursor-pointer ${
                        checked
                          ? 'bg-emerald-50/50 dark:bg-emerald-950/25'
                          : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <ShadcnCheckbox
                          checked={checked}
                          onChange={() =>
                            setSelectedUserIds((prev) =>
                              prev.includes(user.id)
                                ? prev.filter((id) => id !== user.id)
                                : [...prev, user.id]
                            )
                          }
                        />
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-display font-bold text-[11px] flex items-center justify-center shrink-0">
                            {user.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .slice(0, 2)}
                          </div>
                          <span className="font-medium text-slate-900 dark:text-slate-100">
                            {user.name}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-3 font-mono text-xs text-slate-600 dark:text-slate-400">
                        {user.email}
                      </td>

                      <td className="py-3 px-3 font-mono text-xs text-slate-500">
                        {user.phone}
                      </td>

                      <td className="py-3 px-3">
                        <StatusIndicator
                          tone={
                            user.role === 'reseller'
                              ? 'purple'
                              : user.role === 'vip'
                              ? 'blue'
                              : 'zinc'
                          }
                          label={
                            user.role === 'reseller'
                              ? 'Reseller'
                              : user.role === 'vip'
                              ? 'VIP'
                              : 'Subscriber'
                          }
                        />
                      </td>

                      <td className="py-3 px-3 font-mono text-xs text-slate-700 dark:text-slate-300">
                        {user.activeSubscriptions.length} active
                      </td>

                      <td className="py-3 px-3 font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                        {formatBDT(user.totalSpentBDT)}
                      </td>

                      <td className="py-3 px-3">
                        <StatusIndicator
                          tone={
                            user.status === 'active'
                              ? 'emerald'
                              : user.status === 'past_due'
                              ? 'amber'
                              : 'red'
                          }
                          label={
                            user.status === 'active'
                              ? 'Active'
                              : user.status === 'past_due'
                              ? 'Expired'
                              : 'Suspended'
                          }
                        />
                      </td>

                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => onSelectCustomer(user.id)}
                          className="px-2.5 py-1 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 hover:border-emerald-600 text-slate-700 dark:text-slate-300 cursor-pointer"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <PaginationFooter totalItems={filteredUsers.length} pageSize={10} currentPage={1} />
      </Card>
    </div>
  );
}
