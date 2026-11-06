'use client';

import React, { useState } from 'react';
import {
  ArrowLeft,
  Copy,
  Check,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  MoreHorizontal,
} from 'lucide-react';
import type { VaultCredential } from '@/lib/admin-data';
import {
  addDaysYmd,
  daysBetween,
  todayYmd,
} from '@/lib/admin/credential-lifecycle';
import {
  Card,
  getCredentialTypeLabel,
  StatusIndicator,
  BBCodeRenderer,
} from '@/components/admin/ui/primitives';

function resolveStockExpiry(item: VaultCredential): string | null {
  if (item.expiresAt) return item.expiresAt.slice(0, 10);
  if (item.validDays != null && item.addedAt) {
    return addDaysYmd(item.addedAt.slice(0, 10), item.validDays);
  }
  return null;
}

type VaultCredentialViewProps = {
  item: VaultCredential | null;
  onBack: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
};

function StatusBadge({ status }: { status: VaultCredential['status'] }) {
  if (status === 'available')
    return <StatusIndicator tone="emerald" label="Available" size="md" />;
  if (status === 'expired')
    return <StatusIndicator tone="red" label="Expired" size="md" />;
  if (status === 'replaced')
    return <StatusIndicator tone="blue" label="Replaced" size="md" />;
  return <StatusIndicator tone="zinc" label="Delivered" size="md" />;
}

function MetaRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-4">
      <dt className="w-28 shrink-0 text-[13px] font-medium text-slate-500 dark:text-slate-400">
        {label}
      </dt>
      <dd className="min-w-0 flex-1 text-[13px] font-medium text-slate-900 dark:text-slate-100 sm:text-sm">
        {children}
      </dd>
    </div>
  );
}

export default function VaultCredentialView({
  item,
  onBack,
  onEdit,
  onDelete,
}: VaultCredentialViewProps) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  if (!item) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-50"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Credentials
        </button>
        <Card className="p-8 text-center text-sm text-slate-500">
          Credential not found.
        </Card>
      </div>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(item.secretValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const masked =
    item.secretValue.length > 16
      ? `${item.secretValue.slice(0, 8)}••••••••${item.secretValue.slice(-4)}`
      : '••••••••••••••••';

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Credentials
          </button>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-xl">
              {item.productName}
            </h1>
            <StatusBadge status={item.status} />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[13px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {item.variantName}
            </span>
            <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[13px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {getCredentialTypeLabel(item.credentialType)}
            </span>
            <span className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2 py-0.5 font-mono text-[12px] text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
              {item.id}
            </span>
          </div>
        </div>

        <div className="relative flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => onEdit(item.id)}
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
            Edit
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-800 dark:border-slate-700 dark:hover:text-slate-100"
              aria-label="More actions"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
            >
              <MoreHorizontal className="h-4 w-4" aria-hidden />
            </button>
            {menuOpen ? (
              <div
                role="menu"
                className="absolute right-0 top-full z-20 mt-1 w-40 rounded-lg border border-slate-200 bg-white py-1 shadow-md dark:border-slate-700 dark:bg-slate-900"
              >
                {item.status === 'available' ? (
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm font-medium text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/40"
                    onClick={() => {
                      setMenuOpen(false);
                      onDelete(item.id);
                      onBack();
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    Delete
                  </button>
                ) : (
                  <div className="px-3 py-2 text-xs text-slate-400">
                    No extra actions
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Secret — primary focus */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800 sm:px-5">
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Secret
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setRevealed((v) => !v)}
              className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {revealed ? (
                <EyeOff className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <Eye className="h-3.5 w-3.5" aria-hidden />
              )}
              {revealed ? 'Hide' : 'Reveal'}
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
              ) : (
                <Copy className="h-3.5 w-3.5" aria-hidden />
              )}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        <div className="space-y-3 px-4 py-4 sm:px-5">
          <div className="rounded-lg bg-slate-50 px-3.5 py-3 font-mono text-sm break-all text-slate-800 dark:bg-slate-950 dark:text-slate-100">
            {revealed ? item.secretValue : masked}
          </div>

          {item.email || item.password || item.profilePin ? (
            <dl className="space-y-2.5 pt-1">
              {item.email ? (
                <MetaRow label="Email">
                  <span className="font-mono">{item.email}</span>
                </MetaRow>
              ) : null}
              {item.password ? (
                <MetaRow label="Password">
                  <span className="font-mono">
                    {revealed ? item.password : '••••••••'}
                  </span>
                </MetaRow>
              ) : null}
              {item.profilePin ? (
                <MetaRow label="PIN">
                  <span className="font-mono">
                    {revealed ? item.profilePin : '••••'}
                  </span>
                </MetaRow>
              ) : null}
            </dl>
          ) : null}
        </div>
      </Card>

      {/* Details grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="p-4 sm:p-5">
          <h2 className="mb-3.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
            Stock
          </h2>
          <dl className="space-y-3">
            {(() => {
              const expiry = resolveStockExpiry(item);
              const today = todayYmd();
              if (!expiry) {
                return (
                  <MetaRow label="Remaining">
                    <span className="text-slate-400">No expiry set</span>
                  </MetaRow>
                );
              }
              const left = daysBetween(today, expiry);
              const expired = item.status === 'expired' || expiry <= today;
              return (
                <>
                  <MetaRow label="Remaining">
                    {expired ? (
                      <span className="inline-flex rounded-md bg-rose-50 px-2 py-0.5 text-[13px] font-semibold text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
                        Expired
                      </span>
                    ) : (
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-[13px] font-semibold tabular-nums ${
                          left <= 7
                            ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                            : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                        }`}
                      >
                        {left === 0 ? 'Ends today' : `${left} days left`}
                      </span>
                    )}
                  </MetaRow>
                  <MetaRow label="Expires">{expiry}</MetaRow>
                </>
              );
            })()}
            <MetaRow label="Valid days">
              {item.validDays != null ? `${item.validDays} days` : '—'}
            </MetaRow>
            <MetaRow label="Added">{item.addedAt}</MetaRow>
            <MetaRow label="Batch">{item.batchNote || '—'}</MetaRow>
          </dl>
        </Card>

        <Card className="p-4 sm:p-5">
          <h2 className="mb-3.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
            Assignment
          </h2>
          <dl className="space-y-3">
            <MetaRow label="Order">
              {item.assignedOrderId ? (
                <span className="font-mono">{item.assignedOrderId}</span>
              ) : (
                <span className="font-normal text-slate-400">Unassigned</span>
              )}
            </MetaRow>
            <MetaRow label="Buyer">
              {item.assignedBuyerEmail ? (
                <span className="break-all font-mono text-[13px]">
                  {item.assignedBuyerEmail}
                </span>
              ) : (
                <span className="font-normal text-slate-400">—</span>
              )}
            </MetaRow>
          </dl>
        </Card>
      </div>

      {item.noteBBCode ? (
        <Card className="p-4 sm:p-5">
          <h2 className="mb-2.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
            Description
          </h2>
          <div className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            <BBCodeRenderer content={item.noteBBCode} />
          </div>
        </Card>
      ) : null}
    </div>
  );
}
