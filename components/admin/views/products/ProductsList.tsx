'use client';

import React, { Fragment, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import {
  Plus,
  Search,
  Eye,
  Pencil,
  ChevronRight,
} from 'lucide-react';
import {
  DigitalProduct,
  VaultCredential,
} from '@/lib/admin-data';
import {
  Card,
  StatMetric,
  formatBDT,
  StatusIndicator,
  SegmentedTabs,
  SwitchToggle,
  ShadcnCheckbox,
  PaginationFooter,
  FloatingBulkActionBar,
  EmptyTableState,
} from '@/components/admin/ui/primitives';
import { listingWindow, scheduleState, shortDuration } from '@/lib/catalog/schedule';
import { groupProductRows } from './products-grouping';

/** Small status chip for products with an order window. */
function ScheduleChip({ product }: { product: DigitalProduct }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  const windowed = listingWindow(product.variants);
  if (now === null || (!windowed.availableFrom && !windowed.availableUntil)) return null;
  const s = scheduleState(windowed, now);
  if (s.state === 'upcoming') return <StatusIndicator tone="blue" label="Opens in" detail={shortDuration(s.msLeft ?? 0)} />;
  if (s.state === 'ended') return <StatusIndicator tone="zinc" label="Order window closed" />;
  return s.msLeft !== null ? (
    <StatusIndicator tone={s.msLeft < 86_400_000 ? 'amber' : 'emerald'} label="Closes in" detail={shortDuration(s.msLeft)} />
  ) : null;
}

const iconBtnClass =
  'inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-emerald-600 hover:text-emerald-700 dark:hover:text-emerald-400 cursor-pointer transition-colors';

export type ProductTab = 'all' | 'in_stock' | 'out_of_stock' | 'linked' | 'manual_queue';

/** Server view of one option: sell status and supplier links (own stock is counted live from the vault). */
export type RowSupply = {
  inStock: boolean;
  canOrder: boolean;
  backorder: boolean;
  manual: boolean;
  sourcing: string;
  suppliers: string[];
  links: Array<{ supplierName: string; name: string; stock: number | null; status: string; supplierOn: boolean }>;
};

export type VariantRow = {
  product: DigitalProduct;
  variant: DigitalProduct['variants'][number];
  isPlaceholder?: boolean;
  /** Own vault credentials ready to send. */
  stockCount: number;
  supply?: RowSupply;
};

const SOURCING_SHORT: Record<string, string> = {
  own: 'Own stock',
  own_then_supplier: 'Own, then supplier',
  supplier_auto: 'Auto-buy',
  supplier_manual: 'Buy by hand',
};

/** Supplier column: what is linked and whether it can deliver now. */
function SupplierCell({ s }: { s?: RowSupply }) {
  if (!s || s.links.length === 0) return <span className="text-sm text-slate-400">—</span>;
  const first = s.links[0];
  const ok = first.supplierOn && first.status === 'available' && first.stock !== 0;
  return (
    <div className="min-w-0 max-w-[16rem] whitespace-normal">
      <div className="flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${ok ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} aria-hidden />
        <span className="truncate text-sm font-medium text-slate-800 dark:text-slate-200" title={first.name}>{first.supplierName}</span>
        {s.links.length > 1 ? <span className="text-xs text-slate-400">+{s.links.length - 1}</span> : null}
      </div>
      <div className="truncate text-xs text-slate-500">
        {SOURCING_SHORT[s.sourcing] || s.sourcing}
        {' · '}
        {!first.supplierOn ? 'buying off' : first.status === 'removed' ? 'removed' : first.status !== 'available' || first.stock === 0 ? 'out of stock' : first.stock === null ? 'in stock' : `${first.stock} at supplier`}
      </div>
    </div>
  );
}

/** Status column: can a customer buy this option right now (own stock or a supplier). */
function SellStatus({ s, own, manual, planActive }: { s?: RowSupply; own: number; manual: boolean; planActive: boolean }) {
  if (!planActive) return <StatusIndicator tone="zinc" label="Plan Off" />;
  if (manual) return <StatusIndicator tone="blue" label="Manual" />;
  const inStock = s ? s.inStock : own > 0;
  if (inStock) return own === 1 && !s?.suppliers.length ? <StatusIndicator tone="amber" label="Low stock" /> : <StatusIndicator tone="emerald" label="In stock" />;
  if (s?.backorder) return <StatusIndicator tone="amber" label="Back-order" />;
  return <StatusIndicator tone="red" label="Out of stock" />;
}

interface ProductsListProps {
  products: DigitalProduct[];
  vault: VaultCredential[];
  allVariantRows: VariantRow[];
  filteredRows: VariantRow[];
  tabFilter: ProductTab;
  viewMode: 'table' | 'grouped';
  showStatistics: boolean;
  searchQuery: string;
  selectedVariantIds: string[];
  totalRevenue: number;
  totalSold: number;
  totalAvailableVault: number;
  onTabFilterChange: (value: ProductTab) => void;
  onViewModeChange: (value: 'table' | 'grouped') => void;
  onShowStatisticsChange: (value: boolean) => void;
  onSearchQueryChange: (value: string) => void;
  onSelectedVariantIdsChange: (ids: string[] | ((prev: string[]) => string[])) => void;
  onOpenAddProductPage: () => void;
  onOpenAddOptionPage: (productId?: string) => void;
  onOpenEditOptionPage: (productId: string, variantId: string) => void;
  onOpenViewOptionPage: (productId: string, variantId: string) => void;
  onOpenQuickRestock: (productId: string, variantId: string) => void;
  onTogglePlanActive?: (productId: string, variantId: string, nextActive: boolean) => void;
  onToggleProductActive?: (productId: string, nextActive: boolean) => void;
  onResetFilters: () => void;
}

export function ProductsList({
  products,
  allVariantRows,
  filteredRows,
  tabFilter,
  viewMode,
  showStatistics,
  searchQuery,
  selectedVariantIds,
  totalRevenue,
  totalSold,
  totalAvailableVault,
  onTabFilterChange,
  onViewModeChange,
  onShowStatisticsChange,
  onSearchQueryChange,
  onSelectedVariantIdsChange,
  onOpenAddProductPage,
  onOpenAddOptionPage,
  onOpenEditOptionPage,
  onOpenViewOptionPage,
  onOpenQuickRestock,
  onTogglePlanActive,
  onToggleProductActive,
  onResetFilters,
}: ProductsListProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [expandedProductIds, setExpandedProductIds] = useState<Set<string>>(
    () => new Set(),
  );

  const productGroups = useMemo(
    () => groupProductRows(filteredRows),
    [filteredRows],
  );
  useEffect(() => setPage(1), [productGroups.length]);
  const pagedGroups = productGroups.slice((page - 1) * pageSize, page * pageSize);
  const allSelectableIds = useMemo(
    () => productGroups.flatMap((g) => g.selectableVariantIds),
    [productGroups],
  );

  const toggleExpandProduct = (productId: string) => {
    setExpandedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const toggleSelectRow = (variantId: string) => {
    onSelectedVariantIdsChange((prev) =>
      prev.includes(variantId) ? prev.filter((id) => id !== variantId) : [...prev, variantId]
    );
  };

  const toggleSelectGroup = (variantIds: string[]) => {
    if (variantIds.length === 0) return;
    onSelectedVariantIdsChange((prev) => {
      const allSelected = variantIds.every((id) => prev.includes(id));
      if (allSelected) {
        const drop = new Set(variantIds);
        return prev.filter((id) => !drop.has(id));
      }
      const merged = new Set(prev);
      for (const id of variantIds) merged.add(id);
      return Array.from(merged);
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          Product
        </h1>

        <button
          type="button"
          onClick={onOpenAddProductPage}
          className="h-9 px-3.5 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-2xs inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" aria-hidden />
          <span>Add Product</span>
        </button>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="surface-pill-segment inline-flex items-center h-9 p-1 rounded-[10px] text-xs">
            <button
              type="button"
              onClick={() => onViewModeChange('table')}
              className={`h-7 px-3 rounded-[6px] font-medium cursor-pointer whitespace-nowrap shrink-0 inline-flex items-center ${
                viewMode === 'table'
                  ? 'surface-segment-active text-slate-900 dark:text-slate-100 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              Table View
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('grouped')}
              className={`h-7 px-3 rounded-[6px] font-medium cursor-pointer whitespace-nowrap shrink-0 inline-flex items-center ${
                viewMode === 'grouped'
                  ? 'surface-segment-active text-slate-900 dark:text-slate-100 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              Grouped
            </button>
          </div>

          <div className="relative flex-1 min-w-[160px] sm:w-56 sm:flex-none">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              placeholder="Search product or plan..."
              className="w-full h-9 pl-8 pr-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-emerald-600"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 max-w-full">
          <SwitchToggle
            checked={showStatistics}
            onChange={onShowStatisticsChange}
            label="Stats"
          />

          <div className="min-w-0 flex-1 overflow-x-auto">
            <SegmentedTabs
              options={[
                { value: 'all', label: 'All', count: allVariantRows.length },
                {
                  value: 'in_stock',
                  label: 'In stock',
                  count: allVariantRows.filter((r) => (r.supply ? r.supply.inStock : r.stockCount > 0)).length,
                },
                {
                  value: 'out_of_stock',
                  label: 'Out of stock',
                  count: allVariantRows.filter((r) => (r.supply ? !r.supply.inStock : r.stockCount === 0 && r.variant.deliveryMode !== 'manual_dispatch')).length,
                },
                {
                  value: 'linked',
                  label: 'Supplier',
                  count: allVariantRows.filter((r) => r.supply?.links.length).length,
                },
                {
                  value: 'manual_queue',
                  label: 'Manual',
                  count: allVariantRows.filter((r) => r.variant.deliveryMode === 'manual_dispatch').length,
                },
              ]}
              value={tabFilter}
              onChange={onTabFilterChange}
            />
          </div>
        </div>
      </div>

      {showStatistics && (
        <Card className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-slate-200/80 dark:divide-slate-800 overflow-hidden [&>*:nth-child(2)]:border-t-0 [&>*:nth-child(odd)]:border-l-0">
          <StatMetric
            label="Total plans"
            value={allVariantRows.length}
            hint={`${products.length} products`}
          />
          <StatMetric label="Product Revenue" value={formatBDT(totalRevenue)} />
          <StatMetric label="Product Sold" value={totalSold.toLocaleString()} />
          <StatMetric label="Credentials" value={totalAvailableVault} />
        </Card>
      )}

      {viewMode === 'table' ? (
        <Card className="overflow-hidden">
          {allVariantRows.length === 0 ? (
            <EmptyTableState title="No products" />
          ) : productGroups.length === 0 ? (
            <EmptyTableState
              title="No matches"
              onReset={onResetFilters}
              resetLabel="Clear filters"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50">
                    <th scope="col" className="py-3 px-4 w-9">
                      <ShadcnCheckbox
                        ariaLabel="Select all visible plans"
                        checked={
                          allSelectableIds.length > 0 &&
                          allSelectableIds.every((id) => selectedVariantIds.includes(id))
                        }
                        onChange={(checked) =>
                          onSelectedVariantIdsChange(checked ? allSelectableIds : [])
                        }
                      />
                    </th>
                    <th scope="col" className="py-3 px-3 whitespace-nowrap">Product &amp; plans</th>
                    <th scope="col" className="py-3 px-3 text-right whitespace-nowrap">Price</th>
                    <th scope="col" className="py-3 px-3 whitespace-nowrap" title="Your own vault credentials ready to send">Own stock</th>
                    <th scope="col" className="py-3 px-3 whitespace-nowrap">Supplier</th>
                    <th scope="col" className="py-3 px-3 whitespace-nowrap">Status</th>
                    <th scope="col" className="py-3 px-4 text-right whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                  {pagedGroups.map((group) => {
                    const { product, planRows, selectableVariantIds, defaultOrFirstVariantId } = group;
                    const hasPlans = planRows.length > 0;
                    const isExpanded = hasPlans && expandedProductIds.has(product.id);
                    const allGroupSelected =
                      hasPlans && selectableVariantIds.every((id) => selectedVariantIds.includes(id));
                    const openProductTarget = () =>
                      defaultOrFirstVariantId
                        ? onOpenEditOptionPage(product.id, defaultOrFirstVariantId)
                        : onOpenAddOptionPage(product.id);

                    const priceText =
                      group.minPriceBDT === null
                        ? '—'
                        : group.maxPriceBDT !== null && group.maxPriceBDT > group.minPriceBDT
                          ? `${formatBDT(group.minPriceBDT)} – ${formatBDT(group.maxPriceBDT)}`
                          : formatBDT(group.minPriceBDT);

                    return (
                      <Fragment key={product.id}>
                        <tr
                          data-product-row={product.id}
                          className={`transition-colors whitespace-nowrap ${
                            allGroupSelected
                              ? 'bg-emerald-50/50 dark:bg-emerald-950/25'
                              : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          <td className="py-2.5 px-4">
                            {hasPlans ? (
                              <ShadcnCheckbox
                                ariaLabel={`Select all plans for ${product.name}`}
                                checked={allGroupSelected}
                                onChange={() => toggleSelectGroup(selectableVariantIds)}
                              />
                            ) : (
                              <span className="inline-block w-4" aria-hidden />
                            )}
                          </td>

                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2 max-w-full">
                              {hasPlans ? (
                                <button
                                  type="button"
                                  onClick={() => toggleExpandProduct(product.id)}
                                  aria-expanded={isExpanded}
                                  aria-controls={
                                    isExpanded
                                      ? planRows.map((r) => `plan-row-${r.variant.id}`).join(' ')
                                      : undefined
                                  }
                                  aria-label={
                                    isExpanded
                                      ? `Hide plans for ${product.name}`
                                      : `Show ${planRows.length} ${planRows.length === 1 ? 'plan' : 'plans'} for ${product.name}`
                                  }
                                  className="h-6 w-6 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400 inline-flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                                >
                                  <ChevronRight
                                    className={`w-3.5 h-3.5 transition-transform duration-150 ${
                                      isExpanded ? 'rotate-90' : ''
                                    }`}
                                  />
                                </button>
                              ) : (
                                <span className="w-6 shrink-0" aria-hidden />
                              )}

                              <button
                                type="button"
                                onClick={openProductTarget}
                                className="flex items-center gap-2.5 text-left cursor-pointer border-0 bg-transparent p-0 min-w-0"
                              >
                                {product.imageUrl && (
                                  <div className="relative w-6 h-6 rounded overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0">
                                    <Image
                                      src={product.imageUrl}
                                      alt={product.name}
                                      fill
                                      unoptimized={product.imageUrl.startsWith('/uploads/') || /^https?:\/\//i.test(product.imageUrl)}
                                      className="object-cover"
                                      referrerPolicy="no-referrer"
                                    />
                                  </div>
                                )}
                                <span className="font-semibold text-slate-900 dark:text-slate-100 hover:text-emerald-700 dark:hover:text-emerald-400">
                                  {product.name}
                                </span>
                              </button>

                              {hasPlans ? (
                                <button
                                  type="button"
                                  onClick={() => toggleExpandProduct(product.id)}
                                  className="px-2 py-0.5 text-[11px] font-medium rounded-md border border-slate-200/90 dark:border-slate-700 bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-300 cursor-pointer transition-colors"
                                >
                                  {planRows.length} {planRows.length === 1 ? 'plan' : 'plans'}
                                </button>
                              ) : (
                                <span className="px-2 py-0.5 text-[11px] font-normal rounded-md bg-slate-100 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500">
                                  No plans yet
                                </span>
                              )}
                              <ScheduleChip product={product} />
                            </div>
                          </td>

                          <td className="admin-price py-2.5 px-3 text-right">
                            {priceText}
                          </td>

                          <td className="py-2.5 px-3">
                            {!hasPlans ? (
                              <button
                                type="button"
                                onClick={() => onOpenAddOptionPage(product.id)}
                                className="text-sm font-sans font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                              >
                                +Add plan
                              </button>
                            ) : group.allManual ? (
                              <span className="text-sm text-slate-500 dark:text-slate-400 font-sans">
                                Manual
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-2">
                                <span className="admin-metric">{group.totalOwnStock}</span>
                                {group.hasSingleAutoVaultPlan && defaultOrFirstVariantId ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onOpenQuickRestock(product.id, defaultOrFirstVariantId)
                                    }
                                    className="text-sm font-sans font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                                  >
                                    +Stock
                                  </button>
                                ) : null}
                              </span>
                            )}
                          </td>

                          <td className="py-2.5 px-3">
                            {group.uniqueSuppliers.length === 0 ? (
                              <span className="text-slate-400 dark:text-slate-500">—</span>
                            ) : group.uniqueSuppliers.length === 1 ? (
                              <SupplierCell s={group.uniqueSuppliers[0].supply} />
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                                <span
                                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                                    group.uniqueSuppliers.some((s) => s.live)
                                      ? 'bg-emerald-500'
                                      : 'bg-slate-300 dark:bg-slate-600'
                                  }`}
                                  aria-hidden
                                />
                                {group.uniqueSuppliers.length} suppliers
                              </span>
                            )}
                          </td>

                          <td className="py-2.5 px-3">
                            <StatusIndicator
                              tone={group.sellStatus.tone}
                              label={group.sellStatus.label}
                            />
                          </td>

                          <td className="py-2.5 px-4 text-right">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              {onToggleProductActive ? (
                                <SwitchToggle
                                  checked={product.status === 'active'}
                                  onChange={(next) => onToggleProductActive(product.id, next)}
                                  label={product.status === 'active' ? 'On' : 'Off'}
                                />
                              ) : null}
                              <button
                                type="button"
                                title="View product"
                                aria-label={`View ${product.name}`}
                                onClick={() =>
                                  onOpenViewOptionPage(product.id, defaultOrFirstVariantId)
                                }
                                className={iconBtnClass}
                              >
                                <Eye className="w-3.5 h-3.5" strokeWidth={2.2} />
                              </button>
                              <button
                                type="button"
                                title={hasPlans ? 'Edit product' : 'Edit product / add plans'}
                                aria-label={
                                  hasPlans
                                    ? `Edit ${product.name}`
                                    : `Add plans to ${product.name}`
                                }
                                onClick={openProductTarget}
                                className={iconBtnClass}
                              >
                                <Pencil className="w-3.5 h-3.5" strokeWidth={2.2} />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {isExpanded &&
                          planRows.map(({ variant, stockCount, supply: rowSupply }) => {
                            const isSelected = selectedVariantIds.includes(variant.id);
                            return (
                              <tr
                                key={variant.id}
                                id={`plan-row-${variant.id}`}
                                data-plan-row={variant.id}
                                className={`transition-colors whitespace-nowrap ${
                                  isSelected
                                    ? 'bg-emerald-50/60 dark:bg-emerald-950/35'
                                    : 'bg-slate-50/75 dark:bg-slate-900/65 hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
                                }`}
                              >
                                <td className="py-2 px-4">
                                  <ShadcnCheckbox
                                    ariaLabel={`Select plan ${variant.name}`}
                                    checked={isSelected}
                                    onChange={() => toggleSelectRow(variant.id)}
                                  />
                                </td>

                                <td className="py-2 px-3">
                                  <div className="flex items-center gap-2 pl-7 border-l-2 border-slate-200 dark:border-slate-700 ml-2.5">
                                    <button
                                      type="button"
                                      onClick={() => onOpenEditOptionPage(product.id, variant.id)}
                                      className="font-medium text-sm text-slate-800 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-400 cursor-pointer border-0 bg-transparent p-0 text-left"
                                    >
                                      {variant.name}
                                    </button>
                                    {variant.isDefault && (
                                      <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded">
                                        Default
                                      </span>
                                    )}
                                    {variant.durationLabel ? (
                                      <span className="text-[11px] text-slate-400 dark:text-slate-500">
                                        {variant.durationLabel}
                                      </span>
                                    ) : null}
                                  </div>
                                </td>

                                <td className="admin-price py-2 px-3 text-right">
                                  {formatBDT(variant.priceBDT)}
                                </td>

                                <td className="py-2 px-3">
                                  {variant.deliveryMode === 'auto_vault' ? (
                                    <span className="inline-flex items-center gap-2">
                                      <span className="admin-metric">{stockCount}</span>
                                      <button
                                        type="button"
                                        onClick={() => onOpenQuickRestock(product.id, variant.id)}
                                        className="text-sm font-sans font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                                      >
                                        +Stock
                                      </button>
                                    </span>
                                  ) : (
                                    <span className="text-sm text-slate-500 dark:text-slate-400 font-sans">
                                      Manual
                                    </span>
                                  )}
                                </td>

                                <td className="py-2 px-3">
                                  <SupplierCell s={rowSupply} />
                                </td>

                                <td className="py-2 px-3">
                                  <SellStatus
                                    s={rowSupply}
                                    own={stockCount}
                                    manual={variant.deliveryMode === 'manual_dispatch'}
                                    planActive={variant.isActive !== false}
                                  />
                                </td>

                                <td className="py-2 px-4 text-right">
                                  <div className="inline-flex items-center justify-end gap-1.5">
                                    {onTogglePlanActive ? (
                                      <SwitchToggle
                                        checked={variant.isActive !== false}
                                        onChange={(next) =>
                                          onTogglePlanActive(product.id, variant.id, next)
                                        }
                                        label={variant.isActive !== false ? 'On' : 'Off'}
                                      />
                                    ) : null}
                                    <button
                                      type="button"
                                      title="View plan"
                                      aria-label={`View ${variant.name}`}
                                      onClick={() => onOpenViewOptionPage(product.id, variant.id)}
                                      className={iconBtnClass}
                                    >
                                      <Eye className="w-3.5 h-3.5" strokeWidth={2.2} />
                                    </button>
                                    <button
                                      type="button"
                                      title="Edit plan"
                                      aria-label={`Edit ${variant.name}`}
                                      onClick={() => onOpenEditOptionPage(product.id, variant.id)}
                                      className={iconBtnClass}
                                    >
                                      <Pencil className="w-3.5 h-3.5" strokeWidth={2.2} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <PaginationFooter
            totalItems={productGroups.length}
            pageSize={pageSize}
            currentPage={page}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </Card>
      ) : productGroups.length === 0 ? (
        <Card className="overflow-hidden">
          <EmptyTableState
            title={products.length === 0 ? 'No products' : 'No matches'}
            onReset={products.length === 0 ? undefined : onResetFilters}
            resetLabel="Clear filters"
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {productGroups.map((group) => {
            const { product, planRows, defaultOrFirstVariantId } = group;
            const hasPlans = planRows.length > 0;
            const isExpanded = hasPlans && expandedProductIds.has(product.id);
            return (
              <Card key={product.id} className="overflow-hidden">
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/40">
                  <div className="flex flex-wrap items-center gap-2.5 min-w-0">
                    {hasPlans ? (
                      <button
                        type="button"
                        onClick={() => toggleExpandProduct(product.id)}
                        aria-expanded={isExpanded}
                        aria-label={
                          isExpanded
                            ? `Hide plans for ${product.name}`
                            : `Show ${planRows.length} plans for ${product.name}`
                        }
                        className="h-7 w-7 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-emerald-500 inline-flex items-center justify-center shrink-0 cursor-pointer"
                      >
                        <ChevronRight
                          className={`w-4 h-4 transition-transform duration-150 ${
                            isExpanded ? 'rotate-90' : ''
                          }`}
                        />
                      </button>
                    ) : null}
                    {product.imageUrl && (
                      <div className="relative w-7 h-7 rounded overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0">
                        <Image
                          src={product.imageUrl}
                          alt={product.name}
                          fill
                          unoptimized={product.imageUrl.startsWith('/uploads/') || /^https?:\/\//i.test(product.imageUrl)}
                          className="object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        defaultOrFirstVariantId
                          ? onOpenEditOptionPage(product.id, defaultOrFirstVariantId)
                          : onOpenAddOptionPage(product.id)
                      }
                      className="font-display text-base font-bold text-slate-900 dark:text-slate-100 hover:text-emerald-700 dark:hover:text-emerald-400 cursor-pointer border-0 bg-transparent p-0 text-left"
                    >
                      {product.name}
                    </button>
                    <span className="text-xs font-mono text-slate-400 dark:text-slate-500">
                      {product.sku}
                    </span>
                    {hasPlans ? (
                      <button
                        type="button"
                        onClick={() => toggleExpandProduct(product.id)}
                        className="px-2 py-0.5 text-[11px] font-medium rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-emerald-500 cursor-pointer"
                      >
                        {planRows.length} {planRows.length === 1 ? 'plan' : 'plans'}
                      </button>
                    ) : null}
                    <ScheduleChip product={product} />
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusIndicator
                      tone={group.sellStatus.tone}
                      label={group.sellStatus.label}
                    />
                    {onToggleProductActive ? (
                      <SwitchToggle
                        checked={product.status === 'active'}
                        onChange={(next) => onToggleProductActive(product.id, next)}
                        label={product.status === 'active' ? 'On' : 'Off'}
                      />
                    ) : null}
                    <button
                      type="button"
                      title="View product"
                      aria-label={`View ${product.name}`}
                      onClick={() =>
                        onOpenViewOptionPage(product.id, defaultOrFirstVariantId)
                      }
                      className={iconBtnClass}
                    >
                      <Eye className="w-3.5 h-3.5" strokeWidth={2.2} />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        defaultOrFirstVariantId
                          ? onOpenEditOptionPage(product.id, defaultOrFirstVariantId)
                          : onOpenAddOptionPage(product.id)
                      }
                      className="h-8 px-3 text-xs font-semibold rounded-md bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer inline-flex items-center gap-1.5"
                    >
                      Edit
                    </button>
                  </div>
                </div>
                {isExpanded && (
                  <div className="border-t border-slate-200/80 dark:border-slate-800 divide-y divide-slate-200/70 dark:divide-slate-800 text-[13px]">
                    {planRows.map(({ variant: v, stockCount: st }) => (
                      <div
                        key={v.id}
                        className="px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/30"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-slate-900 dark:text-slate-100">
                            {v.name}
                          </span>
                          {v.isDefault && (
                            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded">
                              Default
                            </span>
                          )}
                          {v.deviceLimit ? (
                            <span className="text-xs text-slate-400">
                              · {v.deviceLimit}
                            </span>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="admin-price">{formatBDT(v.priceBDT)}</span>
                          <StatusIndicator
                            tone={v.isActive === false ? 'zinc' : st > 0 ? 'emerald' : 'amber'}
                            label={
                              v.isActive === false
                                ? 'Plan Off'
                                : v.deliveryMode === 'auto_vault'
                                  ? `${st} in Vault`
                                  : 'Manual'
                            }
                          />
                          {onTogglePlanActive ? (
                            <SwitchToggle
                              checked={v.isActive !== false}
                              onChange={(next) => onTogglePlanActive(product.id, v.id, next)}
                              label={v.isActive !== false ? 'On' : 'Off'}
                            />
                          ) : null}
                          <button
                            type="button"
                            title="View plan"
                            aria-label={`View ${v.name}`}
                            onClick={() => onOpenViewOptionPage(product.id, v.id)}
                            className={iconBtnClass}
                          >
                            <Eye className="w-3.5 h-3.5" strokeWidth={2.2} />
                          </button>
                          <button
                            type="button"
                            title="Edit plan"
                            aria-label={`Edit ${v.name}`}
                            onClick={() => onOpenEditOptionPage(product.id, v.id)}
                            className={iconBtnClass}
                          >
                            <Pencil className="w-3.5 h-3.5" strokeWidth={2.2} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <FloatingBulkActionBar
        selectedCount={selectedVariantIds.length}
        onClear={() => onSelectedVariantIdsChange([])}
        actions={[
          {
            label: 'Restock in Vault',
            onClick: () => {
              const firstId = selectedVariantIds[0];
              const match = allVariantRows.find((r) => r.variant.id === firstId);
              if (match) {
                onOpenQuickRestock(match.product.id, match.variant.id);
              }
            },
          },
          {
            label: 'Edit Info',
            onClick: () => {
              const firstId = selectedVariantIds[0];
              const match = allVariantRows.find((r) => r.variant.id === firstId);
              if (match) {
                onOpenEditOptionPage(match.product.id, match.variant.id);
              }
            },
          },
          {
            label: 'Clear',
            destructive: true,
            onClick: () => onSelectedVariantIdsChange([]),
          },
        ]}
      />
    </div>
  );
}
