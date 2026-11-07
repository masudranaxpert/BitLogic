import { randomInt, randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getStoreSettings } from '@/lib/store-settings';
import { warrantyWindow } from '@/lib/warranty';
import { scheduleState } from '@/lib/catalog/schedule';
import { decryptSecret, encryptSecret } from '@/lib/crypto/secrets';
import { generateOrderAccessToken } from '@/lib/orders/access-token';

/** Thrown for caller mistakes (4xx). Anything else is a 500. */
export class OrderError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export type OrderLineInput = {
  /** Product id or slug */
  productId: string;
  /** Plan id or plan code */
  planId: string;
  qty: number;
  /** Admin-only override of the list unit price (BDT). */
  unitPriceBdt?: number;
};

export type CreateOrderInput = {
  source: 'storefront' | 'admin';
  buyer: { name: string; email: string; phone: string };
  items: OrderLineInput[];
  couponCode?: string;
  payment: {
    gateway?: string;
    trxId?: string;
    senderRef?: string;
    /**
     * Admin only: money actually received. Omit for storefront orders
     * (those wait for payment verification).
     */
    paidBdt?: number;
  };
  /** Optional first internal note on the order. */
  note?: string;
  noteAuthor?: string;
};

export type CreateOrderResult = {
  orderId: string;
  accessToken: string;
  totalBdt: number;
  paidBdt: number;
  paymentStatus: string;
  deliveries: Array<{ id: string; status: string }>;
};

const MAX_QTY_PER_LINE = 100;
const MAX_LINES = 30;

