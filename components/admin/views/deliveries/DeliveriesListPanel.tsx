'use client';

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Copy, Check, MessageSquare, MoreHorizontal, Pin, PinOff } from 'lucide-react';
import type { DigitalDelivery, VaultCredential } from '@/lib/admin-data';
import {
  Card,
  StatMetric,
  StatusIndicator,
  SegmentedTabs,
  SwitchToggle,
  ShadcnCheckbox,
  PaginationFooter,
  EmptyTableState,
} from '@/components/admin/ui/primitives';
import type { DeliveriesViewState } from './useDeliveriesViewState';

type DeliveriesListPanelProps = {
  deliveries: DigitalDelivery[];
  vault: VaultCredential[];
  onSelectChatDelivery?: (deliveryId: string | null) => void;
  onTogglePinOrder?: (deliveryId: string) => void;
  hideWarrantyFilter?: boolean;
  pageTitle?: string;
  pageMode?: 'all' | 'pinned' | 'renewals' | 'warranty';
  state: DeliveriesViewState;
};

function primaryFulfillAction(del: DigitalDelivery): {
  label: string;
  urgent: boolean;
  isReplace: boolean;
} {
  const renewPending = Boolean(del.renewalPending);
  const emptySecret = !del.credentialPayload.secretValue?.trim();
  if (
    del.status === 'pending_dispatch' ||
    (renewPending && emptySecret)
  ) {
    return {
      label: renewPending ? 'Assign' : 'Send',
      urgent: true,
      isReplace: false,
    };
  }
  if (del.status === 'warranty_claim') {
    return { label: 'Swap', urgent: true, isReplace: true };
  }
  return { label: 'Replace', urgent: false, isReplace: true };
}

type OrderRowActionsProps = {
  del: DigitalDelivery;
  unread: number;
  menuOpen: boolean;
  onMenuToggle: () => void;
  onMenuClose: () => void;
  onOpenChat: () => void;
  onFulfill: (isReplace: boolean) => void;
  onTogglePin?: () => void;
};

