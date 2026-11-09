import { db } from '@/lib/db';
import { encryptSecret } from '@/lib/crypto/secrets';
import { getStoreSettings, saveStoreSettings } from '@/lib/store-settings';
import { getRates, keyHint, loadSupplier, recordPriceChange } from './core';
import { scrub } from './http';
import { autoPrice, costInBdt, margin, type RateMap } from './pricing';
import { getAdapter, SUPPLIER_KINDS } from './registry';
import { repricePlans, syncSupplier, evaluatePlan } from './sync';
import { planSupplyMap } from './supply';
import { SupplierApiError } from './types';

/** View models for the Suppliers admin pages. Nothing here ever returns an API key. */

export class SupplierInputError extends Error {}

function publicSupplier(s: Awaited<ReturnType<typeof db.supplier.findFirstOrThrow>>) {
  return {
    id: s.id,
    name: s.name,
    kind: s.kind,
    baseUrl: s.baseUrl,
    apiKeyHint: s.apiKeyHint,
    currency: s.currency,
    isEnabled: s.isEnabled,
    purchasingEnabled: s.purchasingEnabled,
    syncIntervalMin: s.syncIntervalMin,
    lowBalanceAlert: s.lowBalanceAlert,
    lastSyncAt: s.lastSyncAt?.toISOString() || null,
    lastSyncStatus: s.lastSyncStatus,
    lastSyncError: s.lastSyncError,
    balance: s.balance,
    balanceAt: s.balanceAt?.toISOString() || null,
    webhookConnected: Boolean(s.webhookSecretEnc),
    webhookUrl: s.webhookUrl,
  };
}

export async function supplierOverview() {
  const [suppliers, counts, linkCounts, orderStats, rates, settings] = await Promise.all([
    db.supplier.findMany({ orderBy: { createdAt: 'asc' } }),
    db.supplierProduct.groupBy({ by: ['supplierId', 'status'], _count: { _all: true } }),
    db.planSupplierLink.findMany({ select: { supplierProduct: { select: { supplierId: true } } } }),
    db.supplierOrder.groupBy({ by: ['supplierId', 'status'], _count: { _all: true } }),
    getRates(),
    getStoreSettings(),
  ]);
  return {
    kinds: SUPPLIER_KINDS,
    rates,
    rules: {
      supplierAutoDispatch: settings.supplierAutoDispatch,
      supplierPriceGuardPct: settings.supplierPriceGuardPct,
      supplierStopOnLoss: settings.supplierStopOnLoss,
      supplierMaxLossPct: settings.supplierMaxLossPct,
    },
    suppliers: suppliers.map((s) => {
      const c = (status: string) => counts.find((x) => x.supplierId === s.id && x.status === status)?._count._all || 0;
      const o = (status: string) => orderStats.find((x) => x.supplierId === s.id && x.status === status)?._count._all || 0;
      return {
        ...publicSupplier(s),
        items: { available: c('available'), outOfStock: c('out_of_stock'), removed: c('removed') },
        linkedOptions: linkCounts.filter((l) => l.supplierProduct.supplierId === s.id).length,
        orders: { delivered: o('delivered'), processing: o('processing'), failed: o('failed'), review: o('needs_review') },
      };
    }),
  };
}

function cleanBaseUrl(raw: string, fallback: string) {
  const url = (raw || fallback).trim().replace(/\/+$/, '');
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    throw new SupplierInputError('Base URL is not valid.');
  }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname);
  // Plain http only for a local test server (dev, or SUPPLIER_ALLOW_LOCAL_HTTP=1 in automated tests).
  const allowLocal = process.env.NODE_ENV !== 'production' || process.env.SUPPLIER_ALLOW_LOCAL_HTTP === '1';
  if (u.protocol !== 'https:' && !(local && allowLocal)) {
    throw new SupplierInputError('Base URL must use https.');
  }
  return url;
}

