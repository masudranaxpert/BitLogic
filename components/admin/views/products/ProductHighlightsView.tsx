'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ExternalLink, Search, Sparkles, X } from 'lucide-react';
import type { DigitalProduct } from '@/lib/admin/types';
import { adminProductEditHref, isPlainLeftClick } from '@/lib/admin-routes';
import {
  Card,
  EmptyTableState,
  PaginationFooter,
  SegmentedTabs,
  StatusIndicator,
  SwitchToggle,
  formatBDT,
} from '@/components/admin/ui/primitives';

type HighlightFilter = 'all' | 'sale' | 'featured' | 'active';

export function ProductHighlightsView({
  products,
  onTogglePlacement,
  onOpenProduct,
}: {
  products: DigitalProduct[];
  onTogglePlacement: (
    productId: string,
    field: 'sale' | 'featured',
    nextValue: boolean,
  ) => void;
  onOpenProduct: (productId: string) => void;
}) {
  const [filter, setFilter] = useState<HighlightFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const counts = useMemo(() => {
    let sale = 0;
    let featured = 0;
    let active = 0;
    for (const p of products) {
      if (p.sale) sale += 1;
      if (p.featured) featured += 1;
      if (p.status === 'active') active += 1;
    }
    return { all: products.length, sale, featured, active };
  }, [products]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      if (filter === 'sale' && !p.sale) return false;
      if (filter === 'featured' && !p.featured) return false;
      if (filter === 'active' && p.status !== 'active') return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.shortDescription.toLowerCase().includes(q)
      );
    });
  }, [filter, products, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const visible = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, pageSize, safePage]);

  const minPriceOf = (p: DigitalProduct): number | null => {
    const activePrices = p.variants
      .filter((v) => v.isActive !== false && v.priceBDT > 0)
      .map((v) => v.priceBDT);
    if (activePrices.length > 0) return Math.min(...activePrices);
    const anyPrices = p.variants.filter((v) => v.priceBDT > 0).map((v) => v.priceBDT);
    return anyPrices.length > 0 ? Math.min(...anyPrices) : null;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100 m-0">
            Special &amp; Featured
          </h1>
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
            <Sparkles className="h-3 w-3" aria-hidden />
            {counts.sale} Special offer · {counts.featured} Featured
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 m-0">
          Choose which products appear in the homepage Special offer rail and Featured products grid. When none are turned on, defaults are shown.
        </p>
      </div>

      <Card className="overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-slate-200/80 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <SegmentedTabs<HighlightFilter>
            value={filter}
            onChange={(next) => {
              setFilter(next);
              setPage(1);
            }}
            options={[
              { value: 'all', label: 'All', count: counts.all },
              { value: 'sale', label: 'Special offer', count: counts.sale },
              { value: 'featured', label: 'Featured', count: counts.featured },
              { value: 'active', label: 'Active', count: counts.active },
            ]}
          />

          <div className="relative w-full sm:w-64">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search products..."
              aria-label="Search products"
              className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-8 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setPage(1);
                }}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer border-0 bg-transparent p-0"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        </div>

        {/* Table */}
        {visible.length === 0 ? (
          <EmptyTableState
            title="No matching products"
            description="Try a different filter or search query."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/70 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
                  <th className="px-4 py-3 sm:px-5">Product</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Special offer</th>
                  <th className="px-4 py-3 sm:pr-5">Featured</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                {visible.map((p) => {
                  const minPrice = minPriceOf(p);
                  const isActive = p.status === 'active';
                  return (
                    <tr
                      key={p.id}
                      className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-900/40"
                    >
                      <td className="px-4 py-3 sm:px-5">
                        <div className="flex items-center gap-3 min-w-[200px]">
                          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-slate-200/80 bg-slate-100 dark:border-slate-800 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500">
                            {p.imageUrl ? (
                              <Image
                                src={p.imageUrl}
                                alt={p.name}
                                fill
                                sizes="40px"
                                className="object-cover"
                              />
                            ) : (
                              p.name.slice(0, 2).toUpperCase()
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <Link
                                href={adminProductEditHref(p.id)}
                                onClick={(e) => {
                                  if (!isPlainLeftClick(e)) return;
                                  e.preventDefault();
                                  onOpenProduct(p.id);
                                }}
                                className="font-semibold text-slate-900 hover:text-emerald-700 dark:text-slate-100 dark:hover:text-emerald-400 truncate"
                              >
                                {p.name}
                              </Link>
                              <a
                                href={`/product/${encodeURIComponent(p.id)}`}
                                target="_blank"
                                rel="noreferrer"
                                title="Open product page"
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0"
                              >
                                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                              </a>
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                              {p.category || 'Uncategorized'}
                              {minPrice !== null ? ` · From ${formatBDT(minPrice)}` : ''}
                              {` · ${p.variants.length} plan${p.variants.length === 1 ? '' : 's'}`}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusIndicator
                          tone={isActive ? 'emerald' : 'zinc'}
                          label={isActive ? 'Active' : 'Hidden'}
                        />
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <SwitchToggle
                          checked={Boolean(p.sale)}
                          onChange={(next) => onTogglePlacement(p.id, 'sale', next)}
                          label={p.sale ? 'On' : 'Off'}
                        />
                      </td>

                      <td className="px-4 py-3 sm:pr-5 whitespace-nowrap">
                        <SwitchToggle
                          checked={Boolean(p.featured)}
                          onChange={(next) => onTogglePlacement(p.id, 'featured', next)}
                          label={p.featured ? 'On' : 'Off'}
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
          totalItems={filtered.length}
          pageSize={pageSize}
          currentPage={safePage}
          onPageChange={setPage}
          onPageSizeChange={(n) => {
            setPageSize(n);
            setPage(1);
          }}
        />
      </Card>
    </div>
  );
}
