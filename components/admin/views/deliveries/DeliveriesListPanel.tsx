'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Copy, Check, Pin, PinOff, ChevronDown, ChevronUp, Layers } from 'lucide-react';
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
import { OrderRowActions } from './OrderRowActions';

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
    replacedCount,
    activeWarrantyCount,
    filteredDeliveries,
    selectedIds,
    setSelectedIds,
    handleCopy,
    copiedId,
    openActionModal,
  } = state;
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [groupByOrder, setGroupByOrder] = useState(true);
  const [expandedOrderIds, setExpandedOrderIds] = useState<string[]>([]);
  const isDedicated = pageMode !== 'all';

  const toggleExpandOrder = (orderId: string) => {
    setExpandedOrderIds((prev) =>
      prev.includes(orderId)
        ? prev.filter((id) => id !== orderId)
        : [...prev, orderId],
    );
  };

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

  const uniqueOrdersCount = useMemo(
    () => new Set(deliveries.map((d) => d.orderId)).size,
    [deliveries],
  );

  const uniquePendingCount = useMemo(
    () =>
      new Set(
        deliveries
          .filter((d) => d.status === 'pending_dispatch')
          .map((d) => d.orderId),
      ).size,
    [deliveries],
  );

  const groupedOrders = useMemo(() => {
    const map = new Map<string, DigitalDelivery[]>();
    for (const del of pageRows) {
      const list = map.get(del.orderId) || [];
      list.push(del);
      map.set(del.orderId, list);
    }
    return Array.from(map.entries()).map(([orderId, units]) => {
      const primary = units[0];
      const allDelivered = units.every((u) => u.status === 'delivered');
      const anyClaim = units.some((u) => u.status === 'warranty_claim');
      const anyPending = units.some((u) => u.status === 'pending_dispatch');
      const deliveredCount = units.filter((u) => u.status === 'delivered').length;
      const totalUnread = units.reduce(
        (acc, u) => acc + (u.unreadChatCount || 0),
        0,
      );
      const isPinned = units.some((u) => u.pinned);
      const isRenewal = units.some((u) => u.renewalPending);
      const isExpanded = expandedOrderIds.includes(orderId);
      const allChecked = units.every((u) => selectedIds.includes(u.id));

      return {
        orderId,
        primary,
        units,
        totalUnits: units.length,
        deliveredCount,
        allDelivered,
        anyClaim,
        anyPending,
        totalUnread,
        isPinned,
        isRenewal,
        isExpanded,
        allChecked,
      };
    });
  }, [pageRows, expandedOrderIds, selectedIds]);

  // Real pagination: page over orders when grouped, over units otherwise.
  const [listPage, setListPage] = useState(1);
  const [listSize, setListSize] = useState(25);
  const listTotal = groupByOrder ? groupedOrders.length : pageRows.length;
  const listPages = Math.max(1, Math.ceil(listTotal / listSize));
  const safePage = Math.min(listPage, listPages);
  const pagedGroups = groupedOrders.slice((safePage - 1) * listSize, safePage * listSize);
  const pagedRows = pageRows.slice((safePage - 1) * listSize, safePage * listSize);
  useEffect(() => {
    setListPage(1);
  }, [searchQuery, statusFilter, pageMode, groupByOrder]);

  const handleToggleSelectOrder = (units: DigitalDelivery[]) => {
    const unitIds = units.map((u) => u.id);
    const allSelected = unitIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !unitIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...unitIds])));
    }
  };

  const pageStats = useMemo(() => {
    const rows = scopeRows || deliveries;
    const uniqueOrders = new Set(rows.map((d) => d.orderId));
    const unread = new Set(
      rows.filter((d) => (d.unreadChatCount || 0) > 0).map((d) => d.orderId),
    ).size;
    const pending = new Set(
      rows.filter((d) => d.status === 'pending_dispatch').map((d) => d.orderId),
    ).size;
    const active = new Set(
      rows.filter((d) => d.status === 'delivered').map((d) => d.orderId),
    ).size;
    const needsAssign = rows.filter(
      (d) => !d.credentialPayload.secretValue?.trim(),
    ).length;
    const cleared = rows.filter(
      (d) =>
        Boolean(d.credentialClearedAt) && !d.credentialPayload.secretValue,
    ).length;
    return {
      total: uniqueOrders.size,
      totalUnits: rows.length,
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
                { value: 'all', label: 'All', count: uniqueOrdersCount },
                {
                  value: 'pending_dispatch',
                  label: 'Pending assign',
                  count: uniquePendingCount,
                },
                {
                  value: 'delivered',
                  label: 'Client Delivery',
                  count: deliveredCount,
                },
                {
                  value: 'replaced',
                  label: 'Replace',
                  count: replacedCount,
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
                  <StatMetric label="Total Orders" value={pageStats.total} />
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
                {groupByOrder
                  ? pagedGroups.map((grp) => {
                      const { orderId, primary, units, totalUnits, deliveredCount, allDelivered, anyClaim, anyPending, totalUnread, isPinned, isRenewal, isExpanded, allChecked } = grp;
                      const credGone = Boolean(primary.credentialClearedAt) && !primary.credentialPayload.secretValue;

                      return (
                        <React.Fragment key={orderId}>
                          <tr
                            className={`transition-colors whitespace-nowrap ${
                              isRenewal && credGone
                                ? 'bg-violet-50/80 dark:bg-violet-950/35'
                                : isRenewal
                                  ? 'bg-sky-50/70 dark:bg-sky-950/30'
                                  : credGone
                                    ? 'bg-amber-50/70 dark:bg-amber-950/25'
                                    : allChecked
                                      ? 'bg-emerald-50/50 dark:bg-emerald-950/30'
                                      : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                            }`}
                          >
                            <td className="py-3 px-4">
                              <ShadcnCheckbox
                                checked={allChecked}
                                onChange={() => handleToggleSelectOrder(units)}
                              />
                            </td>

                            <td className="px-3 py-3">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => onSelectChatDelivery?.(primary.id)}
                                  className="cursor-pointer font-mono text-sm font-semibold tabular-nums text-emerald-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:text-emerald-400"
                                  aria-label={`Open order ${orderId}`}
                                >
                                  {orderId}
                                </button>
                                {totalUnread > 0 ? (
                                  <span
                                    className="h-2 w-2 rounded-full bg-rose-500"
                                    title={`${totalUnread} unread message`}
                                  />
                                ) : null}
                              </div>
                            </td>

                            <td className="px-3 py-3 font-semibold text-slate-900 dark:text-slate-100">
                              {primary.buyerName}
                            </td>

                            <td className="px-3 py-3 font-medium text-slate-900 dark:text-slate-100">
                              {(() => {
                                const lines = new Map<string, { label: string; n: number }>();
                                for (const u of units) {
                                  const k = u.productId + '|' + u.variantId;
                                  const cur = lines.get(k);
                                  if (cur) cur.n += 1;
                                  else lines.set(k, { label: u.productName + ' — ' + u.variantName, n: 1 });
                                }
                                const list = Array.from(lines.values());
                                return (
                                  <div className="space-y-0.5">
                                    {list.map((l) => (
                                      <div key={l.label}>
                                        {l.label}
                                        {l.n > 1 ? (
                                          <span className="ml-1.5 font-mono text-slate-500">× {l.n}</span>
                                        ) : null}
                                      </div>
                                    ))}
                                  </div>
                                );
                              })()}
                            </td>

                            {showCredentialCol ? (
                              <td className="px-3 py-3">
                                {totalUnits === 1 ? (
                                  primary.credentialPayload.secretValue ? (
                                    <div className="inline-flex items-center gap-1.5">
                                      <span className="max-w-[160px] truncate rounded bg-slate-100 px-2 py-0.5 font-mono text-[13px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                        {primary.credentialPayload.secretValue}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleCopy(
                                            primary.id,
                                            primary.credentialPayload.secretValue,
                                          )
                                        }
                                        className="cursor-pointer p-1 text-slate-400 hover:text-emerald-600"
                                        title="Copy"
                                      >
                                        {copiedId === primary.id ? (
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
                                  )
                                ) : (
                                  <div className="inline-flex items-center gap-1.5">
                                    <span
                                      className={`text-[13px] font-semibold ${
                                        allDelivered
                                          ? 'text-emerald-700 dark:text-emerald-400'
                                          : 'text-slate-600 dark:text-slate-300'
                                      }`}
                                    >
                                      {deliveredCount}/{totalUnits} ready
                                    </span>
                                  </div>
                                )}
                              </td>
                            ) : null}

                            {showWarrantyCol ? (
                              <td className="px-3 py-3 font-mono text-[13px] tabular-nums text-slate-600 dark:text-slate-400">
                                {primary.hasWarranty
                                  ? `${primary.warrantyRemainingDays}d`
                                  : '—'}
                              </td>
                            ) : null}

                            <td className="py-3 px-3">
                              <div className="inline-flex items-center gap-1.5 whitespace-nowrap">
                                {anyClaim ? (
                                  <StatusIndicator tone="red" label="Claim" />
                                ) : allDelivered ? (
                                  <StatusIndicator
                                    tone="emerald"
                                    label={
                                      totalUnits > 1
                                        ? `Delivered (${totalUnits}/${totalUnits})`
                                        : 'Delivered'
                                    }
                                  />
                                ) : deliveredCount > 0 ? (
                                  <StatusIndicator
                                    tone="blue"
                                    label={`Partially (${deliveredCount}/${totalUnits})`}
                                  />
                                ) : (
                                  <StatusIndicator
                                    tone="amber"
                                    label={
                                      totalUnits > 1
                                        ? `Pending (0/${totalUnits})`
                                        : 'Pending'
                                    }
                                  />
                                )}
                                {isRenewal ? (
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
                                {isPinned && pageMode !== 'pinned' ? (
                                  <Pin
                                    className="w-3 h-3 shrink-0 text-slate-400"
                                    aria-label="Pinned"
                                  />
                                ) : null}
                              </div>
                            </td>

                            <td className="py-3 px-4 text-right">
                              <OrderRowActions
                                del={primary}
                                unread={totalUnread}
                                menuOpen={menuOpenId === primary.id}
                                onMenuToggle={() =>
                                  setMenuOpenId((id) =>
                                    id === primary.id ? null : primary.id,
                                  )
                                }
                                onMenuClose={() => setMenuOpenId(null)}
                                onOpenChat={() => onSelectChatDelivery?.(primary.id)}
                                onFulfill={(isReplace) =>
                                  openActionModal(primary, isReplace)
                                }
                                onTogglePin={
                                  onTogglePinOrder
                                    ? () => onTogglePinOrder(primary.id)
                                    : undefined
                                }
                              />
                            </td>
                          </tr>

                          {/* Expanded sub-row showing each individual unit in this order */}
                          {isExpanded && totalUnits > 1 ? (
                            <tr className="bg-slate-50/80 dark:bg-slate-900/40">
                              <td
                                colSpan={6 + (showCredentialCol ? 1 : 0) + (showWarrantyCol ? 1 : 0)}
                                className="px-6 py-3 border-t border-b border-slate-200/60 dark:border-slate-800"
                              >
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                    <span>Fulfillment Units for {orderId}</span>
                                    <span>{totalUnits} units total</span>
                                  </div>
                                  <div className="divide-y divide-slate-200/60 dark:divide-slate-800 border border-slate-200/80 dark:border-slate-800 rounded bg-white dark:bg-slate-950 overflow-hidden">
                                    {units.map((unit) => (
                                      <div
                                        key={unit.id}
                                        className="p-2.5 flex items-center justify-between gap-3 text-xs"
                                      >
                                        <div className="flex items-center gap-2">
                                          <span className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                            Unit {unit.unitIndex}/{unit.orderQuantity || totalUnits}
                                          </span>
                                          <span className="font-mono text-slate-400 text-[11px]">
                                            {unit.id}
                                          </span>
                                          <StatusIndicator
                                            tone={
                                              unit.status === 'delivered'
                                                ? 'emerald'
                                                : unit.status === 'warranty_claim'
                                                  ? 'red'
                                                  : 'amber'
                                            }
                                            label={
                                              unit.status === 'delivered'
                                                ? 'Delivered'
                                                : unit.status === 'warranty_claim'
                                                  ? 'Claim'
                                                  : 'Pending'
                                            }
                                          />
                                        </div>
                                        <div className="flex items-center gap-3">
                                          {unit.credentialPayload.secretValue ? (
                                            <div className="inline-flex items-center gap-1.5">
                                              <span className="max-w-[220px] truncate rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 font-mono text-[12px] text-slate-700 dark:text-slate-300">
                                                {unit.credentialPayload.secretValue}
                                              </span>
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  handleCopy(
                                                    unit.id,
                                                    unit.credentialPayload.secretValue,
                                                  )
                                                }
                                                className="cursor-pointer p-1 text-slate-400 hover:text-emerald-600"
                                                title="Copy"
                                              >
                                                {copiedId === unit.id ? (
                                                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                                                ) : (
                                                  <Copy className="h-3.5 w-3.5" />
                                                )}
                                              </button>
                                            </div>
                                          ) : (
                                            <span className="text-[11px] text-amber-600 font-medium">
                                              Not dispatched
                                            </span>
                                          )}
                                          <button
                                            type="button"
                                            onClick={() =>
                                              openActionModal(
                                                unit,
                                                unit.status === 'warranty_claim',
                                              )
                                            }
                                            className="px-2.5 py-1 rounded text-[11px] font-bold border border-slate-300 dark:border-slate-700 hover:border-emerald-600 bg-white dark:bg-slate-900 cursor-pointer transition-colors"
                                          >
                                            {unit.status === 'delivered'
                                              ? 'Replace'
                                              : 'Send Credential'}
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ) : null}
                        </React.Fragment>
                      );
                    })
                  : pagedRows.map((del) => {
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
                                <StatusIndicator tone="amber" label="Pending assign" />
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
          {listTotal > 10 && (
            <PaginationFooter
              totalItems={listTotal}
              pageSize={listSize}
              currentPage={safePage}
              onPageChange={setListPage}
              onPageSizeChange={setListSize}
            />
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          {groupByOrder ? (
            pagedGroups.map((grp) => {
              const {
                orderId,
                primary,
                units,
                totalUnits,
                deliveredCount,
                allDelivered,
                anyClaim,
                totalUnread,
                isExpanded,
              } = grp;

              return (
                <Card key={orderId} className="p-5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/80 dark:border-slate-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onSelectChatDelivery?.(primary.id)}
                          className="cursor-pointer font-mono text-sm font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
                          aria-label={`Open order ${orderId}`}
                        >
                          {orderId}
                        </button>
                        {totalUnits > 1 ? (
                          <button
                            type="button"
                            onClick={() => toggleExpandOrder(orderId)}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-sans text-[11px] font-bold border border-slate-200 dark:border-slate-700 cursor-pointer"
                            title={isExpanded ? 'Collapse units' : 'Expand units'}
                          >
                            <span>Qty: {totalUnits} ({deliveredCount}/{totalUnits} ready)</span>
                            {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                          </button>
                        ) : null}
                        {totalUnread > 0 ? (
                          <span className="h-2 w-2 rounded-full bg-rose-500" />
                        ) : null}
                      </div>
                      <div className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                        {primary.productName} · {primary.variantName}
                        {totalUnits > 1 ? (
                          <span className="ml-1.5 font-sans text-xs font-bold text-slate-500 dark:text-slate-400">
                            × {totalUnits}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <OrderRowActions
                      del={primary}
                      unread={totalUnread}
                      menuOpen={menuOpenId === primary.id}
                      onMenuToggle={() =>
                        setMenuOpenId((id) => (id === primary.id ? null : primary.id))
                      }
                      onMenuClose={() => setMenuOpenId(null)}
                      onOpenChat={() => onSelectChatDelivery?.(primary.id)}
                      onFulfill={(isReplace) =>
                        openActionModal(primary, isReplace)
                      }
                      onTogglePin={
                        onTogglePinOrder
                          ? () => onTogglePinOrder(primary.id)
                          : undefined
                      }
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                    <div className="rounded-lg border border-slate-200/80 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                      <span className="block text-[13px] text-slate-500">Status</span>
                      <div className="mt-1 flex items-center gap-1.5">
                        {anyClaim ? (
                          <StatusIndicator tone="red" label="Claim" />
                        ) : allDelivered ? (
                          <StatusIndicator
                            tone="emerald"
                            label={
                              totalUnits > 1
                                ? `Delivered (${totalUnits}/${totalUnits})`
                                : 'Delivered'
                            }
                          />
                        ) : deliveredCount > 0 ? (
                          <StatusIndicator
                            tone="blue"
                            label={`Partially (${deliveredCount}/${totalUnits})`}
                          />
                        ) : (
                          <StatusIndicator
                            tone="amber"
                            label={
                              totalUnits > 1
                                ? `Pending (0/${totalUnits})`
                                : 'Pending'
                            }
                          />
                        )}
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-lg">
                      <span className="block text-[13px] text-slate-500">Buyer</span>
                      <div className="mt-0.5 font-semibold text-slate-900 dark:text-slate-100">
                        {primary.buyerName}
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-200/80 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                      <span className="block text-[13px] text-slate-500">
                        Fulfillment / Units
                      </span>
                      <div className="mt-0.5 flex items-center justify-between font-semibold text-slate-900 dark:text-slate-100">
                        <span>
                          {deliveredCount}/{totalUnits} fulfilled
                        </span>
                        {totalUnits > 1 ? (
                          <button
                            type="button"
                            onClick={() => toggleExpandOrder(orderId)}
                            className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-semibold cursor-pointer border-0 bg-transparent p-0"
                          >
                            {isExpanded ? 'Hide' : 'View'}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {isExpanded && totalUnits > 1 ? (
                    <div className="mt-3 pt-3 border-t border-slate-200/80 dark:border-slate-800 space-y-2">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Fulfillment Units for {orderId}
                      </div>
                      <div className="divide-y divide-slate-200/60 dark:divide-slate-800 border border-slate-200/80 dark:border-slate-800 rounded bg-slate-50/50 dark:bg-slate-900/50 overflow-hidden">
                        {units.map((unit) => (
                          <div
                            key={unit.id}
                            className="p-2.5 flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-slate-200/70 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                Unit {unit.unitIndex}/{unit.orderQuantity || totalUnits}
                              </span>
                              <span className="font-mono text-slate-400 text-[11px]">
                                {unit.id}
                              </span>
                              <StatusIndicator
                                tone={
                                  unit.status === 'delivered'
                                    ? 'emerald'
                                    : unit.status === 'warranty_claim'
                                      ? 'red'
                                      : 'amber'
                                }
                                label={
                                  unit.status === 'delivered'
                                    ? 'Delivered'
                                    : unit.status === 'warranty_claim'
                                      ? 'Claim'
                                      : 'Pending'
                                }
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              {unit.credentialPayload.secretValue ? (
                                <span className="max-w-[180px] truncate font-mono text-[11px] text-slate-600 dark:text-slate-300">
                                  {unit.credentialPayload.secretValue}
                                </span>
                              ) : (
                                <span className="text-[11px] text-amber-600 font-medium">
                                  Not sent
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  openActionModal(
                                    unit,
                                    unit.status === 'warranty_claim',
                                  )
                                }
                                className="px-2 py-0.5 rounded text-[11px] font-bold border border-slate-300 dark:border-slate-700 hover:border-emerald-600 bg-white dark:bg-slate-900 cursor-pointer"
                              >
                                {unit.status === 'delivered'
                                  ? 'Replace'
                                  : 'Dispatch'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </Card>
              );
            })
          ) : (
            pagedRows.map((del) => {
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
            })
          )}
        </div>
      )}
    </div>
  );
}