import type { Product as DbProduct, ProductPlan as DbPlan } from '@prisma/client';
import type { Category, Plan, Product } from '@/lib/products';

type DbProductWithPlans = DbProduct & { plans: DbPlan[] };

function parseStringArray(raw: string): string[] {
  try {
    const value = JSON.parse(raw) as unknown;
    return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];
  } catch {
    return [];
  }
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
    code: product.category as Category,
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
