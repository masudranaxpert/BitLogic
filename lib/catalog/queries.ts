import { cache } from 'react';
import { db } from '@/lib/db';
import type { Product } from '@/lib/products';
import { mapDbProductToCatalog } from '@/lib/catalog/map-from-db';
import { planSupplyMap } from '@/lib/suppliers/supply';

const include = {
  catalogCategory: true,
  plans: {
    where: { isActive: true },
    orderBy: { priceBdt: 'asc' as const },
  },
};

export async function listCatalogProducts(): Promise<Product[]> {
  const rows = await db.product.findMany({
    where: { isActive: true, status: 'active' },
    include,
    orderBy: [{ featured: 'desc' }, { name: 'asc' }],
  });
  // One pass for own stock + supplier stock of every option (no per-product queries).
  const supply = await planSupplyMap(rows);
  return rows.map((row) => mapDbProductToCatalog(row, supply));
}

export const getCatalogProductBySlug = cache(
  async (slug: string): Promise<Product | null> => {
    const row = await db.product.findFirst({
      where: { slug, isActive: true, status: 'active' },
      include,
    });
    if (!row) return null;
    return mapDbProductToCatalog(row, await planSupplyMap([row]));
  },
);