/** Adds a supplier after proving the key works (balance call). */
export async function createSupplier(input: { kind?: string; name?: string; apiKey?: string; baseUrl?: string }) {
  const adapter = getAdapter(String(input.kind || ''));
  if (!adapter) throw new SupplierInputError('Choose a supplier type.');
  const apiKey = String(input.apiKey || '').trim();
  if (apiKey.length < 12) throw new SupplierInputError('Paste the full API key.');
  const baseUrl = cleanBaseUrl(String(input.baseUrl || ''), adapter.defaultBaseUrl);
  let account;
  try {
    account = await adapter.account({ baseUrl, apiKey });
  } catch (e) {
    const code = e instanceof SupplierApiError ? e.code : 'ERROR';
    throw new SupplierInputError(
      code === 'AUTH' ? 'The supplier rejected this API key.' : `Could not connect: ${scrub(e instanceof Error ? e.message : String(e), apiKey)}`,
    );
  }
  const row = await db.supplier.create({
    data: {
      name: String(input.name || adapter.label).trim().slice(0, 80) || adapter.label,
      kind: adapter.kind,
      baseUrl,
      apiKeyEnc: encryptSecret(apiKey),
      apiKeyHint: keyHint(apiKey),
      currency: account.currency || adapter.currency,
      balance: account.balance,
      balanceAt: new Date(),
      lastSyncStatus: '',
    },
  });
  // First catalog read in the background; the page polls the status.
  void syncSupplier(row.id).catch(() => {});
  return publicSupplier(row);
}

export async function updateSupplier(
  id: string,
  input: Partial<{
    name: string;
    apiKey: string;
    baseUrl: string;
    isEnabled: boolean;
    purchasingEnabled: boolean;
    syncIntervalMin: number;
    lowBalanceAlert: number;
  }>,
) {
  const cur = await db.supplier.findUniqueOrThrow({ where: { id } });
  const adapter = getAdapter(cur.kind);
  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = String(input.name).trim().slice(0, 80) || cur.name;
  if (input.baseUrl !== undefined) data.baseUrl = cleanBaseUrl(String(input.baseUrl), adapter?.defaultBaseUrl || cur.baseUrl);
  if (input.isEnabled !== undefined) data.isEnabled = Boolean(input.isEnabled);
  if (input.purchasingEnabled !== undefined) data.purchasingEnabled = Boolean(input.purchasingEnabled);
  if (input.syncIntervalMin !== undefined) data.syncIntervalMin = Math.min(1440, Math.max(5, Math.round(Number(input.syncIntervalMin) || 15)));
  if (input.lowBalanceAlert !== undefined) data.lowBalanceAlert = Math.max(0, Number(input.lowBalanceAlert) || 0);
  if (input.apiKey) {
    const apiKey = String(input.apiKey).trim();
    try {
      await adapter!.account({ baseUrl: String(data.baseUrl || cur.baseUrl), apiKey });
    } catch (e) {
      const code = e instanceof SupplierApiError ? e.code : 'ERROR';
      throw new SupplierInputError(code === 'AUTH' ? 'The supplier rejected this API key.' : 'Could not verify the new key.');
    }
    data.apiKeyEnc = encryptSecret(apiKey);
    data.apiKeyHint = keyHint(apiKey);
    data.lastSyncError = '';
    data.lastSyncStatus = '';
  }
  const row = await db.supplier.update({ where: { id }, data });
  // Turning a supplier on/off changes what can be sold.
  if (input.isEnabled !== undefined || input.purchasingEnabled !== undefined) await repricePlans({ supplierId: id });
  return publicSupplier(row);
}

export async function deleteSupplier(id: string) {
  const busy = await db.supplierOrder.count({ where: { supplierId: id, status: { in: ['queued', 'processing'] } } });
  if (busy > 0) throw new SupplierInputError(`${busy} purchase(s) are still in progress. Wait for them to finish.`);
  const history = await db.supplierOrder.count({ where: { supplierId: id } });
  if (history > 0) {
    // Keep purchase history: disable instead of deleting.
    await db.supplier.update({ where: { id }, data: { isEnabled: false, purchasingEnabled: false } });
    await db.planSupplierLink.deleteMany({ where: { supplierProduct: { supplierId: id } } });
    return { deleted: false, disabled: true };
  }
  await db.supplier.delete({ where: { id } });
  return { deleted: true, disabled: false };
}

