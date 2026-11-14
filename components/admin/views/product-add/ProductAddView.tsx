'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import type {
  DigitalProduct,
  ProductVariant,
  VaultCredential,
  MediaAsset,
  WarrantyPlan,
  CredentialScheme,
  ProductCategory,
} from '@/lib/admin-data';
import {
  credentialTypeFromScheme,
  findCredentialScheme,
} from '@/lib/admin/credential-schemes';
import {
  defaultDraftVariants,
  defaultLoginStepsForScheme,
  emptyDraftVariant,
  findWarranty,
  FULFILLMENT_DEFAULTS,
  initialMediaUrls,
  parseDurationDays,
  variantToDraft,
  warrantyBadgeFor,
  warrantyHeadlineFor,
  type DraftVariant,
} from './draft-helpers';
import ProductGeneralInfoCard from './ProductGeneralInfoCard';
import { scheduleProblem } from './ProductSchedulePicker';
import ProductSupplyPanel from './ProductSupplyPanel';
import type { OptionView, ProductOptions } from '@/components/admin/views/suppliers/shared';
import ProductOptionsEditor from './ProductOptionsEditor';
import ProductMediaPicker from './ProductMediaPicker';
import ProductLivePreview from './ProductLivePreview';

function resolveCategoryId(
  product: DigitalProduct | null | undefined,
  categories: ProductCategory[],
): string {
  if (!categories.length) return '';
  if (product?.categoryId) {
    const byId = categories.find((c) => c.id === product.categoryId);
    if (byId) return byId.id;
  }
  if (product?.category) {
    const byName = categories.find((c) => c.name === product.category);
    if (byName) return byName.id;
  }
  return categories[0].id;
}

export interface ProductAddViewProps {
  mediaAssets: MediaAsset[];
  warranties: WarrantyPlan[];
  credentialSchemes: CredentialScheme[];
  productCategories: ProductCategory[];
  editingProduct?: DigitalProduct | null;
  focusVariantId?: string | null;
  onSaveProduct: (newProduct: DigitalProduct, initialCredentials: VaultCredential[]) => void;
  onUpdateProduct?: (product: DigitalProduct, newCredentials: VaultCredential[]) => void;
  onCancel: () => void;
  onAddMedia?: (asset: MediaAsset) => void;
  onOpenMediaLibrary: () => void;
  onOpenWarranties: () => void;
  onOpenCredentialTypes: () => void;
  onOpenCategories: () => void;
}

