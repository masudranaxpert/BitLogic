'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Image as ImageIcon,
  Check,
  Search,
  Star,
  SlidersHorizontal,
} from 'lucide-react';
import {
  DigitalProduct,
  ProductVariant,
  ProductSpecification,
  VaultCredential,
  MediaAsset,
  CredentialType,
  DeliveryMode,
  StockDisplayMode,
} from '@/lib/admin-data';
import {
  Card,
  formatBDT,
  getCredentialTypeLabel,
  StatusIndicator,
  SegmentedTabs,
  ModalShell,
  BBCodeEditor,
  BBCodeRenderer,
} from '@/components/admin/ui/primitives';

interface ProductAddViewProps {
  mediaAssets: MediaAsset[];
  /** When set, this page is Edit Product (same UI as Add). */
  editingProduct?: DigitalProduct | null;
  /** Optional option id to focus in the options list / preview. */
  focusVariantId?: string | null;
  onSaveProduct: (newProduct: DigitalProduct, initialCredentials: VaultCredential[]) => void;
  onUpdateProduct?: (product: DigitalProduct, newCredentials: VaultCredential[]) => void;
  onCancel: () => void;
  onOpenMediaLibrary: () => void;
}

interface DraftVariant {
  tempId: string;
  name: string;
  isDefault: boolean;
  priceBDT: number;
  durationDays: number;
  credentialType: CredentialType;
  deliveryMode: DeliveryMode;
  stockDisplayMode: StockDisplayMode;
  vpnRequired: boolean;
  vpnRegionNote: string;
  hasWarranty: boolean;
  warrantyDays: number;
  deviceLimit: string;
  optionDescription: string;
  warningNote: string;
  specifications: ProductSpecification[];
  loginStepsText: string;
  initialVaultLines: string;
}

const SPEC_PRESETS: Record<CredentialType, ProductSpecification[]> = {
  token: [
    { label: 'Delivery Mode', value: 'Instant (Auto-Vault)' },
    { label: 'Login Method', value: 'Chrome/Edge Token Extension' },
    { label: 'Device Limit', value: '1 PC Browser' },
    { label: 'VPN Requirement', value: 'No VPN Required' },
    { label: 'Warranty', value: '30 Days Replacement' },
  ],
  email_login: [
    { label: 'Delivery Mode', value: 'Instant (Auto-Vault)' },
    { label: 'Login Method', value: 'Email + Password + OTP Bot' },
    { label: 'Device Limit', value: '1 Mobile + 1 PC' },
    { label: 'VPN Requirement', value: 'No VPN Required' },
    { label: 'Warranty', value: '30 Days Replacement' },
  ],
  license_key: [
    { label: 'Key Type', value: '25-Digit Official Retail Key' },
    { label: 'Activation', value: 'Global Online Activation' },
    { label: 'Device Limit', value: '1 PC' },
    { label: 'Warranty', value: 'Lifetime Activation' },
  ],
  invite_link: [
    { label: 'Delivery Mode', value: 'Workspace Invite Link' },
    { label: 'Privacy', value: '100% Private Personal Email' },
    { label: 'Device Limit', value: 'Unlimited Personal Devices' },
    { label: 'Warranty', value: '30 Days Full Warranty' },
  ],
};

function variantToDraft(variant: ProductVariant): DraftVariant {
  return {
    tempId: variant.id,
    name: variant.name,
    isDefault: Boolean(variant.isDefault),
    priceBDT: variant.priceBDT,
    durationDays: variant.durationDays,
    credentialType: variant.credentialType,
    deliveryMode: variant.deliveryMode,
    stockDisplayMode: variant.stockDisplayMode,
    vpnRequired: variant.vpnRequired,
    vpnRegionNote: variant.vpnRegionNote,
    hasWarranty: variant.hasWarranty,
    warrantyDays: variant.warrantyDays || 30,
    deviceLimit: variant.deviceLimit,
    optionDescription: variant.optionDescription || '',
    warningNote: variant.warningNote || variant.importantNote || '',
    specifications:
      variant.specifications && variant.specifications.length > 0
        ? variant.specifications.map((s) => ({ ...s }))
        : [...SPEC_PRESETS[variant.credentialType]],
    loginStepsText: variant.loginInstructions.join('\n'),
    initialVaultLines: '',
  };
}

