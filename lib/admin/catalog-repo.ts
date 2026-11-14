import { db } from '@/lib/db';
import { recordPriceChange } from '@/lib/suppliers/core';
import { normalizeDurationUnit } from '@/lib/warranty';
import type {
  CredentialScheme,
  DigitalProduct,
  ProductCategory,
  WarrantyPlan,
} from '@/lib/admin/types';
import {
  buildProductAuditEvents,
  planToggleAuditEvent,
  type ProductAuditEvent,
} from '@/lib/admin/catalog-audit';
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

export async function saveDigitalProduct(product: DigitalProduct, actor = '') {
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
    select: {
      id: true,
      name: true,
      description: true,
      tagline: true,
      category: true,
      imageUrl: true,
      status: true,
    },
  });

  if (existing) {
    const productFieldsChanged =
      existing.name !== payload.name ||
      existing.description !== payload.description ||
      existing.tagline !== payload.tagline ||
      existing.category !== payload.category ||
      existing.imageUrl !== payload.imageUrl ||
      existing.status !== payload.status;

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
      },
    });

    const incomingCodes = payload.plans.map((p) => p.code);
    // Current prices + on/off states, so changes can be audited accurately.
    const existingPlans = await db.productPlan.findMany({
      where: { productId: existing.id },
      select: { code: true, label: true, isActive: true, priceBdt: true, pricingMode: true },
    });
    const before = new Map(existingPlans.map((p) => [p.code, p]));

    for (const planData of payload.plans) {
      const prev = before.get(planData.code);
      const autoPriced = prev?.pricingMode === 'auto';
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
          // Auto-priced options follow the supplier; a stale form can't overwrite that price.
          ...(autoPriced ? {} : { priceBdt: planData.priceBdt }),
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
          renewable: planData.renewable,
          renewalPricing: planData.renewalPricing,
          allowBackorder: planData.allowBackorder,
          availableFrom: planData.availableFrom,
          availableUntil: planData.availableUntil,
        },
      });
      if (!autoPriced) {
        await recordPriceChange({
          productId: payload.slug,
          planCode: planData.code,
          planLabel: planData.label,
          oldValue: prev ? Number(prev.priceBdt) : '—',
          newValue: Number(planData.priceBdt),
          source: 'admin',
          actor,
          note: prev ? '' : 'Option created',
        });
      }
    }

    const removedPlans = await db.productPlan.findMany({
      where: {
        productId: existing.id,
        code: { notIn: incomingCodes },
      },
      select: { id: true, code: true, label: true, isActive: true, priceBdt: true },
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

    return buildProductAuditEvents({
      isNew: false,
      productName: payload.name,
      productSlug: payload.slug,
      beforePlans: existingPlans.map((p) => ({
        code: p.code,
        label: p.label,
        isActive: p.isActive,
        priceBdt: Number(p.priceBdt),
      })),
      afterPlans: payload.plans.map((p) => ({
        code: p.code,
        label: p.label,
        isActive: p.isActive,
        priceBdt: Number(p.priceBdt),
      })),
      removedPlans: removedPlans.map((p) => ({
        code: p.code,
        label: p.label,
        isActive: p.isActive,
        priceBdt: Number(p.priceBdt),
      })),
      productFieldsChanged,
    });
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
      plans: { create: payload.plans },
    },
  });
  for (const p of payload.plans) {
    await recordPriceChange({
      productId: payload.slug,
      planCode: p.code,
      planLabel: p.label,
      oldValue: '—',
      newValue: Number(p.priceBdt),
      source: 'admin',
      actor,
      note: 'Product created',
    });
  }
  return buildProductAuditEvents({
    isNew: true,
    productName: payload.name,
    productSlug: payload.slug,
    beforePlans: [],
    afterPlans: payload.plans.map((p) => ({
      code: p.code,
      label: p.label,
      isActive: p.isActive,
      priceBdt: Number(p.priceBdt),
    })),
    removedPlans: [],
  });
}

export async function toggleProductPlanActive(
  productIdOrSlug: string,
  planCode: string,
  isActive: boolean,
): Promise<ProductAuditEvent | null> {
  const product = await db.product.findFirst({
    where: { OR: [{ slug: productIdOrSlug }, { id: productIdOrSlug }] },
    select: { id: true, slug: true, name: true },
  });
  if (!product) return null;

  const plan = await db.productPlan.findUnique({
    where: { productId_code: { productId: product.id, code: planCode } },
    select: { id: true, label: true, isActive: true },
  });
  if (!plan) return null;

  if (plan.isActive !== isActive) {
    await db.productPlan.update({
      where: { id: plan.id },
      data: { isActive },
    });
  }

  return planToggleAuditEvent(product.name, product.slug, plan.label, isActive);
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
      const unit = normalizeDurationUnit(w.unit, w.days);
      await tx.warrantyTemplate.upsert({
        where: { id: w.id },
        create: {
          id: w.id,
          name: w.name,
          badge: w.badge,
          headline: w.headline,
          kind: w.kind,
          days: w.days,
          unit,
        },
        update: {
          name: w.name,
          badge: w.badge,
          headline: w.headline,
          kind: w.kind,
          days: w.days,
          unit,
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
