import { cache } from 'react';
import { db } from '@/lib/db';
import type { Product } from '@/lib/products';
import { mapDbProductToCatalog } from '@/lib/catalog/map-from-db';
import { planSupplyMap } from '@/lib/suppliers/supply';

import { cleanLegacyProductSlugs } from '@/lib/catalog/clean-legacy-slugs';

const include = {
  catalogCategory: true,
  plans: {
    where: { isActive: true },
    orderBy: { priceBdt: 'asc' as const },
  },
};

export const listCatalogProducts = cache(async (): Promise<Product[]> => {
  let rows = await db.product.findMany({
    where: { isActive: true, status: 'active' },
    include,
    orderBy: [{ featured: 'desc' }, { name: 'asc' }],
  });
  if (rows.some((r) => r.slug.startsWith('prod-'))) {
    const cleaned = await cleanLegacyProductSlugs().catch(() => false);
    if (cleaned) {
      rows = await db.product.findMany({
        where: { isActive: true, status: 'active' },
        include,
        orderBy: [{ featured: 'desc' }, { name: 'asc' }],
      });
    }
  }
  // One pass for own stock + supplier stock of every option (no per-product queries).
  const supply = await planSupplyMap(rows);
  return rows.map((row) => mapDbProductToCatalog(row, supply));
});

export const getCatalogProductBySlug = cache(
  async (slugOrId: string): Promise<Product | null> => {
    const cleanFallback = slugOrId.startsWith('prod-') ? slugOrId.slice(5) : null;
    const findRow = async () =>
      (await db.product.findFirst({
        where: {
          OR: [{ slug: slugOrId }, { id: slugOrId }],
          isActive: true,
          status: 'active',
        },
        include,
      })) ??
      (cleanFallback
        ? await db.product.findFirst({
            where: {
              slug: cleanFallback,
              isActive: true,
              status: 'active',
            },
            include,
          })
        : null);

    let row = await findRow();
    if (!row && (await cleanLegacyProductSlugs().catch(() => false))) {
      row = await findRow();
    }
    if (!row) return null;
    return mapDbProductToCatalog(row, await planSupplyMap([row]));
  },
);
