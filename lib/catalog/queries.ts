import { db } from '@/lib/db';
import type { Product } from '@/lib/products';
import { mapDbProductToCatalog } from '@/lib/catalog/map-from-db';

export async function listCatalogProducts(): Promise<Product[]> {
  const rows = await db.product.findMany({
    where: { isActive: true },
    include: {
      catalogCategory: true,
      plans: {
        where: { isActive: true },
        orderBy: { priceBdt: 'asc' },
      },
    },
    orderBy: [{ featured: 'desc' }, { name: 'asc' }],
  });

  return rows.map(mapDbProductToCatalog);
}

export async function getCatalogProductBySlug(
  slug: string,
): Promise<Product | null> {
  const row = await db.product.findFirst({
    where: { slug, isActive: true },
    include: {
      catalogCategory: true,
      plans: {
        where: { isActive: true },
        orderBy: { priceBdt: 'asc' },
      },
    },
  });

  return row ? mapDbProductToCatalog(row) : null;
}
