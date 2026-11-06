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
    specifications: parseJsonArray<ProductSpecification>(
      plan.specificationsJson,
      [],
    ),
  };
}

export function mapDbProduct(row: DbProductWithPlans): DigitalProduct {
  const status =
    row.status === 'draft' || row.status === 'out_of_stock'
      ? row.status
      : 'active';
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
    totalSales: row.totalSales,
    monthlyRevenueBDT: row.monthlyRevenueBdt,
    variants: row.plans.map((p) => mapDbPlan(p, row.slug)),
  };
}

export function digitalProductToDbPayload(product: DigitalProduct) {
  const status =
    product.status === 'draft' || product.status === 'out_of_stock'
      ? product.status
      : 'active';
  const gallery = product.galleryUrls?.length
    ? product.galleryUrls
    : product.imageUrl
      ? [product.imageUrl]
      : [];

  return {
    slug: product.id,
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
    totalSales: product.totalSales || 0,
    monthlyRevenueBdt: product.monthlyRevenueBDT || 0,
    plans: product.variants.map((v, index) => ({
      code: v.id,
      label: v.name,
      durationLabel: v.durationLabel,
      durationDays: v.durationDays,
      priceBdt: v.priceBDT,
      warrantyBadge: v.importantNote || null,
      warrantyType: v.hasWarranty ? 'warranty' : 'login-only',
      warrantyHeadline: v.warrantyTerms || null,
      detailsJson: JSON.stringify(v.loginInstructions || []),
      isActive: true,
      isDefault: Boolean(v.isDefault) || index === 0,
      credentialSchemeId: v.credentialSchemeId || null,
      credentialType: v.credentialType,
      deliveryMode: v.deliveryMode,
      stockDisplayMode: v.stockDisplayMode,
      vpnRequired: v.vpnRequired,
      vpnRegionNote: v.vpnRegionNote || '',
      hasWarranty: v.hasWarranty,
      warrantyDays: v.warrantyDays,
      deviceLimit: v.deviceLimit || '',
      importantNote: v.importantNote || '',
      warningNote: v.warningNote || '',
      optionDescription: v.optionDescription || '',
      specificationsJson: JSON.stringify(v.specifications || []),
    })),
  };
}