/** Registers our webhook URL with the supplier (needs a public https APP_URL). */
export async function connectWebhook(id: string, appUrl: string) {
  const { row, adapter, ctx } = await loadSupplier(id);
  if (!adapter.setWebhook) throw new SupplierInputError(`${adapter.label} has no webhooks; polling is used.`);
  const base = (appUrl || '').replace(/\/+$/, '');
  if (!/^https:\/\//.test(base) || /localhost|127\.0\.0\.1/.test(base)) {
    throw new SupplierInputError('Webhooks need a public https site address (set APP_URL). Polling keeps working meanwhile.');
  }
  const url = `${base}/api/webhooks/suppliers/${row.id}`;
  try {
    const { secret } = await adapter.setWebhook(ctx, url);
    await db.supplier.update({ where: { id }, data: { webhookSecretEnc: encryptSecret(secret), webhookUrl: url } });
    return { url };
  } catch (e) {
    throw new SupplierInputError(scrub(e instanceof Error ? e.message : String(e), ctx.apiKey));
  }
}

/** Supplier catalog with taka cost and which of our options use each item. */
export async function supplierCatalog(filter: { id?: string; supplierId?: string; q?: string; status?: string; linked?: string }) {
  const rates = await getRates();
  const rows = await db.supplierProduct.findMany({
    where: {
      ...(filter.id ? { id: filter.id } : {}),
      ...(filter.supplierId ? { supplierId: filter.supplierId } : {}),
      ...(filter.status ? { status: filter.status } : filter.id ? {} : { status: { not: 'removed' } }),
      ...(filter.linked === 'yes' ? { links: { some: {} } } : filter.linked === 'no' ? { links: { none: {} } } : {}),
    },
    include: {
      supplier: { select: { name: true, kind: true } },
      links: { include: { plan: { select: { id: true, label: true, code: true, product: { select: { name: true, slug: true } } } } } },
    },
    orderBy: [{ name: 'asc' }],
    take: 2000,
  });
  const q = (filter.q || '').toLowerCase().trim();
  return rows
    .map((r) => {
      const cost = costInBdt(r.price, r.currency, rates);
      return { r, cost };
    })
    .filter(({ r, cost }) => {
      if (!q) return true;
      const priceStr = String(r.price ?? '').toLowerCase();
      const costStr = cost !== null && cost !== undefined ? String(cost).toLowerCase() : '';
      const formattedCost = cost !== null && cost !== undefined ? cost.toFixed(2) : '';
      const searchTarget = `${r.name} ${r.variantName || ''} ${r.category || ''} ${r.supplier.name} ${r.currency || ''} ${priceStr} ${costStr} ${formattedCost} ৳${costStr}`.toLowerCase();
      return searchTarget.includes(q);
    })
    .map(({ r, cost }) => ({
      id: r.id,
      supplierId: r.supplierId,
      supplierName: r.supplier.name,
      name: r.name,
      variantName: r.variantName,
      category: r.category,
      period: r.period,
      price: r.price,
      previousPrice: r.previousPrice,
      priceChangedAt: r.priceChangedAt?.toISOString() || null,
      currency: r.currency,
      costBdt: cost,
      stock: r.stock,
      status: r.status,
      minQty: r.minQty,
      maxQty: r.maxQty,
      deliveryType: r.deliveryType,
      needsBuyerInput: r.needsBuyerInput,
      description: r.description,
      links: r.links.map((l) => ({ planId: l.plan.id, label: `${l.plan.product.name} · ${l.plan.label}`, productId: l.plan.product.slug })),
    }));
}

/** Every option of every product with its sourcing, links, cost, margin and alerts. */
export async function linkedOptions(opts: { productId?: string } = {}) {
  // A link on "your credentials" was ignored. Use the supplier once those credentials run out.
  await db.productPlan.updateMany({
    where: { sourcing: 'own', supplierLinks: { some: {} } },
    data: { sourcing: 'own_then_supplier' },
  });
  const [rates, products] = await Promise.all([
    getRates(),
    db.product.findMany({
      where: opts.productId ? { OR: [{ slug: opts.productId }, { id: opts.productId }] } : {},
      orderBy: { name: 'asc' },
      include: {
        plans: {
          orderBy: { priceBdt: 'asc' },
          include: {
            supplierLinks: {
              orderBy: { priority: 'asc' },
              include: { supplierProduct: { include: { supplier: { select: { name: true, isEnabled: true, purchasingEnabled: true } } } } },
            },
          },
        },
      },
    }),
  ]);
  const supply = await planSupplyMap(products);
  return products.map((p) => ({
    productId: p.slug,
    productName: p.name,
    plans: p.plans.map((pl) => planView(pl, rates, supply.get(pl.id))),
  }));
}

