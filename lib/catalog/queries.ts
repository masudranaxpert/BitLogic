import { cache } from 'react';
import { db } from '@/lib/db';
import type { Product } from '@/lib/products';
import { mapDbProductToCatalog } from '@/lib/catalog/map-from-db';

type VaultKey = { productId: string; variantId: string };

/** One scan of available vault rows — avoids N+1 count queries on catalog load. */
async function loadAvailableVaultKeys(): Promise<VaultKey[]> {
  return db.vaultCredential.findMany({
    where: { status: 'available' },
    select: { productId: true, variantId: true },
  });
}

function vaultAvailableCount(
  keys: VaultKey[],
  slug: string,
  id: string,
  planCodes: string[],
  planIds: string[],
): number {
  if (planCodes.length === 0 && planIds.length === 0) return 0;
  const planSet = new Set([...planCodes, ...planIds]);
  let n = 0;
  for (const k of keys) {
    if (k.productId !== slug && k.productId !== id) continue;
    if (!planSet.has(k.variantId)) continue;
    n += 1;
  }
  return n;
}

export async function listCatalogProducts(): Promise<Product[]> {
  const [rows, vaultKeys] = await Promise.all([
    db.product.findMany({
      where: { isActive: true, status: 'active' },
      include: {
        catalogCategory: true,
        plans: {
          where: { isActive: true },
          orderBy: { priceBdt: 'asc' },
        },
      },
      orderBy: [{ featured: 'desc' }, { name: 'asc' }],
    }),
    loadAvailableVaultKeys(),
  ]);

  return rows.map((row) =>
    mapDbProductToCatalog(
      row,
      vaultAvailableCount(
        vaultKeys,
        row.slug,
        row.id,
        row.plans.map((p) => p.code),
        row.plans.map((p) => p.id),
      ),
    ),
  );
}

export const getCatalogProductBySlug = cache(
  async (slug: string): Promise<Product | null> => {
    const row = await db.product.findFirst({
      where: { slug, isActive: true, status: 'active' },
      include: {
        catalogCategory: true,
        plans: {
          where: { isActive: true },
          orderBy: { priceBdt: 'asc' },
        },
      },
    });
    if (!row) return null;

    const planCodes = row.plans.map((p) => p.code);
    const planIds = row.plans.map((p) => p.id);
    const stock =
      planCodes.length === 0 && planIds.length === 0
        ? 0
        : await db.vaultCredential.count({
            where: {
              status: 'available',
              AND: [
                { OR: [{ productId: row.slug }, { productId: row.id }] },
                {
                  OR: [
                    ...(planCodes.length
                      ? [{ variantId: { in: planCodes } }]
                      : []),
                    ...(planIds.length
                      ? [{ variantId: { in: planIds } }]
                      : []),
                  ],
                },
              ],
            },
          });
    return mapDbProductToCatalog(row, stock);
  },
);
