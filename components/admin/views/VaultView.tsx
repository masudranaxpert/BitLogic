'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import {
  Plus,
  Copy,
  Check,
  Eye,
  EyeOff,
  Trash2,
  Upload,
  Search,
  MoreHorizontal,
  Pencil,
  ExternalLink,
} from 'lucide-react';
import {
  DigitalProduct,
  VaultCredential,
} from '@/lib/admin-data';
import {
  addDaysYmd,
  daysBetween,
  todayYmd,
} from '@/lib/admin/credential-lifecycle';
import {
  Card,
  StatMetric,
  getCredentialTypeLabel,
  StatusIndicator,
  SegmentedTabs,
  SwitchToggle,
  ShadcnCheckbox,
  PaginationFooter,
  FloatingBulkActionBar,
  EmptyTableState,
} from '@/components/admin/ui/primitives';

function resolveStockExpiry(item: VaultCredential): string | null {
  if (item.expiresAt) return item.expiresAt.slice(0, 10);
  if (item.validDays != null && item.addedAt) {
    return addDaysYmd(item.addedAt.slice(0, 10), item.validDays);
  }
  return null;
}

function ExpiresCell({ item }: { item: VaultCredential }) {
  const today = todayYmd();
  const expiry = resolveStockExpiry(item);
  const statusExpired = item.status === 'expired';

  if (!expiry) {
    return <span className="text-xs text-slate-400">No expiry</span>;
  }

  const left = daysBetween(today, expiry);
  const expired = statusExpired || left < 0 || expiry <= today;

  if (expired) {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="inline-flex w-fit items-center rounded-md bg-rose-50 px-1.5 py-0.5 text-[11px] font-semibold text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
          Expired
        </span>
        <span className="font-mono text-[11px] tabular-nums text-slate-400">
          {expiry}
        </span>
      </div>
    );
  }

  const urgent = left <= 7;
  const soon = left <= 14;

  return (
    <div className="flex flex-col gap-0.5">
      <span
        className={`inline-flex w-fit items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${
          urgent
            ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
            : soon
              ? 'bg-sky-50 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300'
              : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
        }`}
      >
        {left === 0 ? 'Ends today' : `${left}d left`}
      </span>
      <span className="font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
        {expiry}
      </span>
    </div>
  );
}

interface VaultViewProps {
  products: DigitalProduct[];
  vault: VaultCredential[];
  onOpenManualAddPage: () => void;
  onOpenBulkImportPage: () => void;
  onViewCredential: (id: string) => void;
  onEditCredential: (id: string) => void;
  onDeleteCredential: (id: string) => void;
}

type VaultRowActionsProps = {
  item: VaultCredential;
  revealed: boolean;
  copied: boolean;
  menuOpen: boolean;
  onMenuToggle: () => void;
  onMenuClose: () => void;
  onView: () => void;
  onEdit: () => void;
  onToggleReveal: () => void;
  onCopy: () => void;
  onDelete?: () => void;
};