type PlanRow = Awaited<ReturnType<typeof db.productPlan.findFirstOrThrow>> & {
  supplierLinks: Array<{
    id: string;
    priority: number;
    isActive: boolean;
    supplierProduct: {
      id: string;
      name: string;
      variantName: string;
      price: string;
      previousPrice: string;
      currency: string;
      stock: number | null;
      status: string;
      needsBuyerInput: boolean;
      minQty: number;
      deliveryType: string;
      supplier: { name: string; isEnabled: boolean; purchasingEnabled: boolean };
    };
  }>;
};

function planView(pl: PlanRow, rates: RateMap, supply?: { inStock: boolean; stock: number | null; canOrder: boolean; backorder: boolean }) {
  const ev = evaluatePlan(pl, rates);
  const price = Number(pl.priceBdt);
  const m = ev.costBdt !== null ? margin(price, ev.costBdt) : null;
  return {
    planId: pl.id,
    code: pl.code,
    label: pl.label,
    isActive: pl.isActive,
    priceBdt: price,
    sourcing: pl.sourcing,
    pricingMode: pl.pricingMode,
    markupPercent: pl.markupPercent,
    markupFlatBdt: pl.markupFlatBdt,
    roundToBdt: pl.roundToBdt,
    minMarginBdt: pl.minMarginBdt,
    renewalPricing: pl.renewalPricing,
    allowBackorder: pl.allowBackorder,
    pricingAlert: pl.pricingAlert,
    costBdt: ev.costBdt,
    suggestedPrice: ev.costBdt !== null ? autoPrice(ev.costBdt, pl) : null,
    marginBdt: m?.bdt ?? null,
    marginPct: m?.pct ?? null,
    inStock: supply?.inStock ?? true,
    stock: supply?.stock ?? null,
    canOrder: supply?.canOrder ?? true,
    links: pl.supplierLinks.map((l) => ({
      linkId: l.id,
      priority: l.priority,
      isActive: l.isActive,
      supplierProductId: l.supplierProduct.id,
      supplierName: l.supplierProduct.supplier.name,
      supplierOn: l.supplierProduct.supplier.isEnabled && l.supplierProduct.supplier.purchasingEnabled,
      name: [l.supplierProduct.name, l.supplierProduct.variantName].filter(Boolean).join(' · '),
      price: l.supplierProduct.price,
      previousPrice: l.supplierProduct.previousPrice,
      currency: l.supplierProduct.currency,
      costBdt: costInBdt(l.supplierProduct.price, l.supplierProduct.currency, rates),
      stock: l.supplierProduct.stock,
      status: l.supplierProduct.status,
      warning: l.supplierProduct.needsBuyerInput
        ? 'Needs buyer details: cannot be bought automatically.'
        : l.supplierProduct.minQty > 1
          ? `Supplier minimum is ${l.supplierProduct.minQty}.`
          : l.supplierProduct.deliveryType === 'manual'
            ? 'Delivered by hand at the supplier (can take hours).'
            : '',
    })),
  };
}

const SOURCING = ['own', 'own_then_supplier', 'supplier_auto', 'supplier_manual'];