export default function ProductAddView({
  mediaAssets,
  warranties,
  credentialSchemes,
  productCategories,
  editingProduct = null,
  focusVariantId = null,
  onSaveProduct,
  onUpdateProduct,
  onCancel,
  onAddMedia,
  onOpenMediaLibrary,
  onOpenWarranties,
  onOpenCredentialTypes,
  onOpenCategories,
}: ProductAddViewProps) {
  const isEdit = Boolean(editingProduct);
  const defaultWarrantyId = warranties[0]?.id || '';
  const defaultCredentialSchemeId = credentialSchemes[0]?.id || '';

  const [name, setName] = useState(editingProduct?.name ?? '');
  const [platform, setPlatform] = useState(editingProduct?.shortDescription ?? '');
  const [categoryId, setCategoryId] = useState(() =>
    resolveCategoryId(editingProduct, productCategories),
  );
  const [status, setStatus] = useState<DigitalProduct['status']>(
    editingProduct?.status === 'draft' ? 'draft' : 'active',
  );
  const [description, setDescription] = useState(editingProduct?.description ?? '');
  const [supplyPlans, setSupplyPlans] = useState<OptionView[] | null>(null);
  const [managePlanId, setManagePlanId] = useState<string | null>(null);
  const onSupply = useCallback((data: ProductOptions | null) => setSupplyPlans(data?.plans ?? null), []);

  const [selectedMediaUrls, setSelectedMediaUrls] = useState<string[]>(() =>
    initialMediaUrls(editingProduct),
  );
  const [customImageUrl, setCustomImageUrl] = useState('');

  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [mediaSearch, setMediaSearch] = useState('');
  const [mediaFolder, setMediaFolder] = useState<'all' | MediaAsset['folder']>('all');
  const [tempSelectedUrls, setTempSelectedUrls] = useState<string[]>(selectedMediaUrls);

  const [draftVariants, setDraftVariants] = useState<DraftVariant[]>(() =>
    editingProduct?.variants?.length
      ? editingProduct.variants.map((v) =>
          variantToDraft(v, warranties, credentialSchemes),
        )
      : defaultDraftVariants(),
  );

  const [previewOptionTempId, setPreviewOptionTempId] = useState<string>(() => {
    if (focusVariantId && editingProduct?.variants.some((v) => v.id === focusVariantId)) {
      return focusVariantId;
    }
    const drafts = editingProduct?.variants?.length
      ? editingProduct.variants.map((v) =>
          variantToDraft(v, warranties, credentialSchemes),
        )
      : [];
    return drafts[0]?.tempId || '';
  });

  // Sync form only when switching products / focus option — not on every
  // warranties/schemes/media identity change (that wiped in-progress edits).
  const editingProductId = editingProduct?.id ?? null;
  useEffect(() => {
    if (!editingProduct) return;
    setName(editingProduct.name);
    setPlatform(editingProduct.shortDescription || '');
    setCategoryId(resolveCategoryId(editingProduct, productCategories));
    setStatus(editingProduct.status === 'draft' ? 'draft' : 'active');
    setDescription(editingProduct.description ?? '');
    setSelectedMediaUrls(initialMediaUrls(editingProduct));
    const drafts = editingProduct.variants.map((v) =>
      variantToDraft(v, warranties, credentialSchemes),
    );
    setDraftVariants(drafts);
    const focus =
      (focusVariantId && drafts.find((d) => d.tempId === focusVariantId)?.tempId) ||
      drafts[0]?.tempId ||
      '';
    setPreviewOptionTempId(focus);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: product id / focus only
  }, [editingProductId, focusVariantId]);

  const handleOpenMediaModal = () => {
    setTempSelectedUrls(selectedMediaUrls);
    setMediaSearch('');
    setMediaFolder('all');
    setMediaModalOpen(true);
  };

  const toggleTempMediaUrl = (url: string) => {
    setTempSelectedUrls((prev) =>
      prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url],
    );
  };

  const handleConfirmMediaSelection = () => {
    if (tempSelectedUrls.length > 0) {
      setSelectedMediaUrls(tempSelectedUrls);
    }
    setMediaModalOpen(false);
  };

  const handleAddDraftVariant = () => {
    const newTempId = `draft-${Date.now()}`;
    setDraftVariants((prev) => [
      ...prev,
      emptyDraftVariant(
        { tempId: newTempId },
        defaultWarrantyId,
        defaultCredentialSchemeId,
      ),
    ]);
    setPreviewOptionTempId(newTempId);
  };

  const handleRemoveDraftVariant = (tempId: string) => {
    setDraftVariants((prev) => {
      const filtered = prev.filter((v) => v.tempId !== tempId);
      if (previewOptionTempId === tempId) {
        setPreviewOptionTempId(filtered[0]?.tempId || '');
      }
      return filtered;
    });
  };

  const updateDraftVariant = <K extends keyof DraftVariant>(
    tempId: string,
    field: K,
    value: DraftVariant[K],
  ) => {
    setDraftVariants((prev) =>
      prev.map((v) => (v.tempId === tempId ? { ...v, [field]: value } : v)),
    );
  };

  const saveProduct = () => {
    if (!name.trim()) return;
    if (draftVariants.some((dv) => scheduleProblem(dv.availableFrom, dv.availableUntil))) return;

    const prodId = editingProduct?.id ?? `prod-${Date.now()}`;
    const finalGallery = customImageUrl.trim()
      ? [customImageUrl.trim(), ...selectedMediaUrls]
      : selectedMediaUrls;
    const primaryImageUrl = finalGallery[0] || '';

    const builtVariants: ProductVariant[] = draftVariants.map((dv, index) => {
      const varId = dv.tempId.startsWith('draft-')
        ? `var-${Date.now()}-${index}`
        : dv.tempId;
      const steps = dv.detailsText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      const plan = findWarranty(warranties, dv.warrantyId);
      const hasWarranty = plan?.kind !== 'login-only';
      const days = plan?.days ?? 0;
      const scheme = findCredentialScheme(
        credentialSchemes,
        dv.credentialSchemeId,
      );

      const durationLabel =
        dv.durationLabel.trim() || `${dv.durationDays || 30} Days`;
      const parsedDays = parseDurationDays(durationLabel, dv.durationDays);

      return {
        id: varId,
        productId: prodId,
        name: dv.name.trim() || `Plan ${index + 1}`,
        sourcing: dv.sourcing || 'own',
        isDefault: false,
        durationDays: parsedDays,
        durationLabel,
        priceBDT: dv.priceBDT,
        priceUSD: Number((dv.priceBDT / 115).toFixed(2)),
        credentialSchemeId: scheme?.id,
        credentialType: credentialTypeFromScheme(scheme),
        deliveryMode: FULFILLMENT_DEFAULTS.deliveryMode,
        stockDisplayMode: FULFILLMENT_DEFAULTS.stockDisplayMode,
        vpnRequired: false,
        vpnRegionNote: '',
        hasWarranty,
        warrantyDays: days,
        warrantyTerms: warrantyHeadlineFor(dv, warranties),
        deviceLimit: '',
        loginInstructions:
          steps.length > 0
            ? steps
            : defaultLoginStepsForScheme(scheme),
        importantNote: warrantyBadgeFor(dv, warranties),
        warningNote: '',
        optionDescription: '',
        specifications: [],
        renewable: dv.renewable,
        renewalPricing: dv.renewalPricing,
        allowOrderWhenOutOfStock: dv.allowOrderWhenOutOfStock,
        availableFrom: dv.availableFrom || undefined,
        availableUntil: dv.availableUntil || undefined,
      };
    });

    const selectedCategory =
      productCategories.find((c) => c.id === categoryId) || productCategories[0];

    const product: DigitalProduct = {
      id: prodId,
      name: name.trim(),
      category: selectedCategory?.name || '',
      categoryId: selectedCategory?.id,
      sku: editingProduct?.sku || `BL-PRD-${Math.floor(100 + Math.random() * 900)}`,
      imageUrl: primaryImageUrl,
      galleryUrls: finalGallery,
      status: status === 'draft' ? 'draft' : 'active',
      shortDescription: platform.trim() || name.trim(),
      description,
      descriptionMode: 'global',
      variants: builtVariants,
    };

    const vaultCredentials: VaultCredential[] = [];

    if (isEdit && onUpdateProduct) {
      onUpdateProduct(product, vaultCredentials);
      return;
    }

    onSaveProduct(product, vaultCredentials);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    saveProduct();
  };

  const activePreviewVariant =
    draftVariants.find((d) => d.tempId === previewOptionTempId) || draftVariants[0];

  return (
    <div className="space-y-5">
      <form
        method="post"
        action="#"
        onSubmit={handleSubmit}
        className="space-y-5"
        noValidate
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-600 text-slate-600 dark:text-slate-300 cursor-pointer"
              aria-label="Back to Products"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden />
            </button>
            <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 m-0">
              {isEdit ? 'Edit Product' : 'Add Product'}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-3.5 h-9 text-sm font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!name.trim()}
              onClick={saveProduct}
              className="px-4 h-9 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg shadow-2xs cursor-pointer"
            >
              {isEdit ? 'Save' : 'Publish'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-8 space-y-5">
            <ProductGeneralInfoCard
              name={name}
              platform={platform}
              categoryId={categoryId}
              categories={productCategories}
              status={status}
              description={description}
              onNameChange={setName}
              onPlatformChange={setPlatform}
              onCategoryIdChange={setCategoryId}
              onStatusChange={setStatus}
              onDescriptionChange={setDescription}
              onOpenCategories={onOpenCategories}
            />

            <ProductOptionsEditor
              draftVariants={draftVariants}
              warranties={warranties}
              credentialSchemes={credentialSchemes}
              onAdd={handleAddDraftVariant}
              onRemove={handleRemoveDraftVariant}
              onUpdate={updateDraftVariant}
              onOpenWarranties={onOpenWarranties}
              onOpenCredentialTypes={onOpenCredentialTypes}
              supplyPlans={supplyPlans ?? undefined}
              onManageSupply={setManagePlanId}
            />

            {isEdit && editingProduct ? (
              <ProductSupplyPanel
                productId={editingProduct.id}
                onSupply={onSupply}
                managePlanId={managePlanId}
                onManagePlanId={setManagePlanId}
              />
            ) : null}
          </div>

          <div className="lg:col-span-4 space-y-5">
            <ProductMediaPicker
              productName={name}
              mediaAssets={mediaAssets}
              selectedMediaUrls={selectedMediaUrls}
              customImageUrl={customImageUrl}
              mediaModalOpen={mediaModalOpen}
              mediaSearch={mediaSearch}
              mediaFolder={mediaFolder}
              tempSelectedUrls={tempSelectedUrls}
              onOpenMediaLibrary={onOpenMediaLibrary}
              onAddMedia={onAddMedia}
              onOpenModal={handleOpenMediaModal}
              onCloseModal={() => setMediaModalOpen(false)}
              onCustomImageUrlChange={setCustomImageUrl}
              onSelectedMediaUrlsChange={setSelectedMediaUrls}
              onMediaSearchChange={setMediaSearch}
              onMediaFolderChange={setMediaFolder}
              onToggleTempUrl={toggleTempMediaUrl}
              onClearTempSelection={() => setTempSelectedUrls([])}
              onConfirmSelection={handleConfirmMediaSelection}
            />

            <ProductLivePreview
              productName={name}
              platform={platform}
              description={description}
              warranties={warranties}
              draftVariants={draftVariants}
              activePreviewVariant={activePreviewVariant}
              onSelectOption={setPreviewOptionTempId}
            />
          </div>
        </div>
      </form>
    </div>
  );
}
