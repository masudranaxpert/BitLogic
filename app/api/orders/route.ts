import { NextResponse } from 'next/server';
import { clientIp, rateLimit } from '@/lib/auth/rate-limit';
import { db } from '@/lib/db';
import { warrantyState } from '@/lib/warranty';
import { createOrder, OrderError } from '@/lib/orders/create-order';
import { getBuyerAccess } from '@/lib/auth/buyer-access';
import { accessTokensMatch } from '@/lib/orders/access-token';
import { decryptSecret } from '@/lib/crypto/secrets';
import { runServerCredentialLifecycle } from '@/lib/admin/run-lifecycle-server';

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function parseGuestProofs(raw: string | null): Map<string, string> {
  const map = new Map<string, string>();
  if (!raw) return map;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return map;
    for (const row of parsed) {
      if (
        row &&
        typeof row === 'object' &&
        typeof (row as { orderId?: unknown }).orderId === 'string' &&
        typeof (row as { token?: unknown }).token === 'string'
      ) {
        map.set(
          (row as { orderId: string }).orderId,
          (row as { token: string }).token,
        );
      }
    }
  } catch {
    /* ignore */
  }
  return map;
}

export async function POST(request: Request) {
  if (!rateLimit(`orders:${clientIp(request)}`, 15, 10 * 60_000).ok) {
    return NextResponse.json({ error: 'Too many requests. Please wait a few minutes.' }, { status: 429 });
  }
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid or empty JSON body' }, { status: 400 });
  }
  if (!body || typeof body !== 'object' || !Array.isArray(body.items)) {
    return NextResponse.json({ error: 'Order must contain at least one item' }, { status: 400 });
  }

  try {
    const result = await createOrder({
      source: 'storefront',
      buyer: {
        name: String(body.customerName ?? ''),
        email: String(body.customerEmail ?? ''),
        phone: String(body.customerPhone ?? ''),
      },
      items: body.items.map((it: any) => ({
        productId: String(it?.productId ?? ''),
        planId: String(it?.planId ?? ''),
        qty: Number(it?.qty),
      })),
      couponCode: body.couponCode ? String(body.couponCode) : undefined,
      payment: {
        gateway: body.gateway ? String(body.gateway) : 'bKash',
        trxId: body.trxId ? String(body.trxId) : '',
      },
    });
    return NextResponse.json({
      ok: true,
      orderId: result.orderId,
      accessToken: result.accessToken,
      totalBdt: result.totalBdt,
      status: 'PENDING',
      message: 'Order created successfully',
    });
  } catch (err) {
    if (err instanceof OrderError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('[api/orders POST]', err);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    // Expiry / renew windows without waiting for an admin browser session.
    try {
      await runServerCredentialLifecycle();
    } catch (e) {
      console.error('[api/orders GET] lifecycle', e);
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email')?.trim().toLowerCase() || '';
    const orderId = searchParams.get('orderId')?.trim() || '';
    const orderIds = (searchParams.get('orderIds') || '')
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 50);
    const singleToken = searchParams.get('accessToken')?.trim() || '';
    const guestProofs = parseGuestProofs(searchParams.get('accessProofs'));
    if (orderId && singleToken) guestProofs.set(orderId, singleToken);

    const access = await getBuyerAccess();
    const deliveryWhere: Record<string, unknown> = {};
    let allowedOrderIds: string[] | null = null;

    if (access.kind === 'admin') {
      if (email) deliveryWhere.buyerEmail = email;
      if (orderId) deliveryWhere.orderId = orderId;
    } else if (access.kind === 'member') {
      deliveryWhere.buyerEmail = access.email;
      if (orderId) deliveryWhere.orderId = orderId;
    } else {
      const ids = orderId ? [orderId] : orderIds;
      if (!email || ids.length === 0) {
        return NextResponse.json({ ok: true, orders: [], deliveriesCount: 0 });
      }
      const orders = await db.order.findMany({
        where: { id: { in: ids } },
        select: { id: true, accessToken: true },
      });
      allowedOrderIds = orders
        .filter((o) => {
          const proof = guestProofs.get(o.id) || (ids.length === 1 ? singleToken : '');
          return accessTokensMatch(o.accessToken, proof);
        })
        .map((o) => o.id);
      if (allowedOrderIds.length === 0) {
        return NextResponse.json({ ok: true, orders: [], deliveriesCount: 0 });
      }
      deliveryWhere.buyerEmail = email;
      deliveryWhere.orderId = { in: allowedOrderIds };
    }

    const deliveries = await db.digitalDelivery.findMany({
      where: deliveryWhere,
      include: {
        credentialAudits: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const vaultIds = deliveries
      .map((d) => d.vaultCredentialId)
      .filter((id): id is string => Boolean(id));
    const vaultRows =
      vaultIds.length > 0
        ? await db.vaultCredential.findMany({
            where: { id: { in: vaultIds } },
          })
        : [];
    const vaultMap = new Map(vaultRows.map((v) => [v.id, v]));

    const uniqueOrderIds = Array.from(new Set(deliveries.map((d) => d.orderId)));
    const payments =
      uniqueOrderIds.length > 0
        ? await db.paymentTransaction.findMany({
            where: { orderId: { in: uniqueOrderIds } },
          })
        : [];
    const paymentByOrderId = new Map(payments.map((p) => [p.orderId, p]));

    const orderGroups = new Map<string, typeof deliveries>();
    for (const d of deliveries) {
      const list = orderGroups.get(d.orderId) || [];
      list.push(d);
      orderGroups.set(d.orderId, list);
    }

    const consolidatedOrders = Array.from(orderGroups.entries()).map(
      ([ordId, group]) => {
        const first = group[0];
        const payment = paymentByOrderId.get(ordId);
        const unitsCount = group.length;

        const allDelivered = group.every(
          (d) =>
            d.status === 'delivered' ||
            d.status === 'refunded' ||
            d.status === 'revoked',
        );
        const anyClaim = group.some((d) => d.status === 'warranty_claim');
        const allRefunded = group.every(
          (d) => d.status === 'refunded' || d.status === 'revoked',
        );
        const overallStatus = allRefunded
          ? 'Refunded'
          : anyClaim
            ? 'Warranty Claim'
            : allDelivered
              ? 'Active'
              : 'Pending (10–24h)';

        const units = group.map((d) => {
          const v = d.vaultCredentialId
            ? vaultMap.get(d.vaultCredentialId)
            : null;
          const latestAudit = d.credentialAudits?.[0];
          const secretValue = decryptSecret(
            v?.secretValue ||
              latestAudit?.secretValue ||
              '',
          );
          const password = v?.password
            ? decryptSecret(v.password)
            : undefined;

          return {
            deliveryId: d.id,
            orderId: d.orderId,
            unitIndex: d.unitIndex || 1,
            orderQuantity: d.orderQuantity || 1,
            productName: d.productName,
            variantName: d.variantName,
            /** Same key the renew API uses for a line (product + plan). */
            lineKey: `${d.productId}|${d.variantId}`,
            orderExpiresAt: d.orderExpiresAt,
            credentialType: d.credentialType,
            status: d.status,
            secretValue,
            email: v?.email || undefined,
            password,
            profilePin: v?.profilePin || undefined,
            vpnRequired: d.vpnRequired,
            vpnRegionNote: d.vpnRegionNote,
            hasWarranty: d.hasWarranty,
            warrantyDays: d.warrantyDays,
            warrantyRemainingDays: warrantyState(d).daysLeft,
            /** Live warranty clock (starts at delivery; next period queued on early renewal). */
            warranty: warrantyState(d),
            warrantyTerms: d.warrantyTerms,
            credentialExpiresAt: d.credentialExpiresAt,
            chatMessages: parseJson(d.chatMessagesJson, []),
            unreadChatCount: d.unreadChatCount || 0,
            deliveredAt: d.deliveredAt,
          };
        });

        const productSummary = Array.from(
          new Set(group.map((d) => `${d.productName} (${d.variantName})`)),
        ).join(', ');

        return {
          id: ordId,
          productName: first.productName,
          planName: first.variantName,
          productSummary,
          quantity: unitsCount,
          date: first.createdAtLabel.slice(0, 10),
          createdAtLabel: first.createdAtLabel,
          // Mixed orders: the soonest end among live items is what needs attention.
          expiryDate:
            group
              .filter((d) => d.status !== 'refunded' && d.status !== 'revoked')
              .map((d) => d.orderExpiresAt)
              .filter(Boolean)
              .sort()[0] ||
            first.orderExpiresAt ||
            first.credentialExpiresAt ||
            'N/A',
          price: payment?.amountBdt || 0,
          paymentMethod: (payment?.gateway?.toLowerCase().includes('nagad')
            ? 'nagad'
            : 'bkash') as 'bkash' | 'nagad',
          trxId: payment?.trxId || 'N/A',
          status: overallStatus,
          warrantyLabel:
            first.warrantyTerms || `${first.warrantyDays}D Warranty`,
          warrantyDaysLeft: Math.max(
            0,
            ...group.map((d) => warrantyState(d).daysLeft),
          ),
          buyerName: first.buyerName,
          buyerEmail: first.buyerEmail,
          buyerPhone: first.buyerPhone,
          loginEmail: units[0]?.email || first.buyerEmail,
          loginPassword: units[0]?.password,
          profilePin: units[0]?.profilePin,
          secretText: units[0]?.secretValue,
          units,
          chatMessages: units[0]?.chatMessages || [],
          unreadChatCount: group.reduce(
            (sum, d) => sum + (d.unreadChatCount || 0),
            0,
          ),
        };
      },
    );

    return NextResponse.json({
      ok: true,
      orders: consolidatedOrders,
      deliveriesCount: deliveries.length,
    });
  } catch (err) {
    console.error('[api/orders GET]', err);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 },
    );
  }
}
