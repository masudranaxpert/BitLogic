export type Category = 'AI' | 'STREAM' | 'WORK' | 'CREATE';

export type Plan = {
  id: string;
  label: string;
  duration: string;
  price: number;
  currency: string;
  warrantyBadge?: string;
  warrantyType?: 'warranty' | 'login-only';
  warrantyHeadline?: string;
  details?: string[];
};

export type Product = {
  id: string;
  name: string;
  code: Category;
  tagline: string;
  description: string;
  badge?: string;
  sale?: boolean;
  image: string;
  gallery: string[];
  platform: string;
  plans: Plan[];
  features: string[];
  featured?: boolean;
  /**
   * Derived from vault credentials (not product status).
   * With acceptOrdersWhenOutOfStock, checkout still works → pending assign.
   */
  availability?: 'available' | 'out_of_stock';
  /** Vault empty but still accept purchase / renew (pending assign). */
  acceptOrdersWhenOutOfStock?: boolean;
  /** Order window (ISO, UTC). See lib/catalog/schedule.ts. */
  availableFrom?: string;
  availableUntil?: string;
};

/** Storefront catalog comes from Prisma — no static mock products. */
export const products: Product[] = [];

/** Hero carousel; empty until CMS/DB drives slides. */
export const heroSlides: Array<{
  id: string;
  productId: string;
  title: string;
  image: string;
}> = [];

export function getProduct(id: string, catalog: Product[] = products) {
  return catalog.find((p) => p.id === id);
}

export function formatPrice(amount: number, _currency = 'BDT') {
  void _currency;
  return `৳${amount.toLocaleString('en-BD')}`;
}

export function priceRange(product: Product) {
  if (!product.plans.length) return formatPrice(0);
  const amounts = product.plans.map((p) => p.price);
  const min = Math.min(...amounts);
  const max = Math.max(...amounts);
  if (min === max) return formatPrice(min);
  return `${formatPrice(min)} – ${formatPrice(max)}`;
}

export function startingPrice(product: Product) {
  if (!product.plans.length) return `${formatPrice(0)} থেকে শুরু`;
  const min = Math.min(...product.plans.map((p) => p.price));
  return `${formatPrice(min)} থেকে শুরু`;
}

export function startingAmount(product: Product) {
  if (!product.plans.length) return '0';
  return Math.min(...product.plans.map((p) => p.price)).toLocaleString('en-BD');
}
