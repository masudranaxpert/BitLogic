import { db } from '@/lib/db';
import type {
  CredentialScheme,
  DigitalProduct,
  ProductCategory,
  WarrantyPlan,
} from '@/lib/admin/types';
import {
  digitalProductToDbPayload,
  mapDbCategory,
  mapDbCredentialScheme,
  mapDbProduct,
  mapDbWarranty,
} from '@/lib/admin/catalog-map';

const categoryCodeByName: Record<string, string> = {
  'AI & LLM Tools': 'AI',
  'Streaming & OTT': 'STREAM',
  'Creative & Design': 'CREATE',
  'Developer & Cloud': 'WORK',
  'VPN & Security': 'WORK',
  'OS & Office Keys': 'WORK',
};

export async function loadAdminCatalog() {
  const [products, categories, warranties, schemes] = await Promise.all([
    db.product.findMany({
      include: { plans: { orderBy: { priceBdt: 'asc' } } },
      orderBy: { name: 'asc' },
    }),
    db.catalogCategory.findMany({ orderBy: { name: 'asc' } }),
    db.warrantyTemplate.findMany({ orderBy: { name: 'asc' } }),
    db.credentialScheme.findMany({ orderBy: { name: 'asc' } }),
  ]);

  return {
    products: products.map(mapDbProduct),
    productCategories: categories.map(mapDbCategory),
    warranties: warranties.map(mapDbWarranty),
    credentialSchemes: schemes.map(mapDbCredentialScheme),
  };
}

export async function saveDigitalProduct(product: DigitalProduct) {
  const payload = digitalProductToDbPayload(product);

  let categoryId = payload.categoryId;
  if (!categoryId && payload.category) {
    const matchedCategory = await db.catalogCategory.findFirst({
      where: {
        OR: [
          { name: payload.category },
          { id: payload.category },
          { code: payload.category },
        ],
      },
      select: { id: true },
    });
    if (matchedCategory) {
      categoryId = matchedCategory.id;
    }
  }

  const lookupSlug = product.id || (product as { slug?: string }).slug;
  const lookupId = (product as { id?: string }).id;

  const existing = await db.product.findFirst({
    where: {
      OR: [
        ...(lookupSlug ? [{ slug: lookupSlug }] : []),
        ...(lookupId ? [{ id: lookupId }] : []),
      ],
    },
    select: { id: true },
  });

  if (existing) {
    await db.product.update({
      where: { id: existing.id },
      data: {
        name: payload.name,
        description: payload.description,
        tagline: payload.tagline,
        category: payload.category,
        categoryId,
        platform: payload.platform,
        imageUrl: payload.imageUrl,
        galleryJson: payload.galleryJson,
        featuresJson: payload.featuresJson,
        isActive: payload.isActive,
        sku: payload.sku,
        status: payload.status,
        renewable: payload.renewable,
        allowOrderWhenOutOfStock: payload.allowOrderWhenOutOfStock,
        availableFrom: payload.availableFrom,
        availableUntil: payload.availableUntil,
      },
    });

    const incomingCodes = payload.plans.map((p) => p.code);

    for (const planData of payload.plans) {
      await db.productPlan.upsert({
        where: {
          productId_code: {
            productId: existing.id,
            code: planData.code,
          },
        },
        create: {
          productId: existing.id,
          ...planData,
        },
        update: {
          label: planData.label,
          durationLabel: planData.durationLabel,
          durationDays: planData.durationDays,
          priceBdt: planData.priceBdt,
          warrantyBadge: planData.warrantyBadge,
          warrantyType: planData.warrantyType,
          warrantyHeadline: planData.warrantyHeadline,
          detailsJson: planData.detailsJson,
          isActive: planData.isActive,
          isDefault: planData.isDefault,
          credentialSchemeId: planData.credentialSchemeId,
          credentialType: planData.credentialType,
          deliveryMode: planData.deliveryMode,
          stockDisplayMode: planData.stockDisplayMode,
          vpnRequired: planData.vpnRequired,
          vpnRegionNote: planData.vpnRegionNote,
          hasWarranty: planData.hasWarranty,
          warrantyDays: planData.warrantyDays,
          deviceLimit: planData.deviceLimit,
          importantNote: planData.importantNote,
          warningNote: planData.warningNote,
          optionDescription: planData.optionDescription,
          specificationsJson: planData.specificationsJson,
        },
      });
    }

    const removedPlans = await db.productPlan.findMany({
      where: {
        productId: existing.id,
        code: { notIn: incomingCodes },
      },
    });

    for (const rp of removedPlans) {
      try {
        await db.productPlan.delete({ where: { id: rp.id } });
      } catch {
        await db.productPlan.update({
          where: { id: rp.id },
          data: { isActive: false },
        });
      }
    }
    return;
  }

  await db.product.create({
    data: {
      slug: payload.slug,
      name: payload.name,
      description: payload.description,
      tagline: payload.tagline,
      category: payload.category,
      categoryId,
      platform: payload.platform,
      imageUrl: payload.imageUrl,
      galleryJson: payload.galleryJson,
      featuresJson: payload.featuresJson,
      isActive: payload.isActive,
      sku: payload.sku,
      status: payload.status,
      renewable: payload.renewable,
      allowOrderWhenOutOfStock: payload.allowOrderWhenOutOfStock,
      availableFrom: payload.availableFrom,
      availableUntil: payload.availableUntil,
      plans: { create: payload.plans },
    },
  });
}

export async function replaceCategories(categories: ProductCategory[]) {
  await db.$transaction(async (tx) => {
    const keepIds = categories.map((c) => c.id);
    await tx.product.updateMany({
      where: { categoryId: { notIn: keepIds } },
      data: { categoryId: null },
    });
    await tx.catalogCategory.deleteMany({
      where: { id: { notIn: keepIds } },
    });
    for (const c of categories) {
      const createdAt = c.createdAt
        ? new Date(`${c.createdAt}T00:00:00.000Z`)
        : new Date();
      await tx.catalogCategory.upsert({
        where: { id: c.id },
        create: {
          id: c.id,
          name: c.name,
          code: categoryCodeByName[c.name] || 'AI',
          createdAt,
        },
        update: {
          name: c.name,
          code: categoryCodeByName[c.name] || 'AI',
        },
      });
    }
  });
}

export async function replaceWarranties(warranties: WarrantyPlan[]) {
  await db.$transaction(async (tx) => {
    const keepIds = warranties.map((w) => w.id);
    await tx.warrantyTemplate.deleteMany({
      where: { id: { notIn: keepIds } },
    });
    for (const w of warranties) {
      await tx.warrantyTemplate.upsert({
        where: { id: w.id },
        create: {
          id: w.id,
          name: w.name,
          badge: w.badge,
          headline: w.headline,
          kind: w.kind,
          days: w.days,
        },
        update: {
          name: w.name,
          badge: w.badge,
          headline: w.headline,
          kind: w.kind,
          days: w.days,
        },
      });
    }
  });
}

export async function replaceCredentialSchemes(schemes: CredentialScheme[]) {
  await db.$transaction(async (tx) => {
    const keepIds = schemes.map((s) => s.id);
    await tx.credentialScheme.deleteMany({
      where: { id: { notIn: keepIds } },
    });
    for (const s of schemes) {
      await tx.credentialScheme.upsert({
        where: { id: s.id },
        create: {
          id: s.id,
          name: s.name,
          fieldsJson: JSON.stringify(s.fields),
        },
        update: {
          name: s.name,
          fieldsJson: JSON.stringify(s.fields),
        },
      });
    }
  });
}