function VaultRowActions({
  item,
  revealed,
  copied,
  menuOpen,
  onMenuToggle,
  onMenuClose,
  onView,
  onEdit,
  onToggleReveal,
  onCopy,
  onDelete,
}: VaultRowActionsProps) {
  const menuId = useId();
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onMenuClose();
        triggerRef.current?.focus();
      }
    };
    const onPointer = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) onMenuClose();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer);
    };
  }, [menuOpen, onMenuClose]);

  const menuItemClass =
    'flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-800 hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none dark:text-slate-100 dark:hover:bg-slate-800 dark:focus-visible:bg-slate-800';

  return (
    <div className="relative inline-flex justify-end" ref={menuRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={onMenuToggle}
        className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:border-emerald-500 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:border-slate-700 dark:hover:text-slate-200"
        aria-label={`More actions for ${item.id}`}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-controls={menuOpen ? menuId : undefined}
        title="More"
      >
        <MoreHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      {menuOpen ? (
        <div
          id={menuId}
          role="menu"
          aria-label={`Actions for ${item.id}`}
          className="absolute right-0 top-full z-20 mt-1 w-44 rounded-md border border-slate-200 bg-white py-1 shadow-md dark:border-slate-700 dark:bg-slate-900"
        >
          <button
            type="button"
            role="menuitem"
            className={menuItemClass}
            onClick={() => {
              onMenuClose();
              onView();
            }}
          >
            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
            View
          </button>
          <button
            type="button"
            role="menuitem"
            className={menuItemClass}
            onClick={() => {
              onMenuClose();
              onEdit();
            }}
          >
            <Pencil className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
            Edit
          </button>
          <button
            type="button"
            role="menuitem"
            className={menuItemClass}
            onClick={() => {
              onToggleReveal();
              onMenuClose();
            }}
          >
            {revealed ? (
              <EyeOff className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
            ) : (
              <Eye className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
            )}
            {revealed ? 'Hide secret' : 'Reveal secret'}
          </button>
          <button
            type="button"
            role="menuitem"
            className={menuItemClass}
            onClick={() => {
              onCopy();
              onMenuClose();
            }}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
            ) : (
              <Copy className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
            )}
            {copied ? 'Copied' : 'Copy secret'}
          </button>
          {onDelete ? (
            <>
              <div
                className="my-1 border-t border-slate-100 dark:border-slate-800"
                role="separator"
              />
              <button
                type="button"
                role="menuitem"
                className={`${menuItemClass} text-rose-700 dark:text-rose-300`}
                onClick={() => {
                  onMenuClose();
                  onDelete();
                }}
              >
                <Trash2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Delete
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default function VaultView({
  products,
  vault,
  onOpenManualAddPage,
  onOpenBulkImportPage,
  onViewCredential,
  onEditCredential,
  onDeleteCredential,
}: VaultViewProps) {
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'available' | 'delivered' | 'expired'
  >('all');
  const [productFilter, setProductFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showStatistics, setShowStatistics] = useState(true);
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1600);
  };

  const toggleReveal = (id: string) => {
    setRevealedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const filteredVault = vault.filter((item) => {
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesProd = productFilter === 'all' || item.productId === productFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      item.id.toLowerCase().includes(q) ||
      item.productName.toLowerCase().includes(q) ||
      item.variantName.toLowerCase().includes(q) ||
      item.secretValue.toLowerCase().includes(q) ||
      (item.batchNote || '').toLowerCase().includes(q);
    return matchesStatus && matchesProd && matchesSearch;
  });

  useEffect(() => setPage(1), [statusFilter, productFilter, searchQuery, filteredVault.length]);
  const pagedVault = filteredVault.slice((page - 1) * pageSize, page * pageSize);

  const availableCount = vault.filter((v) => v.status === 'available').length;
  const deliveredCount = vault.filter((v) => v.status === 'delivered').length;
  const expiredCount = vault.filter((v) => v.status === 'expired').length;
  const tokenCount = vault.filter(
    (v) => v.credentialType === 'token' && v.status === 'available',
  ).length;
  const emailLoginCount = vault.filter(
    (v) => v.credentialType === 'email_login' && v.status === 'available',
  ).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-2xl">
          Credentials
        </h1>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpenBulkImportPage}
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-[0_0_0_1px_rgba(15,23,42,0.08)] hover:shadow-[0_0_0_1px_#059669] dark:bg-slate-900 dark:text-slate-200 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.1)]"
          >
            <Upload className="h-3.5 w-3.5" aria-hidden />
            <span>Bulk Import</span>
          </button>

          <button
            type="button"
            onClick={onOpenManualAddPage}
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 text-xs font-semibold text-white shadow-2xs hover:bg-emerald-700"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            <span>Manual Add</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
        <div className="flex max-w-full items-center gap-2">
          <SwitchToggle
            checked={showStatistics}
            onChange={setShowStatistics}
            label="Stats"
          />
          <div className="min-w-0 flex-1 overflow-x-auto">
            <SegmentedTabs
              options={[
                { value: 'all', label: 'All', count: vault.length },
                { value: 'available', label: 'Available', count: availableCount },
                { value: 'delivered', label: 'Delivered', count: deliveredCount },
                { value: 'expired', label: 'Expired', count: expiredCount },
              ]}
              value={statusFilter}
              onChange={setStatusFilter}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative w-full sm:w-56">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search…"
              className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-xs focus:border-emerald-600 focus:outline-none dark:border-slate-800 dark:bg-slate-900"
            />
          </div>

          <select
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            aria-label="Filter by product"
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs dark:border-slate-800 dark:bg-slate-900"
          >
            <option value="all">All Products</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {showStatistics && (
        <Card className="grid grid-cols-2 overflow-hidden divide-x divide-y divide-slate-200/80 sm:divide-y-0 dark:divide-slate-800 lg:grid-cols-4 [&>*:nth-child(2)]:border-t-0 [&>*:nth-child(odd)]:border-l-0">
          <StatMetric label="Available" value={availableCount} />
          <StatMetric label="Delivered" value={deliveredCount} />
          <StatMetric label="Expired" value={expiredCount} tone="amber" />
          <StatMetric
            label="Tokens / Email"
            value={`${tokenCount} / ${emailLoginCount}`}
          />
        </Card>
      )}

      <Card className="overflow-hidden">
        {vault.length === 0 ? (
          <EmptyTableState title="No credentials" />
        ) : filteredVault.length === 0 ? (
          <EmptyTableState
            title="No matches"
            onReset={() => {
              setStatusFilter('all');
              setProductFilter('all');
              setSearchQuery('');
            }}
            resetLabel="Clear filters"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/50">
                  <th className="w-9 px-4 py-3">
                    <ShadcnCheckbox
                      checked={
                        filteredVault.length > 0 &&
                        selectedIds.length === filteredVault.length
                      }
                      onChange={(checked) =>
                        setSelectedIds(checked ? filteredVault.map((i) => i.id) : [])
                      }
                    />
                  </th>
                  <th className="whitespace-nowrap px-3 py-3">ID</th>
                  <th className="whitespace-nowrap px-3 py-3">Product</th>
                  <th className="whitespace-nowrap px-3 py-3">Type</th>
                  <th className="whitespace-nowrap px-3 py-3">Secret</th>
                  <th className="whitespace-nowrap px-3 py-3">Expires</th>
                  <th className="whitespace-nowrap px-3 py-3">Status</th>
                  <th className="w-12 whitespace-nowrap px-4 py-3 text-right"> </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                {pagedVault.map((item) => {
                  const isRevealed = Boolean(revealedIds[item.id]);
                  const isSelected = selectedIds.includes(item.id);
                  const maskedSecret =
                    item.secretValue.length > 14
                      ? `${item.secretValue.slice(0, 10)}••••••••${item.secretValue.slice(-4)}`
                      : '••••••••••••';

                  return (
                    <tr
                      key={item.id}
                      className={`whitespace-nowrap transition-colors ${
                        isSelected
                          ? 'bg-emerald-50/60 dark:bg-emerald-950/30'
                          : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="px-4 py-3">
                        <ShadcnCheckbox
                          checked={isSelected}
                          onChange={() => toggleSelect(item.id)}
                        />
                      </td>

                      <td className="admin-metric px-3 py-3">{item.id}</td>

                      <td className="max-w-[220px] truncate px-3 py-3 font-medium text-slate-900 dark:text-slate-100">
                        {item.productName}
                        <span className="font-normal text-slate-400">
                          {' '}
                          — {item.variantName}
                        </span>
                      </td>

                      <td className="px-3 py-3 text-sm text-slate-600 dark:text-slate-400">
                        {getCredentialTypeLabel(item.credentialType)}
                      </td>

                      <td className="admin-metric max-w-[220px] truncate px-3 py-3">
                        {isRevealed ? item.secretValue : maskedSecret}
                      </td>

                      <td className="px-3 py-3">
                        <ExpiresCell item={item} />
                      </td>

                      <td className="px-3 py-3">
                        {item.status === 'available' ? (
                          <StatusIndicator tone="emerald" label="Available" />
                        ) : item.status === 'expired' ? (
                          <StatusIndicator tone="red" label="Expired" />
                        ) : item.status === 'replaced' ? (
                          <StatusIndicator tone="blue" label="Replaced" />
                        ) : (
                          <StatusIndicator tone="zinc" label="Delivered" />
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <VaultRowActions
                          item={item}
                          revealed={isRevealed}
                          copied={copiedId === item.id}
                          menuOpen={openMenuId === item.id}
                          onMenuToggle={() =>
                            setOpenMenuId((prev) =>
                              prev === item.id ? null : item.id,
                            )
                          }
                          onMenuClose={() => setOpenMenuId(null)}
                          onView={() => onViewCredential(item.id)}
                          onEdit={() => onEditCredential(item.id)}
                          onToggleReveal={() => toggleReveal(item.id)}
                          onCopy={() => handleCopy(item.id, item.secretValue)}
                          onDelete={
                            item.status === 'available'
                              ? () => onDeleteCredential(item.id)
                              : undefined
                          }
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <PaginationFooter
          totalItems={filteredVault.length}
          pageSize={pageSize}
          currentPage={page}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </Card>

      <FloatingBulkActionBar
        selectedCount={selectedIds.length}
        onClear={() => setSelectedIds([])}
        actions={[
          {
            label: 'Reveal',
            onClick: () => {
              const next: Record<string, boolean> = { ...revealedIds };
              selectedIds.forEach((id) => {
                next[id] = true;
              });
              setRevealedIds(next);
            },
          },
          {
            label: 'Delete',
            destructive: true,
            onClick: () => {
              selectedIds.forEach((id) => onDeleteCredential(id));
              setSelectedIds([]);
            },
          },
        ]}
      />
    </div>
  );
}
