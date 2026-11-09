'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, CalendarPlus, Plus, Search } from 'lucide-react';
import { CustomerPasswordPanel } from './CustomerPasswordPanel';
import { EmailVerifiedBadge } from './EmailVerifiedBadge';
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
  AdminBadge,
  credentialTypeBadgeTone,
  SegmentedTabs,
  ModalShell,
} from '@/components/admin/ui/primitives';

type DetailTab = 'profile' | 'plans' | 'deliveries' | 'payments';

interface CustomerDetailProps {
  activeUser: SubscriberUser;
  products: DigitalProduct[];
  deliveries: DigitalDelivery[];
  payments: PaymentTransaction[];
  onBackToList: () => void;
  onRenewSubscription: (
    userId: string,
    subId: string,
    amountBDT?: number,
    paymentMeta?: {
      gateway: PaymentTransaction['gateway'];
      trxId: string;
      senderNumberOrRef?: string;
    },
  ) => void;
  onAssignSubscription: (
    userId: string,
    productId: string,
    variantId: string,
    amountBDT?: number,
    quantity?: number,
  ) => void;
  onToggleUserStatus: (userId: string) => void;
  onUpdateCustomer: (
    userId: string,
    patch: Partial<
      Pick<
        SubscriberUser,
        'name' | 'email' | 'phone' | 'joinedAt' | 'role' | 'status'
      >
    >,
  ) => void;
}

function deliveryStatusLabel(status: DigitalDelivery['status']): {
  tone: 'emerald' | 'amber' | 'red' | 'blue';
  label: string;
} {
  switch (status) {
    case 'delivered':
      return { tone: 'emerald', label: 'Delivered' };
    case 'pending_dispatch':
      return { tone: 'amber', label: 'Pending assign' };
    case 'warranty_claim':
      return { tone: 'red', label: 'Claim' };
    case 'replaced':
      return { tone: 'blue', label: 'Replaced' };
    case 'revoked':
      return { tone: 'red', label: 'Revoked' };
    default:
      return { tone: 'amber', label: status };
  }
}

