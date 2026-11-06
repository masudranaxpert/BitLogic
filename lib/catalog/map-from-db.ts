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
  if (
    product.category === 'AI' ||
    product.category === 'STREAM' ||
    product.category === 'WORK' ||
    product.category === 'CREATE'
  ) {
    return product.category;
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

export function mapDbProductToCatalog(product: DbProductWithPlans): Product {
  const gallery = parseStringArray(product.galleryJson);
  const image = product.imageUrl || gallery[0] || '/products/chatgpt.jpg';

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
    features: parseStringArray(product.featuresJson),
    plans: product.plans
      .filter((plan) => plan.isActive)
      .map(mapPlan),
  };
}
