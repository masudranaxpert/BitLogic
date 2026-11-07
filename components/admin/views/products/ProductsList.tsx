'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import {
  Plus,
  Search,
  Eye,
  Pencil,
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
import { scheduleState, shortDuration } from '@/lib/catalog/schedule';

/** Small status chip for products with an order window. */
function ScheduleChip({ product }: { product: DigitalProduct }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  if (now === null || (!product.availableFrom && !product.availableUntil)) return null;
  const s = scheduleState(product, now);
  if (s.state === 'upcoming') return <StatusIndicator tone="blue" label="Opens in" detail={shortDuration(s.msLeft ?? 0)} />;
  if (s.state === 'ended') return <StatusIndicator tone="zinc" label="Order window closed" />;
  return s.msLeft !== null ? (
    <StatusIndicator tone={s.msLeft < 86_400_000 ? 'amber' : 'emerald'} label="Closes in" detail={shortDuration(s.msLeft)} />
  ) : null;
}

const iconBtnClass =
  'inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-emerald-600 hover:text-emerald-700 dark:hover:text-emerald-400 cursor-pointer transition-colors';

type VariantRow = {
  product: DigitalProduct;
  variant: DigitalProduct['variants'][number];
  stockCount: number;
};

interface ProductsListProps {
  products: DigitalProduct[];
  vault: VaultCredential[];
  allVariantRows: VariantRow[];
  filteredRows: VariantRow[];
  tabFilter: 'all' | 'in_stock' | 'manual_queue' | 'vpn_required';
  viewMode: 'table' | 'grouped';
  showStatistics: boolean;
  searchQuery: string;
  selectedVariantIds: string[];
  totalRevenue: number;
  totalSold: number;
  totalAvailableVault: number;
  onTabFilterChange: (value: 'all' | 'in_stock' | 'manual_queue' | 'vpn_required') => void;
  onViewModeChange: (value: 'table' | 'grouped') => void;
  onShowStatisticsChange: (value: boolean) => void;
  onSearchQueryChange: (value: string) => void;
  onSelectedVariantIdsChange: (ids: string[] | ((prev: string[]) => string[])) => void;
  onOpenAddProductPage: () => void;
  onOpenAddOptionPage: (productId?: string) => void;
  onOpenEditOptionPage: (productId: string, variantId: string) => void;
  onOpenQuickRestock: (productId: string, variantId: string) => void;
  onResetFilters: () => void;
}