/** Chat (old style) + ⋯ menu (Send / Replace / Pin). */
function OrderRowActions({
  del,
  unread,
  menuOpen,
  onMenuToggle,
  onMenuClose,
  onOpenChat,
  onFulfill,
  onTogglePin,
}: OrderRowActionsProps) {
  const action = primaryFulfillAction(del);
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
    'flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 focus-visible:bg-slate-50 dark:focus-visible:bg-slate-800 focus-visible:outline-none';

  return (
    <div className="inline-flex items-center justify-end gap-1.5">
      <button
        type="button"
        onClick={onOpenChat}
        className={`relative h-8 w-8 rounded-md border inline-flex items-center justify-center cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${
          unread > 0
            ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
            : 'border-slate-200 dark:border-slate-700 hover:border-emerald-500 text-slate-600 dark:text-slate-300'
        }`}
        aria-label={
          unread > 0
            ? `Open chat for ${del.orderId}, ${unread} unread`
            : `Open chat for ${del.orderId}`
        }
        title="Chat"
      >
        <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
        {unread > 0 ? (
          <span className="absolute -top-1 -right-1 min-w-[1rem] h-4 px-1 rounded-full bg-rose-600 text-white text-[10px] font-semibold leading-4 tabular-nums">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>

      <div className="relative" ref={menuRef}>
        <button
          ref={triggerRef}
          type="button"
          onClick={onMenuToggle}
          className="h-8 w-8 rounded-md border border-slate-200 dark:border-slate-700 inline-flex items-center justify-center text-slate-500 hover:border-emerald-500 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
          aria-label={`More actions for ${del.orderId}`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-controls={menuOpen ? menuId : undefined}
          title="More"
        >
          <MoreHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
        {menuOpen ? (
          <div
            id={menuId}
            role="menu"
            aria-label={`Actions for ${del.orderId}`}
            className="absolute right-0 top-full z-20 mt-1 w-44 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-1 shadow-md"
          >
            <button
              type="button"
              role="menuitem"
              className={menuItemClass}
              onClick={() => {
                onFulfill(action.isReplace);
                onMenuClose();
              }}
            >
              {action.label}
            </button>
            {onTogglePin ? (
              <button
                type="button"
                role="menuitem"
                className={menuItemClass}
                onClick={() => {
                  onTogglePin();
                  onMenuClose();
                }}
              >
                {del.pinned ? (
                  <>
                    <PinOff className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    Unpin
                  </>
                ) : (
                  <>
                    <Pin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    Pin
                  </>
                )}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function DeliveriesListPanel({
  deliveries,
  vault: _vault,
  onSelectChatDelivery,
  onTogglePinOrder,
  pageTitle = 'Orders',
  pageMode = 'all',
  state,
}: DeliveriesListPanelProps) {
  const {
    viewLayout,
    setViewLayout,
    searchQuery,
    setSearchQuery,
    showStatistics,
    setShowStatistics,
    statusFilter,
    setStatusFilter,
    unreadChatDeliveriesCount,
    pendingCount,
    deliveredCount,
    refundedCount,
    activeWarrantyCount,
    filteredDeliveries,
    selectedIds,
    setSelectedIds,
    handleCopy,
    copiedId,
    openActionModal,
  } = state;
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const isDedicated = pageMode !== 'all';

  const scopeRows = useMemo(() => {
    if (pageMode === 'pinned') return deliveries.filter((d) => d.pinned);
    if (pageMode === 'renewals')
      return deliveries.filter((d) => d.renewalPending);
    if (pageMode === 'warranty')
      return deliveries.filter((d) => d.status === 'warranty_claim');
    return null;
  }, [deliveries, pageMode]);

  const pageRows = useMemo(() => {
    if (!scopeRows) return filteredDeliveries;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return scopeRows;
    return scopeRows.filter(
      (d) =>
        d.id.toLowerCase().includes(q) ||
        d.orderId.toLowerCase().includes(q) ||
        d.buyerName.toLowerCase().includes(q) ||
        d.buyerEmail.toLowerCase().includes(q) ||
        d.productName.toLowerCase().includes(q) ||
        d.variantName.toLowerCase().includes(q),
    );
  }, [scopeRows, filteredDeliveries, searchQuery]);

  const pageStats = useMemo(() => {
    const rows = scopeRows || deliveries;
    const unread = rows.filter((d) => (d.unreadChatCount || 0) > 0).length;
    const pending = rows.filter((d) => d.status === 'pending_dispatch').length;
    const active = rows.filter((d) => d.status === 'delivered').length;
    const needsAssign = rows.filter(
      (d) => !d.credentialPayload.secretValue?.trim(),
    ).length;
    const cleared = rows.filter(
      (d) =>
        Boolean(d.credentialClearedAt) && !d.credentialPayload.secretValue,
    ).length;
    return {
      total: rows.length,
      unread,
      pending,
      active,
      needsAssign,
      cleared,
    };
  }, [scopeRows, deliveries]);

  const emptyTitle =
    pageMode === 'pinned'
      ? 'No pinned orders'
      : pageMode === 'renewals'
        ? 'No renewals waiting'
        : pageMode === 'warranty'
          ? 'No warranty claims'
          : 'No orders';

  const showCredentialCol = pageMode === 'all' || pageMode === 'renewals';
  const showWarrantyCol = pageMode === 'all' || pageMode === 'warranty';

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <h1 className="font-display text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-2xl">
          {pageTitle}
        </h1>
      </div>

      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:gap-2.5">
        <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
          <div className="surface-pill-segment inline-flex items-center h-9 p-0.5 rounded-md text-xs shrink-0">
            <button
              type="button"
              onClick={() => setViewLayout('table')}
              className={`h-7 px-3 rounded font-medium cursor-pointer whitespace-nowrap shrink-0 inline-flex items-center ${
                viewLayout === 'table'
                  ? 'surface-segment-active text-slate-900 dark:text-slate-100 font-semibold'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Table
            </button>
            <button
              type="button"
              onClick={() => setViewLayout('cards')}
              className={`h-7 px-3 rounded font-medium cursor-pointer whitespace-nowrap shrink-0 inline-flex items-center ${
                viewLayout === 'cards'
                  ? 'surface-segment-active text-slate-900 dark:text-slate-100 font-semibold'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Cards
            </button>
          </div>

          <div className="sm:hidden ml-auto">
            <SwitchToggle
              checked={showStatistics}
              onChange={setShowStatistics}
              label="Stats"
            />
          </div>
        </div>

        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={
            pageMode === 'pinned'
              ? 'Search pinned…'
              : pageMode === 'renewals'
                ? 'Search renewals…'
                : pageMode === 'warranty'
                  ? 'Search claims…'
                  : 'Search order or buyer…'
          }
          className="h-9 px-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md focus:outline-none focus:border-emerald-500 w-full sm:w-56 lg:w-48 shrink-0"
        />

        <div className="hidden sm:block shrink-0">
          <SwitchToggle
            checked={showStatistics}
            onChange={setShowStatistics}
            label="Stats"
          />
        </div>

        {!isDedicated ? (
          <div className="w-full lg:w-auto lg:ml-auto lg:shrink-0">
            <SegmentedTabs
              layout="wrap"
              options={[
                { value: 'all', label: 'All', count: deliveries.length },
                {
                  value: 'pending_dispatch',
                  label: 'Pending',
                  count: pendingCount,
                },
                {
                  value: 'delivered',
                  label: 'Client Delivery',
                  count: deliveredCount,
                },
                {
                  value: 'replaced',
                  label: 'Replace',
                  count: deliveries.filter((d) => d.status === 'replaced')
                    .length,
                },
                {
                  value: 'refunded',
                  label: 'Refunded',
                  count: refundedCount,
                },
                {
                  value: 'unread_chat',
                  label: 'Unread',
                  count: unreadChatDeliveriesCount,
                },
              ]}
              value={statusFilter}
              onChange={setStatusFilter}
            />
          </div>
        ) : null}
      </div>

      {showStatistics && (
        <Card className="overflow-hidden p-0">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-slate-200/80 dark:bg-slate-800">
            {pageMode === 'pinned' ? (
              <>
                <div className="bg-white dark:bg-slate-900">
                  <StatMetric label="Pinned" value={pageStats.total} />
                </div>
                <div className="bg-white dark:bg-slate-900">
                  <StatMetric
                    label="Unread chats"
                    value={pageStats.unread}
                    tone={pageStats.unread > 0 ? 'amber' : 'emerald'}
                  />
                </div>
                <div className="bg-white dark:bg-slate-900">
                  <StatMetric
                    label="Pending"
                    value={pageStats.pending}
                    tone="amber"
                  />
                </div>
                <div className="bg-white dark:bg-slate-900">
                  <StatMetric label="Active" value={pageStats.active} />
                </div>
              </>
            ) : pageMode === 'renewals' ? (
              <>
                <div className="bg-white dark:bg-slate-900">
                  <StatMetric label="Renewals" value={pageStats.total} />
                </div>
                <div className="bg-white dark:bg-slate-900">
                  <StatMetric
                    label="Need assign"
                    value={pageStats.needsAssign}
                    tone="amber"
                  />
                </div>
                <div className="bg-white dark:bg-slate-900">
                  <StatMetric
                    label="Cred cleared"
                    value={pageStats.cleared}
                    tone="amber"
                  />
                </div>
                <div className="bg-white dark:bg-slate-900">
                  <StatMetric
                    label="Unread chats"
                    value={pageStats.unread}
                    tone={pageStats.unread > 0 ? 'amber' : 'emerald'}
                  />
                </div>
              </>
            ) : pageMode === 'warranty' ? (
              <>
                <div className="bg-white dark:bg-slate-900">
                  <StatMetric label="Open claims" value={pageStats.total} />
                </div>
                <div className="bg-white dark:bg-slate-900">
                  <StatMetric
                    label="Unread chats"
                    value={pageStats.unread}
                    tone={pageStats.unread > 0 ? 'amber' : 'emerald'}
                  />
                </div>
                <div className="bg-white dark:bg-slate-900">
                  <StatMetric
                    label="Need swap"
                    value={pageStats.total}
                    tone="amber"
                  />
                </div>
                <div className="bg-white dark:bg-slate-900">
                  <StatMetric label="In queue" value={pageStats.pending} />
                </div>
              </>
            ) : (
              <>
                <div className="bg-white dark:bg-slate-900">
                  <StatMetric label="Total Orders" value={deliveries.length} />
                </div>
                <div className="bg-white dark:bg-slate-900">
                  <StatMetric
                    label="Pending"
                    value={pendingCount}
                    badge={pendingCount > 0 ? 'Queue' : undefined}
                    tone="amber"
                  />
                </div>
                <div className="bg-white dark:bg-slate-900">
                  <StatMetric
                    label="Unread Chats"
                    value={unreadChatDeliveriesCount}
                    badge={
                      unreadChatDeliveriesCount > 0 ? 'Unread' : undefined
                    }
                    tone={
                      unreadChatDeliveriesCount > 0 ? 'amber' : 'emerald'
                    }
                  />
                </div>
                <div className="bg-white dark:bg-slate-900">
                  <StatMetric
                    label="Active Warranty"
                    value={activeWarrantyCount}
                  />
                </div>
              </>
            )}
          </div>
        </Card>
      )}

      {(isDedicated ? scopeRows?.length === 0 : deliveries.length === 0) ? (
        <Card className="overflow-hidden">
          <EmptyTableState title={emptyTitle} />
        </Card>
      ) : pageRows.length === 0 ? (
        <Card className="overflow-hidden">
          <EmptyTableState
            title="No matches"
            onReset={() => {
              if (!isDedicated) setStatusFilter('all');
              setSearchQuery('');
            }}
            resetLabel="Clear search"
          />
        </Card>
      ) : viewLayout === 'table' ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/70 text-[13px] font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-900/50">
                  <th className="w-9 px-4 py-3">
                    <ShadcnCheckbox
                      checked={
                        pageRows.length > 0 &&
                        selectedIds.length === pageRows.length
                      }
                      onChange={(c) =>
                        setSelectedIds(c ? pageRows.map((d) => d.id) : [])
                      }
                    />
                  </th>
                  <th className="whitespace-nowrap px-3 py-3">Order ID</th>
                  <th className="whitespace-nowrap px-3 py-3">Buyer</th>
                  <th className="whitespace-nowrap px-3 py-3">Product &amp; Option</th>
                  {showCredentialCol ? (
                    <th className="py-3 px-3 whitespace-nowrap">Credential</th>
                  ) : null}
                  {showWarrantyCol ? (
                    <th className="py-3 px-3 whitespace-nowrap">Warranty</th>
                  ) : null}
                  <th className="py-3 px-3 whitespace-nowrap">Status</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                {pageRows.map((del) => {
                  const checked = selectedIds.includes(del.id);
                  const unread = del.unreadChatCount || 0;
                  const credGone =
                    Boolean(del.credentialClearedAt) &&
                    !del.credentialPayload.secretValue;
                  const renewRow = Boolean(del.renewalPending);

                  return (
                    <tr
                      key={del.id}
                      className={`transition-colors whitespace-nowrap ${
                        renewRow && credGone
                          ? 'bg-violet-50/80 dark:bg-violet-950/35'
                          : renewRow
                            ? 'bg-sky-50/70 dark:bg-sky-950/30'
                            : credGone
                              ? 'bg-amber-50/70 dark:bg-amber-950/25'
                              : checked
                                ? 'bg-emerald-50/50 dark:bg-emerald-950/30'
                                : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-3 px-4">
                        <ShadcnCheckbox
                          checked={checked}
                          onChange={() =>
                            setSelectedIds((prev) =>
                              prev.includes(del.id)
                                ? prev.filter((i) => i !== del.id)
                                : [...prev, del.id]
                            )
                          }
                        />
                      </td>

                      <td className="px-3 py-3">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onSelectChatDelivery?.(del.id)}
                            className="cursor-pointer font-mono text-sm font-semibold tabular-nums text-emerald-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:text-emerald-400"
                            aria-label={`Open order ${del.orderId}`}
                          >
                            {del.orderId}
                            {(del.orderQuantity ?? 1) > 1 ? (
                              <span className="ml-1 font-sans text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                {del.unitIndex ?? 1}/{del.orderQuantity}
                              </span>
                            ) : null}
                          </button>
                          {unread > 0 ? (
                            <span
                              className="h-2 w-2 rounded-full bg-rose-500"
                              title={`${unread} unread message`}
                            />
                          ) : null}
                        </div>
                      </td>

                      <td className="px-3 py-3 font-semibold text-slate-900 dark:text-slate-100">
                        {del.buyerName}
                      </td>

                      <td className="px-3 py-3 font-medium text-slate-900 dark:text-slate-100">
                        {del.productName}{' '}
                        <span className="font-normal text-slate-500">
                          — {del.variantName}
                        </span>
                      </td>

                      {showCredentialCol ? (
                        <td className="px-3 py-3">
                          {del.credentialPayload.secretValue ? (
                            <div className="inline-flex items-center gap-1.5">
                              <span className="max-w-[160px] truncate rounded bg-slate-100 px-2 py-0.5 font-mono text-[13px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                {del.credentialPayload.secretValue}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleCopy(
                                    del.id,
                                    del.credentialPayload.secretValue,
                                  )
                                }
                                className="cursor-pointer p-1 text-slate-400 hover:text-emerald-600"
                                title="Copy"
                              >
                                {copiedId === del.id ? (
                                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-[13px] font-medium text-amber-600 dark:text-amber-400">
                              Not sent
                            </span>
                          )}
                        </td>
                      ) : null}

                      {showWarrantyCol ? (
                        <td className="px-3 py-3 font-mono text-[13px] tabular-nums text-slate-600 dark:text-slate-400">
                          {del.hasWarranty
                            ? `${del.warrantyRemainingDays}d`
                            : '—'}
                        </td>
                      ) : null}

                      <td className="py-3 px-3">
                        <div className="inline-flex items-center gap-1.5 whitespace-nowrap">
                          {del.status === 'delivered' && (
                            <StatusIndicator tone="emerald" label="Delivered" />
                          )}
                          {del.status === 'pending_dispatch' && (
                            <StatusIndicator tone="amber" label="Pending" />
                          )}
                          {del.status === 'warranty_claim' && (
                            <StatusIndicator tone="red" label="Claim" />
                          )}
                          {del.status === 'replaced' && (
                            <StatusIndicator tone="blue" label="Replaced" />
                          )}
                          {del.status === 'refunded' && (
                            <StatusIndicator tone="red" label="Refunded" />
                          )}
                          {renewRow ? (
                            <span
                              className="rounded px-1.5 py-0.5 text-[11px] font-semibold bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300"
                              title="Renewal paid"
                            >
                              Renew
                            </span>
                          ) : null}
                          {credGone ? (
                            <span
                              className="rounded px-1.5 py-0.5 text-[11px] font-semibold bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                              title="Credential cleared"
                            >
                              Cleared
                            </span>
                          ) : null}
                          {del.pinned && pageMode !== 'pinned' ? (
                            <Pin
                              className="w-3 h-3 shrink-0 text-slate-400"
                              aria-label="Pinned"
                            />
                          ) : null}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <OrderRowActions
                          del={del}
                          unread={unread}
                          menuOpen={menuOpenId === del.id}
                          onMenuToggle={() =>
                            setMenuOpenId((id) =>
                              id === del.id ? null : del.id,
                            )
                          }
                          onMenuClose={() => setMenuOpenId(null)}
                          onOpenChat={() => onSelectChatDelivery?.(del.id)}
                          onFulfill={(isReplace) =>
                            openActionModal(del, isReplace)
                          }
                          onTogglePin={
                            onTogglePinOrder
                              ? () => onTogglePinOrder(del.id)
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
          {pageRows.length > 10 && (
            <PaginationFooter
              totalItems={pageRows.length}
              pageSize={10}
              currentPage={1}
            />
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          {pageRows.map((del) => {
            const unread = del.unreadChatCount || 0;

            return (
              <Card key={del.id} className="p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/80 dark:border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onSelectChatDelivery?.(del.id)}
                        className="cursor-pointer font-mono text-sm font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
                        aria-label={`Open order ${del.orderId}`}
                      >
                        {del.orderId}
                        {(del.orderQuantity ?? 1) > 1 ? (
                          <span className="ml-1 font-sans text-[11px] font-semibold text-slate-500">
                            {del.unitIndex ?? 1}/{del.orderQuantity}
                          </span>
                        ) : null}
                      </button>
                      {unread > 0 ? (
                        <span className="h-2 w-2 rounded-full bg-rose-500" />
                      ) : null}
                    </div>
                    <div className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                      {del.productName} · {del.variantName}
                    </div>
                  </div>

                  <OrderRowActions
                    del={del}
                    unread={unread}
                    menuOpen={menuOpenId === del.id}
                    onMenuToggle={() =>
                      setMenuOpenId((id) => (id === del.id ? null : del.id))
                    }
                    onMenuClose={() => setMenuOpenId(null)}
                    onOpenChat={() => onSelectChatDelivery?.(del.id)}
                    onFulfill={(isReplace) =>
                      openActionModal(del, isReplace)
                    }
                    onTogglePin={
                      onTogglePinOrder
                        ? () => onTogglePinOrder(del.id)
                        : undefined
                    }
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                  <div className="rounded-lg border border-slate-200/80 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                    <span className="block text-[13px] text-slate-500">Credential</span>
                    <div className="mt-0.5 truncate font-mono text-[13px] text-slate-900 dark:text-slate-100">
                      {del.credentialPayload.secretValue || 'Pending'}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-lg">
                    <span className="block text-[13px] text-slate-500">Buyer</span>
                    <div className="mt-0.5 font-semibold text-slate-900 dark:text-slate-100">
                      {del.buyerName}
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-200/80 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                    <span className="block text-[13px] text-slate-500">
                      Warranty &amp; VPN
                    </span>
                    <div className="mt-0.5 font-semibold text-slate-900 dark:text-slate-100">
                      {del.warrantyRemainingDays}d ·{' '}
                      {del.vpnRequired ? 'VPN On' : 'Direct'}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}