import type {
  CredentialScheme as DbScheme,
  CatalogCategory as DbCategory,
  Product as DbProduct,
  ProductPlan as DbPlan,
  WarrantyTemplate as DbWarranty,
} from '@prisma/client';
import type {
  CredentialFieldDef,
  CredentialScheme,
  CredentialType,
  DeliveryMode,
  DigitalProduct,
  ProductCategory,
  ProductSpecification,
  ProductVariant,
  StockDisplayMode,
  WarrantyPlan,
} from '@/lib/admin/types';

type DbProductWithPlans = DbProduct & { plans: DbPlan[] };

function parseJsonArray<T>(raw: string, fallback: T[]): T[] {
  try {
    const value = JSON.parse(raw) as unknown;
    return Array.isArray(value) ? (value as T[]) : fallback;
  } catch {
    return fallback;
  }
}

export function mapDbCategory(row: DbCategory): ProductCategory {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.createdAt.toISOString().slice(0, 10),
  };
}

export function mapDbWarranty(row: DbWarranty): WarrantyPlan {
  return {
    id: row.id,
    name: row.name,
    badge: row.badge,
    headline: row.headline,
    kind: row.kind === 'login-only' ? 'login-only' : 'warranty',
    days: row.days,
  };
}

export function mapDbCredentialScheme(row: DbScheme): CredentialScheme {
  return {
    id: row.id,
    name: row.name,
    fields: parseJsonArray<CredentialFieldDef>(row.fieldsJson, []),
  };
}

function mapDbPlan(plan: DbPlan, productId: string): ProductVariant {
  const credentialType = (plan.credentialType || 'email_login') as CredentialType;
  return {
    id: plan.code,
    planDbId: plan.id,
    sourcing: plan.sourcing,
    pricingMode: plan.pricingMode,
    productId,
    name: plan.label,
    isDefault: plan.isDefault || undefined,
    durationDays: plan.durationDays,
    durationLabel: plan.durationLabel,
    priceBDT: Number(plan.priceBdt),
    priceUSD: Number((Number(plan.priceBdt) / 115).toFixed(2)),
    credentialSchemeId: plan.credentialSchemeId || undefined,
    credentialType,
    deliveryMode: (plan.deliveryMode || 'auto_vault') as DeliveryMode,
    stockDisplayMode: (plan.stockDisplayMode || 'exact_count') as StockDisplayMode,
    vpnRequired: plan.vpnRequired,
    vpnRegionNote: plan.vpnRegionNote || '',
    hasWarranty: plan.hasWarranty,
    warrantyDays: plan.warrantyDays,
    warrantyTerms: plan.warrantyHeadline || plan.warrantyBadge || '',
    deviceLimit: plan.deviceLimit || '',
    loginInstructions: parseJsonArray<string>(plan.detailsJson, []),
    importantNote: plan.importantNote || plan.warrantyBadge || '',
    warningNote: plan.warningNote || undefined,
    optionDescription: plan.optionDescription || undefined,
    renewable: plan.renewable,
    renewalPricing: plan.renewalPricing === 'locked' ? 'locked' : 'current',
    allowOrderWhenOutOfStock: plan.allowBackorder === true,
    availableFrom: plan.availableFrom ? plan.availableFrom.toISOString() : undefined,
    availableUntil: plan.availableUntil ? plan.availableUntil.toISOString() : undefined,
    specifications: parseJsonArray<ProductSpecification>(
      plan.specificationsJson,
      [],
    ),
  };
}

/** Visibility only: listed vs hidden. Legacy out_of_stock → active; suspended → draft. */
function normalizeAvailabilityStatus(
  raw: string | null | undefined,
): 'active' | 'draft' {
  if (raw === 'draft' || raw === 'suspended') return 'draft';
  return 'active';
}

/** ISO string → Date, or null when empty/invalid (clears the column). */
function toDate(iso?: string | null): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function mapDbProduct(row: DbProductWithPlans): DigitalProduct {
  const status = normalizeAvailabilityStatus(row.status);
  const gallery = parseJsonArray<string>(row.galleryJson, []);
  return {
    id: row.slug,
    name: row.name,
    category: row.category,
    categoryId: row.categoryId || undefined,
    sku: row.sku || '',
    imageUrl: row.imageUrl || gallery[0] || undefined,
    galleryUrls: gallery.length ? gallery : undefined,
    status,
    shortDescription: row.tagline || '',
    description: row.description || undefined,
    descriptionMode: 'global',
    variants: row.plans.map((p) => mapDbPlan(p, row.slug)),
  };
}

export function digitalProductToDbPayload(product: DigitalProduct) {
  const status = normalizeAvailabilityStatus(product.status);
  const gallery = product.galleryUrls?.length
    ? product.galleryUrls
    : product.imageUrl
      ? [product.imageUrl]
      : [];

  return {
    slug: product.id || (product as { slug?: string }).slug || '',
    name: product.name,
    description: product.description || '',
    tagline: product.shortDescription || '',
    category: product.category,
    categoryId: product.categoryId || null,
    platform: product.shortDescription || '',
    imageUrl: product.imageUrl || gallery[0] || null,
    galleryJson: JSON.stringify(gallery),
    featuresJson: '[]',
    isActive: status === 'active',
    sku: product.sku || '',
    status,
    plans: ((product.variants || (product as { plans?: any[] }).plans || []) as any[]).map((v, index) => ({
      code: v.id || v.code,
      label: v.name || v.label,
      durationLabel: v.durationLabel,
      durationDays: v.durationDays,
      priceBdt: v.priceBDT ?? v.priceBdt ?? 0,
      warrantyBadge: v.importantNote || v.warrantyBadge || null,
      warrantyType: v.hasWarranty ? 'warranty' : (v.warrantyType || 'login-only'),
      warrantyHeadline: v.warrantyTerms || v.warrantyHeadline || null,
      detailsJson: typeof v.loginInstructions === 'string'
        ? v.loginInstructions
        : JSON.stringify(v.loginInstructions || []),
      isActive: v.isActive !== false,
      isDefault: Boolean(v.isDefault) || index === 0,
      credentialSchemeId: v.credentialSchemeId || null,
      credentialType: v.credentialType || 'email_login',
      deliveryMode: v.deliveryMode || 'auto_vault',
      stockDisplayMode: v.stockDisplayMode || 'exact_count',
      vpnRequired: Boolean(v.vpnRequired),
      vpnRegionNote: v.vpnRegionNote || '',
      hasWarranty: Boolean(v.hasWarranty),
      warrantyDays: v.warrantyDays || 0,
      deviceLimit: v.deviceLimit || '',
      importantNote: v.importantNote || '',
      warningNote: v.warningNote || '',
      optionDescription: v.optionDescription || '',
      sourcing: v.sourcing || 'own',
      pricingMode: v.pricingMode || 'fixed',
      renewable: v.renewable !== false,
      renewalPricing: v.renewalPricing === 'locked' ? 'locked' : 'current',
      allowBackorder: Boolean(v.allowOrderWhenOutOfStock),
      availableFrom: toDate(v.availableFrom),
      availableUntil: toDate(v.availableUntil),
      specificationsJson: typeof v.specifications === 'string'
        ? v.specifications
        : JSON.stringify(v.specifications || []),
    })),
  };
}