/** Updates an option's sourcing/pricing settings. Applying an auto price is logged. */
export async function updatePlanSourcing(
  planId: string,
  input: Partial<{
    sourcing: string;
    pricingMode: string;
    markupPercent: number;
    markupFlatBdt: number;
    roundToBdt: number;
    minMarginBdt: number;
    renewalPricing: string;
    allowBackorder: boolean | null;
    priceBdt: number;
    /** Accept an auto price that the jump guard held back. */
    approvePrice: boolean;
  }>,
  actor: string,
) {
  const plan = await db.productPlan.findUniqueOrThrow({
    where: { id: planId },
    include: { product: { select: { slug: true } }, supplierLinks: { select: { id: true } } },
  });
  const data: Record<string, unknown> = {};
  if (input.sourcing !== undefined) {
    if (!SOURCING.includes(input.sourcing)) throw new SupplierInputError('Unknown sourcing.');
    if (input.sourcing !== 'own' && plan.supplierLinks.length === 0) {
      throw new SupplierInputError('Link a supplier item first.');
    }
    data.sourcing = input.sourcing;
  }
  if (input.pricingMode !== undefined) {
    if (!['fixed', 'auto'].includes(input.pricingMode)) throw new SupplierInputError('Unknown pricing mode.');
    if (input.pricingMode === 'auto' && plan.supplierLinks.length === 0) throw new SupplierInputError('Auto pricing needs a linked supplier item.');
    data.pricingMode = input.pricingMode;
  }
  const num = (v: unknown, min: number, max: number) => Math.min(max, Math.max(min, Number(v) || 0));
  if (input.markupPercent !== undefined) data.markupPercent = num(input.markupPercent, 0, 1000);
  if (input.markupFlatBdt !== undefined) data.markupFlatBdt = Math.round(num(input.markupFlatBdt, 0, 1_000_000));
  if (input.roundToBdt !== undefined) data.roundToBdt = Math.round(num(input.roundToBdt, 1, 1000));
  if (input.minMarginBdt !== undefined) data.minMarginBdt = Math.round(num(input.minMarginBdt, 0, 1_000_000));
  if (input.renewalPricing !== undefined) {
    if (!['current', 'locked'].includes(input.renewalPricing)) throw new SupplierInputError('Unknown renewal pricing.');
    data.renewalPricing = input.renewalPricing;
  }
  if (input.allowBackorder !== undefined) data.allowBackorder = input.allowBackorder === null ? null : Boolean(input.allowBackorder);
  const mode = (data.pricingMode as string) || plan.pricingMode;
  if (input.priceBdt !== undefined && mode === 'fixed') {
    const p = Math.round(Number(input.priceBdt));
    if (!Number.isFinite(p) || p < 0) throw new SupplierInputError('Price must be 0 or more.');
    data.priceBdt = p;
  }
  if (input.approvePrice) {
    const held = plan.pricingAlert.split(',').find((a) => a.startsWith('jump:'));
    if (held) data.priceBdt = Number(held.slice(5));
  }
  await db.productPlan.update({ where: { id: planId }, data });
  if (data.priceBdt !== undefined) {
    await recordPriceChange({
      productId: plan.product.slug,
      planCode: plan.code,
      planLabel: plan.label,
      oldValue: Number(plan.priceBdt),
      newValue: Number(data.priceBdt),
      source: 'admin',
      actor,
      note: input.approvePrice ? 'Approved held auto price' : '',
    });
  }
  const pricingChanged = ['pricingMode', 'markupPercent', 'markupFlatBdt', 'roundToBdt', 'minMarginBdt', 'sourcing'].some((k) => k in data);
  if (pricingChanged && (data.pricingMode || plan.pricingMode) !== plan.pricingMode) {
    await recordPriceChange({
      productId: plan.product.slug,
      planCode: plan.code,
      planLabel: plan.label,
      field: 'pricing',
      oldValue: plan.pricingMode,
      newValue: String(data.pricingMode),
      source: 'admin',
      actor,
    });
  }
  await repricePlans({ planIds: [planId], reason: 'settings', actor });
}

export async function linkPlan(planId: string, supplierProductId: string) {
  const [plan, sp] = await Promise.all([
    db.productPlan.findUniqueOrThrow({ where: { id: planId }, include: { supplierLinks: true } }),
    db.supplierProduct.findUniqueOrThrow({ where: { id: supplierProductId } }),
  ]);
  if (sp.status === 'removed') throw new SupplierInputError('That supplier item is no longer sold.');
  if (plan.supplierLinks.some((l) => l.supplierProductId === supplierProductId)) throw new SupplierInputError('Already linked.');
  const priority = plan.supplierLinks.length ? Math.max(...plan.supplierLinks.map((l) => l.priority)) + 1 : 0;
  await db.planSupplierLink.create({ data: { planId, supplierProductId, priority } });
  if (plan.sourcing === 'own') {
    await db.productPlan.update({ where: { id: planId }, data: { sourcing: 'own_then_supplier' } });
  }
  await repricePlans({ planIds: [planId], reason: 'link' });
}

export async function unlinkPlan(linkId: string) {
  const link = await db.planSupplierLink.delete({ where: { id: linkId } });
  const left = await db.planSupplierLink.count({ where: { planId: link.planId } });
  // Without any source, a supplier-only option falls back to own stock and fixed pricing.
  if (left === 0) {
    await db.productPlan.update({ where: { id: link.planId }, data: { sourcing: 'own', pricingMode: 'fixed', pricingAlert: '' } });
  } else {
    await repricePlans({ planIds: [link.planId], reason: 'link' });
  }
}