function pad(n: number) {
  return String(n).padStart(2, '0');
}
function formatDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function formatStamp(d: Date) {
  return `${formatDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function uid(prefix: string) {
  return `${prefix}-${randomUUID().slice(0, 12)}`;
}

type Tx = Prisma.TransactionClient;

async function allocateOrderId(tx: Tx): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const candidate = `ORD-${randomInt(100000, 1000000)}`;
    const hit = await tx.order.findUnique({
      where: { id: candidate },
      select: { id: true },
    });
    if (!hit) return candidate;
  }
  throw new OrderError('Could not allocate an order id, please retry.', 503);
}

export async function createOrder(
  input: CreateOrderInput,
): Promise<CreateOrderResult> {
  const name = input.buyer.name.trim();
  const email = input.buyer.email.trim().toLowerCase();
  const phone = input.buyer.phone.trim();
  const isAdmin = input.source === 'admin';

  if (!name) throw new OrderError('Customer name is required.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new OrderError('A valid customer email is required.');
  }
  if (!isAdmin && !phone) throw new OrderError('Phone number is required.');
  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new OrderError('Order must contain at least one item.');
  }
  if (input.items.length > MAX_LINES) {
    throw new OrderError(`An order can have at most ${MAX_LINES} lines.`);
  }

  if (!isAdmin) {
    const settings = await getStoreSettings();
    if (settings.maintenanceMode) {
      throw new OrderError('The store is under maintenance. Please try again later.', 503);
    }
    if (settings.ordersPaused) {
      throw new OrderError(settings.ordersPausedMessage, 503);
    }
  }

  const trxId = (input.payment.trxId ?? '').trim();
  if (!isAdmin && !trxId) {
    throw new OrderError('Transaction ID is required.');
  }

  return db.$transaction(
    async (tx) => {
      // ---- 1. Resolve + validate lines against the live catalog ----
      type Line = {
        product: Prisma.ProductGetPayload<{ include: { plans: true } }>;
        plan: Prisma.ProductPlanGetPayload<object>;
        qty: number;
        unitPriceBdt: number;
      };
      const lines: Line[] = [];
      let subtotal = 0;

      for (const raw of input.items) {
        const qty = Math.round(Number(raw.qty));
        if (!Number.isFinite(qty) || qty < 1 || qty > MAX_QTY_PER_LINE) {
          throw new OrderError(
            `Quantity must be between 1 and ${MAX_QTY_PER_LINE}.`,
          );
        }
        const product = await tx.product.findFirst({
          where: { OR: [{ id: String(raw.productId) }, { slug: String(raw.productId) }] },
          include: { plans: true },
        });
        if (!product) {
          throw new OrderError(`Product not found: ${raw.productId}`);
        }
        // Availability = listed on storefront. Draft/hidden → no new orders.
        if (product.status !== 'active') {
          throw new OrderError(`${product.name} is not available.`);
        }
        // Order window. Admins can still place manual orders; renewals never come through here.
        if (!isAdmin) {
          const win = scheduleState({
            availableFrom: product.availableFrom?.toISOString(),
            availableUntil: product.availableUntil?.toISOString(),
          });
          if (win.state === 'upcoming') {
            throw new OrderError(`${product.name} is not on sale yet.`);
          }
          if (win.state === 'ended') {
            throw new OrderError(`${product.name} is no longer on sale — the offer has ended.`);
          }
        }
        const plan = product.plans.find(
          (p) => p.id === raw.planId || p.code === raw.planId,
        );
        if (!plan) {
          throw new OrderError(`Plan not found for ${product.name}.`);
        }
        if (!plan.isActive) {
          throw new OrderError(`${product.name} (${plan.label}) is not available.`);
        }

        // Out of stock = no vault credentials. Still-accept flag allows pending assign.
        if (!isAdmin && plan.deliveryMode === 'auto_vault') {
          const stock = await tx.vaultCredential.count({
            where: {
              status: 'available',
              AND: [
                {
                  OR: [
                    { productId: product.slug },
                    { productId: product.id },
                  ],
                },
                {
                  OR: [{ variantId: plan.code }, { variantId: plan.id }],
                },
              ],
            },
          });
          if (stock < qty && !product.allowOrderWhenOutOfStock) {
            throw new OrderError(`${product.name} is currently out of stock.`);
          }
        }

        let unit = Number(plan.priceBdt);
        if (isAdmin && raw.unitPriceBdt !== undefined) {
          const override = Number(raw.unitPriceBdt);
          if (!Number.isFinite(override) || override < 0) {
            throw new OrderError('Unit price must be 0 or more.');
          }
          unit = Math.round(override);
        }
        subtotal += unit * qty;
        lines.push({ product, plan, qty, unitPriceBdt: unit });
      }

      // ---- 2. Coupon ----
      let discount = 0;
      const couponRaw = (input.couponCode ?? '').trim().toUpperCase();
      if (couponRaw) {
        const coupon = await tx.couponCode.findFirst({
          where: { code: couponRaw, status: 'active' },
        });
        if (coupon) {
          const today = formatDate(new Date());
          if (coupon.expiresAt && coupon.expiresAt.slice(0, 10) < today) {
            throw new OrderError('This coupon has expired.');
          }
          if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
            throw new OrderError('This coupon has reached its usage limit.');
          }
          if (subtotal < coupon.minSpendBdt) {
            throw new OrderError(
              `Coupon needs a minimum spend of BDT ${coupon.minSpendBdt}.`,
            );
          }
          discount =
            coupon.discountType === 'percentage'
              ? Math.round((subtotal * coupon.discountValue) / 100)
              : Math.min(subtotal, coupon.discountValue);
          await tx.couponCode.update({
            where: { id: coupon.id },
            data: { usedCount: { increment: 1 } },
          });
        } else {
          throw new OrderError('Invalid coupon code.');
        }
      }
      const total = Math.max(0, subtotal - discount);

      // ---- 3. Payment bookkeeping ----
      let paid = 0;
      let paymentStatus = 'pending';
      if (isAdmin) {
        paid = Math.max(0, Math.round(Number(input.payment.paidBdt ?? 0) || 0));
        paymentStatus =
          paid <= 0 ? 'unpaid' : paid >= total ? 'paid' : 'partial';
      }

      const now = new Date();
      const stamp = formatStamp(now);
      const startedAt = formatDate(now);
      const orderId = await allocateOrderId(tx);
      const orderNum = orderId.replace('ORD-', '');
      const accessToken = generateOrderAccessToken();

      const existingUser = await tx.user.findUnique({
        where: { email },
        select: { id: true },
      });

      await tx.order.create({
        data: {
          id: orderId,
          userId: existingUser?.id ?? null,
          status: 'PENDING',
          totalBdt: total,
          paidBdt: paid,
          paymentStatus,
          source: input.source,
          accessToken,
          items: {
            create: lines.map((l) => ({
              productId: l.product.id,
              planId: l.plan.id,
              qty: l.qty,
              unitPriceBdt: l.unitPriceBdt,
            })),
          },
        },
      });

      const summary = lines
        .map((l) => `${l.product.name} (${l.plan.label}) × ${l.qty}`)
        .join(', ');

      const gateway = (input.payment.gateway ?? '').trim();
      if (!isAdmin || paid > 0 || trxId) {
        await tx.paymentTransaction.create({
          data: {
            id: uid('trx'),
            orderId,
            buyerName: name,
            buyerEmail: email,
            productSummary: summary,
            amountBdt: isAdmin ? paid : total,
            gateway: gateway || (isAdmin ? 'Cash' : 'bKash'),
            senderNumberOrRef: (input.payment.senderRef ?? phone).trim(),
            trxId: trxId || (isAdmin ? '—' : ''),
            status: isAdmin ? 'verified' : 'pending_verification',
            kind: isAdmin ? 'manual' : 'purchase',
            createdAtLabel: stamp,
          },
        });
      }

      // ---- 4. CRM row ----
      const sub = await tx.adminSubscriber.findUnique({ where: { email } });
      if (sub) {
        await tx.adminSubscriber.update({
          where: { email },
          data: {
            name,
            phone: phone || sub.phone,
            ordersCount: { increment: 1 },
            totalSpentBdt: { increment: isAdmin ? paid : total },
          },
        });
      } else {
        await tx.adminSubscriber.create({
          data: {
            id: uid('cust'),
            name,
            email,
            phone,
            joinedAt: startedAt,
            status: 'active',
            role: 'subscriber',
            totalSpentBdt: isAdmin ? paid : total,
            ordersCount: 1,
            warrantyClaimsCount: 0,
            subscriptionsJson: '[]',
          },
        });
      }

      // ---- 5. One delivery per unit; claim vault stock atomically ----
      const totalUnits = lines.reduce((n, l) => n + l.qty, 0);
      const deliveries: Array<{ id: string; status: string }> = [];
      let unitCounter = 0;

      for (const l of lines) {
        const { product, plan, qty } = l;
        const durationDays = plan.durationDays || 30;
        const expires = new Date(now);
        expires.setDate(expires.getDate() + durationDays);
        const expiresAt = formatDate(expires);

        const candidates =
          plan.deliveryMode === 'auto_vault'
            ? await tx.vaultCredential.findMany({
                where: {
                  OR: [
                    { productId: product.slug, variantId: plan.code },
                    { productId: product.slug, variantId: plan.id },
                    { productId: product.id, variantId: plan.code },
                    { productId: product.id, variantId: plan.id },
                  ],
                  status: 'available',
                },
                orderBy: { createdAt: 'asc' },
                take: qty,
              })
            : [];

        for (let i = 0; i < qty; i++) {
          unitCounter++;
          const deliveryId =
            totalUnits === 1
              ? `DLV-${orderNum}`
              : `DLV-${orderNum}-${unitCounter}`;

          // Guarded claim — only wins if the row is still 'available'.
          let vault: (typeof candidates)[number] | null = null;
          const candidate = candidates[i];
          if (candidate) {
            const claimed = await tx.vaultCredential.updateMany({
              where: { id: candidate.id, status: 'available' },
              data: {
                status: 'delivered',
                assignedOrderId: orderId,
                assignedBuyerEmail: email,
              },
            });
            if (claimed.count === 1) vault = candidate;
          }
          const instant = Boolean(vault);
          const credExpires = instant
            ? vault?.expiresAt || expiresAt
            : null;

          await tx.digitalDelivery.create({
            data: {
              id: deliveryId,
              orderId,
              createdAtLabel: stamp,
              deliveredAt: instant ? stamp : null,
              buyerName: name,
              buyerEmail: email,
              buyerPhone: phone,
              productId: product.slug,
              productName: product.name,
              variantId: plan.code,
              variantName: plan.label,
              credentialType: plan.credentialType || 'email_login',
              deliveryMode: plan.deliveryMode || 'auto_vault',
              status: instant ? 'delivered' : 'pending_dispatch',
              vaultCredentialId: vault?.id ?? null,
              vpnRequired: plan.vpnRequired,
              vpnRegionNote: plan.vpnRegionNote || '',
              hasWarranty: plan.hasWarranty,
              warrantyDays: plan.warrantyDays || 0,
              warrantyRemainingDays: plan.warrantyDays || 0,
              // Warranty starts when the buyer actually gets access.
              ...(instant && plan.hasWarranty && plan.warrantyDays
                ? (() => {
                    const w = warrantyWindow(now, plan.warrantyDays, expiresAt);
                    return { warrantyStartsAt: w.startsAt, warrantyEndsAt: w.endsAt };
                  })()
                : {}),
              warrantyTerms: plan.warrantyHeadline || '',
              replacementHistoryCount: 0,
              loginInstructionsJson: plan.detailsJson || '[]',
              customAdminNote: '',
              unreadChatCount: 0,
              chatMessagesJson: JSON.stringify([
                {
                  id: uid('msg'),
                  sender: 'support',
                  senderName: 'Support',
                  text: instant
                    ? `Thank you for your order! Your credentials for ${product.name} (${plan.label}) have been provisioned.`
                    : `Order ${orderId} received. Your access for ${product.name} (${plan.label}) will be dispatched shortly.`,
                  time: 'Just now',
                },
              ]),
              pinned: false,
              orderExpiresAt: expiresAt,
              credentialValidDays: durationDays,
              credentialAssignedAt: instant ? startedAt : null,
              credentialExpiresAt: credExpires,
              renewalPending: false,
              orderQuantity: qty,
              unitIndex: i + 1,
            },
          });

          if (vault) {
            await tx.credentialAudit.create({
              data: {
                id: `aud-${deliveryId}-1`,
                deliveryId,
                atLabel: stamp,
                action: 'assigned',
                source: 'vault',
                secretValue: encryptSecret(decryptSecret(vault.secretValue)),
                vaultCredentialId: vault.id,
                credentialExpiresAt: credExpires,
              },
            });
          }
          deliveries.push({
            id: deliveryId,
            status: instant ? 'delivered' : 'pending_dispatch',
          });
        }
      }

      // ---- 6. Optional first note ----
      const note = (input.note ?? '').trim();
      if (note) {
        await tx.orderNote.create({
          data: {
            orderId,
            text: note.slice(0, 2000),
            authorName: input.noteAuthor || 'Admin',
          },
        });
      }

      // ---- 7. Admin notification (storefront orders only) ----
      if (!isAdmin) {
        const pendingAssign = deliveries.filter(
          (d) => d.status === 'pending_dispatch',
        ).length;
        await tx.adminNotification.create({
          data: {
            id: uid('notif'),
            type: 'new_order',
            orderId,
            title: `New Order ${orderId}`,
            message:
              pendingAssign > 0
                ? `${name} ordered ${summary} (BDT ${total}) via ${gateway || 'bKash'}. TrxID: ${trxId}. ${pendingAssign} unit(s) pending assign.`
                : `${name} ordered ${summary} (BDT ${total}) via ${gateway || 'bKash'}. TrxID: ${trxId}`,
            timeLabel: 'Just now',
            read: false,
          },
        });
      }

      return {
        orderId,
        accessToken,
        totalBdt: total,
        paidBdt: paid,
        paymentStatus,
        deliveries,
      };
    },
    { timeout: 60_000, maxWait: 15_000 },
  );
}