export function CustomerDetail({
  activeUser,
  products,
  deliveries,
  payments,
  onBackToList,
  onRenewSubscription,
  onAssignSubscription,
  onToggleUserStatus,
  onUpdateCustomer,
}: CustomerDetailProps) {
  const router = useRouter();
  const [detailTab, setDetailTab] = useState<DetailTab>('profile');
  const [tabSearch, setTabSearch] = useState('');
  const [renewSubId, setRenewSubId] = useState<string | null>(null);
  const [renewAmountBDT, setRenewAmountBDT] = useState(0);
  const [renewGateway, setRenewGateway] =
    useState<PaymentTransaction['gateway']>('bKash');
  const [renewTrxId, setRenewTrxId] = useState('');
  const [renewSender, setRenewSender] = useState('');

  /** What this customer actually paid per unit last time (renewal beats first purchase). */
  const lastPaidUnit = (sub: SubscriberUser['activeSubscriptions'][number]) => {
    const own = payments
      .filter((p) => p.deliveryId === sub.deliveryId && p.kind === 'renewal' && p.status !== 'rejected')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    if (own && own.amountBDT > 0) return own.amountBDT;
    const units = deliveries.filter((d) => d.orderId === sub.orderId);
    const lines = new Set(units.map((d) => d.productId + '|' + d.variantId));
    const purchase = payments.find(
      (p) => p.orderId === sub.orderId && p.kind !== 'renewal' && p.status !== 'rejected' && p.amountBDT > 0,
    );
    if (purchase && units.length > 0 && lines.size === 1) {
      return Math.round(purchase.amountBDT / units.length);
    }
    return null;
  };
  const listPriceFor = (sub: SubscriberUser['activeSubscriptions'][number]) =>
    products
      .find((p) => p.name === sub.productName)
      ?.variants.find((v) => v.name === sub.variantName)?.priceBDT ?? null;

  const renewSub = renewSubId
    ? activeUser.activeSubscriptions.find((s) => s.id === renewSubId)
    : null;

  const [profileName, setProfileName] = useState(activeUser.name);
  const [profileEmail, setProfileEmail] = useState(activeUser.email);
  const [profilePhone, setProfilePhone] = useState(activeUser.phone);
  const [profileJoined, setProfileJoined] = useState(activeUser.joinedAt);
  const [profileRole, setProfileRole] = useState(activeUser.role);
  const [profileStatus, setProfileStatus] = useState(activeUser.status);

  const [prevUserId, setPrevUserId] = useState(activeUser.id);
  if (activeUser.id !== prevUserId) {
    setPrevUserId(activeUser.id);
    setProfileName(activeUser.name);
    setProfileEmail(activeUser.email);
    setProfilePhone(activeUser.phone);
    setProfileJoined(activeUser.joinedAt);
    setProfileRole(activeUser.role);
    setProfileStatus(activeUser.status);
  }

  const profileDirty =
    profileName !== activeUser.name ||
    profileEmail !== activeUser.email ||
    profilePhone !== activeUser.phone ||
    profileJoined !== activeUser.joinedAt ||
    profileRole !== activeUser.role ||
    profileStatus !== activeUser.status;

  const fieldClass =
    'w-full h-9 px-3 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md';

  const userDeliveries = useMemo(
    () =>
      deliveries.filter(
        (d) =>
          d.buyerEmail.toLowerCase() === activeUser.email.toLowerCase() ||
          d.buyerName.toLowerCase() === activeUser.name.toLowerCase(),
      ),
    [deliveries, activeUser.email, activeUser.name],
  );

  const userPayments = useMemo(
    () =>
      payments.filter(
        (p) =>
          p.buyerEmail.toLowerCase() === activeUser.email.toLowerCase() ||
          p.buyerName.toLowerCase() === activeUser.name.toLowerCase(),
      ),
    [payments, activeUser.email, activeUser.name],
  );

  const tabQuery = tabSearch.trim().toLowerCase();

  const filteredPlans = useMemo(() => {
    if (!tabQuery) return activeUser.activeSubscriptions;
    return activeUser.activeSubscriptions.filter(
      (s) =>
        s.productName.toLowerCase().includes(tabQuery) ||
        s.variantName.toLowerCase().includes(tabQuery) ||
        getCredentialTypeLabel(s.credentialType).toLowerCase().includes(tabQuery),
    );
  }, [activeUser.activeSubscriptions, tabQuery]);

  const paymentByOrder = useMemo(() => {
    const map = new Map<string, (typeof userPayments)[number]>();
    for (const p of userPayments) {
      if (!map.has(p.orderId)) map.set(p.orderId, p);
    }
    return map;
  }, [userPayments]);

  const filteredDeliveries = useMemo(() => {
    if (!tabQuery) return userDeliveries;
    return userDeliveries.filter((d) => {
      const pay = paymentByOrder.get(d.orderId);
      return (
        d.orderId.toLowerCase().includes(tabQuery) ||
        d.productName.toLowerCase().includes(tabQuery) ||
        d.variantName.toLowerCase().includes(tabQuery) ||
        d.status.toLowerCase().includes(tabQuery) ||
        (pay?.trxId || '').toLowerCase().includes(tabQuery)
      );
    });
  }, [userDeliveries, tabQuery, paymentByOrder]);

  const filteredPayments = useMemo(() => {
    if (!tabQuery) return userPayments;
    return userPayments.filter(
      (p) =>
        p.orderId.toLowerCase().includes(tabQuery) ||
        p.trxId.toLowerCase().includes(tabQuery) ||
        p.gateway.toLowerCase().includes(tabQuery) ||
        p.productSummary.toLowerCase().includes(tabQuery) ||
        p.status.toLowerCase().includes(tabQuery),
    );
  }, [userPayments, tabQuery]);

  const tabSearchPlaceholder =
    detailTab === 'plans'
      ? 'Search plans…'
      : detailTab === 'deliveries'
        ? 'Search order or product…'
        : detailTab === 'payments'
          ? 'Search order, trx, or gateway…'
          : '';

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
            <ArrowLeft className="w-4 h-4" aria-hidden />
          </button>
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-display font-semibold text-xs flex items-center justify-center tracking-wide"
              aria-hidden
            >
              {activeUser.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50 m-0">
                {activeUser.name}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-slate-500">
                  {activeUser.email}
                </span>
                <EmailVerifiedBadge verified={activeUser.emailVerified} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <AdminBadge
            tone={activeUser.status === 'active' ? 'emerald' : 'red'}
            label={activeUser.status === 'active' ? 'Active' : 'Suspended'}
          />

          <button
            type="button"
            onClick={() => onToggleUserStatus(activeUser.id)}
            className={
              activeUser.status === 'suspended'
                ? 'h-8 px-3.5 text-xs font-semibold rounded-md bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600'
                : 'h-8 px-3.5 text-xs font-semibold rounded-md bg-rose-600 hover:bg-rose-700 text-white cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600'
            }
          >
            {activeUser.status === 'suspended' ? 'Reactivate' : 'Suspend'}
          </button>
        </div>
      </div>

      <Card className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/80 dark:divide-slate-800 overflow-hidden">
        <StatMetric
          label="Lifetime Spent"
          value={formatBDT(activeUser.totalSpentBDT)}
        />
        <StatMetric
          label="Active Plans"
          value={activeUser.activeSubscriptions.length}
        />
        <StatMetric label="Total Orders" value={activeUser.ordersCount} />
        <StatMetric
          label="Warranty Claims"
          value={activeUser.warrantyClaimsCount}
        />
      </Card>

      <Card className="overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <SegmentedTabs
            options={[
              { value: 'profile', label: 'Profile' },
              {
                value: 'plans',
                label: 'Plans',
                count: activeUser.activeSubscriptions.length,
              },
              {
                value: 'deliveries',
                label: 'Deliveries',
                count: new Set(userDeliveries.map((d) => d.orderId)).size,
              },
              {
                value: 'payments',
                label: 'Payments',
                count: userPayments.length,
              },
            ]}
            value={detailTab}
            onChange={(next) => {
              setDetailTab(next);
              setTabSearch('');
            }}
          />

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {detailTab !== 'profile' ? (
              <div className="relative">
                <Search
                  className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden
                />
                <input
                  type="search"
                  value={tabSearch}
                  onChange={(e) => setTabSearch(e.target.value)}
                  placeholder={tabSearchPlaceholder}
                  className="h-8 w-full sm:w-52 pl-8 pr-2.5 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md focus:outline-none focus:border-emerald-500"
                />
              </div>
            ) : null}

            {detailTab === 'plans' ? (
              <button
                type="button"
                onClick={() =>
                  router.push(`/admin/orders/add?customerId=${encodeURIComponent(activeUser.id)}`)
                }
                className="h-8 px-3 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden />
                <span>Add Order</span>
              </button>
            ) : null}
          </div>
        </div>

        {detailTab === 'profile' ? (
          <form
            className="p-4 sm:p-5 space-y-4 text-xs"
            onSubmit={(e) => {
              e.preventDefault();
              const name = profileName.trim();
              const email = profileEmail.trim().toLowerCase();
              if (!name || !email) return;
              onUpdateCustomer(activeUser.id, {
                name,
                email,
                phone: profilePhone.trim(),
                joinedAt: profileJoined.trim() || activeUser.joinedAt,
                role: profileRole,
                status: profileStatus,
              });
            }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  required
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className={fieldClass}
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  className={fieldClass}
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Phone
                </label>
                <input
                  type="text"
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  placeholder="+880 …"
                  className={fieldClass}
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Joined
                </label>
                <div className="relative">
                  <Calendar
                    className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden
                  />
                  <input
                    type="text"
                    value={profileJoined}
                    onChange={(e) => setProfileJoined(e.target.value)}
                    placeholder="YYYY-MM-DD"
                    className={`${fieldClass} pl-9 font-mono`}
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tier
                </label>
                <select
                  value={profileRole}
                  onChange={(e) =>
                    setProfileRole(e.target.value as SubscriberUser['role'])
                  }
                  className={fieldClass}
                >
                  <option value="subscriber">Subscriber</option>
                  <option value="vip">VIP</option>
                  <option value="reseller">Reseller</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Status
                </label>
                <select
                  value={profileStatus}
                  onChange={(e) =>
                    setProfileStatus(
                      e.target.value as SubscriberUser['status'],
                    )
                  }
                  className={fieldClass}
                >
                  <option value="active">Active</option>
                  <option value="past_due">Expired</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 mt-1 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                disabled={!profileDirty}
                onClick={() => {
                  setProfileName(activeUser.name);
                  setProfileEmail(activeUser.email);
                  setProfilePhone(activeUser.phone);
                  setProfileJoined(activeUser.joinedAt);
                  setProfileRole(activeUser.role);
                  setProfileStatus(activeUser.status);
                }}
                className="px-4 h-9 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer disabled:opacity-40"
              >
                Reset
              </button>
              <button
                type="submit"
                disabled={!profileDirty}
                className="px-5 h-9 font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-lg cursor-pointer"
              >
                Save profile
              </button>
            </div>
          </form>
        ) : null}
        {detailTab === 'profile' ? <CustomerPasswordPanel email={activeUser.email} /> : null}

        {detailTab === 'plans' ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 text-xs text-slate-500 font-medium">
                  <th className="py-3 px-4">Product &amp; Option</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Started</th>
                  <th className="py-3 px-3">Expires</th>
                  <th className="py-3 px-3">Remaining</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                {activeUser.activeSubscriptions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-10 text-center text-xs text-slate-400"
                    >
                      No orders yet. Add an order to create a plan.
                    </td>
                  </tr>
                ) : filteredPlans.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-10 text-center text-xs text-slate-400"
                    >
                      No plans match “{tabSearch.trim()}”.
                    </td>
                  </tr>
                ) : (
                  filteredPlans.map((sub) => (
                    <tr key={sub.id} className="whitespace-nowrap">
                      <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                        {sub.productName}{' '}
                        <span className="text-slate-400 font-normal">
                          — {sub.variantName}
                        </span>
                        {sub.orderId ? (
                          <div className="mt-0.5 font-mono text-[11px] font-normal text-slate-400">
                            {sub.orderId}
                          </div>
                        ) : null}
                      </td>
                      <td className="py-3 px-3">
                        <AdminBadge
                          tone={credentialTypeBadgeTone(sub.credentialType)}
                          label={getCredentialTypeLabel(sub.credentialType)}
                        />
                      </td>
                      <td className="py-3 px-3">
                        <StatusIndicator
                          tone={
                            sub.status === 'pending_credential'
                              ? 'amber'
                              : 'emerald'
                          }
                          label={
                            sub.status === 'pending_credential'
                              ? 'Credential pending'
                              : 'Active'
                          }
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
                        {(() => {
                          const prod = products.find((p) => p.name === sub.productName);
                          const plan = prod?.variants.find((v) => v.name === sub.variantName);
                          const blocked =
                            plan?.renewable === false
                              ? 'One-time plan — no renewals'
                              : prod?.status === 'draft'
                                ? 'Product not available — renewals blocked'
                                : '';
                          return blocked ? (
                            <span className="text-[11px] text-slate-400" title={blocked}>
                              {plan?.renewable === false ? 'One-time' : 'Unavailable'}
                            </span>
                          ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setRenewSubId(sub.id);
                            setRenewAmountBDT(lastPaidUnit(sub) ?? listPriceFor(sub) ?? 0);
                            setRenewGateway('bKash');
                            setRenewTrxId('');
                            setRenewSender(activeUser.phone || '');
                          }}
                          className="inline-flex h-8 cursor-pointer items-center gap-1 rounded border border-sky-200 bg-sky-50 px-2.5 text-xs font-medium text-sky-800 hover:bg-sky-600 hover:text-white dark:border-sky-800 dark:bg-sky-950/70 dark:text-sky-300"
                        >
                          <CalendarPlus className="h-3.5 w-3.5" aria-hidden />
                          <span>Renew</span>
                        </button>
                          );
                        })()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : null}

        {detailTab === 'deliveries' ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 text-xs text-slate-500 font-medium">
                  <th className="py-3 px-4">Order</th>
                  <th className="py-3 px-3">Payment</th>
                  <th className="py-3 px-3">Product</th>
                  <th className="py-3 px-3">Warranty</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                {userDeliveries.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-10 text-center text-xs text-slate-400"
                    >
                      No deliveries for this customer.
                    </td>
                  </tr>
                ) : filteredDeliveries.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-10 text-center text-xs text-slate-400"
                    >
                      No deliveries match “{tabSearch.trim()}”.
                    </td>
                  </tr>
                ) : (
                  filteredDeliveries.map((del) => {
                    const st = deliveryStatusLabel(del.status);
                    const pay = paymentByOrder.get(del.orderId);
                    return (
                      <tr key={del.id} className="whitespace-nowrap">
                        <td className="py-3 px-4 font-mono text-xs text-slate-700 dark:text-slate-300">
                          {del.orderId}
                          {(del.orderQuantity ?? 1) > 1 ? (
                            <span className="ml-1 text-[11px] text-slate-400 font-sans">
                              (Unit {del.unitIndex}/{del.orderQuantity})
                            </span>
                          ) : null}
                        </td>
                        <td className="py-3 px-3 font-mono text-xs text-slate-600 dark:text-slate-400">
                          {pay ? (
                            <span>
                              {pay.trxId}
                              <span className="text-slate-400"> · </span>
                              {formatBDT(pay.amountBDT)}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-900 dark:text-slate-100">
                          {del.productName} — {del.variantName}
                        </td>
                        <td className="py-3 px-3 font-mono text-xs text-slate-500">
                          {del.hasWarranty
                            ? `${del.warrantyRemainingDays}d`
                            : '—'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <StatusIndicator tone={st.tone} label={st.label} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : null}

        {detailTab === 'payments' ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 text-xs text-slate-500 font-medium">
                  <th className="py-3 px-4">Order</th>
                  <th className="py-3 px-3">TrxID</th>
                  <th className="py-3 px-3">Gateway</th>
                  <th className="py-3 px-3">Amount</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                {userPayments.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-10 text-center text-xs text-slate-400"
                    >
                      No payments yet.
                    </td>
                  </tr>
                ) : filteredPayments.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-10 text-center text-xs text-slate-400"
                    >
                      No payments match “{tabSearch.trim()}”.
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((pay) => (
                    <tr key={pay.id} className="whitespace-nowrap">
                      <td className="py-3 px-4 font-mono text-xs text-slate-700 dark:text-slate-300">
                        {pay.orderId}
                      </td>
                      <td className="py-3 px-3 font-mono text-xs text-slate-800 dark:text-slate-200">
                        {pay.trxId}
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                        {pay.gateway}
                      </td>
                      <td className="admin-price py-3 px-3">
                        {formatBDT(pay.amountBDT)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <StatusIndicator
                          tone={
                            pay.status === 'verified' ? 'emerald' : 'amber'
                          }
                          label={
                            pay.status === 'verified' ? 'Verified' : 'Pending'
                          }
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>

      <ModalShell
        open={Boolean(renewSub)}
        onClose={() => setRenewSubId(null)}
        title="Renew"
        maxWidth="max-w-sm"
      >
        {renewSub ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const trx = renewTrxId.trim();
              if (!trx) return;
              onRenewSubscription(activeUser.id, renewSub.id, renewAmountBDT, {
                gateway: renewGateway,
                trxId: trx,
                senderNumberOrRef: renewSender.trim() || undefined,
              });
              setRenewSubId(null);
            }}
            className="space-y-4"
          >
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="font-semibold text-slate-900 dark:text-slate-100">
                {renewSub.productName} — {renewSub.variantName}
              </div>
              <div className="mt-0.5 font-mono text-xs text-slate-500">
                {renewSub.orderId}
              </div>
            </div>
            {(() => {
              const paid = lastPaidUnit(renewSub);
              const list = listPriceFor(renewSub);
              if (paid === null || list === null || paid === list) return null;
              return (
                <div className="flex items-center justify-between rounded-md bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-sm">
                  <span>Paid {formatBDT(paid)} · List {formatBDT(list)}</span>
                  <button
                    type="button"
                    onClick={() => setRenewAmountBDT(list)}
                    className="font-medium text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    Use list
                  </button>
                </div>
              );
            })()}

            <div className="space-y-1.5">
              <label
                htmlFor="renew-amount"
                className="text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Amount
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                  ৳
                </span>
                <input
                  id="renew-amount"
                  type="text"
                  inputMode="numeric"
                  required
                  value={renewAmountBDT === 0 ? '' : String(renewAmountBDT)}
                  onChange={(e) =>
                    setRenewAmountBDT(Number(e.target.value.replace(/[^0-9]/g, '')) || 0)
                  }
                  className="h-9 w-full rounded-md border border-slate-200 bg-white pl-6 pr-2 font-mono text-xs tabular-nums dark:border-slate-800 dark:bg-slate-950"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="renew-gateway"
                className="text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Gateway
              </label>
              <select
                id="renew-gateway"
                value={renewGateway}
                onChange={(e) =>
                  setRenewGateway(e.target.value as PaymentTransaction['gateway'])
                }
                className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-xs dark:border-slate-800 dark:bg-slate-950"
              >
                <option value="bKash">bKash</option>
                <option value="Nagad">Nagad</option>
                <option value="Rocket">Rocket</option>
                <option value="Stripe">Stripe</option>
                <option value="Binance Pay">Binance Pay</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="renew-trx"
                className="text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                TrxID
              </label>
              <input
                id="renew-trx"
                type="text"
                required
                value={renewTrxId}
                onChange={(e) => setRenewTrxId(e.target.value)}
                placeholder="Real transaction ID"
                className="h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 font-mono text-xs dark:border-slate-800 dark:bg-slate-950"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="renew-sender"
                className="text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Sender / Ref
              </label>
              <input
                id="renew-sender"
                type="text"
                value={renewSender}
                onChange={(e) => setRenewSender(e.target.value)}
                className="h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 font-mono text-xs dark:border-slate-800 dark:bg-slate-950"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setRenewSubId(null)}
                className="h-9 cursor-pointer rounded-md border border-slate-200 px-3 text-xs font-medium dark:border-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!renewTrxId.trim()}
                className="h-9 cursor-pointer rounded-md bg-sky-600 px-3.5 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
              >
                Confirm renew
              </button>
            </div>
          </form>
        ) : null}
      </ModalShell>
    </div>
  );
}
