'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  LayoutDashboard,
  KeyRound,
  ShoppingBag,
  ShieldAlert,
  CreditCard,
  Copy,
  Check,
  Eye,
  EyeOff,
  RefreshCw,
  Star,
  Globe,
  ShieldCheck,
  Search,
  Sun,
  Moon,
  ArrowLeftRight,
  Menu,
  X,
} from 'lucide-react';
import {
  DigitalProduct,
  VaultCredential,
  DigitalDelivery,
  SubscriberUser,
  PaymentTransaction,
} from '@/lib/admin-data';
import {
  Card,
  StatMetric,
  formatBDT,
  getCredentialTypeLabel,
  StatusIndicator,
  ModalShell,
  BBCodeRenderer,
} from '@/components/ui/primitives';

export type UserPortalTab =
  | 'overview'
  | 'credentials'
  | 'store'
  | 'warranty'
  | 'billing';

interface UserPortalViewProps {
  currentUser: SubscriberUser;
  allUsers: SubscriberUser[];
  onSwitchUser: (userId: string) => void;
  products: DigitalProduct[];
  vault: VaultCredential[];
  deliveries: DigitalDelivery[];
  payments: PaymentTransaction[];
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onSwitchToAdmin: () => void;
  onPlaceUserOrder: (productId: string, variantId: string) => void;
  onSubmitWarrantyClaim: (deliveryId: string, reason: string) => void;
}

function generateOtpCode(): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return String(100000 + (array[0] % 900000));
  }
  return '582910';
}

