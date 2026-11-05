'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  Plus,
  Layers,
  Star,
  Search,
} from 'lucide-react';
import {
  DigitalProduct,
  ProductVariant,
  VaultCredential,
  CredentialType,
  DeliveryMode,
  StockDisplayMode,
} from '@/lib/admin-data';
import {
  Card,
  StatMetric,
  formatBDT,
  getCredentialTypeLabel,
  StatusIndicator,
  SegmentedTabs,
  SwitchToggle,
  ShadcnCheckbox,
  PaginationFooter,
  FloatingBulkActionBar,
  ModalShell,
  EmptyTableState,
  BBCodeEditor,
  BBCodeRenderer,
} from '@/components/ui/primitives';

interface ProductsViewProps {
  products: DigitalProduct[];
  vault: VaultCredential[];
  onOpenAddProductPage: () => void;
  onAddVariant: (productId: string, variant: ProductVariant) => void;
  onUpdateVariant: (productId: string, variant: ProductVariant) => void;
  onOpenQuickRestock: (productId: string, variantId: string) => void;
}

export default function ProductsView({
  products,
  vault,
  onOpenAddProductPage,
  onAddVariant,
  onUpdateVariant,
  onOpenQuickRestock,
}: ProductsViewProps) {
  const [tabFilter, setTabFilter] = useState<'all' | 'in_stock' | 'manual_queue' | 'vpn_required'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'grouped'>('table');
  const [showStatistics, setShowStatistics] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVariantIds, setSelectedVariantIds] = useState<string[]>([]);

  const [selectedProductForPreview, setSelectedProductForPreview] = useState<DigitalProduct | null>(null);
  const [previewSelectedVariantId, setPreviewSelectedVariantId] = useState<string>('');

  const [addingVariantToProduct, setAddingVariantToProduct] = useState<DigitalProduct | null>(null);
  const [editingVariantState, setEditingVariantState] = useState<{
    productId: string;
    variant: ProductVariant;
  } | null>(null);

  const [targetProductIdForNewVariant, setTargetProductIdForNewVariant] = useState<string>(
    products[0]?.id || ''
  );
  const [varName, setVarName] = useState('');
  const [varIsDefault, setVarIsDefault] = useState(false);
  const [varDurationDays, setVarDurationDays] = useState(30);
  const [varPriceBDT, setVarPriceBDT] = useState(490);
  const [varCredType, setVarCredType] = useState<CredentialType>('token');
  const [varDeliveryMode, setVarDeliveryMode] = useState<DeliveryMode>('auto_vault');
  const [varStockMode, setVarStockMode] = useState<StockDisplayMode>('exact_count');
  const [varVpnRequired, setVarVpnRequired] = useState(false);
  const [varVpnNote, setVarVpnNote] = useState('Direct login without VPN.');
  const [varHasWarranty, setVarHasWarranty] = useState(true);
  const [varWarrantyDays, setVarWarrantyDays] = useState(30);
  const [varWarrantyTerms, setVarWarrantyTerms] = useState('30-day replacement guarantee.');
  const [varDeviceLimit, setVarDeviceLimit] = useState('1 Device');
  const [varLoginSteps, setVarLoginSteps] = useState(
    'Open the service login page.\nEnter or inject your delivered credential.\nKeep your Order ID for warranty support.'
  );
  const [varOptionDescription, setVarOptionDescription] = useState(
    'Instant pre-authenticated session delivered immediately from Vault.'
  );
  const [varWarningNote, setVarWarningNote] = useState(
    '[warning]Close the browser tab instead of clicking Log Out on shared token sessions.[/warning]'
  );

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

  const openAddVariantModal = (product: DigitalProduct) => {
    setAddingVariantToProduct(product);
    setTargetProductIdForNewVariant(product.id);
    setVarName('3M Access Token');
    setVarIsDefault(false);
    setVarDurationDays(90);
    setVarPriceBDT(1250);
    setVarCredType('token');
    setVarDeliveryMode('auto_vault');
    setVarStockMode('exact_count');
    setVarVpnRequired(false);
    setVarVpnNote('Direct login without VPN.');
    setVarHasWarranty(true);
    setVarWarrantyDays(90);
    setVarWarrantyTerms('90-day replacement warranty.');
    setVarDeviceLimit('1 PC Browser');
    setVarLoginSteps(
      'Open Chrome Token Extension.\nPaste your delivered token string.\nClick Inject Session.'
    );
    setVarOptionDescription('90-day pre-authenticated token session with instant replacement.');
    setVarWarningNote('[warning]Do not share token outside your primary machine.[/warning]');
  };

  const openEditVariantModal = (productId: string, variant: ProductVariant) => {
    setEditingVariantState({ productId, variant });
    setVarName(variant.name);
    setVarIsDefault(Boolean(variant.isDefault));
    setVarDurationDays(variant.durationDays);
    setVarPriceBDT(variant.priceBDT);
    setVarCredType(variant.credentialType);
    setVarDeliveryMode(variant.deliveryMode);
    setVarStockMode(variant.stockDisplayMode);
    setVarVpnRequired(variant.vpnRequired);
    setVarVpnNote(variant.vpnRegionNote);
    setVarHasWarranty(variant.hasWarranty);
    setVarWarrantyDays(variant.warrantyDays);
    setVarWarrantyTerms(variant.warrantyTerms);
    setVarDeviceLimit(variant.deviceLimit);
    setVarLoginSteps(variant.loginInstructions.join('\n'));
    setVarOptionDescription(variant.optionDescription || '');
    setVarWarningNote(variant.warningNote || variant.importantNote || '');
  };

  const handleSaveVariant = (e: React.FormEvent) => {
    e.preventDefault();
    const steps = varLoginSteps
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    if (editingVariantState) {
      const updated: ProductVariant = {
        ...editingVariantState.variant,
        name: varName,
        isDefault: varIsDefault,
        durationDays: varDurationDays,
        durationLabel: `${varDurationDays} Days`,
        priceBDT: varPriceBDT,
        priceUSD: Number((varPriceBDT / 115).toFixed(2)),
        credentialType: varCredType,
        deliveryMode: varDeliveryMode,
        stockDisplayMode: varStockMode,
        vpnRequired: varVpnRequired,
        vpnRegionNote: varVpnNote,
        hasWarranty: varHasWarranty,
        warrantyDays: varHasWarranty ? varWarrantyDays : 0,
        warrantyTerms: varHasWarranty ? varWarrantyTerms : 'No Warranty',
        deviceLimit: varDeviceLimit,
        loginInstructions: steps,
        importantNote: varWarningNote,
        warningNote: varWarningNote,
        optionDescription: varOptionDescription,
      };
      onUpdateVariant(editingVariantState.productId, updated);
      setEditingVariantState(null);
    } else if (addingVariantToProduct) {
      const targetProdId = targetProductIdForNewVariant || addingVariantToProduct.id;
      const created: ProductVariant = {
        id: `var-${Date.now()}`,
        productId: targetProdId,
        name: varName,
        isDefault: varIsDefault,
        durationDays: varDurationDays,
        durationLabel: `${varDurationDays} Days`,
        priceBDT: varPriceBDT,
        priceUSD: Number((varPriceBDT / 115).toFixed(2)),
        credentialType: varCredType,
        deliveryMode: varDeliveryMode,
        stockDisplayMode: varStockMode,
        vpnRequired: varVpnRequired,
        vpnRegionNote: varVpnNote,
        hasWarranty: varHasWarranty,
        warrantyDays: varHasWarranty ? varWarrantyDays : 0,
        warrantyTerms: varHasWarranty ? varWarrantyTerms : 'No Warranty',
        deviceLimit: varDeviceLimit,
        loginInstructions: steps,
        importantNote: varWarningNote,
        warningNote: varWarningNote,
        optionDescription: varOptionDescription,
        specifications: [
          { label: 'Delivery Type', value: getCredentialTypeLabel(varCredType) },
          { label: 'Device Limit', value: varDeviceLimit },
          { label: 'VPN Requirement', value: varVpnRequired ? 'VPN Required' : 'Direct Login' },
          { label: 'Warranty', value: varHasWarranty ? `${varWarrantyDays} Days` : 'No Warranty' },
        ],
      };
      onAddVariant(targetProdId, created);
      setAddingVariantToProduct(null);
    }
  };

  const toggleSelectRow = (variantId: string) => {
    setSelectedVariantIds((prev) =>
      prev.includes(variantId) ? prev.filter((id) => id !== variantId) : [...prev, variantId]
    );
  };

  const totalRevenue = products.reduce((sum, p) => sum + p.monthlyRevenueBDT, 0);
  const totalSold = products.reduce((sum, p) => sum + p.totalSales, 0);
  const totalAvailableVault = vault.filter((v) => v.status === 'available').length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          Product
        </h1>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => openAddVariantModal(products[0])}
            className="h-9 px-3.5 text-xs font-semibold bg-white dark:bg-slate-900 shadow-[0_0_0_1px_rgba(15,23,42,0.08)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.1)] hover:shadow-[0_0_0_1px_#059669] text-slate-700 dark:text-slate-200 rounded-lg inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
            <span>Add Option</span>
          </button>

          <button
            type="button"
            onClick={onOpenAddProductPage}
            className="h-9 px-3.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-2xs inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="surface-pill-segment inline-flex items-center h-9 p-1 rounded-[10px] text-xs">
            <button
              type="button"
              onClick={() => setViewMode('table')}
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
              onClick={() => setViewMode('grouped')}
              className={`h-7 px-3 rounded-[6px] font-medium cursor-pointer whitespace-nowrap shrink-0 inline-flex items-center ${
                viewMode === 'grouped'
                  ? 'surface-segment-active text-slate-900 dark:text-slate-100 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Grouped
            </button>
          </div>

          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search product or option..."
              className="w-full h-9 pl-8 pr-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-emerald-600"
            />
          </div>

          <SwitchToggle
            checked={showStatistics}
            onChange={setShowStatistics}
            label="Show Statistics"
          />
        </div>

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
          onChange={setTabFilter}
        />
      </div>

      {showStatistics && (
        <Card className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/80 dark:divide-slate-800 overflow-hidden">
          <StatMetric
            label="Total Options"
            value={allVariantRows.length}
            badge={`+ ${products.length} products`}
          />
          <StatMetric
            label="Product Revenue"
            value={formatBDT(totalRevenue)}
            badge="↑ 18%"
          />
          <StatMetric
            label="Product Sold"
            value={totalSold.toLocaleString()}
            badge="↑ 12%"
          />
          <StatMetric
            label="Vault Stock"
            value={totalAvailableVault}
            badge="↑ 8%"
          />
        </Card>
      )}

      {viewMode === 'table' ? (
        <Card className="overflow-hidden">
          {filteredRows.length === 0 ? (
            <EmptyTableState
              title="No matching options"
              description="Clear the search input or reset the filter tab."
              onReset={() => {
                setTabFilter('all');
                setSearchQuery('');
              }}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-left border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 text-xs text-slate-500 dark:text-slate-400 font-medium">
                    <th className="py-3 px-4 w-9">
                      <ShadcnCheckbox
                        checked={
                          filteredRows.length > 0 &&
                          selectedVariantIds.length === filteredRows.length
                        }
                        onChange={(checked) =>
                          setSelectedVariantIds(
                            checked ? filteredRows.map((r) => r.variant.id) : []
                          )
                        }
                      />
                    </th>
                    <th className="py-3 px-3 whitespace-nowrap">Product &amp; Option</th>
                    <th className="py-3 px-3 whitespace-nowrap">Price</th>
                    <th className="py-3 px-3 whitespace-nowrap">Type</th>
                    <th className="py-3 px-3 whitespace-nowrap">Stock</th>
                    <th className="py-3 px-3 whitespace-nowrap">Warranty</th>
                    <th className="py-3 px-3 whitespace-nowrap">VPN</th>
                    <th className="py-3 px-3 whitespace-nowrap">Status</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                  {filteredRows.map(({ product, variant, stockCount }) => {
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
                          <div className="flex items-center gap-2.5">
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
                            <span className="font-medium text-slate-900 dark:text-slate-100">
                              {product.name}{' '}
                              <span className="text-slate-400 font-normal">— {variant.name}</span>
                            </span>
                            {variant.isDefault && (
                              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded">
                                Default
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-2.5 px-3 font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                          {formatBDT(variant.priceBDT)}
                        </td>

                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                          {getCredentialTypeLabel(variant.credentialType)}
                        </td>

                        <td className="py-2.5 px-3 font-mono tabular-nums">
                          {variant.deliveryMode === 'auto_vault' ? (
                            <span className="inline-flex items-center gap-2">
                              <span className="font-medium text-slate-800 dark:text-slate-200">
                                {stockCount}
                              </span>
                              <button
                                type="button"
                                onClick={() => onOpenQuickRestock(product.id, variant.id)}
                                className="text-xs font-sans font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                              >
                                +Stock
                              </button>
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 font-sans">Manual</span>
                          )}
                        </td>

                        <td className="py-2.5 px-3 font-mono tabular-nums text-xs text-slate-600 dark:text-slate-400">
                          {variant.hasWarranty ? `${variant.warrantyDays}d` : '—'}
                        </td>

                        <td className="py-2.5 px-3 text-xs">
                          <span
                            className={
                              variant.vpnRequired
                                ? 'text-amber-700 dark:text-amber-400 font-medium'
                                : 'text-slate-500 dark:text-slate-400'
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
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedProductForPreview(product);
                                setPreviewSelectedVariantId(variant.id);
                              }}
                              className="px-2.5 py-1 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 hover:border-emerald-600 text-slate-700 dark:text-slate-300 cursor-pointer"
                            >
                              Preview
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditVariantModal(product.id, variant)}
                              className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-700 dark:text-slate-200 cursor-pointer"
                            >
                              Edit
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

          <PaginationFooter totalItems={filteredRows.length} pageSize={10} currentPage={1} />
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
                    <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                      {product.name}
                    </h3>
                    <span className="text-xs font-mono text-slate-400">{product.sku}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProductForPreview(product);
                        setPreviewSelectedVariantId(defaultVar?.id || '');
                      }}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-emerald-600 cursor-pointer"
                    >
                      Preview
                    </button>
                    <button
                      type="button"
                      onClick={() => openAddVariantModal(product)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                    >
                      Add Option
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
                          <span className="text-xs text-slate-400">
                            · {getCredentialTypeLabel(v.credentialType)} · {v.deviceLimit}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                            {formatBDT(v.priceBDT)}
                          </span>
                          <StatusIndicator
                            tone={st > 0 ? 'emerald' : 'amber'}
                            label={v.deliveryMode === 'auto_vault' ? `${st} in Vault` : 'Manual'}
                          />
                          <button
                            type="button"
                            onClick={() => openEditVariantModal(product.id, v)}
                            className="px-2.5 py-1 text-xs rounded-md border border-slate-200 dark:border-slate-700 hover:border-emerald-600 cursor-pointer"
                          >
                            Edit
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
        onClear={() => setSelectedVariantIds([])}
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
                openEditVariantModal(match.product.id, match.variant);
              }
            },
          },
          {
            label: 'Clear',
            destructive: true,
            onClick: () => setSelectedVariantIds([]),
          },
        ]}
      />

      <ModalShell
        open={Boolean(addingVariantToProduct || editingVariantState)}
        onClose={() => {
          setAddingVariantToProduct(null);
          setEditingVariantState(null);
        }}
        title={
          editingVariantState
            ? `Edit Option: ${editingVariantState.variant.name}`
            : 'Add Product Option'
        }
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSaveVariant} className="space-y-4 text-xs">
          {addingVariantToProduct && (
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Product
              </label>
              <select
                value={targetProductIdForNewVariant}
                onChange={(e) => setTargetProductIdForNewVariant(e.target.value)}
                className="w-full h-9 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Option Title
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                  <input
                    type="checkbox"
                    checked={varIsDefault}
                    onChange={(e) => setVarIsDefault(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span>Default Option</span>
                </label>
              </div>
              <input
                type="text"
                required
                value={varName}
                onChange={(e) => setVarName(e.target.value)}
                placeholder="e.g., 1M Access Token"
                className="w-full h-9 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Price (BDT ৳)
              </label>
              <input
                type="number"
                required
                min={1}
                value={varPriceBDT}
                onChange={(e) => setVarPriceBDT(Number(e.target.value))}
                className="w-full h-9 px-3 font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Credential Type
              </label>
              <select
                value={varCredType}
                onChange={(e) => setVarCredType(e.target.value as CredentialType)}
                className="w-full h-9 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
              >
                <option value="token">Token</option>
                <option value="email_login">Email Login</option>
                <option value="license_key">License Key</option>
                <option value="invite_link">Team Invite</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Delivery Mode
              </label>
              <select
                value={varDeliveryMode}
                onChange={(e) => setVarDeliveryMode(e.target.value as DeliveryMode)}
                className="w-full h-9 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
              >
                <option value="auto_vault">Auto-Vault (Instant)</option>
                <option value="manual_dispatch">Manual Dispatch</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Stock Display
              </label>
              <select
                value={varStockMode}
                onChange={(e) => setVarStockMode(e.target.value as StockDisplayMode)}
                className="w-full h-9 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
              >
                <option value="exact_count">Exact Count</option>
                <option value="status_only">Status Only</option>
                <option value="unlimited_manual">Always Available</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Duration (Days)
              </label>
              <input
                type="number"
                required
                min={1}
                value={varDurationDays}
                onChange={(e) => setVarDurationDays(Number(e.target.value))}
                className="w-full h-9 px-3 font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Device Limit
              </label>
              <input
                type="text"
                value={varDeviceLimit}
                onChange={(e) => setVarDeviceLimit(e.target.value)}
                className="w-full h-9 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                VPN Required?
              </label>
              <select
                value={varVpnRequired ? 'yes' : 'no'}
                onChange={(e) => setVarVpnRequired(e.target.value === 'yes')}
                className="w-full h-9 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Option Description
            </label>
            <textarea
              rows={2}
              value={varOptionDescription}
              onChange={(e) => setVarOptionDescription(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
            />
          </div>

          <BBCodeEditor
            label="Option Warning & Rules (BBCode)"
            value={varWarningNote}
            onChange={setVarWarningNote}
            rows={3}
          />

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setAddingVariantToProduct(null);
                setEditingVariantState(null);
              }}
              className="px-4 h-9 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 h-9 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer"
            >
              Save Option
            </button>
          </div>
        </form>
      </ModalShell>

      <ModalShell
        open={Boolean(selectedProductForPreview)}
        onClose={() => setSelectedProductForPreview(null)}
        title={`Storefront Preview: ${selectedProductForPreview?.name}`}
        maxWidth="max-w-2xl"
      >
        {selectedProductForPreview && (() => {
          const activeVar =
            selectedProductForPreview.variants.find((v) => v.id === previewSelectedVariantId) ||
            selectedProductForPreview.variants.find((v) => v.isDefault) ||
            selectedProductForPreview.variants[0];
          const liveStock = activeVar
            ? getVaultStock(selectedProductForPreview.id, activeVar.id)
            : 0;

          return (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 gap-2">
                {selectedProductForPreview.variants.map((v) => {
                  const vStock = getVaultStock(selectedProductForPreview.id, v.id);
                  const isSelected = v.id === activeVar?.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setPreviewSelectedVariantId(v.id)}
                      className={`p-3 text-left border rounded-lg flex items-center justify-between gap-2 cursor-pointer ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/30'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-display font-semibold text-sm text-slate-900 dark:text-slate-100">
                            {v.name}
                          </span>
                          {v.isDefault && (
                            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded inline-flex items-center gap-1">
                              <Star className="w-2.5 h-2.5 fill-current" />
                              Default
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {getCredentialTypeLabel(v.credentialType)} ·{' '}
                          {v.vpnRequired ? 'VPN Required' : 'No VPN'} ·{' '}
                          {v.hasWarranty ? `${v.warrantyDays}d Warranty` : 'No Warranty'}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                          {formatBDT(v.priceBDT)}
                        </div>
                        <div className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400">
                          {v.deliveryMode === 'auto_vault' ? `${vStock} in stock` : 'Manual Invite'}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {activeVar && (
                <div className="space-y-3 pt-1">
                  <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      {selectedProductForPreview.descriptionMode === 'global'
                        ? 'Product Description'
                        : `Selected Option Overview — ${activeVar.name}`}
                    </div>
                    <BBCodeRenderer
                      content={
                        selectedProductForPreview.descriptionMode === 'global'
                          ? selectedProductForPreview.description ||
                            selectedProductForPreview.shortDescription
                          : activeVar.optionDescription ||
                            selectedProductForPreview.description ||
                            selectedProductForPreview.shortDescription
                      }
                    />
                  </div>

                  {(activeVar.warningNote || activeVar.importantNote) && (
                    <BBCodeRenderer
                      content={activeVar.warningNote || `[warning]${activeVar.importantNote}[/warning]`}
                    />
                  )}

                  {activeVar.specifications && activeVar.specifications.length > 0 && (
                    <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
                      <div className="px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-800 dark:text-slate-200">
                        Option Specifications ({activeVar.name})
                      </div>
                      <div className="divide-y divide-slate-200/70 dark:divide-slate-800">
                        {activeVar.specifications.map((spec, idx) => (
                          <div
                            key={idx}
                            className="px-3.5 py-2 flex items-center justify-between gap-4 bg-white dark:bg-slate-950"
                          >
                            <span className="text-slate-500">{spec.label}</span>
                            <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
                              {spec.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg">
                      <span className="text-slate-400 block">VPN</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5 block">
                        {activeVar.vpnRequired ? 'Required' : 'Not Required'}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg">
                      <span className="text-slate-400 block">Warranty</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5 block">
                        {activeVar.hasWarranty ? `${activeVar.warrantyDays} Days` : 'None'}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg">
                      <span className="text-slate-400 block">Stock</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5 block font-mono">
                        {activeVar.deliveryMode === 'auto_vault' ? `${liveStock} Ready` : 'Manual'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </ModalShell>
    </div>
  );
}
