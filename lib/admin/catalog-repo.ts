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
  const existing = await db.product.findUnique({
    where: { slug: product.id },
    select: { id: true },
  });

  if (existing) {
    await db.productPlan.deleteMany({ where: { productId: existing.id } });
    await db.product.update({
      where: { id: existing.id },
      data: {
        name: payload.name,
        description: payload.description,
        tagline: payload.tagline,
        category: payload.category,
        categoryId: payload.categoryId,
        platform: payload.platform,
        imageUrl: payload.imageUrl,
        galleryJson: payload.galleryJson,
        featuresJson: payload.featuresJson,
        isActive: payload.isActive,
        sku: payload.sku,
        status: payload.status,
        totalSales: payload.totalSales,
        monthlyRevenueBdt: payload.monthlyRevenueBdt,
        plans: { create: payload.plans },
      },
    });
    return;
  }

  await db.product.create({
    data: {
      slug: payload.slug,
      name: payload.name,
      description: payload.description,
      tagline: payload.tagline,
      category: payload.category,
      categoryId: payload.categoryId,
      platform: payload.platform,
      imageUrl: payload.imageUrl,
      galleryJson: payload.galleryJson,
      featuresJson: payload.featuresJson,
      isActive: payload.isActive,
      sku: payload.sku,
      status: payload.status,
      totalSales: payload.totalSales,
      monthlyRevenueBdt: payload.monthlyRevenueBdt,
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
