import { createHash, randomBytes } from 'node:crypto';
import { db } from '@/lib/db';
import { encryptSecret, decryptSecret } from '@/lib/crypto/secrets';
import { getStoreSettings } from '@/lib/store-settings';
import { warrantyWindow, toStamp } from '@/lib/warranty';
import { cappedCredentialExpiresAt } from '@/lib/admin/renewal-lifecycle';
import { getRates, loadSupplier, notifyAdmin, nowStamp, singleFlight } from './core';
import { scrub } from './http';
import { costInBdt, maxUnitPriceFor } from './pricing';
import { SupplierApiError, type SupplierOrderState } from './types';

/**
 * Buys supplier credentials for customer units.
 * - One supplier order per unit; the SupplierOrder id is the Idempotency-Key.
 * - A unit is claimed atomically (supplierState → processing) so two triggers never buy twice.
 * - Ambiguous failures (timeout, 5xx) keep the claim and are re-sent later with the same key.
 */

export type DispatchTrigger = 'verify' | 'manual' | 'sweep' | 'renewal';

export type UnitResult = {
  deliveryId: string;
  outcome: 'delivered' | 'processing' | 'needs_review' | 'failed' | 'skipped';
  message: string;
};

const DONE_UNIT = ['refunded', 'revoked'];
const newOrderId = () => `so_${Date.now().toString(36)}${randomBytes(6).toString('hex')}`;
const hash = (s: string) => createHash('sha256').update(s).digest('hex');

type Unit = Awaited<ReturnType<typeof db.digitalDelivery.findMany>>[number];

