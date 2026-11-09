'use client';

import React from 'react';
import { Card } from '@/components/admin/ui/Card';
import { BrandLogo } from '@/components/brand/BrandLogo';
import type { AdminTab } from '@/lib/admin-data';
import {
  LayoutDashboard,
  Layers,
  Database,
  Send,
  CreditCard,
  Ticket,
  Users,
  Network,
  Image as ImageIcon,
  Sliders,
  PanelTop,
  Mail,
  Headset,
  ShieldAlert,
} from 'lucide-react';

const STATIC_MAIN_MENU = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'Product', icon: Layers },
  { label: 'Credentials', icon: Database },
  { label: 'Orders', icon: Send },
  { label: 'Payments', icon: CreditCard },
  { label: 'Support Tickets', icon: Ticket },
  { label: 'Customer', icon: Users },
  { label: 'Suppliers', icon: Network },
  { label: 'Media Library', icon: ImageIcon },
];

const STATIC_TOOLS_MENU = [
  { label: 'Settings', icon: Sliders },
  { label: 'Storefront', icon: PanelTop },
  { label: 'Email', icon: Mail },
  { label: 'Contact', icon: Headset },
  { label: 'Security & Traffic', icon: ShieldAlert },
];

export function AdminTableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <Card className="overflow-hidden" aria-busy="true" aria-label="Loading table data">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200/80 dark:border-slate-800 text-left text-xs text-slate-500">
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i} className="px-4 py-3 font-medium">
                  <div className="h-3.5 w-20 rounded bg-slate-200/80 dark:bg-slate-700 shimmer-sweep" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {Array.from({ length: rows }).map((_, i) => (
              <tr key={i}>
                {Array.from({ length: columns }).map((_, j) => (
                  <td key={j} className="px-4 py-3.5">
                    {j === 0 ? (
                      <div className="space-y-1.5">
                        <div className="h-4 w-36 rounded bg-slate-200/80 dark:bg-slate-700 shimmer-sweep" />
                        <div className="h-3 w-24 rounded bg-slate-200/50 dark:bg-slate-800 shimmer-sweep" />
                      </div>
                    ) : j === columns - 1 ? (
                      <div className="h-7 w-16 rounded bg-slate-200/60 dark:bg-slate-800 shimmer-sweep ml-auto" />
                    ) : (
                      <div className="h-5 w-20 rounded-full bg-slate-200/70 dark:bg-slate-800 shimmer-sweep" />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function AdminListViewSkeleton({
  rows = 7,
  columns = 5,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading list view">
      {/* Top Header Placeholder */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <div className="h-7 w-40 rounded-md bg-slate-200/80 dark:bg-slate-700 shimmer-sweep" />
          <div className="h-3.5 w-56 rounded bg-slate-200/50 dark:bg-slate-800 shimmer-sweep" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-24 rounded-lg bg-slate-200/70 dark:bg-slate-800 shimmer-sweep" />
          <div className="h-9 w-28 rounded-lg bg-emerald-600/60 shimmer-sweep" />
        </div>
      </div>

      {/* Toolbar / Search Filter */}
      <Card className="p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="h-9 w-full sm:w-72 rounded-lg bg-slate-200/70 dark:bg-slate-800 shimmer-sweep" />
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="h-9 w-24 rounded-lg bg-slate-200/60 dark:bg-slate-800 shimmer-sweep" />
            <div className="h-9 w-28 rounded-lg bg-slate-200/60 dark:bg-slate-800 shimmer-sweep" />
          </div>
        </div>
      </Card>

      {/* Table */}
      <AdminTableSkeleton rows={rows} columns={columns} />
    </div>
  );
}

export function AdminProductFormSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading product editor">
      {/* Top action bar: Back button + Title on left; Cancel + Save on right */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shimmer-sweep" />
          <div className="h-7 w-36 rounded-md bg-slate-200/80 dark:bg-slate-700 shimmer-sweep" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-20 rounded-lg bg-slate-200/60 dark:bg-slate-800 shimmer-sweep" />
          <div className="h-9 w-24 rounded-lg bg-emerald-600/60 shimmer-sweep" />
        </div>
      </div>

      {/* 2-Column Grid matching ProductAddView */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Product Info & Plans (col-span-8) */}
        <div className="lg:col-span-8 space-y-5">
          {/* General Info Card */}
          <Card className="p-5 sm:p-6 space-y-5">
            <div className="h-5 w-24 rounded bg-slate-200/80 dark:bg-slate-700 shimmer-sweep pb-2 border-b border-slate-200/70 dark:border-slate-800" />
            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="h-3.5 w-16 rounded bg-slate-200/70 dark:bg-slate-700 shimmer-sweep" />
                <div className="h-10 w-full rounded-lg bg-slate-100 dark:bg-slate-800 shimmer-sweep" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="h-3.5 w-20 rounded bg-slate-200/70 dark:bg-slate-700 shimmer-sweep" />
                  <div className="h-10 w-full rounded-lg bg-slate-100 dark:bg-slate-800 shimmer-sweep" />
                </div>
                <div className="space-y-1.5">
                  <div className="h-3.5 w-20 rounded bg-slate-200/70 dark:bg-slate-700 shimmer-sweep" />
                  <div className="h-10 w-full rounded-lg bg-slate-100 dark:bg-slate-800 shimmer-sweep" />
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="h-3.5 w-24 rounded bg-slate-200/70 dark:bg-slate-700 shimmer-sweep" />
                <div className="h-10 w-full rounded-lg bg-slate-100 dark:bg-slate-800 shimmer-sweep" />
              </div>
              <div className="space-y-1.5">
                <div className="h-3.5 w-24 rounded bg-slate-200/70 dark:bg-slate-700 shimmer-sweep" />
                <div className="h-8 w-full rounded-t-lg bg-slate-200/50 dark:bg-slate-800 shimmer-sweep" />
                <div className="h-28 w-full rounded-b-lg bg-slate-100 dark:bg-slate-800/80 shimmer-sweep" />
              </div>
            </div>
          </Card>

          {/* Plans Card */}
          <Card className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/70 dark:border-slate-800">
              <div className="h-5 w-24 rounded bg-slate-200/80 dark:bg-slate-700 shimmer-sweep" />
              <div className="h-8 w-24 rounded-lg bg-emerald-600/50 shimmer-sweep" />
            </div>
            {/* Plan item skeleton */}
            <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 space-y-3.5 bg-slate-50/50 dark:bg-slate-900/40">
              <div className="flex items-center justify-between">
                <div className="h-4 w-16 rounded bg-slate-200 dark:bg-slate-700 shimmer-sweep" />
                <div className="h-5 w-5 rounded bg-slate-200/60 dark:bg-slate-800" />
              </div>
              <div className="space-y-1.5">
                <div className="h-3 w-14 rounded bg-slate-200/60 dark:bg-slate-700 shimmer-sweep" />
                <div className="h-9 w-full rounded-lg bg-white dark:bg-slate-800 shimmer-sweep border border-slate-200/70 dark:border-slate-700" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <div className="h-3 w-16 rounded bg-slate-200/60 dark:bg-slate-700 shimmer-sweep" />
                  <div className="h-9 w-full rounded-lg bg-white dark:bg-slate-800 shimmer-sweep border border-slate-200/70 dark:border-slate-700" />
                </div>
                <div className="space-y-1.5">
                  <div className="h-3 w-16 rounded bg-slate-200/60 dark:bg-slate-700 shimmer-sweep" />
                  <div className="h-9 w-full rounded-lg bg-white dark:bg-slate-800 shimmer-sweep border border-slate-200/70 dark:border-slate-700" />
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Media & Live Preview (col-span-4) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Media Card */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-4 w-20 rounded bg-slate-200/80 dark:bg-slate-700 shimmer-sweep" />
              <div className="h-3.5 w-14 rounded bg-slate-200/50 dark:bg-slate-800 shimmer-sweep" />
            </div>
            <div className="aspect-4/3 w-full rounded-xl bg-slate-200/60 dark:bg-slate-800 shimmer-sweep flex items-center justify-center">
              <div className="h-10 w-10 rounded-full bg-slate-300/50 dark:bg-slate-700/50" />
            </div>
            <div className="h-9 w-full rounded-lg bg-slate-100 dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-700 shimmer-sweep" />
            <div className="space-y-1.5">
              <div className="h-3 w-16 rounded bg-slate-200/60 dark:bg-slate-700 shimmer-sweep" />
              <div className="h-9 w-full rounded-lg bg-slate-100 dark:bg-slate-800 shimmer-sweep" />
            </div>
          </Card>

          {/* Live Preview Card */}
          <Card className="p-5 space-y-3.5">
            <div className="h-4 w-20 rounded bg-slate-200/80 dark:bg-slate-700 shimmer-sweep pb-1" />
            <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 space-y-3 bg-slate-50/50 dark:bg-slate-900/40">
              <div className="h-3 w-24 rounded bg-slate-200/60 dark:bg-slate-800 shimmer-sweep" />
              <div className="h-5 w-40 rounded bg-slate-200/80 dark:bg-slate-700 shimmer-sweep" />
              <div className="space-y-1">
                <div className="h-2.5 w-full rounded bg-slate-200/50 dark:bg-slate-800 shimmer-sweep" />
                <div className="h-2.5 w-3/4 rounded bg-slate-200/50 dark:bg-slate-800 shimmer-sweep" />
              </div>
              <div className="flex gap-2 pt-1">
                <div className="h-6 w-16 rounded-md bg-slate-200/70 dark:bg-slate-800 shimmer-sweep" />
                <div className="h-6 w-16 rounded-md bg-slate-200/50 dark:bg-slate-800 shimmer-sweep" />
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-200/70 dark:border-slate-800">
                <div className="h-5 w-20 rounded bg-slate-200/80 dark:bg-slate-700 shimmer-sweep" />
                <div className="h-4 w-24 rounded-full bg-emerald-600/30 shimmer-sweep" />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export function AdminFormSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start" aria-busy="true">
      <Card className="lg:col-span-7 p-5 space-y-4">
        <div className="h-5 w-28 rounded bg-slate-200/80 dark:bg-slate-700 shimmer-sweep pb-3 border-b border-slate-200/80 dark:border-slate-800" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3.5 w-20 rounded bg-slate-200/70 dark:bg-slate-700 shimmer-sweep" />
              <div className="h-9 w-full rounded-md bg-slate-100 dark:bg-slate-800 shimmer-sweep" />
            </div>
          ))}
        </div>
      </Card>
      <Card className="lg:col-span-5 p-5 space-y-4">
        <div className="h-5 w-24 rounded bg-slate-200/80 dark:bg-slate-700 shimmer-sweep pb-3 border-b border-slate-200/80 dark:border-slate-800" />
        <div className="space-y-2.5">
          <div className="h-14 rounded-lg bg-slate-100 dark:bg-slate-800 shimmer-sweep" />
          <div className="h-14 rounded-lg bg-slate-100 dark:bg-slate-800 shimmer-sweep" />
        </div>
      </Card>
    </div>
  );
}

export function AdminDashboardSkeleton() {
  return (
    <div className="space-y-6 pb-20" aria-busy="true" aria-label="Loading dashboard workspace">
      {/* Top Header Placeholder */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <div className="h-6 w-44 rounded-md bg-slate-200/80 dark:bg-slate-700 shimmer-sweep" />
          <div className="h-3.5 w-64 rounded bg-slate-200/50 dark:bg-slate-800 shimmer-sweep" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-24 rounded-lg bg-slate-200/70 dark:bg-slate-800 shimmer-sweep" />
          <div className="h-9 w-32 rounded-lg bg-slate-200/80 dark:bg-slate-700 shimmer-sweep" />
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-3.5 w-24 rounded bg-slate-200/70 dark:bg-slate-800 shimmer-sweep" />
              <div className="h-8 w-8 rounded-lg bg-slate-200/60 dark:bg-slate-800 shimmer-sweep" />
            </div>
            <div className="h-7 w-28 rounded-md bg-slate-200/90 dark:bg-slate-700 shimmer-sweep" />
            <div className="h-3 w-16 rounded bg-slate-200/50 dark:bg-slate-800 shimmer-sweep" />
          </Card>
        ))}
      </div>

      {/* Toolbar / Search Filter */}
      <Card className="p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="h-9 w-full sm:w-72 rounded-lg bg-slate-200/70 dark:bg-slate-800 shimmer-sweep" />
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="h-9 w-24 rounded-lg bg-slate-200/60 dark:bg-slate-800 shimmer-sweep" />
            <div className="h-9 w-28 rounded-lg bg-slate-200/60 dark:bg-slate-800 shimmer-sweep" />
          </div>
        </div>
      </Card>

      {/* Data Table */}
      <AdminTableSkeleton rows={6} columns={5} />
    </div>
  );
}

/**
 * Contextual skeleton that matches the exact layout of the active tab.
 */
export function AdminContextualSkeleton({ tab }: { tab?: AdminTab | null }) {
  switch (tab) {
    case 'product-add':
    case 'product-option':
      return <AdminProductFormSkeleton />;
    case 'features':
    case 'email':
    case 'email-templates':
    case 'email-triggers':
    case 'contact':
    case 'storefront':
    case 'staff-add':
      return <AdminFormSkeleton />;
    case 'overview':
    case 'security':
      return <AdminDashboardSkeleton />;
    case 'products':
    case 'deliveries':
    case 'orders-pinned':
    case 'orders-renewals':
    case 'warranty-claims':
    case 'tickets':
    case 'users':
    case 'user-detail':
    case 'payments':
    case 'coupons':
    case 'suppliers':
    case 'supplier-catalog':
    case 'supplier-links':
    case 'supplier-orders':
    case 'supplier-settings':
    case 'vault':
    case 'vault-manual':
    case 'vault-bulk':
    case 'vault-view':
    case 'vault-edit':
    case 'staff':
    case 'staff-logins':
    case 'staff-actions':
    case 'staff-view':
    case 'warranties':
    case 'credential-types':
    case 'categories':
    case 'media':
    default:
      return <AdminListViewSkeleton />;
  }
}

/**
 * Full page shell skeleton: keeps the sidebar and header permanently visible
 * during SSR and initial page loads so the user never experiences layout loss.
 */
export function AdminShellSkeleton({
  children,
  tab,
}: {
  children?: React.ReactNode;
  tab?: AdminTab | null;
}) {
  return (
    <div className="flex min-h-dvh bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
      {/* Desktop Sidebar Shell - Permanent static labels so zero layout shift */}
      <aside className="hidden lg:sticky lg:top-0 lg:h-dvh lg:flex w-60 shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 flex-col justify-between select-none">
        <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-5">
          <div className="px-1.5 py-1 flex items-center gap-2">
            <BrandLogo size="sm" />
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs">
              Admin
            </span>
          </div>

          <div className="space-y-4 pt-2">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2 block mb-1">
                Main Menu
              </span>
              <div className="space-y-0.5">
                {STATIC_MAIN_MENU.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400"
                    >
                      <Icon className="w-4 h-4 shrink-0 text-slate-400" />
                      <span>{item.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2 block mb-1">
                Tools
              </span>
              <div className="space-y-0.5">
                {STATIC_TOOLS_MENU.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400"
                    >
                      <Icon className="w-4 h-4 shrink-0 text-slate-400" />
                      <span>{item.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="p-3 border-t border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center justify-between gap-2 p-1.5">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-full bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 flex items-center justify-center font-bold text-xs">
                A
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  BitLogic Admin
                </div>
                <div className="text-[10px] text-slate-400">
                  Admin
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex flex-1 flex-col min-w-0">
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="h-4 w-32 rounded bg-slate-200/80 dark:bg-slate-700 shimmer-sweep" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-40 rounded-lg bg-slate-100 dark:bg-slate-800 shimmer-sweep hidden sm:block" />
            <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 shimmer-sweep" />
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-7 pb-22 md:pb-8 max-w-[1440px] w-full mx-auto">
          {children || <AdminContextualSkeleton tab={tab} />}
        </main>
      </div>
    </div>
  );
}
