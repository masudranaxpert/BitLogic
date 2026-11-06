'use client';

import React, { useState } from 'react';
import {
  DigitalProduct,
  VaultCredential,
} from '@/lib/admin-data';
import { ProductsList } from './ProductsList';

interface ProductsViewProps {
  products: DigitalProduct[];
  vault: VaultCredential[];
  onOpenAddProductPage: () => void;
  onOpenAddOptionPage: (productId?: string) => void;
  onOpenEditOptionPage: (productId: string, variantId: string) => void;
  onOpenQuickRestock: (productId: string, variantId: string) => void;
}

export default function ProductsView({
  products,
  vault,
  onOpenAddProductPage,
  onOpenAddOptionPage,
  onOpenEditOptionPage,
  onOpenQuickRestock,
}: ProductsViewProps) {
  const [tabFilter, setTabFilter] = useState<'all' | 'in_stock' | 'manual_queue' | 'vpn_required'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'grouped'>('table');
  const [showStatistics, setShowStatistics] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVariantIds, setSelectedVariantIds] = useState<string[]>([]);

  const getVaultStock = (productId: string, variantId: string) =>
    vault.filter(
      (v) => v.productId === productId && v.variantId === variantId && v.status === 'available'
    ).length;

  const allVariantRows = products.flatMap((product) =>
    product.variants.map((variant) => ({
      product,
      variant,
      stockCount: getVaultStock(product.id, variant.id),
    }))
  );

  const filteredRows = allVariantRows.filter(({ product, variant, stockCount }) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      variant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (tabFilter === 'in_stock') return variant.deliveryMode === 'auto_vault' && stockCount > 0;
    if (tabFilter === 'manual_queue') return variant.deliveryMode === 'manual_dispatch';
    if (tabFilter === 'vpn_required') return variant.vpnRequired;
    return true;
  });

  const totalRevenue = products.reduce((sum, p) => sum + p.monthlyRevenueBDT, 0);
  const totalSold = products.reduce((sum, p) => sum + p.totalSales, 0);
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
      onOpenQuickRestock={onOpenQuickRestock}
      onResetFilters={() => {
        setTabFilter('all');
        setSearchQuery('');
      }}
    />
  );
}