async function planForUnit(u: Pick<Unit, 'productId' | 'variantId'>) {
  return db.productPlan.findFirst({
    where: {
      product: { OR: [{ slug: u.productId }, { id: u.productId }] },
      OR: [{ code: u.variantId }, { id: u.variantId }],
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
}

/** Price the customer paid for this unit (falls back to today's price). */
async function salePriceFor(u: Unit, planId: string, fallback: number) {
  const item = await db.orderItem.findFirst({ where: { orderId: u.orderId, planId }, select: { unitPriceBdt: true } });
  const n = item ? Number(item.unitPriceBdt) : fallback;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Can this unit be bought from a supplier on this trigger? */
function eligible(u: Unit, sourcing: string, trigger: DispatchTrigger, explicit = false) {
  if (DONE_UNIT.includes(u.status) || u.supplierState === 'processing') return false;
  if (u.vaultCredentialId) return false;
  if (!(u.status === 'pending_dispatch' || u.renewalPending)) return false;
  // Admin picked a supplier item in "Send credentials": allowed whatever the option's sourcing.
  if (explicit && trigger === 'manual') return true;
  if (sourcing === 'supplier_auto' || sourcing === 'own_then_supplier') return true;
  return sourcing === 'supplier_manual' && trigger === 'manual';
}

/** Dispatch every eligible unit of an order (or only `deliveryIds`). Safe to call repeatedly. */
export async function dispatchOrder(
  orderId: string,
  opts: {
    trigger: DispatchTrigger;
    deliveryIds?: string[];
    actor?: string;
    buyAnyway?: boolean;
    /** Buy from this linked supplier item only (admin choice in Send credentials). */
    supplierProductId?: string;
  } = { trigger: 'verify' },
): Promise<UnitResult[]> {
  return singleFlight(`dispatch:${orderId}:${(opts.deliveryIds || []).join(",")}:${opts.supplierProductId || ""}`, async () => {
    const settings = await getStoreSettings();
    if (!settings.supplierAutoDispatch && opts.trigger !== 'manual') return [];
    const units = await db.digitalDelivery.findMany({
      where: { orderId, ...(opts.deliveryIds?.length ? { id: { in: opts.deliveryIds } } : {}) },
      orderBy: [{ unitIndex: 'asc' }, { id: 'asc' }],
    });
    // Never spend supplier money before the customer's money is confirmed.
    const paid = await db.paymentTransaction.findMany({
      where: { orderId, status: 'verified' },
      select: { kind: true, renewDeliveryIds: true },
    });
    const isPaid = (u: Unit) =>
      u.renewalPending && u.status !== 'pending_dispatch'
        ? paid.some((p) => p.kind === 'renewal' && (!p.renewDeliveryIds || p.renewDeliveryIds.split(',').includes(u.id)))
        : paid.some((p) => p.kind !== 'renewal');
    const results: UnitResult[] = [];
    for (const u of units) {
      const plan = await planForUnit(u);
      if (!plan || (plan.sourcing === 'own' && !opts.supplierProductId)) continue;
      if (!isPaid(u)) {
        if (opts.deliveryIds?.includes(u.id) || opts.trigger === 'manual') {
          results.push({ deliveryId: u.id, outcome: 'skipped', message: 'Payment is not verified yet.' });
        }
        continue;
      }
      if (!eligible(u, plan.sourcing, opts.trigger, Boolean(opts.supplierProductId))) {
        if (opts.deliveryIds?.includes(u.id)) results.push({ deliveryId: u.id, outcome: 'skipped', message: 'Nothing to buy for this unit.' });
        continue;
      }
      results.push(await buyUnit(u, plan, opts));
    }
    return results;
  });
}

async function buyUnit(
  u: Unit,
  plan: NonNullable<Awaited<ReturnType<typeof planForUnit>>>,
  opts: { trigger: DispatchTrigger; actor?: string; buyAnyway?: boolean; supplierProductId?: string },
): Promise<UnitResult> {
  // Atomic claim: only one caller wins.
  const claimed = await db.digitalDelivery.updateMany({
    where: {
      id: u.id,
      supplierState: { not: 'processing' },
      vaultCredentialId: null,
      status: { notIn: DONE_UNIT },
      OR: [{ status: 'pending_dispatch' }, { renewalPending: true }],
    },
    data: { supplierState: 'processing', supplierRev: { increment: 1 } },
  });
  if (claimed.count !== 1) return { deliveryId: u.id, outcome: 'skipped', message: 'Already being handled.' };

  const [rates, settings] = await Promise.all([getRates(), getStoreSettings()]);
  const sale = await salePriceFor(u, plan.id, Number(plan.priceBdt));
  const label = `${plan.product.name} · ${plan.label}`;
  let review = false;
  const notes: string[] = [];

  const links = plan.supplierLinks.filter(
    (l) =>
      l.supplierProduct.supplier.isEnabled &&
      l.supplierProduct.supplier.purchasingEnabled &&
      l.supplierProduct.status !== 'removed' &&
      !l.supplierProduct.needsBuyerInput &&
      (!opts.supplierProductId || l.supplierProduct.id === opts.supplierProductId),
  );
  if (links.length === 0) notes.push(opts.supplierProductId ? 'That supplier item cannot be bought now.' : 'No usable supplier link.');

  for (const link of links) {
    const sp = link.supplierProduct;
    const rate = rates[sp.currency.toUpperCase()];
    if (!rate) {
      notes.push(`${sp.supplier.name}: no exchange rate for ${sp.currency}.`);
      continue;
    }
    // Highest unit price we accept. "Buy anyway" reads the supplier's live price (the cache may be old) + 2%.
    let maxUnit = maxUnitPriceFor(sale, rate, settings.supplierMaxLossPct);
    if (opts.buyAnyway) {
      try {
        const { adapter, ctx } = await loadSupplier(sp.supplierId);
        const fresh = await adapter.item(ctx, { externalId: sp.externalId, productRef: sp.productRef, variantRef: sp.variantRef });
        maxUnit = (Number(fresh?.price ?? sp.price) * 1.02).toFixed(4);
      } catch {
        maxUnit = (Number(sp.price) * 1.02).toFixed(4);
      }
    }
    const outcome = await attempt(u, plan.id, label, link.supplierProduct, sale, maxUnit, rate);
    if (outcome.kind === 'done' || outcome.kind === 'processing') {
      return {
        deliveryId: u.id,
        outcome: outcome.kind === 'done' ? 'delivered' : 'processing',
        message: outcome.message,
      };
    }
    notes.push(`${sp.supplier.name}: ${outcome.message}`);
    if (outcome.kind === 'review') review = true;
  }

  // Nothing worked: release the unit (pending again) and tell the admin.
  await db.digitalDelivery.update({
    where: { id: u.id },
    data: { supplierState: review ? 'needs_review' : 'failed', supplierRev: { increment: 1 } },
  });
  await notifyAdmin(
    review ? `Supplier price check: ${u.orderId}` : `Supplier purchase failed: ${u.orderId}`,
    `${label} (unit #${u.unitIndex}): ${notes.join(' ') || 'no supplier could deliver.'}${review ? ' Open the order to buy anyway or refund.' : ''}`,
    u.orderId,
  );
  return { deliveryId: u.id, outcome: review ? 'needs_review' : 'failed', message: notes.join(' ') };
}

type AttemptOutcome =
  | { kind: 'done'; message: string }
  | { kind: 'processing'; message: string }
  | { kind: 'next'; message: string }
  | { kind: 'review'; message: string };

type SP = {
  id: string;
  supplierId: string;
  externalId: string;
  productRef: string;
  variantRef: string;
  name: string;
  price: string;
  currency: string;
  supplier: { name: string };
};

async function attempt(
  u: Unit,
  planId: string,
  label: string,
  sp: SP,
  sale: number,
  maxUnit: string,
  rate: number,
  retriedPrice = false,
): Promise<AttemptOutcome> {
  const { adapter, ctx } = await loadSupplier(sp.supplierId);
  const so = await db.supplierOrder.create({
    data: {
      id: newOrderId(),
      supplierId: sp.supplierId,
      supplierProductId: sp.id,
      orderId: u.orderId,
      deliveryId: u.id,
      status: 'queued',
      currency: sp.currency,
      salePriceBdt: Math.round(sale),
      productLabel: `${label} → ${sp.name}`.slice(0, 300),
    },
  });
  void planId;
  try {
    const built = await adapter.buildOrder(ctx, {
      item: { externalId: sp.externalId, productRef: sp.productRef, variantRef: sp.variantRef },
      quantity: 1,
      maxUnitPrice: maxUnit,
      reference: so.id,
    });
    await db.supplierOrder.update({
      where: { id: so.id },
      data: {
        status: 'processing',
        requestJson: JSON.stringify(built.body),
        unitCost: built.unitPrice,
        costBdt: costInBdt(built.unitPrice, sp.currency, { [sp.currency.toUpperCase()]: rate }) ?? 0,
        attempts: 1,
        // Keep the poller away while this request is still in flight.
        nextPollAt: new Date(Date.now() + 90_000),
      },
    });
    const state = await adapter.submitOrder(ctx, built.body, so.id);
    return await handleState(so.id, state);
  } catch (e) {
    const err = e instanceof SupplierApiError ? e : null;
    const msg = scrub(e instanceof Error ? e.message : String(e), ctx.apiKey);
    const code = err?.code || 'ERROR';
    const sent = (await db.supplierOrder.findUnique({ where: { id: so.id } }))?.requestJson;

    // Ambiguous: the order may exist at the supplier. Keep the claim; re-send the same body + key later.
    if (sent && err && (err.code === 'NETWORK' || err.code === 'SERVER' || err.code === 'RATE_LIMITED' || err.code === 'IN_PROGRESS')) {
      await db.supplierOrder.update({
        where: { id: so.id },
        data: {
          status: 'processing',
          errorCode: code,
          lastError: msg,
          nextPollAt: new Date(Date.now() + Math.max(30, err.opts.retryAfterSec || 0) * 1000),
        },
      });
      return { kind: 'processing', message: 'Sent; waiting for the supplier to confirm.' };
    }
    // Price moved between quote and order: one fresh try with a new key.
    if (err?.code === 'PRICE_CHANGED' && !retriedPrice) {
      await db.supplierOrder.update({ where: { id: so.id }, data: { status: 'failed', errorCode: code, lastError: msg } });
      return attempt(u, planId, label, sp, sale, maxUnit, rate, true);
    }
    const review = err?.code === 'PRICE_TOO_HIGH' || err?.code === 'IDEMPOTENCY_CONFLICT';
    await db.supplierOrder.update({
      where: { id: so.id },
      data: { status: review ? 'needs_review' : 'failed', errorCode: code, lastError: msg },
    });
    // Keep the cache honest so the storefront stops offering what the supplier can't sell.
    if (err?.code === 'OUT_OF_STOCK') {
      await db.supplierProduct.update({ where: { id: sp.id }, data: { status: 'out_of_stock', stock: 0 } });
    } else if (err?.code === 'NOT_FOUND') {
      await db.supplierProduct.update({ where: { id: sp.id }, data: { status: 'removed', stock: 0 } });
    } else if (err?.code === 'AUTH') {
      await db.supplier.update({ where: { id: sp.supplierId }, data: { lastSyncStatus: 'error', lastSyncError: `AUTH: ${msg}` } });
    }
    return { kind: review ? 'review' : 'next', message: friendly(code, msg) };
  }
}

function friendly(code: string, msg: string) {
  const map: Record<string, string> = {
    BALANCE: 'not enough balance at the supplier.',
    OUT_OF_STOCK: 'out of stock.',
    UNAVAILABLE: 'not available.',
    NOT_FOUND: 'item no longer sold.',
    PRICE_TOO_HIGH: `price is above what this sale allows (${msg.replace(/^.*price /i, '').slice(0, 60)}).`,
    PURCHASING_DISABLED: 'purchasing is paused at the supplier.',
    LIMIT: 'supplier spending limit reached.',
    AUTH: 'API key rejected.',
    SCOPE: 'API key lacks permission.',
    BUYER_INPUT: 'needs buyer details; buy by hand.',
    QUANTITY: 'quantity not allowed.',
  };
  return map[code] || msg;
}

/** Applies a supplier order state to our records. Used after submit, by polling and by webhooks. */
export async function handleState(soId: string, state: SupplierOrderState): Promise<AttemptOutcome> {
  const so = await db.supplierOrder.findUniqueOrThrow({ where: { id: soId }, include: { supplier: true } });
  const base = {
    externalOrderId: state.externalOrderId || so.externalOrderId,
    externalStatus: state.externalStatus,
    unitCost: state.unitCost || so.unitCost,
  };

  if (state.state === 'processing' || (state.state === 'delivered' && state.items.length === 0)) {
    const attempts = so.attempts + 1;
    const ageH = (Date.now() - so.createdAt.getTime()) / 3_600_000;
    // Manual items can take long; give up waiting after 7 days, others after 48 h.
    const limitH = state.externalStatus === 'manual_review' ? 168 : 48;
    if (ageH > limitH) {
      await db.supplierOrder.update({ where: { id: so.id }, data: { ...base, status: 'needs_review', lastError: 'Supplier has not delivered in time.' } });
      await releaseUnit(so.deliveryId, 'needs_review');
      await notifyAdmin(`Supplier order stuck: ${so.orderId}`, `${so.productLabel}: still "${state.externalStatus}" after ${Math.round(ageH)} h.`, so.orderId);
      return { kind: 'review', message: 'Stuck at the supplier.' };
    }
    const waitS = Math.min(1800, 30 * 2 ** Math.min(attempts, 6)) + Math.floor(Math.random() * 15);
    await db.supplierOrder.update({
      where: { id: so.id },
      data: { ...base, status: 'processing', attempts, nextPollAt: new Date(Date.now() + waitS * 1000) },
    });
    return { kind: 'processing', message: `Supplier status: ${state.externalStatus}.` };
  }

  if (state.state === 'failed' || state.state === 'refunded') {
    const wasDelivered = so.status === 'delivered';
    await db.supplierOrder.update({
      where: { id: so.id },
      data: { ...base, status: wasDelivered ? 'needs_review' : 'failed', errorCode: state.failureCode || state.externalStatus, lastError: state.failureMessage || `Supplier marked it ${state.externalStatus}.` },
    });
    if (wasDelivered) {
      await notifyAdmin(`Supplier ${state.externalStatus} a delivered order`, `${so.productLabel} (${so.orderId}): the supplier now says "${state.externalStatus}". Check the customer's access.`, so.orderId);
      return { kind: 'review', message: `Supplier marked it ${state.externalStatus} after delivery.` };
    }
    return { kind: 'next', message: state.failureMessage || `Supplier marked it ${state.externalStatus}.` };
  }

  // Delivered with data.
  const secret = state.items.join('\n').trim();
  const h = hash(secret);
  if (so.status === 'delivered') {
    // Supplementary data on a delivered order (e.g. Jaha additions).
    if (h !== so.deliveryHash) await applyAddition(so.id, secret, h);
    return { kind: 'done', message: 'Already delivered.' };
  }
  await deliverToUnit(so.id, secret, h, base);
  return { kind: 'done', message: `Delivered by ${so.supplier.name}.` };
}

async function releaseUnit(deliveryId: string, state: string) {
  await db.digitalDelivery.updateMany({
    where: { id: deliveryId, supplierState: 'processing' },
    data: { supplierState: state, supplierRev: { increment: 1 } },
  });
}

async function deliverToUnit(
  soId: string,
  secret: string,
  h: string,
  base: { externalOrderId: string; externalStatus: string; unitCost: string },
) {
  await db.$transaction(async (tx) => {
    const so = await tx.supplierOrder.findUniqueOrThrow({ where: { id: soId }, include: { supplier: true } });
    const unit = await tx.digitalDelivery.findUnique({ where: { id: so.deliveryId } });
    const stamp = nowStamp();
    await tx.supplierOrder.update({
      where: { id: so.id },
      data: { ...base, status: 'delivered', deliveredAt: new Date(), deliveryHash: h, resultEnc: encryptSecret(secret), errorCode: '', lastError: '' },
    });
    // The unit was closed or served another way meanwhile: keep the credential in the log for the admin.
    if (!unit || DONE_UNIT.includes(unit.status) || (unit.vaultCredentialId && unit.supplierState !== 'processing')) {
      await tx.supplierOrder.update({
        where: { id: so.id },
        data: { status: 'needs_review', lastError: 'Delivered, but the unit was refunded or already had a credential. The credential is kept in this log.' },
      });
      if (unit) await tx.digitalDelivery.update({ where: { id: unit.id }, data: { supplierState: '', supplierRev: { increment: 1 } } });
      return;
    }
    const previous = unit.vaultCredentialId ? await tx.vaultCredential.findUnique({ where: { id: unit.vaultCredentialId } }) : null;
    const vaultId = `vc-sup-${so.id}`;
    await tx.vaultCredential.create({
      data: {
        id: vaultId,
        productId: unit.productId,
        productName: unit.productName,
        variantId: unit.variantId,
        variantName: unit.variantName,
        credentialType: unit.credentialType,
        secretValue: encryptSecret(secret),
        status: 'delivered',
        validDays: unit.credentialValidDays,
        batchNote: `Supplier: ${so.supplier.name} · ${base.externalOrderId}`.slice(0, 200),
        addedAt: stamp,
        assignedOrderId: unit.orderId,
        assignedBuyerEmail: unit.buyerEmail,
      },
    });
    if (previous) await tx.vaultCredential.update({ where: { id: previous.id }, data: { status: 'replaced' } });
    const assignedDay = stamp.slice(0, 10);
    const credExpires = cappedCredentialExpiresAt(assignedDay, unit.credentialValidDays || 30, undefined);
    const warranty =
      unit.hasWarranty && unit.warrantyDays && !unit.warrantyStartsAt
        ? warrantyWindow(new Date(), unit.warrantyDays, unit.orderExpiresAt)
        : null;
    await tx.digitalDelivery.update({
      where: { id: unit.id },
      data: {
        status: 'delivered',
        vaultCredentialId: vaultId,
        deliveredAt: stamp,
        credentialAssignedAt: assignedDay,
        credentialExpiresAt: credExpires,
        credentialClearedAt: null,
        renewalPending: false,
        supplierState: 'delivered',
        supplierRev: { increment: 1 },
        replacementHistoryCount: previous ? unit.replacementHistoryCount + 1 : unit.replacementHistoryCount,
        ...(warranty ? { warrantyStartsAt: warranty.startsAt, warrantyEndsAt: warranty.endsAt, warrantyRemainingDays: unit.warrantyDays } : {}),
      },
    });
    await tx.credentialAudit.create({
      data: {
        id: `aud-sup-${so.id}`,
        deliveryId: unit.id,
        atLabel: stamp,
        action: unit.renewalPending ? 'renewed' : previous ? 'replaced' : 'assigned',
        source: 'supplier',
        secretValue: encryptSecret(secret),
        previousSecretValue: previous ? previous.secretValue : null,
        vaultCredentialId: vaultId,
        note: `${so.supplier.name} order ${base.externalOrderId}`.slice(0, 200),
        credentialExpiresAt: credExpires,
      },
    });
  });
}

/** Supplier added data to a delivered order: update the credential, keep an audit trail. */
async function applyAddition(soId: string, secret: string, h: string) {
  const so = await db.supplierOrder.findUniqueOrThrow({ where: { id: soId }, include: { supplier: true } });
  const vaultId = `vc-sup-${so.id}`;
  const vault = await db.vaultCredential.findUnique({ where: { id: vaultId } });
  await db.supplierOrder.update({ where: { id: so.id }, data: { deliveryHash: h, resultEnc: encryptSecret(secret) } });
  if (!vault) return;
  await db.vaultCredential.update({ where: { id: vaultId }, data: { secretValue: encryptSecret(secret) } });
  const unit = await db.digitalDelivery.findUnique({ where: { id: so.deliveryId } });
  if (unit?.vaultCredentialId === vaultId) {
    await db.digitalDelivery.update({ where: { id: unit.id }, data: { supplierRev: { increment: 1 } } });
    await db.credentialAudit.create({
      data: {
        id: `aud-supadd-${so.id}-${Date.now()}`,
        deliveryId: unit.id,
        atLabel: nowStamp(),
        action: 'replaced',
        source: 'supplier',
        secretValue: encryptSecret(secret),
        previousSecretValue: vault.secretValue,
        vaultCredentialId: vaultId,
        note: `${so.supplier.name} added more data to order ${so.externalOrderId}`,
      },
    });
  }
  await notifyAdmin(`New data from ${so.supplier.name}`, `${so.productLabel} (${so.orderId}) received supplementary delivery data. Tell the customer if needed.`, so.orderId);
}

/** Re-checks orders still processing: re-sends ambiguous ones (same key), polls the rest. */
export async function pollSupplierOrders(limit = 15) {
  const due = await db.supplierOrder.findMany({
    where: { status: 'processing', OR: [{ nextPollAt: null }, { nextPollAt: { lte: new Date() } }] },
    orderBy: { nextPollAt: 'asc' },
    take: limit,
  });
  for (const so of due) {
    await singleFlight(`so:${so.id}`, async () => {
      const { adapter, ctx } = await loadSupplier(so.supplierId);
      try {
        const state = so.externalOrderId
          ? await adapter.getOrder(ctx, so.externalOrderId)
          : await adapter.submitOrder(ctx, JSON.parse(so.requestJson || '{}'), so.id); // same body + same key
        const out = await handleState(so.id, state);
        if (out.kind === 'next') {
          // Definitive failure after an earlier ambiguous send: free the unit for another try.
          await releaseUnit(so.deliveryId, 'failed');
          await notifyAdmin(`Supplier purchase failed: ${so.orderId}`, `${so.productLabel}: ${out.message}`, so.orderId);
        } else if (out.kind === 'review') {
          await releaseUnit(so.deliveryId, 'needs_review');
        }
      } catch (e) {
        const err = e instanceof SupplierApiError ? e : null;
        const attempts = so.attempts + 1;
        const definitive = err && !err.opts.retryable && err.code !== 'NETWORK';
        if (definitive && !so.externalOrderId) {
          // The supplier rejected the re-sent order: nothing was bought.
          await db.supplierOrder.update({ where: { id: so.id }, data: { status: 'failed', attempts, errorCode: err.code, lastError: scrub(err.message, ctx.apiKey) } });
          await releaseUnit(so.deliveryId, 'failed');
          await notifyAdmin(`Supplier purchase failed: ${so.orderId}`, `${so.productLabel}: ${friendly(err.code, err.message)}`, so.orderId);
          return;
        }
        const waitS = Math.min(1800, 30 * 2 ** Math.min(attempts, 6)) + (err?.opts.retryAfterSec || 0);
        await db.supplierOrder.update({
          where: { id: so.id },
          data: { attempts, errorCode: err?.code || 'ERROR', lastError: scrub(e instanceof Error ? e.message : String(e), ctx.apiKey), nextPollAt: new Date(Date.now() + waitS * 1000) },
        });
      }
    });
  }
  return due.length;
}

/** Jaha can add data to a completed order: re-read recently delivered orders a few times. */
export async function pollAdditions(limit = 10) {
  const since = new Date(Date.now() - 24 * 3_600_000);
  const rows = await db.supplierOrder.findMany({
    where: {
      status: 'delivered',
      deliveredAt: { gte: since },
      supplier: { kind: 'jaha' },
      OR: [{ nextPollAt: null }, { nextPollAt: { lte: new Date() } }],
    },
    take: limit,
  });
  for (const so of rows) {
    try {
      const { adapter, ctx } = await loadSupplier(so.supplierId);
      const state = await adapter.getOrder(ctx, so.externalOrderId);
      await handleState(so.id, state);
    } catch {
      /* try again next round */
    }
    await db.supplierOrder.update({ where: { id: so.id }, data: { nextPollAt: new Date(Date.now() + 30 * 60_000) } });
  }
}

/**
 * Backstop for anything the browser trigger missed (closed tab, server restart):
 * paid orders with supplier-sourced units still pending.
 */
export async function sweepPendingUnits() {
  const settings = await getStoreSettings();
  if (!settings.supplierAutoDispatch) return 0;
  const cutoff = toStamp(new Date(Date.now() - 60_000));
  const pending = await db.digitalDelivery.findMany({
    where: {
      vaultCredentialId: null,
      supplierState: { in: ['', 'failed'] },
      status: { notIn: DONE_UNIT },
      OR: [{ status: 'pending_dispatch' }, { renewalPending: true }],
      createdAtLabel: { lte: cutoff },
    },
    select: { id: true, orderId: true, productId: true, variantId: true, renewalPending: true, supplierState: true },
    take: 200,
  });
  // Failed units (e.g. out of stock) are retried every 30 minutes, at most 6 times.
  const failedIds = pending.filter((p) => p.supplierState === 'failed').map((p) => p.id);
  if (failedIds.length) {
    const tries = await db.supplierOrder.groupBy({
      by: ['deliveryId'],
      where: { deliveryId: { in: failedIds } },
      _count: { _all: true },
      _max: { updatedAt: true },
    });
    const skip = new Set(
      tries
        .filter((t) => t._count._all >= 6 || (t._max.updatedAt && Date.now() - t._max.updatedAt.getTime() < 30 * 60_000))
        .map((t) => t.deliveryId),
    );
    for (let i = pending.length - 1; i >= 0; i--) if (skip.has(pending[i].id)) pending.splice(i, 1);
  }
  if (pending.length === 0) return 0;
  const orderIds = [...new Set(pending.map((p) => p.orderId))];
  const pays = await db.paymentTransaction.findMany({
    where: { orderId: { in: orderIds }, status: 'verified' },
    select: { orderId: true, kind: true, renewDeliveryIds: true },
  });
  let n = 0;
  for (const orderId of orderIds) {
    const units = pending.filter((p) => p.orderId === orderId);
    const paid = pays.filter((p) => p.orderId === orderId);
    const ids = units
      .filter((u) =>
        u.renewalPending
          ? paid.some((p) => p.kind === 'renewal' && (!p.renewDeliveryIds || p.renewDeliveryIds.split(',').includes(u.id)))
          : paid.some((p) => p.kind !== 'renewal'),
      )
      .map((u) => u.id);
    if (ids.length === 0) continue;
    const res = await dispatchOrder(orderId, { trigger: 'sweep', deliveryIds: ids });
    n += res.filter((r) => r.outcome !== 'skipped').length;
  }
  return n;
}

/** Decrypted delivery of one supplier order (admin "view" in the log). */
export async function supplierOrderResult(id: string) {
  const so = await db.supplierOrder.findUnique({ where: { id }, select: { resultEnc: true } });
  return so?.resultEnc ? decryptSecret(so.resultEnc) : '';
}
