'use client';

import type { DigitalDelivery, PaymentTransaction } from '@/lib/admin/types';
import React, { useEffect, useState } from 'react';
import {
  DigitalProduct,
  VaultCredential,
} from '@/lib/admin-data';
import { ProductsList, type ProductTab, type RowSupply, type VariantRow } from './ProductsList';

interface ProductsViewProps {
  products: DigitalProduct[];
  vault: VaultCredential[];
  deliveries: DigitalDelivery[];
  payments: PaymentTransaction[];
  onOpenAddProductPage: () => void;
  onOpenAddOptionPage: (productId?: string) => void;
  onOpenEditOptionPage: (productId: string, variantId: string) => void;
  onOpenViewOptionPage: (productId: string, variantId: string) => void;
  onOpenQuickRestock: (productId: string, variantId: string) => void;
  onTogglePlanActive?: (productId: string, variantId: string, nextActive: boolean) => void;
}

export default function ProductsView({
  products,
  deliveries,
  payments,
  vault,
  onOpenAddProductPage,
  onOpenAddOptionPage,
  onOpenEditOptionPage,
  onOpenViewOptionPage,
  onOpenQuickRestock,
  onTogglePlanActive,
}: ProductsViewProps) {
  const [tabFilter, setTabFilter] = useState<ProductTab>('all');
  // Sell status + supplier links per option (own stock is counted live from the vault below).
  const [supply, setSupply] = useState<Record<string, RowSupply>>({});
  const availableCount = vault.filter((v) => v.status === 'available').length;
  useEffect(() => {
    let alive = true;
    fetch('/api/admin/catalog/supply', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d?.supply) setSupply(d.supply);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [products, availableCount]);
  const [viewMode, setViewMode] = useState<'table' | 'grouped'>('table');
  const [showStatistics, setShowStatistics] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVariantIds, setSelectedVariantIds] = useState<string[]>([]);

  const getVaultStock = (productId: string, variantId: string) =>
    vault.filter(
      (v) => v.productId === productId && v.variantId === variantId && v.status === 'available'
    ).length;

  const allVariantRows: VariantRow[] = products.flatMap((product): VariantRow[] => {
    if (product.variants.length === 0) {
      return [
        {
          product,
          variant: {
            id: `__no-plan__:${product.id}`,
            productId: product.id,
            name: 'No plans yet',
            isDefault: false,
            durationDays: 0,
            durationLabel: '—',
            priceBDT: 0,
            priceUSD: 0,
            credentialType: 'email_login' as const,
            deliveryMode: 'auto_vault' as const,
            stockDisplayMode: 'exact_count' as const,
            vpnRequired: false,
            vpnRegionNote: '',
            hasWarranty: false,
            warrantyDays: 0,
            warrantyTerms: '',
            deviceLimit: '',
            loginInstructions: [],
            importantNote: '',
            specifications: [],
          },
          isPlaceholder: true,
          stockCount: 0,
          supply: undefined,
        },
      ];
    }
    return product.variants.map((variant) => ({
      product,
      variant,
      isPlaceholder: false,
      stockCount: getVaultStock(product.id, variant.id),
      supply: supply[`${product.id}|${variant.id}`],
    }));
  });

  const filteredRows = allVariantRows.filter(({ product, variant, stockCount, supply: s }) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      variant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (tabFilter === 'in_stock') return s ? s.inStock : stockCount > 0;
    if (tabFilter === 'out_of_stock') return s ? !s.inStock : stockCount === 0 && variant.deliveryMode !== 'manual_dispatch';
    if (tabFilter === 'linked') return Boolean(s?.links.length);
    if (tabFilter === 'manual_queue') return variant.deliveryMode === 'manual_dispatch';
    return true;
  });

  const month = new Date().toISOString().slice(0, 7);
  const totalRevenue = payments
    .filter((p) => p.status === 'verified' && p.createdAt.startsWith(month))
    .reduce((sum, p) => sum + p.amountBDT, 0);
  const totalSold = deliveries.filter((d) => d.status !== 'refunded' && d.status !== 'revoked').length;
  const totalAvailableVault = vault.filter((v) => v.status === 'available').length;

  return (
    <ProductsList
      products={products}
      vault={vault}
      allVariantRows={allVariantRows}
      filteredRows={filteredRows}
      tabFilter={tabFilter}
      viewMode={viewMode}
      showStatistics={showStatistics}
      searchQuery={searchQuery}
      selectedVariantIds={selectedVariantIds}
      totalRevenue={totalRevenue}
      totalSold={totalSold}
      totalAvailableVault={totalAvailableVault}
      onTabFilterChange={setTabFilter}
      onViewModeChange={setViewMode}
      onShowStatisticsChange={setShowStatistics}
      onSearchQueryChange={setSearchQuery}
      onSelectedVariantIdsChange={setSelectedVariantIds}
      onOpenAddProductPage={onOpenAddProductPage}
      onOpenAddOptionPage={onOpenAddOptionPage}
      onOpenEditOptionPage={onOpenEditOptionPage}
      onOpenViewOptionPage={onOpenViewOptionPage}
      onOpenQuickRestock={onOpenQuickRestock}
      onTogglePlanActive={onTogglePlanActive}
      onResetFilters={() => {
        setTabFilter('all');
        setSearchQuery('');
      }}
    />
  );
}
