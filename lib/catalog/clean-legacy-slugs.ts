import { db } from '@/lib/db';
import { resolveNewProductSlug } from '@/lib/catalog/slug';

const MIGRATION_KEY = 'legacy_slugs_cleaned_v1';

/**
 * One-time idempotent migration that strips legacy `prod-` prefixes (and
 * timestamp IDs like `prod-1794...`) from existing Product slugs and updates
 * string references (`HomeBanner`, `VaultCredential`, `DigitalDelivery`,
 * `PriceHistory`). Guarded by `StoreSetting` so future slugs are untouched.
 */
export async function cleanLegacyProductSlugs(): Promise<boolean> {
  return db.$transaction(async (tx) => {
    const marker = await tx.storeSetting.findUnique({
      where: { key: MIGRATION_KEY },
      select: { value: true },
    });
    if (marker?.value === '1') return false;

    const allProducts = await tx.product.findMany({
      select: { id: true, slug: true, name: true },
      orderBy: { createdAt: 'asc' },
    });

    const taken = new Set(
      allProducts.filter((p) => !p.slug.startsWith('prod-')).map((p) => p.slug),
    );

    let changed = false;
    for (const p of allProducts) {
      if (!p.slug.startsWith('prod-')) continue;

      const base = resolveNewProductSlug(p.slug, p.name);
      let nextSlug = base;
      let suffix = 2;
      while (taken.has(nextSlug)) {
        nextSlug = `${base}-${suffix}`;
        suffix += 1;
      }
      taken.add(nextSlug);

      if (nextSlug === p.slug) continue;

      await tx.product.update({
        where: { id: p.id },
        data: { slug: nextSlug },
      });
      await tx.homeBanner.updateMany({
        where: { linkType: 'product', linkValue: p.slug },
        data: { linkValue: nextSlug },
      });
      await tx.vaultCredential.updateMany({
        where: { productId: p.slug },
        data: { productId: nextSlug },
      });
      await tx.digitalDelivery.updateMany({
        where: { productId: p.slug },
        data: { productId: nextSlug },
      });
      await tx.priceHistory.updateMany({
        where: { productId: p.slug },
        data: { productId: nextSlug },
      });
      changed = true;
    }

    await tx.storeSetting.upsert({
      where: { key: MIGRATION_KEY },
      create: { key: MIGRATION_KEY, value: '1' },
      update: { value: '1' },
    });

    return changed;
  });
}