export default function UserPortalView({
  currentUser,
  allUsers,
  onSwitchUser,
  products,
  vault,
  deliveries,
  payments,
  darkMode,
  onToggleDarkMode,
  onSwitchToAdmin,
  onPlaceUserOrder,
  onSubmitWarrantyClaim,
}: UserPortalViewProps) {
  const [activeTab, setActiveTab] = useState<UserPortalTab>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [otpCodes, setOtpCodes] = useState<Record<string, string>>({});

  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Storefront product detail modal state
  const [selectedStoreProduct, setSelectedStoreProduct] = useState<DigitalProduct | null>(null);
  const [selectedStoreVariantId, setSelectedStoreVariantId] = useState<string>('');
  const [selectedGalleryImage, setSelectedGalleryImage] = useState<string>('');

  // Warranty claim form state
  const [claimDeliveryId, setClaimDeliveryId] = useState<string>('');
  const [claimReason, setClaimReason] = useState<string>(
    'Session token logged out with 401 error before expiry.'
  );

  const userDeliveries = deliveries.filter(
    (d) =>
      d.buyerEmail.toLowerCase() === currentUser.email.toLowerCase() ||
      d.buyerName.toLowerCase() === currentUser.name.toLowerCase()
  );

  const userPayments = payments.filter(
    (p) =>
      p.buyerEmail.toLowerCase() === currentUser.email.toLowerCase() ||
      p.buyerName.toLowerCase() === currentUser.name.toLowerCase()
  );

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1600);
  };

  const handleFetchOtp = (deliveryId: string) => {
    const code = generateOtpCode();
    setOtpCodes((prev) => ({ ...prev, [deliveryId]: code }));
  };

  const getVaultStock = (productId: string, variantId: string) =>
    vault.filter(
      (v) => v.productId === productId && v.variantId === variantId && v.status === 'available'
    ).length;

  const openStoreProduct = (product: DigitalProduct, variantId?: string) => {
    const targetVar = variantId
      ? product.variants.find((v) => v.id === variantId)
      : product.variants.find((v) => v.isDefault) || product.variants[0];
    setSelectedStoreProduct(product);
    setSelectedStoreVariantId(targetVar?.id || product.variants[0]?.id || '');
    setSelectedGalleryImage(product.imageUrl || '');
  };

  const navItems: {
    id: UserPortalTab;
    label: string;
    shortLabel: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
  }[] = [
    { id: 'overview', label: 'My Overview', shortLabel: 'Home', icon: LayoutDashboard },
    {
      id: 'credentials',
      label: 'My Credentials',
      shortLabel: 'Vault',
      icon: KeyRound,
      count: userDeliveries.length,
    },
    {
      id: 'store',
      label: 'Browse Store',
      shortLabel: 'Store',
      icon: ShoppingBag,
      count: products.length,
    },
    {
      id: 'warranty',
      label: 'Warranty Support',
      shortLabel: 'Warranty',
      icon: ShieldAlert,
      count: userDeliveries.filter((d) => d.status === 'warranty_claim').length,
    },
    {
      id: 'billing',
      label: 'Billing & TrxID',
      shortLabel: 'Billing',
      icon: CreditCard,
      count: userPayments.length,
    },
  ];

  const activePlansCount = currentUser.activeSubscriptions.filter(
    (s) => s.remainingDays > 0
  ).length;
  const protectedCount = userDeliveries.filter(
    (d) => d.hasWarranty && d.warrantyRemainingDays > 0
  ).length;

  return (
    <div className="min-h-dvh flex bg-[#faf9f5] dark:bg-[#0c0b09] text-slate-900 dark:text-slate-100">
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-[1px] lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* YELLOW / AMBER THEMED SIDEBAR */}
      <aside
        className={`${
          mobileMenuOpen ? 'fixed inset-y-0 left-0 z-50 flex shadow-2xl' : 'hidden'
        } lg:sticky lg:top-0 lg:h-dvh lg:flex w-60 shrink-0 bg-white dark:bg-slate-900 border-r border-amber-200/70 dark:border-slate-800 flex-col justify-between select-none`}
      >
        <div className="p-4 space-y-5 overflow-y-auto">
          <div className="p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.2)] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-[7px] bg-amber-500 text-slate-950 font-display font-bold text-sm flex items-center justify-center shadow-2xs">
                B
              </div>
              <div>
                <div className="font-display text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
                  BitLogic Portal
                </div>
                <div className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                  Customer Panel
                </div>
              </div>
            </div>
            {mobileMenuOpen && (
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="lg:hidden p-1 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Switch Active Demo Customer */}
          <div className="space-y-1">
            <label className="block px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Logged-in Customer
            </label>
            <select
              value={currentUser.id}
              onChange={(e) => onSwitchUser(e.target.value)}
              className="w-full h-9 px-2.5 text-xs font-medium bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-amber-500"
            >
              {allUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="px-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
              CUSTOMER MENU
            </div>
            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-[13px] font-medium rounded-lg cursor-pointer transition-colors ${
                      active
                        ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 font-semibold shadow-[inset_0_0_0_1px_rgba(245,158,11,0.35)]'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 truncate">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          active
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-slate-400 dark:text-slate-500'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </span>

                    {typeof item.count === 'number' && (
                      <span
                        className={`px-1.5 py-0.5 rounded text-[11px] font-mono tabular-nums ${
                          active
                            ? 'bg-amber-200/70 dark:bg-amber-900/70 text-amber-900 dark:text-amber-200 font-semibold'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-4 space-y-3 border-t border-slate-200/80 dark:border-slate-800">
          <button
            type="button"
            onClick={onSwitchToAdmin}
            className="w-full h-9 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Switch to Admin Panel</span>
          </button>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 font-display font-bold text-[11px] flex items-center justify-center shrink-0">
                {currentUser.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)}
              </div>
              <div className="min-w-0">
                <div className="font-display text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                  {currentUser.name}
                </div>
                <div className="text-[11px] text-amber-700 dark:text-amber-400 truncate capitalize">
                  {currentUser.role} Account
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onToggleDarkMode}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-amber-500 cursor-pointer shrink-0"
              title="Toggle Light / Dark Mode"
            >
              {darkMode ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-13 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="p-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              <Menu className="w-4 h-4" />
            </button>
            <span className="font-display text-sm font-bold text-slate-900 dark:text-slate-100">
              BitLogic Customer Portal
            </span>
          </div>

          <button
            type="button"
            onClick={onSwitchToAdmin}
            className="px-2.5 py-1 text-xs font-semibold bg-emerald-600 text-white rounded-md cursor-pointer"
          >
            Admin Panel
          </button>
        </div>

        <main className="flex-1 p-4 sm:p-6 lg:p-7 pb-22 md:pb-8 max-w-[1440px] w-full mx-auto">
          {/* 1. MY OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                  My Overview
                </h1>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('credentials')}
                    className="h-9 px-3.5 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-500 rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                    <span>My Credentials</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('store')}
                    className="h-9 px-3.5 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Browse Store</span>
                  </button>
                </div>
              </div>

              <Card className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/80 dark:divide-slate-800 overflow-hidden">
                <StatMetric
                  label="Active Subscriptions"
                  value={activePlansCount}
                  badge="Active"
                  tone="amber"
                />
                <StatMetric
                  label="Delivered Credentials"
                  value={userDeliveries.length}
                  badge="Instant Vault"
                  tone="amber"
                />
                <StatMetric
                  label="Warranty Protected"
                  value={protectedCount}
                  badge="Covered"
                  tone="emerald"
                />
                <StatMetric
                  label="Total Spent"
                  value={formatBDT(currentUser.totalSpentBDT)}
                  badge={currentUser.role.toUpperCase()}
                  tone="amber"
                />
              </Card>

              <Card className="overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                  <h2 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100">
                    Active Subscriptions ({currentUser.activeSubscriptions.length})
                  </h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab('credentials')}
                    className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                  >
                    View Credentials →
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-left border-collapse text-[13px]">
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
                      {currentUser.activeSubscriptions.map((sub) => (
                        <tr key={sub.id} className="whitespace-nowrap hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                          <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                            {sub.productName}{' '}
                            <span className="text-slate-400 font-normal">— {sub.variantName}</span>
                          </td>
                          <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                            {getCredentialTypeLabel(sub.credentialType)}
                          </td>
                          <td className="py-3 px-3 font-mono text-xs text-slate-500">
                            {sub.startedAt}
                          </td>
                          <td className="py-3 px-3 font-mono text-xs text-slate-500">
                            {sub.expiresAt}
                          </td>
                          <td className="py-3 px-3 font-mono text-xs font-semibold text-amber-600 dark:text-amber-400">
                            {sub.remainingDays}d left
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => setActiveTab('credentials')}
                              className="px-2.5 py-1 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-md cursor-pointer"
                            >
                              Access Key
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* 2. MY CREDENTIALS & OTP */}
          {activeTab === 'credentials' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                  My Credentials
                </h1>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search order or product..."
                    className="w-full h-9 pl-8 pr-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="space-y-4">
                {userDeliveries
                  .filter(
                    (d) =>
                      !searchQuery ||
                      d.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      d.orderId.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((del) => {
                    const isRevealed = Boolean(revealedIds[del.id]);
                    const prod = products.find((p) => p.id === del.productId);
                    const variant = prod?.variants.find((v) => v.id === del.variantId);
                    const warningBBCode =
                      variant?.warningNote ||
                      (variant?.importantNote
                        ? `[warning]${variant.importantNote}[/warning]`
                        : '');

                    return (
                      <Card key={del.id} className="p-5 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/80 dark:border-slate-800">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <span className="font-mono text-xs px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-semibold">
                              {del.orderId}
                            </span>
                            <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                              {del.productName} — {del.variantName}
                            </h2>
                          </div>

                          <div className="flex items-center gap-2">
                            <StatusIndicator
                              tone={del.status === 'delivered' ? 'emerald' : 'amber'}
                              label={
                                del.status === 'delivered'
                                  ? `${del.warrantyRemainingDays}d Warranty`
                                  : 'Claim Active'
                              }
                            />
                            <StatusIndicator
                              tone={del.vpnRequired ? 'amber' : 'zinc'}
                              label={del.vpnRequired ? 'VPN Required' : 'Direct Login'}
                            />
                          </div>
                        </div>

                        {/* Secret Credential Box */}
                        <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1 min-w-0">
                            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                              {getCredentialTypeLabel(del.credentialType)}
                            </div>
                            <div className="font-mono text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 break-all">
                              {del.credentialPayload.secretValue
                                ? isRevealed
                                  ? del.credentialPayload.secretValue
                                  : `${del.credentialPayload.secretValue.slice(0, 10)}••••••••••••`
                                : 'Awaiting Manual Dispatch'}
                            </div>
                            {del.credentialPayload.profilePin && (
                              <div className="font-mono text-xs text-amber-700 dark:text-amber-400">
                                Slot / PIN: {del.credentialPayload.profilePin}
                              </div>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            {del.credentialType === 'email_login' && (
                              <button
                                type="button"
                                onClick={() => handleFetchOtp(del.id)}
                                className="h-8 px-3 text-xs font-semibold rounded-md border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 inline-flex items-center gap-1.5 cursor-pointer"
                              >
                                <RefreshCw className="w-3 h-3" />
                                <span>
                                  {otpCodes[del.id] ? `OTP: ${otpCodes[del.id]}` : 'Get 2FA Code'}
                                </span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() =>
                                setRevealedIds((prev) => ({
                                  ...prev,
                                  [del.id]: !prev[del.id],
                                }))
                              }
                              className="h-8 px-2.5 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 hover:border-amber-500 inline-flex items-center gap-1 cursor-pointer"
                            >
                              {isRevealed ? (
                                <>
                                  <EyeOff className="w-3.5 h-3.5" />
                                  <span>Hide</span>
                                </>
                              ) : (
                                <>
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Reveal</span>
                                </>
                              )}
                            </button>

                            {del.credentialPayload.secretValue && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleCopy(del.id, del.credentialPayload.secretValue)
                                }
                                className="h-8 px-3 text-xs font-semibold rounded-md bg-amber-500 hover:bg-amber-600 text-slate-950 inline-flex items-center gap-1.5 cursor-pointer"
                              >
                                {copiedId === del.id ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>Copy Key</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* BBCode Warning Box */}
                        {warningBBCode && <BBCodeRenderer content={warningBBCode} />}

                        {/* Step-by-Step Login Guide */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs pt-1">
                          <div className="space-y-1.5">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">
                              How to Log In
                            </div>
                            <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-400">
                              {del.loginInstructions.map((step, i) => (
                                <li key={i}>{step}</li>
                              ))}
                            </ol>
                          </div>

                          {variant?.specifications && variant.specifications.length > 0 && (
                            <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
                              <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                                Plan Specifications
                              </div>
                              <div className="divide-y divide-slate-200/60 dark:divide-slate-800">
                                {variant.specifications.map((s, idx) => (
                                  <div
                                    key={idx}
                                    className="px-3 py-1.5 flex items-center justify-between"
                                  >
                                    <span className="text-slate-500">{s.label}</span>
                                    <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
                                      {s.value}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </Card>
                    );
                  })}
              </div>
            </div>
          )}

          {/* 3. BROWSE STORE (Dynamic Per-Option Description, BBCode Warnings & Specs) */}
          {activeTab === 'store' && (
            <div className="space-y-5">
              {/* Top Hero Banner */}
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 p-5 sm:p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[11px] font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      Instant Auto-Fulfillment Active
                    </div>
                    <h2 className="font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
                      BitLogic Digital Subscriptions &amp; Vault Credentials
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl">
                      Select any digital plan below. Pre-stocked Vault credentials dispatch instantly with 2FA OTP codes, 30-day warranty coverage, and bKash / Nagad payment verification.
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <div className="px-3.5 py-2 rounded-lg bg-white/90 dark:bg-slate-900/90 border border-amber-200/60 dark:border-amber-900/50 shadow-2xs">
                      <div className="text-[10px] uppercase font-semibold text-slate-400">Vault Ready</div>
                      <div className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        {vault.filter((v) => v.status === 'available').length} Credentials
                      </div>
                    </div>
                    <div className="px-3.5 py-2 rounded-lg bg-white/90 dark:bg-slate-900/90 border border-amber-200/60 dark:border-amber-900/50 shadow-2xs">
                      <div className="text-[10px] uppercase font-semibold text-slate-400">Active Plans</div>
                      <div className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100">
                        {products.reduce((acc, p) => acc + p.variants.length, 0)} Options
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Title, Search & Category Filters */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                      Browse Subscriptions
                    </h1>
                    <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                      {products.length} Products
                    </span>
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search subscriptions or tags..."
                      className="w-full h-9 pl-8 pr-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Category Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {['all', ...Array.from(new Set(products.map((p) => p.category)))].map((cat) => {
                    const count = cat === 'all'
                      ? products.length
                      : products.filter((p) => p.category === cat).length;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={`h-8 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer capitalize ${
                          selectedCategory === cat
                            ? 'bg-amber-500 text-slate-950 shadow-2xs'
                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-amber-500'
                        }`}
                      >
                        {cat === 'all' ? 'All Subscriptions' : cat} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Product Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {products
                  .filter((p) => {
                    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
                    const matchesQuery = !searchQuery ||
                      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      p.variants.some((v) => v.name.toLowerCase().includes(searchQuery.toLowerCase()));
                    return matchesCategory && matchesQuery;
                  })
                  .map((product) => {
                    const defaultVar =
                      product.variants.find((v) => v.isDefault) || product.variants[0];
                    const stock = defaultVar
                      ? getVaultStock(product.id, defaultVar.id)
                      : 0;

                    return (
                      <Card
                        key={product.id}
                        className="overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow"
                      >
                        <div>
                          <div className="relative aspect-[16/10] w-full bg-slate-100 dark:bg-slate-950 border-b border-slate-200/70 dark:border-slate-800">
                            {product.imageUrl && (
                              <Image
                                src={product.imageUrl}
                                alt={product.name}
                                fill
                                className="object-cover"
                                referrerPolicy="no-referrer"
                              />
                            )}
                            <div className="absolute top-2.5 left-2.5">
                              <StatusIndicator tone="amber" label={product.category} />
                            </div>
                            <div className="absolute top-2.5 right-2.5">
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-900/80 backdrop-blur-xs text-white">
                                {product.variants.length} Options
                              </span>
                            </div>
                          </div>

                          <div className="p-4 space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <h2 className="font-display font-bold text-base text-slate-900 dark:text-slate-100">
                                {product.name}
                              </h2>
                              {defaultVar && (
                                <span className="font-mono font-bold text-base text-amber-600 dark:text-amber-400 shrink-0">
                                  {formatBDT(defaultVar.priceBDT)}
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                              {product.shortDescription}
                            </p>

                            {/* Option Quick Chips */}
                            <div className="space-y-1.5 pt-1">
                              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                Available Plans &amp; Pricing
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {product.variants.map((v) => (
                                  <button
                                    key={v.id}
                                    type="button"
                                    onClick={() => openStoreProduct(product, v.id)}
                                    className="px-2 py-1 rounded-md text-[11px] font-medium border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 hover:border-amber-500 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <span>{v.name}</span>
                                    <span className="font-mono font-semibold text-amber-600 dark:text-amber-400">
                                      {formatBDT(v.priceBDT)}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 bg-slate-50/50 dark:bg-slate-950/40">
                          <div className="text-[11px] flex items-center gap-1.5 font-mono text-emerald-600 dark:text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>
                              {defaultVar?.deliveryMode === 'auto_vault'
                                ? `${stock} in Vault`
                                : 'Manual Dispatch'}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => openStoreProduct(product)}
                            className="h-8 px-3.5 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg cursor-pointer shrink-0 shadow-2xs"
                          >
                            Select &amp; Checkout
                          </button>
                        </div>
                      </Card>
                    );
                  })}
              </div>
            </div>
          )}

          {/* 4. WARRANTY SUPPORT */}
          {activeTab === 'warranty' && (
            <div className="space-y-5">
              <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                Warranty Claims &amp; Replacement
              </h1>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                <Card className="lg:col-span-5 p-5 space-y-4 text-xs">
                  <h2 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200/80 dark:border-slate-800 pb-3">
                    Request Credential Replacement
                  </h2>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const targetId = claimDeliveryId || userDeliveries[0]?.id;
                      if (!targetId) return;
                      onSubmitWarrantyClaim(targetId, claimReason);
                    }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Select Covered Order
                      </label>
                      <select
                        value={claimDeliveryId || userDeliveries[0]?.id || ''}
                        onChange={(e) => setClaimDeliveryId(e.target.value)}
                        className="w-full h-9 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                      >
                        {userDeliveries.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.orderId} — {d.productName} ({d.warrantyRemainingDays}d left)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Issue Description
                      </label>
                      <textarea
                        rows={4}
                        required
                        value={claimReason}
                        onChange={(e) => setClaimReason(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full h-9 font-semibold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg cursor-pointer"
                    >
                      Submit Warranty Claim
                    </button>
                  </form>
                </Card>

                <Card className="lg:col-span-7 overflow-hidden">
                  <div className="p-4 border-b border-slate-200/80 dark:border-slate-800">
                    <h2 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100">
                      Warranty Status by Order
                    </h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-[13px]">
                      <thead>
                        <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 text-xs text-slate-500 font-medium">
                          <th className="py-3 px-4">Order</th>
                          <th className="py-3 px-3">Product &amp; Option</th>
                          <th className="py-3 px-3">Warranty</th>
                          <th className="py-3 px-3">Replacements</th>
                          <th className="py-3 px-4 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                        {userDeliveries.map((d) => (
                          <tr key={d.id} className="whitespace-nowrap">
                            <td className="py-3 px-4 font-mono text-xs">{d.orderId}</td>
                            <td className="py-3 px-3 font-medium text-slate-900 dark:text-slate-100">
                              {d.productName} — {d.variantName}
                            </td>
                            <td className="py-3 px-3 font-mono text-xs">
                              {d.warrantyRemainingDays} / {d.warrantyDays}d
                            </td>
                            <td className="py-3 px-3 font-mono text-xs">
                              {d.replacementHistoryCount}x
                            </td>
                            <td className="py-3 px-4 text-right">
                              <StatusIndicator
                                tone={
                                  d.status === 'warranty_claim'
                                    ? 'red'
                                    : d.status === 'replaced'
                                    ? 'blue'
                                    : 'emerald'
                                }
                                label={
                                  d.status === 'warranty_claim'
                                    ? 'Claim Under Review'
                                    : d.status === 'replaced'
                                    ? 'Replaced'
                                    : 'Covered'
                                }
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* 5. BILLING & TRXID */}
          {activeTab === 'billing' && (
            <div className="space-y-5">
              <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                Billing &amp; TrxID History
              </h1>

              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-left border-collapse text-[13px]">
                    <thead>
                      <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 text-xs text-slate-500 font-medium">
                        <th className="py-3 px-4">Order ID</th>
                        <th className="py-3 px-3">Product &amp; Option</th>
                        <th className="py-3 px-3">Gateway</th>
                        <th className="py-3 px-3">TrxID</th>
                        <th className="py-3 px-3">Amount</th>
                        <th className="py-3 px-4 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                      {userPayments.map((pay) => (
                        <tr key={pay.id} className="whitespace-nowrap">
                          <td className="py-3 px-4 font-mono text-xs">{pay.orderId}</td>
                          <td className="py-3 px-3 font-medium text-slate-900 dark:text-slate-100">
                            {pay.productSummary}
                          </td>
                          <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                            {pay.gateway}
                          </td>
                          <td className="py-3 px-3 font-mono text-xs">{pay.trxId}</td>
                          <td className="py-3 px-3 font-mono font-semibold">
                            {formatBDT(pay.amountBDT)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <StatusIndicator
                              tone={pay.status === 'verified' ? 'emerald' : 'amber'}
                              label={pay.status === 'verified' ? 'Verified' : 'Pending'}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}
        </main>
      </div>

      {/* STOREFRONT PRODUCT & DYNAMIC OPTION SPECS MODAL */}
      <ModalShell
        open={Boolean(selectedStoreProduct)}
        onClose={() => setSelectedStoreProduct(null)}
        title={selectedStoreProduct?.name || 'Select Option'}
        maxWidth="max-w-2xl"
      >
        {selectedStoreProduct && (() => {
          const activeVar =
            selectedStoreProduct.variants.find((v) => v.id === selectedStoreVariantId) ||
            selectedStoreProduct.variants.find((v) => v.isDefault) ||
            selectedStoreProduct.variants[0];
          const liveStock = activeVar
            ? getVaultStock(selectedStoreProduct.id, activeVar.id)
            : 0;
          const allImages =
            selectedStoreProduct.galleryUrls && selectedStoreProduct.galleryUrls.length > 0
              ? selectedStoreProduct.galleryUrls
              : selectedStoreProduct.imageUrl
              ? [selectedStoreProduct.imageUrl]
              : [];

          return (
            <div className="space-y-4 text-xs">
              {allImages.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {allImages.map((url, idx) => (
                    <button
                      key={url + idx}
                      type="button"
                      onClick={() => setSelectedGalleryImage(url)}
                      className={`relative w-14 h-14 rounded-lg overflow-hidden border-2 shrink-0 cursor-pointer ${
                        (selectedGalleryImage || allImages[0]) === url
                          ? 'border-amber-500'
                          : 'border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <Image
                        src={url}
                        alt=""
                        fill
                        className="object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </button>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <div className="font-semibold text-slate-700 dark:text-slate-300">
                  Choose Subscription Option
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {selectedStoreProduct.variants.map((v) => {
                    const st = getVaultStock(selectedStoreProduct.id, v.id);
                    const isSelected = v.id === activeVar?.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setSelectedStoreVariantId(v.id)}
                        className={`p-3 rounded-lg border text-left flex items-center justify-between gap-3 cursor-pointer ${
                          isSelected
                            ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-display font-bold text-sm text-slate-900 dark:text-slate-100">
                              {v.name}
                            </span>
                            {v.isDefault && (
                              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 rounded inline-flex items-center gap-1">
                                <Star className="w-2.5 h-2.5 fill-current" />
                                Default
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {getCredentialTypeLabel(v.credentialType)} · {v.deviceLimit} ·{' '}
                            {v.hasWarranty ? `${v.warrantyDays}d Warranty` : 'No Warranty'}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100">
                            {formatBDT(v.priceBDT)}
                          </div>
                          <div className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                            {v.deliveryMode === 'auto_vault'
                              ? `${st} Ready in Vault`
                              : 'Manual Invite'}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {activeVar && (
                <div className="space-y-3 pt-1">
                  {/* Dynamic Option or Global Description */}
                  <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      {selectedStoreProduct.descriptionMode === 'global'
                        ? 'Product Description'
                        : `Option Description — ${activeVar.name}`}
                    </div>
                    <BBCodeRenderer
                      content={
                        selectedStoreProduct.descriptionMode === 'global'
                          ? selectedStoreProduct.description ||
                            selectedStoreProduct.shortDescription
                          : activeVar.optionDescription ||
                            selectedStoreProduct.description ||
                            selectedStoreProduct.shortDescription
                      }
                    />
                  </div>

                  {/* Option BBCode Warning */}
                  {(activeVar.warningNote || activeVar.importantNote) && (
                    <BBCodeRenderer
                      content={
                        activeVar.warningNote || `[warning]${activeVar.importantNote}[/warning]`
                      }
                    />
                  )}

                  {/* Per-Option Specifications Table */}
                  {activeVar.specifications && activeVar.specifications.length > 0 && (
                    <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
                      <div className="px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-800 dark:text-slate-200">
                        Specifications ({activeVar.name})
                      </div>
                      <div className="divide-y divide-slate-200/70 dark:divide-slate-800">
                        {activeVar.specifications.map((spec, idx) => (
                          <div
                            key={idx}
                            className="px-3.5 py-2 flex items-center justify-between bg-white dark:bg-slate-950"
                          >
                            <span className="text-slate-500">{spec.label}</span>
                            <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
                              {spec.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                        {activeVar.hasWarranty ? `${activeVar.warrantyDays}d Warranty` : 'No Warranty'}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Globe className="w-3.5 h-3.5 text-amber-500" />
                        {activeVar.vpnRequired ? 'VPN Required' : 'Direct Login'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onPlaceUserOrder(selectedStoreProduct.id, activeVar.id);
                        setSelectedStoreProduct(null);
                        setActiveTab('credentials');
                      }}
                      className="h-9 px-5 font-semibold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg cursor-pointer"
                    >
                      Buy Now — {formatBDT(activeVar.priceBDT)}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </ModalShell>
    </div>
  );
}