/** Moves a link up/down in the fallback order. */
export async function moveLink(linkId: string, dir: -1 | 1) {
  const link = await db.planSupplierLink.findUniqueOrThrow({ where: { id: linkId } });
  const all = await db.planSupplierLink.findMany({ where: { planId: link.planId }, orderBy: { priority: 'asc' } });
  const i = all.findIndex((l) => l.id === linkId);
  const j = i + dir;
  if (j < 0 || j >= all.length) return;
  [all[i], all[j]] = [all[j], all[i]];
  await db.$transaction(all.map((l, idx) => db.planSupplierLink.update({ where: { id: l.id }, data: { priority: idx } })));
  await repricePlans({ planIds: [link.planId], reason: 'link' });
}

/** Name-similarity suggestions for an option (admin still confirms the link). */
export async function suggestLinks(planId: string) {
  const plan = await db.productPlan.findUniqueOrThrow({ where: { id: planId }, include: { product: true } });
  const words = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .split(' ')
        .filter((w) => w.length > 1 && !['the', 'and', 'for', 'with', 'plan', 'shared', 'private'].includes(w)),
    );
  const mine = words(`${plan.product.name} ${plan.label} ${plan.durationLabel}`);
  const rows = await db.supplierProduct.findMany({ where: { status: { not: 'removed' } }, include: { supplier: { select: { name: true } } } });
  const rates = await getRates();
  return rows
    .map((r) => {
      const theirs = words(`${r.name} ${r.variantName} ${r.period}`);
      const common = [...mine].filter((w) => theirs.has(w)).length;
      const score = common / Math.max(1, Math.min(mine.size, theirs.size));
      return { r, score };
    })
    .filter((x) => x.score >= 0.34)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(({ r, score }) => ({
      id: r.id,
      supplierName: r.supplier.name,
      name: [r.name, r.variantName].filter(Boolean).join(' · '),
      price: r.price,
      currency: r.currency,
      costBdt: costInBdt(r.price, r.currency, rates),
      stock: r.stock,
      status: r.status,
      score: Math.round(score * 100),
    }));
}

/** Exchange rates + global rules. A rate change reprices every auto option once. */
export async function saveRatesAndRules(
  input: { rates?: Record<string, number>; rules?: Partial<Record<string, number | boolean>> },
  actor: string,
) {
  let ratesChanged = false;
  if (input.rates) {
    const before = await getRates();
    for (const [code, value] of Object.entries(input.rates)) {
      const v = Number(value);
      const c = code.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 8);
      if (!c || !Number.isFinite(v) || v <= 0 || v > 100000) throw new SupplierInputError(`Rate for ${code} must be above 0.`);
      if (before[c] !== v) ratesChanged = true;
      await db.currencyRate.upsert({ where: { code: c }, create: { code: c, bdtPerUnit: v, updatedBy: actor }, update: { bdtPerUnit: v, updatedBy: actor } });
    }
  }
  if (input.rules) {
    const r = input.rules;
    await saveStoreSettings({
      ...(r.supplierAutoDispatch !== undefined ? { supplierAutoDispatch: Boolean(r.supplierAutoDispatch) } : {}),
      ...(r.supplierPriceGuardPct !== undefined ? { supplierPriceGuardPct: Number(r.supplierPriceGuardPct) } : {}),
      ...(r.supplierStopOnLoss !== undefined ? { supplierStopOnLoss: Boolean(r.supplierStopOnLoss) } : {}),
      ...(r.supplierMaxLossPct !== undefined ? { supplierMaxLossPct: Number(r.supplierMaxLossPct) } : {}),
    });
  }
  if (ratesChanged || input.rules) await repricePlans({ reason: ratesChanged ? 'rate' : 'settings', actor });
}

