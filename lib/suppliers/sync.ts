import { db } from '@/lib/db';
import { getStoreSettings } from '@/lib/store-settings';
import { getRates, loadSupplier, notifyAdmin, recordPriceChange, singleFlight } from './core';
import { scrub } from './http';
import { autoPrice, costInBdt, type RateMap } from './pricing';
import { SupplierApiError } from './types';

export type SyncResult = {
  ok: boolean;
  added: number;
  updated: number;
  removed: number;
  restored: number;
  priceChanges: number;
  balance?: string;
  error?: string;
};

/** Reads balance + full catalog and refreshes the cache. Only a complete read may mark items removed. */
export function syncSupplier(supplierId: string): Promise<SyncResult> {
  return singleFlight(`sync:${supplierId}`, () => runSync(supplierId));
}

async function runSync(supplierId: string): Promise<SyncResult> {
  const { row, adapter, ctx } = await loadSupplier(supplierId);
  const result: SyncResult = { ok: false, added: 0, updated: 0, removed: 0, restored: 0, priceChanges: 0 };
  await db.supplier.update({ where: { id: row.id }, data: { lastSyncStatus: 'running' } });
  try {
    const acct = await adapter.account(ctx);
    result.balance = acct.balance;
    const items = await adapter.catalog(ctx);
    const existing = await db.supplierProduct.findMany({ where: { supplierId: row.id } });
    const byExt = new Map(existing.map((e) => [e.externalId, e]));
    const seen = new Set<string>();
    const changedIds = new Set<string>();
    const now = new Date();

    for (const it of items) {
      if (seen.has(it.externalId)) continue; // duplicate rows in a supplier list: first wins
      seen.add(it.externalId);
      const old = byExt.get(it.externalId);
      const data = {
        productRef: it.productRef,
        variantRef: it.variantRef,
        name: it.name.slice(0, 300),
        variantName: it.variantName.slice(0, 200),
        category: it.category.slice(0, 200),
        description: it.description,
        period: it.period.slice(0, 100),
        price: it.price,
        currency: it.currency,
        stock: it.stock,
        status: it.status,
        minQty: it.minQty,
        maxQty: it.maxQty,
        deliveryType: it.deliveryType,
        needsBuyerInput: it.needsBuyerInput,
        lastSeenAt: now,
      };
      if (!old) {
        await db.supplierProduct.create({ data: { ...data, supplierId: row.id, externalId: it.externalId } });
        result.added++;
        continue;
      }
      const priceChanged = old.price !== it.price || old.currency !== it.currency;
      if (priceChanged) {
        result.priceChanges++;
        changedIds.add(old.id);
      }
      if (old.status === 'removed') result.restored++;
      await db.supplierProduct.update({
        where: { id: old.id },
        data: {
          ...data,
          ...(priceChanged ? { previousPrice: old.price, priceChangedAt: now } : {}),
        },
      });
      result.updated++;
    }

    // Complete read: anything we did not see is gone from the supplier's catalog.
    const gone = existing.filter((e) => !seen.has(e.externalId) && e.status !== 'removed');
    if (gone.length) {
      await db.supplierProduct.updateMany({
        where: { id: { in: gone.map((g) => g.id) } },
        data: { status: 'removed', stock: 0 },
      });
      result.removed = gone.length;
      const linked = await db.planSupplierLink.count({ where: { supplierProductId: { in: gone.map((g) => g.id) } } });
      if (linked > 0) {
        await notifyAdmin(
          `${row.name}: ${gone.length} item(s) removed`,
          `${linked} linked option(s) lost a source: ${gone.slice(0, 5).map((g) => g.name).join(', ')}${gone.length > 5 ? '…' : ''}.`,
        );
      }
    }

    // Low balance: alert when it drops below the threshold (not on every sync).
    const bal = Number(acct.balance);
    const prevBal = Number(row.balance);
    if (Number.isFinite(bal) && bal < row.lowBalanceAlert && !(Number.isFinite(prevBal) && prevBal < row.lowBalanceAlert && row.balance !== '')) {
      await notifyAdmin(`${row.name}: low balance`, `Balance is ${acct.balance} ${acct.currency}. Top up so purchases don't fail.`);
    }

    await db.supplier.update({
      where: { id: row.id },
      data: {
        balance: acct.balance,
        balanceAt: now,
        currency: acct.currency || row.currency,
        lastSyncAt: now,
        lastSyncStatus: 'ok',
        lastSyncError: '',
      },
    });
    await repricePlans({ supplierId: row.id, costChangedProductIds: changedIds });
    result.ok = true;
    return result;
  } catch (e) {
    const code = e instanceof SupplierApiError ? e.code : 'ERROR';
    const msg = scrub(e instanceof Error ? e.message : String(e), ctx.apiKey);
    await db.supplier.update({
      where: { id: row.id },
      data: { lastSyncAt: new Date(), lastSyncStatus: 'error', lastSyncError: `${code}: ${msg}` },
    });
    if (code === 'AUTH' && row.lastSyncStatus !== 'error') {
      await notifyAdmin(`${row.name}: API key rejected`, 'Sync and purchases from this supplier are stopped until the key is fixed.');
    }
    result.error = `${code}: ${msg}`;
    return result;
  }
}