export function ProductsList({
  products,
  vault,
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
  onOpenQuickRestock,
  onResetFilters,
}: ProductsListProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  useEffect(() => setPage(1), [filteredRows.length]);
  const paged = filteredRows.slice((page - 1) * pageSize, page * pageSize);
  const getVaultStock = (productId: string, variantId: string) =>
    vault.filter(
      (v) => v.productId === productId && v.variantId === variantId && v.status === 'available'
    ).length;

  const toggleSelectRow = (variantId: string) => {
    onSelectedVariantIdsChange((prev) =>
      prev.includes(variantId) ? prev.filter((id) => id !== variantId) : [...prev, variantId]
    );
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
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
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
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
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
              placeholder="Search product or option..."
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
                  label: 'In Stock',
                  count: allVariantRows.filter((r) => r.stockCount > 0).length,
                },
                {
                  value: 'manual_queue',
                  label: 'Manual',
                  count: allVariantRows.filter((r) => r.variant.deliveryMode === 'manual_dispatch').length,
                },
                {
                  value: 'vpn_required',
                  label: 'VPN',
                  count: allVariantRows.filter((r) => r.variant.vpnRequired).length,
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
            label="Total Options"
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
          ) : filteredRows.length === 0 ? (
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
                    <th className="py-3 px-4 w-9">
                      <ShadcnCheckbox
                        checked={
                          filteredRows.length > 0 &&
                          selectedVariantIds.length === filteredRows.length
                        }
                        onChange={(checked) =>
                          onSelectedVariantIdsChange(
                            checked ? filteredRows.map((r) => r.variant.id) : []
                          )
                        }
                      />
                    </th>
                    <th className="py-3 px-3 whitespace-nowrap">Product &amp; Option</th>
                    <th className="py-3 px-3 whitespace-nowrap">Price</th>
                    <th className="py-3 px-3 whitespace-nowrap">Stock</th>
                    <th className="py-3 px-3 whitespace-nowrap">Warranty</th>
                    <th className="py-3 px-3 whitespace-nowrap">VPN</th>
                    <th className="py-3 px-3 whitespace-nowrap">Status</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                  {paged.map(({ product, variant, stockCount }) => {
                    const isSelected = selectedVariantIds.includes(variant.id);
                    return (
                      <tr
                        key={variant.id}
                        className={`transition-colors whitespace-nowrap ${
                          isSelected
                            ? 'bg-emerald-50/50 dark:bg-emerald-950/25'
                            : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="py-2.5 px-4">
                          <ShadcnCheckbox
                            checked={isSelected}
                            onChange={() => toggleSelectRow(variant.id)}
                          />
                        </td>

                        <td className="py-2.5 px-3">
                          <button
                            type="button"
                            onClick={() => onOpenEditOptionPage(product.id, variant.id)}
                            className="flex items-center gap-2.5 text-left cursor-pointer border-0 bg-transparent p-0 max-w-full"
                          >
                            {product.imageUrl && (
                              <div className="relative w-6 h-6 rounded overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0">
                                <Image
                                  src={product.imageUrl}
                                  alt={product.name}
                                  fill
                                  className="object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            )}
                            <span className="font-medium text-slate-900 dark:text-slate-100 hover:text-emerald-700 dark:hover:text-emerald-400">
                              {product.name}{' '}
                              <span className="text-slate-400 font-normal">— {variant.name}</span>
                            </span>
                            {variant.isDefault && (
                              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded">
                                Default
                              </span>
                            )}
                            <ScheduleChip product={product} />
                          </button>
                        </td>

                        <td className="admin-price py-2.5 px-3 text-right">
                          {formatBDT(variant.priceBDT)}
                        </td>

                        <td className="py-2.5 px-3">
                          {variant.deliveryMode === 'auto_vault' ? (
                            <span className="inline-flex items-center gap-2">
                              <span className="admin-metric">
                                {stockCount}
                              </span>
                              <button
                                type="button"
                                onClick={() => onOpenQuickRestock(product.id, variant.id)}
                                className="text-sm font-sans font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                              >
                                +Stock
                              </button>
                            </span>
                          ) : (
                            <span className="text-sm text-slate-500 font-sans">Manual</span>
                          )}
                        </td>

                        <td className="admin-metric py-2.5 px-3">
                          {variant.hasWarranty ? `${variant.warrantyDays} days` : '—'}
                        </td>

                        <td className="py-2.5 px-3">
                          <span
                            className={
                              variant.vpnRequired
                                ? 'text-amber-700 dark:text-amber-400 font-medium'
                                : 'text-slate-600 dark:text-slate-400'
                            }
                          >
                            {variant.vpnRequired ? 'Required' : 'No'}
                          </span>
                        </td>

                        <td className="py-2.5 px-3">
                          {variant.deliveryMode === 'manual_dispatch' ? (
                            <StatusIndicator tone="blue" label="Manual" />
                          ) : stockCount > 1 ? (
                            <StatusIndicator tone="emerald" label="In Stock" />
                          ) : stockCount === 1 ? (
                            <StatusIndicator tone="amber" label="Restock" />
                          ) : (
                            <StatusIndicator tone="red" label="Out of Stock" />
                          )}
                        </td>

                        <td className="py-2.5 px-4 text-right">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              title="View product"
                              aria-label="View product"
                              onClick={() =>
                                onOpenEditOptionPage(product.id, variant.id)
                              }
                              className={iconBtnClass}
                            >
                              <Eye className="w-3.5 h-3.5" strokeWidth={2.2} />
                            </button>
                            <button
                              type="button"
                              title="Edit product"
                              aria-label="Edit product"
                              onClick={() =>
                                onOpenEditOptionPage(product.id, variant.id)
                              }
                              className={iconBtnClass}
                            >
                              <Pencil className="w-3.5 h-3.5" strokeWidth={2.2} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <PaginationFooter
          totalItems={filteredRows.length}
          pageSize={pageSize}
          currentPage={page}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
        </Card>
      ) : products.length === 0 ? (
        <Card className="overflow-hidden">
          <EmptyTableState title="No products" />
        </Card>
      ) : (
        <div className="space-y-4">
          {products.map((product) => {
            const defaultVar =
              product.variants.find((v) => v.isDefault) || product.variants[0];
            return (
              <Card key={product.id} className="overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/40">
                  <div className="flex items-center gap-3">
                    {product.imageUrl && (
                      <div className="relative w-7 h-7 rounded overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0">
                        <Image
                          src={product.imageUrl}
                          alt={product.name}
                          fill
                          className="object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        defaultVar
                          ? onOpenEditOptionPage(product.id, defaultVar.id)
                          : onOpenAddOptionPage(product.id)
                      }
                      className="font-display text-base font-bold text-slate-900 dark:text-slate-100 hover:text-emerald-700 dark:hover:text-emerald-400 cursor-pointer border-0 bg-transparent p-0 text-left"
                    >
                      {product.name}
                    </button>
                    <span className="text-xs font-mono text-slate-400">{product.sku}</span>
                    <ScheduleChip product={product} />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      title="View product"
                      aria-label="View product"
                      onClick={() =>
                        defaultVar
                          ? onOpenEditOptionPage(product.id, defaultVar.id)
                          : onOpenAddOptionPage(product.id)
                      }
                      className={iconBtnClass}
                    >
                      <Eye className="w-3.5 h-3.5" strokeWidth={2.2} />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        defaultVar
                          ? onOpenEditOptionPage(product.id, defaultVar.id)
                          : onOpenAddOptionPage(product.id)
                      }
                      className="h-8 px-3 text-xs font-semibold rounded-md bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer inline-flex items-center gap-1.5"
                    >
                      Edit
                    </button>
                  </div>
                </div>
                <div className="divide-y divide-slate-200/70 dark:divide-slate-800 text-[13px]">
                  {product.variants.map((v) => {
                    const st = getVaultStock(product.id, v.id);
                    return (
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
                          <span className="admin-price">
                            {formatBDT(v.priceBDT)}
                          </span>
                          <StatusIndicator
                            tone={st > 0 ? 'emerald' : 'amber'}
                            label={v.deliveryMode === 'auto_vault' ? `${st} in Vault` : 'Manual'}
                          />
                          <button
                            type="button"
                            title="View product"
                            aria-label="View product"
                            onClick={() => onOpenEditOptionPage(product.id, v.id)}
                            className={iconBtnClass}
                          >
                            <Eye className="w-3.5 h-3.5" strokeWidth={2.2} />
                          </button>
                          <button
                            type="button"
                            title="Edit product"
                            aria-label="Edit product"
                            onClick={() => onOpenEditOptionPage(product.id, v.id)}
                            className={iconBtnClass}
                          >
                            <Pencil className="w-3.5 h-3.5" strokeWidth={2.2} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
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