function defaultDraftVariants(): DraftVariant[] {
  return [
    {
      tempId: 'draft-1',
      name: '1M Access Token',
      isDefault: true,
      priceBDT: 450,
      durationDays: 30,
      credentialType: 'token',
      deliveryMode: 'auto_vault',
      stockDisplayMode: 'exact_count',
      vpnRequired: false,
      vpnRegionNote: 'Direct login without VPN.',
      hasWarranty: true,
      warrantyDays: 30,
      deviceLimit: '1 PC Browser',
      optionDescription:
        'Budget-friendly 30-day session token for Chrome or Edge browser with 1-click extension login.',
      warningNote:
        '[warning]Do NOT click "Log Out" inside the app — clicking Log Out revokes the shared session token. Simply close the browser tab when finished.[/warning]',
      specifications: [...SPEC_PRESETS.token],
      loginStepsText:
        'Install the Access Token Helper extension.\nPaste your delivered token and click Inject Session.',
      initialVaultLines: '',
    },
  ];
}

export default function ProductAddView({
  mediaAssets,
  editingProduct = null,
  focusVariantId = null,
  onSaveProduct,
  onUpdateProduct,
  onCancel,
  onOpenMediaLibrary,
}: ProductAddViewProps) {
  const isEdit = Boolean(editingProduct);

  const [name, setName] = useState(editingProduct?.name ?? '');
  const [sku, setSku] = useState(editingProduct?.sku ?? '');
  const [category, setCategory] = useState<DigitalProduct['category']>(
    editingProduct?.category ?? 'AI & LLM Tools',
  );
  const [status, setStatus] = useState<DigitalProduct['status']>(
    editingProduct?.status ?? 'active',
  );
  const [shortDescription, setShortDescription] = useState(
    editingProduct?.shortDescription ?? '',
  );
  const [descriptionMode, setDescriptionMode] = useState<'per_option' | 'global'>(
    editingProduct?.descriptionMode ?? 'per_option',
  );
  const [description, setDescription] = useState(
    editingProduct?.description ??
      '[notice]Instant 24/7 Auto-Vault delivery immediately after payment verification.[/notice]\nSelect your preferred subscription option below to view option-specific specifications, login instructions, and warranty rules.',
  );

  // Selected Media (supports multiple images; first is Primary Cover)
  const [selectedMediaUrls, setSelectedMediaUrls] = useState<string[]>(() => {
    if (editingProduct?.galleryUrls?.length) return [...editingProduct.galleryUrls];
    if (editingProduct?.imageUrl) return [editingProduct.imageUrl];
    return [
      mediaAssets[0]?.url || 'https://picsum.photos/seed/chatgptplus/400/400',
    ];
  });
  const [customImageUrl, setCustomImageUrl] = useState('');

  // Media Picker Modal State
  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [mediaSearch, setMediaSearch] = useState('');
  const [mediaFolder, setMediaFolder] = useState<'all' | MediaAsset['folder']>('all');
  const [tempSelectedUrls, setTempSelectedUrls] = useState<string[]>(selectedMediaUrls);

  const [draftVariants, setDraftVariants] = useState<DraftVariant[]>(() =>
    editingProduct?.variants?.length
      ? editingProduct.variants.map(variantToDraft)
      : defaultDraftVariants(),
  );

  const [previewOptionTempId, setPreviewOptionTempId] = useState<string>(() => {
    if (focusVariantId && editingProduct?.variants.some((v) => v.id === focusVariantId)) {
      return focusVariantId;
    }
    const drafts = editingProduct?.variants?.length
      ? editingProduct.variants.map(variantToDraft)
      : defaultDraftVariants();
    return drafts.find((d) => d.isDefault)?.tempId || drafts[0]?.tempId || 'draft-1';
  });

  // Parent remounts via `key`; this hydrates if editingProduct arrives after mount.
  useEffect(() => {
    if (!editingProduct) return;
    setName(editingProduct.name);
    setSku(editingProduct.sku);
    setCategory(editingProduct.category);
    setStatus(editingProduct.status);
    setShortDescription(editingProduct.shortDescription);
    setDescriptionMode(editingProduct.descriptionMode ?? 'per_option');
    setDescription(
      editingProduct.description ??
        '[notice]Instant 24/7 Auto-Vault delivery immediately after payment verification.[/notice]',
    );
    setSelectedMediaUrls(
      editingProduct.galleryUrls?.length
        ? [...editingProduct.galleryUrls]
        : editingProduct.imageUrl
          ? [editingProduct.imageUrl]
          : [
              mediaAssets[0]?.url ||
                'https://picsum.photos/seed/chatgptplus/400/400',
            ],
    );
    const drafts = editingProduct.variants.map(variantToDraft);
    setDraftVariants(drafts);
    const focus =
      (focusVariantId &&
        drafts.find((d) => d.tempId === focusVariantId)?.tempId) ||
      drafts.find((d) => d.isDefault)?.tempId ||
      drafts[0]?.tempId;
    if (focus) setPreviewOptionTempId(focus);
  }, [editingProduct, focusVariantId, mediaAssets]);

  const handleOpenMediaModal = () => {
    setTempSelectedUrls(selectedMediaUrls);
    setMediaSearch('');
    setMediaFolder('all');
    setMediaModalOpen(true);
  };

  const toggleTempMediaUrl = (url: string) => {
    setTempSelectedUrls((prev) =>
      prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url]
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
      {
        tempId: newTempId,
        name: '1M Shared Login',
        isDefault: false,
        priceBDT: 650,
        durationDays: 30,
        credentialType: 'email_login',
        deliveryMode: 'auto_vault',
        stockDisplayMode: 'exact_count',
        vpnRequired: false,
        vpnRegionNote: 'Direct login on PC or Mobile.',
        hasWarranty: true,
        warrantyDays: 30,
        deviceLimit: '1 Mobile + 1 PC',
        optionDescription:
          'Works on both Mobile App and PC Browser via direct Email + Password sign-in.',
        warningNote:
          '[warning]Do NOT change the account password or modify 2FA settings, otherwise warranty will be voided.[/warning]',
        specifications: [...SPEC_PRESETS.email_login],
        loginStepsText: 'Sign in with delivered Email and Password.\nFetch OTP via Order ID if prompted.',
        initialVaultLines: '',
      },
    ]);
    setPreviewOptionTempId(newTempId);
  };

  const handleRemoveDraftVariant = (tempId: string) => {
    if (draftVariants.length <= 1) return;
    setDraftVariants((prev) => {
      const filtered = prev.filter((v) => v.tempId !== tempId);
      if (!filtered.some((v) => v.isDefault) && filtered[0]) {
        filtered[0].isDefault = true;
      }
      return filtered;
    });
  };

  const handleSetDefaultVariant = (tempId: string) => {
    setDraftVariants((prev) =>
      prev.map((v) => ({ ...v, isDefault: v.tempId === tempId }))
    );
    setPreviewOptionTempId(tempId);
  };

  const updateDraftVariant = <K extends keyof DraftVariant>(
    tempId: string,
    field: K,
    value: DraftVariant[K]
  ) => {
    setDraftVariants((prev) =>
      prev.map((v) => (v.tempId === tempId ? { ...v, [field]: value } : v))
    );
  };

  const handleAddSpecRow = (tempId: string) => {
    setDraftVariants((prev) =>
      prev.map((v) =>
        v.tempId === tempId
          ? {
              ...v,
              specifications: [...v.specifications, { label: 'Feature', value: 'Included' }],
            }
          : v
      )
    );
  };

  const handleUpdateSpecRow = (
    tempId: string,
    specIdx: number,
    key: 'label' | 'value',
    val: string
  ) => {
    setDraftVariants((prev) =>
      prev.map((v) =>
        v.tempId === tempId
          ? {
              ...v,
              specifications: v.specifications.map((s, idx) =>
                idx === specIdx ? { ...s, [key]: val } : s
              ),
            }
          : v
      )
    );
  };

  const handleRemoveSpecRow = (tempId: string, specIdx: number) => {
    setDraftVariants((prev) =>
      prev.map((v) =>
        v.tempId === tempId
          ? {
              ...v,
              specifications: v.specifications.filter((_, idx) => idx !== specIdx),
            }
          : v
      )
    );
  };

  const handleLoadSpecPreset = (tempId: string, type: CredentialType) => {
    updateDraftVariant(tempId, 'specifications', [...SPEC_PRESETS[type]]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const prodId = editingProduct?.id ?? `prod-${Date.now()}`;
    const finalGallery = customImageUrl.trim()
      ? [customImageUrl.trim(), ...selectedMediaUrls]
      : selectedMediaUrls;
    const primaryImageUrl =
      finalGallery[0] || 'https://picsum.photos/seed/chatgptplus/400/400';

    const vaultCredentials: VaultCredential[] = [];

    const builtVariants: ProductVariant[] = draftVariants.map((dv, index) => {
      const varId = dv.tempId.startsWith('draft-')
        ? `var-${Date.now()}-${index}`
        : dv.tempId;
      const steps = dv.loginStepsText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      const rawLines = dv.initialVaultLines
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);

      rawLines.forEach((line, lineIdx) => {
        const parts = line.split('|').map((p) => p.trim());
        const isEmail = dv.credentialType === 'email_login';
        vaultCredentials.push({
          id: `vlt-${Date.now()}-${index}-${lineIdx}`,
          productId: prodId,
          productName: name.trim(),
          variantId: varId,
          variantName: dv.name.trim() || 'Standard Option',
          credentialType: dv.credentialType,
          secretValue: isEmail && parts.length >= 2 ? `${parts[0]} | ${parts[1]}` : line,
          email: isEmail ? parts[0] : undefined,
          password: isEmail ? parts[1] : undefined,
          profilePin: isEmail && parts[2] ? parts[2] : undefined,
          noteBBCode: dv.warningNote,
          status: 'available',
          batchNote: isEdit ? 'Edited product restock' : 'Initial Setup',
          addedAt: '2026-10-30 07:35',
        });
      });

      return {
        id: varId,
        productId: prodId,
        name: dv.name.trim() || '1M Access Plan',
        isDefault: dv.isDefault,
        durationDays: dv.durationDays,
        durationLabel: `${dv.durationDays} Days`,
        priceBDT: dv.priceBDT,
        priceUSD: Number((dv.priceBDT / 115).toFixed(2)),
        credentialType: dv.credentialType,
        deliveryMode: dv.deliveryMode,
        stockDisplayMode: dv.stockDisplayMode,
        vpnRequired: dv.vpnRequired,
        vpnRegionNote: dv.vpnRegionNote,
        hasWarranty: dv.hasWarranty,
        warrantyDays: dv.hasWarranty ? dv.warrantyDays : 0,
        warrantyTerms: dv.hasWarranty
          ? `${dv.warrantyDays}-day replacement warranty.`
          : 'No Warranty',
        deviceLimit: dv.deviceLimit,
        loginInstructions: steps.length > 0 ? steps : ['Sign in with delivered credential.'],
        importantNote: dv.warningNote,
        warningNote: dv.warningNote,
        optionDescription: dv.optionDescription,
        specifications: dv.specifications.filter((s) => s.label.trim() && s.value.trim()),
      };
    });

    const product: DigitalProduct = {
      id: prodId,
      name: name.trim(),
      category,
      sku: sku.trim() || `BL-PRD-${Math.floor(100 + Math.random() * 900)}`,
      imageUrl: primaryImageUrl,
      galleryUrls: finalGallery,
      status,
      shortDescription: shortDescription.trim() || `${name.trim()} digital subscription.`,
      description,
      descriptionMode,
      totalSales: editingProduct?.totalSales ?? 0,
      monthlyRevenueBDT: editingProduct?.monthlyRevenueBDT ?? 0,
      variants: builtVariants,
    };

    if (isEdit && onUpdateProduct) {
      onUpdateProduct(product, vaultCredentials);
      return;
    }

    onSaveProduct(product, vaultCredentials);
  };

  const filteredModalAssets = mediaAssets.filter((a) => {
    const matchesFolder = mediaFolder === 'all' || a.folder === mediaFolder;
    const matchesSearch =
      a.name.toLowerCase().includes(mediaSearch.toLowerCase()) ||
      a.fileName.toLowerCase().includes(mediaSearch.toLowerCase()) ||
      (a.usedByProduct || '').toLowerCase().includes(mediaSearch.toLowerCase());
    return matchesFolder && matchesSearch;
  });

  const activePreviewVariant =
    draftVariants.find((d) => d.tempId === previewOptionTempId) ||
    draftVariants.find((d) => d.isDefault) ||
    draftVariants[0];

  return (
    <div className="space-y-5">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-600 text-slate-600 dark:text-slate-300 cursor-pointer"
              aria-label="Back to Products"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 m-0">
              {isEdit ? 'Edit Product' : 'Add Product'}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-3.5 h-9 text-xs font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 h-9 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-2xs cursor-pointer"
            >
              {isEdit ? 'Save Changes' : 'Publish Product'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-8 space-y-5">
            {/* 1. GENERAL PRODUCT INFO & DESCRIPTION */}
            <Card className="p-5 space-y-4">
              <h2 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200/80 dark:border-slate-800 pb-3">
                General Information &amp; Description
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Product Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Midjourney Pro"
                    className="w-full h-9 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    SKU Code
                  </label>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="BL-AI-MIDJ"
                    className="w-full h-9 px-3 font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as DigitalProduct['category'])}
                    className="w-full h-9 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                  >
                    <option value="AI & LLM Tools">AI &amp; LLM Tools</option>
                    <option value="Developer & Cloud">Developer &amp; Cloud</option>
                    <option value="Creative & Design">Creative &amp; Design</option>
                    <option value="Streaming & OTT">Streaming &amp; OTT</option>
                    <option value="VPN & Security">VPN &amp; Security</option>
                    <option value="OS & Office Keys">OS &amp; Office Keys</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Storefront Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as DigitalProduct['status'])}
                    className="w-full h-9 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                  >
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                    <option value="out_of_stock">Out of Stock</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Description &amp; Specs Mode
                  </label>
                  <select
                    value={descriptionMode}
                    onChange={(e) =>
                      setDescriptionMode(e.target.value as 'per_option' | 'global')
                    }
                    className="w-full h-9 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                  >
                    <option value="per_option">Dynamic Per-Option Specs</option>
                    <option value="global">Global Description Only</option>
                  </select>
                </div>
              </div>

              <div className="text-xs">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Short Summary (1-Line Card Subtitle)
                </label>
                <input
                  type="text"
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  placeholder="Fast GPU generations via session token, shared login, or private invite."
                  className="w-full h-9 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-emerald-600"
                />
              </div>

              <BBCodeEditor
                label="Main Product Description (Supports BBCode)"
                value={description}
                onChange={setDescription}
                rows={4}
                placeholder="Write full product description with [notice], [warning], [b], or [code] tags..."
              />
            </Card>

            {/* 2. PRODUCT OPTIONS, WARNINGS & SPECIFICATIONS */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100">
                  Product Options, Warnings &amp; Specifications ({draftVariants.length})
                </h2>
                <button
                  type="button"
                  onClick={handleAddDraftVariant}
                  className="px-3 h-9 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-emerald-600 text-emerald-700 dark:text-emerald-400 rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Another Option</span>
                </button>
              </div>

              {draftVariants.map((dv, idx) => (
                <Card key={dv.tempId} className="p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="w-5 h-5 rounded bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-mono text-xs font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="font-display text-sm font-bold text-slate-900 dark:text-slate-100">
                        {dv.name || 'Option'}
                      </span>
                      <StatusIndicator
                        tone="emerald"
                        label={getCredentialTypeLabel(dv.credentialType)}
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSetDefaultVariant(dv.tempId)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium inline-flex items-center gap-1 cursor-pointer border ${
                          dv.isDefault
                            ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 font-semibold'
                            : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800 hover:border-emerald-500'
                        }`}
                      >
                        <Star
                          className={`w-3 h-3 ${
                            dv.isDefault ? 'fill-emerald-600 text-emerald-600' : ''
                          }`}
                        />
                        <span>{dv.isDefault ? 'Default Option' : 'Set as Default'}</span>
                      </button>

                      {draftVariants.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveDraftVariant(dv.tempId)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                          title="Remove Option"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                    <div className="sm:col-span-2">
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Option Name
                      </label>
                      <input
                        type="text"
                        required
                        value={dv.name}
                        onChange={(e) => updateDraftVariant(dv.tempId, 'name', e.target.value)}
                        placeholder="1M Access Token"
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
                        value={dv.priceBDT}
                        onChange={(e) =>
                          updateDraftVariant(dv.tempId, 'priceBDT', Number(e.target.value))
                        }
                        className="w-full h-9 px-3 font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Duration (Days)
                      </label>
                      <input
                        type="number"
                        required
                        min={1}
                        value={dv.durationDays}
                        onChange={(e) =>
                          updateDraftVariant(dv.tempId, 'durationDays', Number(e.target.value))
                        }
                        className="w-full h-9 px-3 font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Credential Type
                      </label>
                      <select
                        value={dv.credentialType}
                        onChange={(e) => {
                          const nextType = e.target.value as CredentialType;
                          updateDraftVariant(dv.tempId, 'credentialType', nextType);
                        }}
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
                        value={dv.deliveryMode}
                        onChange={(e) =>
                          updateDraftVariant(
                            dv.tempId,
                            'deliveryMode',
                            e.target.value as DeliveryMode
                          )
                        }
                        className="w-full h-9 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                      >
                        <option value="auto_vault">Auto-Vault (Instant)</option>
                        <option value="manual_dispatch">Manual Queue</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        VPN Required?
                      </label>
                      <select
                        value={dv.vpnRequired ? 'yes' : 'no'}
                        onChange={(e) =>
                          updateDraftVariant(dv.tempId, 'vpnRequired', e.target.value === 'yes')
                        }
                        className="w-full h-9 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                      >
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Warranty Days
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={dv.warrantyDays}
                        onChange={(e) =>
                          updateDraftVariant(dv.tempId, 'warrantyDays', Number(e.target.value))
                        }
                        className="w-full h-9 px-3 font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                      />
                    </div>
                  </div>

                  {/* Option Description & BBCode Warning Box */}
                  <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 space-y-3">
                    <div className="text-xs">
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Option Description (Shown when buyer selects this option)
                      </label>
                      <input
                        type="text"
                        value={dv.optionDescription}
                        onChange={(e) =>
                          updateDraftVariant(dv.tempId, 'optionDescription', e.target.value)
                        }
                        placeholder="Explain how this specific option works..."
                        className="w-full h-9 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                      />
                    </div>

                    <BBCodeEditor
                      label="Option Warning & Rules (BBCode [warning] / [notice])"
                      value={dv.warningNote}
                      onChange={(val) => updateDraftVariant(dv.tempId, 'warningNote', val)}
                      rows={2}
                      placeholder="[warning]Do NOT click Log Out or change password...[/warning]"
                    />
                  </div>

                  {/* Per-Option Specifications Table Builder */}
                  <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 space-y-2.5 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Option Specifications ({dv.specifications.length})</span>
                      </span>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleLoadSpecPreset(dv.tempId, dv.credentialType)}
                          className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-600 text-[11px] cursor-pointer"
                        >
                          Load {getCredentialTypeLabel(dv.credentialType)} Preset
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddSpecRow(dv.tempId)}
                          className="px-2.5 py-1 rounded bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 font-semibold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Spec</span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {dv.specifications.map((spec, sIdx) => (
                        <div key={sIdx} className="grid grid-cols-12 gap-2 items-center">
                          <input
                            type="text"
                            value={spec.label}
                            onChange={(e) =>
                              handleUpdateSpecRow(dv.tempId, sIdx, 'label', e.target.value)
                            }
                            placeholder="Spec Name (e.g., Device Limit)"
                            className="col-span-5 h-8 px-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md"
                          />
                          <input
                            type="text"
                            value={spec.value}
                            onChange={(e) =>
                              handleUpdateSpecRow(dv.tempId, sIdx, 'value', e.target.value)
                            }
                            placeholder="Spec Value (e.g., 1 PC Browser)"
                            className="col-span-6 h-8 px-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveSpecRow(dv.tempId, sIdx)}
                            className="col-span-1 flex items-center justify-center text-slate-400 hover:text-rose-600 cursor-pointer"
                            title="Remove Spec"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Login Steps & Pre-stock Vault */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/80 dark:border-slate-800 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Login Steps (1 per line)
                      </label>
                      <textarea
                        rows={3}
                        value={dv.loginStepsText}
                        onChange={(e) =>
                          updateDraftVariant(dv.tempId, 'loginStepsText', e.target.value)
                        }
                        className="w-full px-3 py-2 font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Initial Vault Stock (Optional, 1 per line)
                      </label>
                      <textarea
                        rows={3}
                        value={dv.initialVaultLines}
                        onChange={(e) =>
                          updateDraftVariant(dv.tempId, 'initialVaultLines', e.target.value)
                        }
                        placeholder={
                          dv.credentialType === 'email_login'
                            ? 'user1@vault.io | Pass#123 | PIN: 1122'
                            : 'TOKEN_OR_KEY_LINE_1'
                        }
                        className="w-full px-3 py-2 font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* RIGHT COLUMN: MEDIA PICKER TRIGGER & LIVE DYNAMIC OPTION PREVIEW */}
          <div className="lg:col-span-4 space-y-5">
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-3">
                <h2 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100">
                  Product Media ({selectedMediaUrls.length})
                </h2>
                <button
                  type="button"
                  onClick={onOpenMediaLibrary}
                  className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  Manage Library
                </button>
              </div>

              <div className="relative aspect-square w-full max-w-[200px] mx-auto rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950">
                <Image
                  src={
                    customImageUrl.trim() ||
                    selectedMediaUrls[0] ||
                    'https://picsum.photos/seed/chatgptplus/400/400'
                  }
                  alt={name || 'Product Cover'}
                  fill
                  className="object-cover"
                  referrerPolicy="no-referrer"
                />
                <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-slate-900/80 text-white text-[10px] font-semibold">
                  Primary Cover
                </span>
              </div>

              {selectedMediaUrls.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {selectedMediaUrls.map((url, idx) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => {
                        const reordered = [
                          url,
                          ...selectedMediaUrls.filter((u) => u !== url),
                        ];
                        setSelectedMediaUrls(reordered);
                      }}
                      className={`relative w-12 h-12 rounded-md overflow-hidden border shrink-0 cursor-pointer ${
                        idx === 0
                          ? 'border-emerald-600 ring-2 ring-emerald-600/30'
                          : 'border-slate-200 dark:border-slate-800 opacity-75 hover:opacity-100'
                      }`}
                      title={idx === 0 ? 'Primary Cover' : 'Click to make Primary Cover'}
                    >
                      <Image
                        src={url}
                        alt={`Selected ${idx + 1}`}
                        fill
                        className="object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </button>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={handleOpenMediaModal}
                className="w-full h-9 px-3 text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-600 hover:text-white text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <ImageIcon className="w-4 h-4" />
                <span>Select from Media Library ({mediaAssets.length} files)</span>
              </button>

              <div className="text-xs">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Or Paste External Image URL
                </label>
                <input
                  type="url"
                  value={customImageUrl}
                  onChange={(e) => setCustomImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full h-9 px-3 font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                />
              </div>
            </Card>

            {/* LIVE OPTION-AWARE DESCRIPTION & SPECIFICATION PREVIEW */}
            <Card className="p-5 space-y-3.5 text-xs">
              <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-2.5">
                <span className="font-display text-sm font-bold text-slate-900 dark:text-slate-100">
                  Live Storefront Option Preview
                </span>
                <StatusIndicator tone="emerald" label="Interactive" />
              </div>

              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-400">
                  Select Option to Test Specs:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {draftVariants.map((dv) => {
                    const active = dv.tempId === activePreviewVariant?.tempId;
                    return (
                      <button
                        key={dv.tempId}
                        type="button"
                        onClick={() => setPreviewOptionTempId(dv.tempId)}
                        className={`px-2.5 py-1.5 rounded-md border text-xs font-medium cursor-pointer flex items-center gap-1.5 ${
                          active
                            ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 font-semibold'
                            : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <span>{dv.name}</span>
                        {dv.isDefault && (
                          <span className="px-1 py-0.2 rounded bg-emerald-600 text-white text-[9px]">
                            Default
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {activePreviewVariant && (
                <div className="space-y-3 pt-1">
                  <div className="flex items-baseline justify-between">
                    <span className="font-display font-bold text-base text-slate-900 dark:text-slate-100">
                      {formatBDT(activePreviewVariant.priceBDT)}
                    </span>
                    <span className="font-mono text-slate-500">
                      {activePreviewVariant.durationDays} Days ·{' '}
                      {getCredentialTypeLabel(activePreviewVariant.credentialType)}
                    </span>
                  </div>

                  {descriptionMode === 'per_option' &&
                    activePreviewVariant.optionDescription && (
                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                        {activePreviewVariant.optionDescription}
                      </p>
                    )}

                  <BBCodeRenderer content={activePreviewVariant.warningNote} />

                  <div className="rounded-lg border border-slate-200/80 dark:border-slate-800 overflow-hidden">
                    <div className="px-3 py-2 bg-slate-50 dark:bg-slate-900 font-semibold text-slate-700 dark:text-slate-200 border-b border-slate-200/80 dark:border-slate-800">
                      Specifications — {activePreviewVariant.name}
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
                      {activePreviewVariant.specifications.map((s, i) => (
                        <div
                          key={i}
                          className="px-3 py-2 flex items-center justify-between gap-2"
                        >
                          <span className="text-slate-500">{s.label}</span>
                          <span className="font-medium text-slate-900 dark:text-slate-100 text-right">
                            {s.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </form>

      {/* MEDIA LIBRARY MULTI-SELECT MODAL */}
      <ModalShell
        open={mediaModalOpen}
        onClose={() => setMediaModalOpen(false)}
        title="Select from Media Library"
        subtitle="Search, filter by folder, and scroll to select one or multiple images for this product."
        maxWidth="max-w-3xl"
      >
        <div className="space-y-4 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <SegmentedTabs
              options={[
                { value: 'all', label: 'All Files', count: mediaAssets.length },
                {
                  value: 'Product Covers',
                  label: 'Product Covers',
                  count: mediaAssets.filter((a) => a.folder === 'Product Covers').length,
                },
                {
                  value: 'Brand Icons',
                  label: 'Brand Icons',
                  count: mediaAssets.filter((a) => a.folder === 'Brand Icons').length,
                },
                {
                  value: 'Login Guides',
                  label: 'Login Guides',
                  count: mediaAssets.filter((a) => a.folder === 'Login Guides').length,
                },
              ]}
              value={mediaFolder}
              onChange={setMediaFolder}
            />

            <div className="relative w-full sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={mediaSearch}
                onChange={(e) => setMediaSearch(e.target.value)}
                placeholder="Search media files..."
                className="w-full h-9 pl-8 pr-3 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          <div className="max-h-[380px] overflow-y-auto pr-1 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {filteredModalAssets.map((asset) => {
              const selectedIdx = tempSelectedUrls.indexOf(asset.url);
              const isSelected = selectedIdx !== -1;

              return (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => toggleTempMediaUrl(asset.url)}
                  className={`group text-left rounded-lg overflow-hidden border transition-all cursor-pointer flex flex-col ${
                    isSelected
                      ? 'border-emerald-600 ring-2 ring-emerald-600/30 bg-emerald-50/20 dark:bg-emerald-950/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-emerald-500 bg-white dark:bg-slate-900'
                  }`}
                >
                  <div className="relative aspect-square w-full bg-slate-100 dark:bg-slate-950">
                    <Image
                      src={asset.url}
                      alt={asset.name}
                      fill
                      className="object-cover"
                      referrerPolicy="no-referrer"
                    />
                    {isSelected && (
                      <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-emerald-600 text-white font-mono text-[10px] font-bold flex items-center justify-center shadow-xs">
                        {selectedIdx + 1}
                      </span>
                    )}
                    {selectedIdx === 0 && (
                      <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-semibold">
                        Cover
                      </span>
                    )}
                  </div>
                  <div className="p-2.5">
                    <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {asset.name}
                    </div>
                    <div className="font-mono text-[10px] text-slate-400 mt-0.5 truncate">
                      {asset.dimensions} · {asset.sizeKB} KB
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <div className="text-slate-500">
              <strong className="text-slate-900 dark:text-slate-100 font-mono">
                {tempSelectedUrls.length}
              </strong>{' '}
              image(s) selected · First selected image is used as Primary Cover
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTempSelectedUrls([])}
                className="px-3 h-9 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-400 cursor-pointer"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleConfirmMediaSelection}
                disabled={tempSelectedUrls.length === 0}
                className="px-4 h-9 font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Insert Selected ({tempSelectedUrls.length})</span>
              </button>
            </div>
          </div>
        </div>
      </ModalShell>
    </div>
  );
}
