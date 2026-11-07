import type {
  CatalogCategory,
  Product as DbProduct,
  ProductPlan as DbPlan,
} from '@prisma/client';
import type { Category, Plan, Product } from '@/lib/products';

type DbProductWithPlans = DbProduct & {
  plans: DbPlan[];
  catalogCategory?: CatalogCategory | null;
};

function parseStringArray(raw: string): string[] {
  try {
    const value = JSON.parse(raw) as unknown;
    return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

const CATEGORY_NAME_TO_CODE: Record<string, Category> = {
  'AI & LLM Tools': 'AI',
  'Streaming & OTT': 'STREAM',
  'Creative & Design': 'CREATE',
  'Developer & Cloud': 'WORK',
  'VPN & Security': 'WORK',
  'OS & Office Keys': 'WORK',
  AI: 'AI',
  STREAM: 'STREAM',
  WORK: 'WORK',
  CREATE: 'CREATE',
};

function resolveCategoryCode(product: DbProductWithPlans): Category {
  const fromRelation = product.catalogCategory?.code;
  if (
    fromRelation === 'AI' ||
    fromRelation === 'STREAM' ||
    fromRelation === 'WORK' ||
    fromRelation === 'CREATE'
  ) {
    return fromRelation;
  }
  if (product.category && CATEGORY_NAME_TO_CODE[product.category]) {
    return CATEGORY_NAME_TO_CODE[product.category];
  }
  return 'AI';
}

function mapPlan(plan: DbPlan): Plan {
  return {
    id: plan.code,
    label: plan.label,
    duration: plan.durationLabel,
    price: Number(plan.priceBdt),
    currency: 'BDT',
    warrantyBadge: plan.warrantyBadge ?? undefined,
    warrantyType:
      plan.warrantyType === 'warranty' || plan.warrantyType === 'login-only'
        ? plan.warrantyType
        : undefined,
    warrantyHeadline: plan.warrantyHeadline ?? undefined,
    details: parseStringArray(plan.detailsJson),
  };
}

/**
 * Storefront OOS is vault-driven, not product.status.
 * Manual-dispatch plans never count as vault-empty.
 */
export function mapDbProductToCatalog(
  product: DbProductWithPlans,
  availableVaultCount = 0,
): Product {
  const gallery = parseStringArray(product.galleryJson);
  const image = product.imageUrl || gallery[0] || '/products/chatgpt.jpg';
  const activePlans = product.plans.filter((plan) => plan.isActive);
  const hasManualPlan = activePlans.some(
    (p) => p.deliveryMode === 'manual_dispatch',
  );
  const needsVault = activePlans.some((p) => p.deliveryMode !== 'manual_dispatch');
  const outOfStock = needsVault && !hasManualPlan && availableVaultCount <= 0;

  return {
    id: product.slug,
    name: product.name,
    code: resolveCategoryCode(product),
    tagline: product.tagline,
    description: product.description,
    badge: product.badge ?? undefined,
    sale: product.sale || undefined,
    image,
    gallery: gallery.length > 0 ? gallery : [image],
    platform: product.platform,
    featured: product.featured || undefined,
    availability: outOfStock ? 'out_of_stock' : 'available',
    acceptOrdersWhenOutOfStock: Boolean(product.allowOrderWhenOutOfStock),
    availableFrom: product.availableFrom ? product.availableFrom.toISOString() : undefined,
    availableUntil: product.availableUntil ? product.availableUntil.toISOString() : undefined,
    features: parseStringArray(product.featuresJson),
    plans: activePlans.map(mapPlan),
  };
}
