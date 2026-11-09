import type {
  CatalogCategory,
  Product as DbProduct,
  ProductPlan as DbPlan,
} from '@prisma/client';
import type { Category, Plan, Product } from '@/lib/products';
import type { PlanSupply } from '@/lib/suppliers/supply';

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

function mapPlan(plan: DbPlan, supply?: PlanSupply): Plan {
  return {
    inStock: supply ? supply.inStock : true,
    canOrder: supply ? supply.canOrder : true,
    stockLeft: supply ? supply.stock : null,
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
    availableFrom: plan.availableFrom ? plan.availableFrom.toISOString() : undefined,
    availableUntil: plan.availableUntil ? plan.availableUntil.toISOString() : undefined,
  };
}

/**
 * Stock is per option (own vault + supplier, see lib/suppliers/supply.ts).
 * The product is out of stock only when no option is in stock.
 */
export function mapDbProductToCatalog(
  product: DbProductWithPlans,
  supply: Map<string, PlanSupply> = new Map(),
): Product {
  const gallery = parseStringArray(product.galleryJson);
  const image = product.imageUrl || gallery[0] || '/products/chatgpt.jpg';
  const activePlans = product.plans.filter((plan) => plan.isActive);
  const plans = activePlans.map((p) => mapPlan(p, supply.get(p.id)));
  const outOfStock = plans.length > 0 && plans.every((p) => p.inStock === false);
  const anyBackorder = plans.some((p) => p.canOrder && !p.inStock);

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
    acceptOrdersWhenOutOfStock: anyBackorder,
    features: parseStringArray(product.featuresJson),
    plans,
  };
}
