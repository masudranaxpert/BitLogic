import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import type { DigitalDelivery } from '@prisma/client';
import { db } from '@/lib/db';
import { getBuyerAccess, sameEmail } from '@/lib/auth/buyer-access';
import { accessTokensMatch } from '@/lib/orders/access-token';
import { getStoreSettings } from '@/lib/store-settings';
import { renewWindow, warrantyState } from '@/lib/warranty';
import { planSupplyMap } from '@/lib/suppliers/supply';
import { clientIp, guardRateLimit } from '@/lib/auth/rate-limit';
import { recordSystemActivity } from '@/lib/audit/record';

function stamp(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** One renewable "subscription" inside an order = one product + plan line. */
export type RenewLine = {
  key: string;
  productName: string;
  planName: string;
  units: number;
  unitPriceBdt: number;
  /** Renewing at the price first paid (option set to locked renewal price). */
  priceLocked: boolean;
  amountBdt: number;
  endsAt: string | null;
  warrantyDaysLeft: number;
  hasWarranty: boolean;
  canRenew: boolean;
  pending: boolean;
  /** Renewal window for this line: opens N days before it ends, closes after the grace days. */
  window: 'open' | 'not_yet' | 'closed' | 'unknown';
  opensOn: string | null;
  warranty: ReturnType<typeof warrantyState>;
  reason?: string;
  deliveryIds: string[];
};

/** Seats of the same plan that end on different dates (partial renewals) are separate lines. */
const lineKey = (u: Pick<DigitalDelivery, 'productId' | 'variantId' | 'orderExpiresAt'>) =>
  `${u.productId}|${u.variantId}|${u.orderExpiresAt || ''}`;

/**
 * Every order line is its own subscription: its own price, end date, warranty
 * and renewability. Quote and renew work per line, never "the whole order".
 */
async function buildLines(orderId: string): Promise<{ lines: RenewLine[]; units: DigitalDelivery[] }> {
  const settings = await getStoreSettings();
  const units = await db.digitalDelivery.findMany({ where: { orderId }, orderBy: [{ unitIndex: 'asc' }, { id: 'asc' }] });
  const live = units.filter((u) => u.status !== 'refunded' && u.status !== 'revoked');
  const pendingPays = await db.paymentTransaction.findMany({
    where: { orderId, kind: 'renewal', status: 'pending_verification' },
  });
  const pendingIds = new Set<string>();
  let wholeOrderPending = false;
  for (const p of pendingPays) {
    const ids = p.renewDeliveryIds.split(',').filter(Boolean);
    if (ids.length === 0) wholeOrderPending = true;
    ids.forEach((id) => pendingIds.add(id));
  }

  const groups = new Map<string, DigitalDelivery[]>();
  for (const u of live) {
    const list = groups.get(lineKey(u)) || [];
    list.push(u);
    groups.set(lineKey(u), list);
  }

  // One product query for the order (avoids N+1 findFirst per line).
  const productKeys = [...new Set(live.map((u) => u.productId))];
  const products =
    productKeys.length === 0
      ? []
      : await db.product.findMany({
          where: {
            OR: [
              { id: { in: productKeys } },
              { slug: { in: productKeys } },
            ],
          },
          include: { plans: true },
        });
  const productByKey = new Map<string, (typeof products)[number]>();
  for (const p of products) {
    productByKey.set(p.id, p);
    productByKey.set(p.slug, p);
  }

  // Per-option stock (own vault + supplier) and the prices first paid (for locked renewal prices).
  const supply = await planSupplyMap(products);
  const paidItems = await db.orderItem.findMany({ where: { orderId }, select: { planId: true, unitPriceBdt: true } });
  const firstPaid = new Map(paidItems.map((i) => [i.planId, Number(i.unitPriceBdt)]));

  const lines: RenewLine[] = [];
  for (const [key, group] of groups) {
    const first = group[0];
    const product = productByKey.get(first.productId);
    const plan = product?.plans.find((p) => p.code === first.variantId || p.id === first.variantId);
    const current = plan ? Number(plan.priceBdt) : 0;
    // locked = renew at the price first paid; never more than today's price.
    const original = plan ? firstPaid.get(plan.id) : undefined;
    const priceLocked = Boolean(plan && plan.renewalPricing === 'locked' && original && original > 0 && original < current);
    const unitPrice = priceLocked ? (original as number) : current;
    let reason: string | undefined;
    if (!product || !plan) reason = 'No longer sold';
    else if (plan.renewable === false) reason = 'One-time plan';
    else if (product.status === 'suspended' || product.status === 'draft' || !plan.isActive) reason = 'Not available';
    else {
      const s = supply.get(plan.id);
      if (s && !s.backorder) {
        if (!s.inStock) reason = s.reason || 'Out of stock';
        else if (s.stock !== null && s.stock < group.length) reason = s.stock === 0 ? 'Out of stock' : `Only ${s.stock} in stock`;
      }
    }
    const pending = wholeOrderPending || group.some((u) => pendingIds.has(u.id));
    const endsSoonest = group.map((u) => u.orderExpiresAt).filter((x): x is string => Boolean(x)).sort()[0] || null;
    const win = renewWindow(endsSoonest, settings.renewOpenDaysBefore, settings.renewGraceDaysAfter);
    if (!reason && group.every((u) => u.status === 'pending_dispatch')) reason = 'Not delivered yet';
    if (!reason && win.state === 'not_yet') reason = `Renewal opens ${win.opensOn}`;
    if (!reason && win.state === 'closed') reason = 'Renewal period ended — place a new order';
    const ends = group
      .map((u) => u.orderExpiresAt)
      .filter((x): x is string => Boolean(x))
      .sort()[0] || null;
    lines.push({
      key,
      productName: first.productName,
      planName: first.variantName,
      units: group.length,
      unitPriceBdt: unitPrice,
      priceLocked,
      amountBdt: unitPrice * group.length,
      endsAt: ends,
      hasWarranty: group.some((u) => u.hasWarranty),
      warrantyDaysLeft: Math.max(...group.map((u) => u.warrantyRemainingDays || 0)),
      canRenew: !reason && !pending,
      pending,
      window: win.state,
      opensOn: win.opensOn,
      warranty: warrantyState(group[0]),
      reason: pending ? 'Waiting for verification' : reason,
      deliveryIds: group.map((u) => u.id),
    });
  }
  return { lines, units };
}

async function authorize(
  units: DigitalDelivery[],
  email?: string | null,
  accessToken?: string | null,
) {
  const access = await getBuyerAccess();
  if (access.kind === 'admin') return true;
  if (units.length === 0) return false;
  if (access.kind === 'member') {
    return units.every((u) => sameEmail(u.buyerEmail, access.email));
  }
  // Guest: order access token required (email alone is not enough).
  const order = await db.order.findUnique({
    where: { id: units[0].orderId },
    select: { accessToken: true },
  });
  if (!accessTokensMatch(order?.accessToken, accessToken)) return false;
  return Boolean(email) && units.every((u) => sameEmail(u.buyerEmail, email));
}

/** Quote every line of the order. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get('orderId')?.trim();
  const email = searchParams.get('email')?.trim().toLowerCase();
  const accessToken = searchParams.get('accessToken')?.trim() || '';
  if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 });
  const { lines, units } = await buildLines(orderId);
  if (!(await authorize(units, email, accessToken))) {
    return NextResponse.json({ lines: [] });
  }
  return NextResponse.json({ lines: lines.map(({ deliveryIds: _ids, ...l }) => l) });
}

/**
 * Customer renews one or more lines: records a pending renewal payment for
 * exactly those units. Admin verification extends only them.
 */
export async function POST(request: Request) {
  const ip = clientIp(request);
  const rl = guardRateLimit(request, '/api/orders/renew', 15, 10 * 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: rl.blocked ? 'Access denied from your IP address.' : 'Too many renewal attempts. Please wait a few minutes.' },
      { status: rl.blocked ? 403 : 429 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    orderId?: string;
    buyerEmail?: string;
    accessToken?: string;
    gateway?: string;
    trxId?: string;
    senderNumber?: string;
    lines?: Array<string | { key: string; qty?: number }>;
  } | null;
  const orderId = body?.orderId?.trim();
  const trxId = body?.trxId?.trim();
  const gateway = body?.gateway === 'Nagad' ? 'Nagad' : 'bKash';
  if (!orderId || !trxId) {
    return NextResponse.json({ error: 'Order and transaction ID are required.' }, { status: 400 });
  }
  if (trxId.length > 64) {
    return NextResponse.json({ error: 'Transaction ID looks too long.' }, { status: 400 });
  }

  const settings = await getStoreSettings();
  if (settings.maintenanceMode || settings.ordersPaused) {
    return NextResponse.json({ error: settings.ordersPausedMessage }, { status: 503 });
  }

  const { lines, units } = await buildLines(orderId);
  if (units.length === 0) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  if (!(await authorize(units, body?.buyerEmail, body?.accessToken))) {
    return NextResponse.json({ error: 'Not allowed for this order.' }, { status: 403 });
  }

  const asked = new Map<string, number | undefined>();
  for (const x of Array.isArray(body?.lines) ? body!.lines : []) {
    if (typeof x === 'string') asked.set(x, undefined);
    else if (x && typeof x.key === 'string') asked.set(x.key, x.qty === undefined ? undefined : Math.round(Number(x.qty)));
  }
  const wanted = (asked.size > 0 ? lines.filter((l) => asked.has(l.key)) : lines.filter((l) => l.canRenew)).map((l) => {
    // Keep the first N units (lowest #); the rest simply end with their period.
    const q = asked.get(l.key);
    const qty = q === undefined || !Number.isFinite(q) ? l.units : Math.max(1, Math.min(l.units, q));
    return { ...l, units: qty, amountBdt: l.unitPriceBdt * qty, deliveryIds: l.deliveryIds.slice(0, qty) };
  });
  if (wanted.length === 0) {
    return NextResponse.json({ error: 'Choose at least one item that can be renewed.' }, { status: 400 });
  }
  const blocked = wanted.find((l) => !l.canRenew);
  if (blocked) {
    return NextResponse.json(
      { error: `${blocked.productName} (${blocked.planName}) can't be renewed: ${blocked.reason}.` },
      { status: 409 },
    );
  }

  if (await db.paymentTransaction.findFirst({ where: { trxId } })) {
    return NextResponse.json({ error: 'This transaction ID was already used.' }, { status: 409 });
  }

  const amount = wanted.reduce((n, l) => n + l.amountBdt, 0);
  const ids = wanted.flatMap((l) => l.deliveryIds);
  const first = units.find((u) => ids.includes(u.id)) || units[0];
  const summary = wanted
    .map((l) => `${l.productName} (${l.planName})${l.units > 1 ? ` ×${l.units}` : ''}`)
    .join(', ');

  const payment = await db.paymentTransaction.create({
    data: {
      id: `pay-ren-${randomUUID().slice(0, 12)}`,
      orderId,
      buyerName: first.buyerName,
      buyerEmail: first.buyerEmail,
      productSummary: `Renewal · ${summary}`,
      amountBdt: amount,
      gateway,
      senderNumberOrRef: body?.senderNumber?.trim() || first.buyerPhone,
      trxId,
      status: 'pending_verification',
      kind: 'renewal',
      deliveryId: ids.length === 1 ? ids[0] : null,
      renewDeliveryIds: ids.join(','),
      createdAtLabel: stamp(),
    },
  });
  await db.adminNotification.create({
    data: {
      id: `notif-${randomUUID().slice(0, 12)}`,
      type: 'payment',
      orderId,
      title: `Renewal request ${orderId}`,
      message: `${first.buyerName} paid BDT ${amount} via ${gateway} (${trxId}) to renew ${summary}.`,
      timeLabel: 'Just now',
      read: false,
    },
  });
  await recordSystemActivity({
    action: 'order.renew',
    entityType: 'order',
    entityId: orderId,
    summary: `${first.buyerName} requested renewal on ${orderId} · ${summary} (৳${amount} via ${gateway}, TrxID ${trxId})`,
    ip,
  });
  return NextResponse.json({ ok: true, amountBdt: amount, paymentId: payment.id });
}