/** Purchase log for the Purchases page. */
export async function supplierOrders(filter: { status?: string; orderId?: string; take?: number }) {
  const rows = await db.supplierOrder.findMany({
    where: { ...(filter.status ? { status: filter.status } : {}), ...(filter.orderId ? { orderId: filter.orderId } : {}) },
    include: { supplier: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: Math.min(500, filter.take || 200),
  });
  return rows.map((r) => ({
    id: r.id,
    supplierName: r.supplier.name,
    orderId: r.orderId,
    deliveryId: r.deliveryId,
    status: r.status,
    externalOrderId: r.externalOrderId,
    externalStatus: r.externalStatus,
    productLabel: r.productLabel,
    unitCost: r.unitCost,
    currency: r.currency,
    costBdt: r.costBdt,
    salePriceBdt: r.salePriceBdt,
    profitBdt: r.costBdt ? r.salePriceBdt - r.costBdt : null,
    attempts: r.attempts,
    errorCode: r.errorCode,
    lastError: r.lastError,
    hasResult: Boolean(r.resultEnc),
    createdAt: r.createdAt.toISOString(),
    deliveredAt: r.deliveredAt?.toISOString() || null,
    nextPollAt: r.nextPollAt?.toISOString() || null,
  }));
}

export async function priceHistory(productId: string) {
  const rows = await db.priceHistory.findMany({ where: { productId }, orderBy: { createdAt: 'desc' }, take: 300 });
  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
}

/**
 * Supplier choices for the "Send credentials" modal: every linked item of each waiting unit,
 * with cost, stock and the reason it can't be bought (if any). Read-only; buying goes through dispatch.
 */
export async function unitSupplierOptions(orderId: string) {
  const [units, pays, rates] = await Promise.all([
    db.digitalDelivery.findMany({ where: { orderId } }),
    db.paymentTransaction.findMany({ where: { orderId, status: 'verified' }, select: { kind: true, renewDeliveryIds: true } }),
    getRates(),
  ]);
  const items = await db.orderItem.findMany({ where: { orderId }, select: { planId: true, unitPriceBdt: true } });
  const out: Record<string, unknown> = {};
  for (const u of units) {
    if (u.vaultCredentialId || ['refunded', 'revoked'].includes(u.status)) continue;
    if (!(u.status === 'pending_dispatch' || u.renewalPending)) continue;
    const plan = await db.productPlan.findFirst({
      where: { product: { OR: [{ slug: u.productId }, { id: u.productId }] }, OR: [{ code: u.variantId }, { id: u.variantId }] },
      include: { supplierLinks: { orderBy: { priority: 'asc' }, include: { supplierProduct: { include: { supplier: true } } } } },
    });
    if (!plan) continue;
    const renewal = u.renewalPending && u.status !== 'pending_dispatch';
    const paid = renewal
      ? pays.some((p) => p.kind === 'renewal' && (!p.renewDeliveryIds || p.renewDeliveryIds.split(',').includes(u.id)))
      : pays.some((p) => p.kind !== 'renewal');
    const item = items.find((i) => i.planId === plan.id);
    const sale = item ? Number(item.unitPriceBdt) : Number(plan.priceBdt);
    out[u.id] = {
      paid,
      busy: u.supplierState === 'processing',
      salePriceBdt: sale,
      options: plan.supplierLinks.map((l) => {
        const sp = l.supplierProduct;
        const s = sp.supplier;
        const cost = costInBdt(sp.price, sp.currency, rates);
        const reason = !s.isEnabled
          ? 'Supplier is turned off'
          : !s.purchasingEnabled
            ? 'Buying is paused for this supplier'
            : s.lastSyncError.startsWith('AUTH')
              ? 'API key rejected'
              : sp.status === 'removed'
                ? 'No longer sold'
                : sp.status !== 'available' || sp.stock === 0
                  ? 'Out of stock'
                  : sp.needsBuyerInput
                    ? 'Needs buyer details: buy by hand at the supplier'
                    : sp.minQty > 1
                      ? `Supplier minimum is ${sp.minQty}`
                      : cost === null
                        ? `No exchange rate for ${sp.currency}`
                        : '';
        return {
          supplierProductId: sp.id,
          supplierName: s.name,
          name: [sp.name, sp.variantName].filter(Boolean).join(' · '),
          price: sp.price,
          currency: sp.currency,
          costBdt: cost,
          stock: sp.stock,
          deliveryType: sp.deliveryType,
          lossBdt: cost !== null && cost > sale ? cost - sale : 0,
          reason,
        };
      }),
    };
  }
  return out;
}
