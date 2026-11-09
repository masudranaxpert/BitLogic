'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  ArrowLeft,
  Pencil,
  ExternalLink,
  Layers,
  ShieldCheck,
  Tag,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Eye,
} from 'lucide-react';
import type { DigitalProduct, ProductVariant, VaultCredential } from '@/lib/admin-data';
import { Card, formatBDT, StatusIndicator, BBCodeRenderer } from '@/components/admin/ui/primitives';

export interface ProductDetailViewProps {
  product: DigitalProduct | null;
  selectedVariantId?: string | null;
  vault: VaultCredential[];
  onBack: () => void;
  onEdit: (productId: string, variantId?: string) => void;
}

export default function ProductDetailView({
  product,
  selectedVariantId,
  vault,
  onBack,
  onEdit,
}: ProductDetailViewProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'options' | 'inventory'>('details');
  const [copiedSku, setCopiedSku] = useState(false);

  if (!product) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-50"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to Products
        </button>
        <Card className="p-8 text-center text-sm text-slate-500">
          Product not found or has been removed.
        </Card>
      </div>
    );
  }

  const initialVariant =
    (selectedVariantId && product.variants.find((v) => v.id === selectedVariantId)) ||
    product.variants.find((v) => v.isDefault) ||
    product.variants[0] ||
    null;

  const [currentVariant, setCurrentVariant] = useState<ProductVariant | null>(initialVariant);

  const getVaultStock = (productId: string, variantId: string) =>
    vault.filter(
      (v) => v.productId === productId && v.variantId === variantId && v.status === 'available',
    ).length;

  const totalVaultStock = product.variants.reduce(
    (sum, v) => sum + getVaultStock(product.id, v.id),
    0,
  );

  const handleCopySku = () => {
    navigator.clipboard.writeText(product.sku || product.id);
    setCopiedSku(true);
    setTimeout(() => setCopiedSku(false), 1600);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-600 text-slate-600 dark:text-slate-300 cursor-pointer shrink-0"
            aria-label="Back to Products"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 truncate">
                {product.name}
              </h1>
              <StatusIndicator
                tone={product.status === 'active' ? 'emerald' : 'zinc'}
                label={product.status === 'active' ? 'Active' : 'Draft'}
                size="md"
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>Category: <strong className="text-slate-700 dark:text-slate-300">{product.category || 'General'}</strong></span>
              <span>•</span>
              <button
                type="button"
                onClick={handleCopySku}
                className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer font-mono"
              >
                SKU: {product.sku || product.id}
                {copiedSku ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-400" />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href={`/product/${product.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 h-9 text-xs sm:text-sm font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Store View
          </a>
          <button
            type="button"
            onClick={() => onEdit(product.id, currentVariant?.id)}
            className="px-4 h-9 text-xs sm:text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-2xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit Product
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('details')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === 'details'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          Product Details
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('options')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'options'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <span>Plans / Options</span>
          <span className="px-1.5 py-0.5 rounded text-[11px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {product.variants.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('inventory')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'inventory'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <span>Vault Stock</span>
          <span
            className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold ${
              totalVaultStock > 0
                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
            }`}
          >
            {totalVaultStock}
          </span>
        </button>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'details' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: Core Info & Description */}
          <div className="lg:col-span-8 space-y-5">
            <Card className="p-5 space-y-4">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                General Overview
              </h2>
              {product.shortDescription && (
                <div>
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Tagline / Short Description
                  </div>
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                    {product.shortDescription}
                  </div>
                </div>
              )}
              <div>
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Full Description
                </div>
                <div className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-lg border border-slate-100 dark:border-slate-800 prose prose-sm dark:prose-invert max-w-none">
                  {product.description ? (
                    <BBCodeRenderer content={product.description} />
                  ) : (
                    <span className="italic text-slate-400">No extended description provided.</span>
                  )}
                </div>
              </div>
            </Card>

            {/* Quick Summary of Plans */}
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Configured Plans & Pricing
                </h2>
                <button
                  type="button"
                  onClick={() => setActiveTab('options')}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 cursor-pointer"
                >
                  View All Details →
                </button>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-lg overflow-hidden">
                {product.variants.map((v) => {
                  const stock = getVaultStock(product.id, v.id);
                  return (
                    <div
                      key={v.id}
                      className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-900/40"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                            {v.name}
                          </span>
                          {v.isDefault && (
                            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded">
                              Default
                            </span>
                          )}
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            ({v.durationLabel || `${v.durationDays} Days`})
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                          Mode: {v.deliveryMode === 'auto_vault' ? 'Instant Vault' : 'Manual Dispatch'} • Warranty: {v.hasWarranty ? `${v.warrantyDays} Days` : 'Login Only'}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-semibold text-sm text-slate-900 dark:text-slate-100 font-mono">
                          {formatBDT(v.priceBDT)}
                        </span>
                        <StatusIndicator
                          tone={stock > 0 ? 'emerald' : 'amber'}
                          label={v.deliveryMode === 'auto_vault' ? `${stock} in stock` : 'Manual'}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Right Column: Media, Specifications & Metadata */}
          <div className="lg:col-span-4 space-y-5">
            <Card className="p-5 space-y-4">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Primary Product Image
              </h2>
              {product.imageUrl ? (
                <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                  <Image
                    src={product.imageUrl}
                    alt={product.name}
                    fill
                    className="object-contain p-2"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : (
                <div className="aspect-video w-full rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center text-xs text-slate-400">
                  No image uploaded
                </div>
              )}

              {product.galleryUrls && product.galleryUrls.length > 1 && (
                <div>
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                    Gallery Assets ({product.galleryUrls.length})
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {product.galleryUrls.map((url, i) => (
                      <div
                        key={i}
                        className="relative aspect-square rounded border border-slate-200 dark:border-slate-800 overflow-hidden"
                      >
                        <Image
                          src={url}
                          alt={`${product.name} gallery ${i + 1}`}
                          fill
                          className="object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            <Card className="p-5 space-y-3">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Product Details
              </h2>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                <div className="py-2 flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Category</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{product.category || 'General'}</span>
                </div>
                <div className="py-2 flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Status</span>
                  <span className="font-semibold text-emerald-600 capitalize">{product.status}</span>
                </div>
                <div className="py-2 flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Total Plans</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">{product.variants.length}</span>
                </div>
                <div className="py-2 flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Available Vault Stock</span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{totalVaultStock} items</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Options Tab Content */}
      {activeTab === 'options' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Options selector list */}
          <div className="lg:col-span-4 space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1 mb-2">
              Select Plan / Variant
            </div>
            {product.variants.map((v) => {
              const isSelected = currentVariant?.id === v.id;
              const stock = getVaultStock(product.id, v.id);
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setCurrentVariant(v)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`font-semibold text-sm ${isSelected ? 'text-emerald-800 dark:text-emerald-200' : 'text-slate-900 dark:text-slate-100'}`}>
                        {v.name}
                      </span>
                      {v.isDefault && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                          Default
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {v.durationLabel || `${v.durationDays} Days`} • {formatBDT(v.priceBDT)}
                    </div>
                  </div>
                  <StatusIndicator
                    tone={stock > 0 ? 'emerald' : 'amber'}
                    label={v.deliveryMode === 'auto_vault' ? `${stock}` : 'M'}
                    size="sm"
                  />
                </button>
              );
            })}
          </div>

          {/* Option details panel */}
          <div className="lg:col-span-8">
            {currentVariant ? (
              <Card className="p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">
                        {currentVariant.name}
                      </h2>
                      {currentVariant.isDefault && (
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                          Default Store Plan
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Plan ID: <code className="font-mono">{currentVariant.id}</code>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                      {formatBDT(currentVariant.priceBDT)}
                    </div>
                    <div className="text-xs text-slate-400 font-mono">
                      ≈ ${currentVariant.priceUSD || (currentVariant.priceBDT / 115).toFixed(2)} USD
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40">
                    <div className="text-slate-500 dark:text-slate-400 font-medium mb-1">Delivery Mode</div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                      {currentVariant.deliveryMode === 'auto_vault' ? 'Instant Automatic Delivery (Vault)' : 'Manual Dispatch by Staff'}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40">
                    <div className="text-slate-500 dark:text-slate-400 font-medium mb-1">Warranty Period</div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                      {currentVariant.hasWarranty ? `${currentVariant.warrantyDays} Days Warranty Guarantee` : 'Login Guarantee Only'}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40">
                    <div className="text-slate-500 dark:text-slate-400 font-medium mb-1">Duration & Expiry</div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                      {currentVariant.durationLabel || `${currentVariant.durationDays} Days`}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40">
                    <div className="text-slate-500 dark:text-slate-400 font-medium mb-1">Device Limit</div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                      {currentVariant.deviceLimit || '1 Device / Shared profile'}
                    </div>
                  </div>
                </div>

                {currentVariant.loginInstructions && currentVariant.loginInstructions.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
                      Customer Delivery & Login Instructions
                    </h3>
                    <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-lg border border-slate-100 dark:border-slate-800">
                      {currentVariant.loginInstructions.map((step, idx) => (
                        <li key={idx} className="leading-relaxed">{step}</li>
                      ))}
                    </ol>
                  </div>
                )}

                {currentVariant.importantNote && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1.5">
                      Important Rules & Notes
                    </h3>
                    <div className="text-xs text-slate-700 dark:text-slate-300 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 p-3.5 rounded-lg">
                      {currentVariant.importantNote}
                    </div>
                  </div>
                )}
              </Card>
            ) : (
              <Card className="p-8 text-center text-sm text-slate-500">
                Please select a plan to view its specifications.
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Vault Inventory Tab Content */}
      {activeTab === 'inventory' && (
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Live Vault Stock per Option
            </h2>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-lg overflow-hidden">
            {product.variants.map((v) => {
              const availableItems = vault.filter(
                (item) => item.productId === product.id && item.variantId === v.id && item.status === 'available',
              );
              const totalItems = vault.filter(
                (item) => item.productId === product.id && item.variantId === v.id,
              );

              return (
                <div key={v.id} className="p-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                      {v.name}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Delivery: {v.deliveryMode === 'auto_vault' ? 'Instant Automatic Vault' : 'Manual Dispatch'}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm font-bold font-mono text-slate-800 dark:text-slate-200">
                        {availableItems.length} available
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {totalItems.length} total ever added
                      </div>
                    </div>
                    <StatusIndicator
                      tone={availableItems.length > 0 ? 'emerald' : 'amber'}
                      label={availableItems.length > 0 ? 'In Stock' : 'Out of Stock'}
                      size="md"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
