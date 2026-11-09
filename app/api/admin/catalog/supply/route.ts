import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-admin';
import { db } from '@/lib/db';
import { planSupplyMap } from '@/lib/suppliers/supply';

export const runtime = 'nodejs';

/**
 * Per-option stock for the admin product list, keyed "<productSlug>|<planCode>":
 * own vault count, overall sell status, and every linked supplier item (even if the option still sells own stock).
 */
export async function GET() {
  const { error } = await requirePermission('products');
  if (error) return error;
  const products = await db.product.findMany({
    include: {
      plans: {
        include: {
          supplierLinks: {
            orderBy: { priority: 'asc' },
            include: { supplierProduct: { include: { supplier: { select: { name: true, isEnabled: true, purchasingEnabled: true } } } } },
          },
        },
      },
    },
  });
  const supply = await planSupplyMap(products);
  const out: Record<string, unknown> = {};
  for (const p of products) {
    for (const pl of p.plans) {
      const s = supply.get(pl.id);
      if (!s) continue;
      out[`${p.slug}|${pl.code}`] = {
        ...s,
        sourcing: pl.sourcing,
        links: pl.supplierLinks.map((l) => ({
          supplierName: l.supplierProduct.supplier.name,
          name: [l.supplierProduct.name, l.supplierProduct.variantName].filter(Boolean).join(' · '),
          stock: l.supplierProduct.stock,
          status: l.supplierProduct.status,
          supplierOn: l.supplierProduct.supplier.isEnabled && l.supplierProduct.supplier.purchasingEnabled,
        })),
      };
    }
  }
  return NextResponse.json({ supply: out });
}