type RepriceOpts = {
  supplierId?: string;
  planIds?: string[];
  /** Linked items whose supplier price changed in this sync (logged as cost changes). */
  costChangedProductIds?: Set<string>;
  reason?: 'sync' | 'rate' | 'settings' | 'link';
  actor?: string;
};

/**
 * Recomputes cost, auto prices and alerts for supplier-backed options.
 * Alerts: loss (cost above price) · jump:<price> (auto rise above the guard, held) · no_rate.
 */
export async function repricePlans(opts: RepriceOpts = {}) {
  const [rates, settings] = await Promise.all([getRates(), getStoreSettings()]);
  const plans = await db.productPlan.findMany({
    where: {
      ...(opts.planIds ? { id: { in: opts.planIds } } : {}),
      supplierLinks: opts.supplierId
        ? { some: { supplierProduct: { supplierId: opts.supplierId } } }
        : { some: {} },
    },
    include: {
      product: { select: { slug: true, name: true } },
      supplierLinks: {
        where: { isActive: true },
        orderBy: { priority: 'asc' },
        include: { supplierProduct: { include: { supplier: true } } },
      },
    },
  });
  let changed = 0;
  for (const plan of plans) {
    const r = evaluatePlan(plan, rates);
    const alerts: string[] = [];
    const current = Number(plan.priceBdt);
    let next = current;

    if (r.costBdt === null) {
      if (r.anyLink) alerts.push('no_rate');
    } else if (plan.pricingMode === 'auto') {
      const target = autoPrice(r.costBdt, plan);
      if (target !== current) {
        const risePct = current > 0 ? ((target - current) / current) * 100 : 0;
        if (current > 0 && risePct > settings.supplierPriceGuardPct) {
          alerts.push(`jump:${target}`);
          if (r.costBdt + plan.minMarginBdt > current) alerts.push('loss');
        } else {
          next = target;
        }
      }
    } else if (r.costBdt + plan.minMarginBdt > current) {
      alerts.push('loss');
    }

    // Supplier cost story (only when the linked item's price moved in this sync).
    if (r.best && opts.costChangedProductIds?.has(r.best.supplierProduct.id)) {
      await recordPriceChange({
        productId: plan.product.slug,
        planCode: plan.code,
        planLabel: plan.label,
        field: 'cost',
        oldValue: `${r.best.supplierProduct.previousPrice} ${r.best.supplierProduct.currency}`,
        newValue: `${r.best.supplierProduct.price} ${r.best.supplierProduct.currency}`,
        source: 'supplier',
        note: `${r.best.supplierProduct.supplier.name} · ${r.best.supplierProduct.name}`,
      });
    }

    const alertText = alerts.join(',');
    if (next !== current || alertText !== plan.pricingAlert) {
      await db.productPlan.update({
        where: { id: plan.id },
        data: { priceBdt: next, pricingAlert: alertText },
      });
      changed++;
    }
    if (next !== current) {
      await recordPriceChange({
        productId: plan.product.slug,
        planCode: plan.code,
        planLabel: plan.label,
        oldValue: current,
        newValue: next,
        source: opts.reason === 'rate' ? 'rate' : 'auto',
        actor: opts.actor,
        note: r.best
          ? `Cost ${r.best.supplierProduct.price} ${r.best.supplierProduct.currency} = ৳${r.costBdt} · +${plan.markupPercent}%${plan.markupFlatBdt ? ` +৳${plan.markupFlatBdt}` : ''}`
          : '',
      });
    }
    const newAlerts = alerts.filter((a) => !plan.pricingAlert.split(',').some((o) => o.split(':')[0] === a.split(':')[0]));
    if (newAlerts.length) {
      await notifyAdmin(
        `${plan.product.name} · ${plan.label}: price needs attention`,
        newAlerts
          .map((a) =>
            a === 'loss'
              ? `Supplier cost ৳${r.costBdt} is above the price ৳${next}.`
              : a.startsWith('jump:')
                ? `Auto price wants ৳${a.slice(5)} (from ৳${current}), more than the ${settings.supplierPriceGuardPct}% guard. Approve it on the option.`
                : 'No exchange rate for the supplier currency.',
          )
          .join(' '),
      );
    }
  }
  return { plans: plans.length, changed };
}

type PlanWithLinks = {
  supplierLinks: Array<{
    supplierProduct: {
      id: string;
      price: string;
      currency: string;
      status: string;
      previousPrice: string;
      name: string;
      supplier: { isEnabled: boolean; name: string };
    };
  }>;
};

/** Best usable link (first by priority that is on sale) and its cost in taka. */
export function evaluatePlan<P extends PlanWithLinks>(plan: P, rates: RateMap) {
  const usable = plan.supplierLinks.filter((l) => l.supplierProduct.supplier.isEnabled && l.supplierProduct.status === 'available');
  const best = usable[0] || plan.supplierLinks.find((l) => l.supplierProduct.status !== 'removed') || null;
  const costBdt = best ? costInBdt(best.supplierProduct.price, best.supplierProduct.currency, rates) : null;
  return { best: best as P['supplierLinks'][number] | null, costBdt, anyLink: plan.supplierLinks.length > 0 };
}
