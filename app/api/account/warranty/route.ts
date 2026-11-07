import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { warrantyState } from '@/lib/warranty';
import { getBuyerAccess, sameEmail } from '@/lib/auth/buyer-access';
import { accessTokensMatch } from '@/lib/orders/access-token';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    if (!email) {
      return NextResponse.json({ claims: [] });
    }

    const cleanEmail = email.trim().toLowerCase();
    const access = await getBuyerAccess();
    if (access.kind === 'guest' || (access.kind === 'member' && access.email !== cleanEmail)) {
      return NextResponse.json({ ok: true, claims: [] });
    }
    const deliveries = await db.digitalDelivery.findMany({
      where: {
        buyerEmail: cleanEmail,
        OR: [
          { status: 'warranty_claim' },
          { status: 'replaced' },
          { warrantyClaimReason: { not: null } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    const seenOrder = new Set<string>();
    const claims = [];

    for (let i = 0; i < deliveries.length; i++) {
      const d = deliveries[i];
      if (seenOrder.has(d.orderId)) continue;
      seenOrder.add(d.orderId);

      const rawReason = d.warrantyClaimReason || '';
      const match = rawReason.match(/^\[(.*?)\]\s*(.*)$/);
      const issueType = match ? match[1] : 'Account Issue';
      const description = match ? match[2] : (rawReason || 'Warranty service requested');

      claims.push({
        id: `WRN-${d.orderId.replace(/[^0-9]/g, '') || String(i + 101)}`,
        orderId: d.orderId,
        productName: d.productName,
        planName: d.variantName,
        issueType,
        description,
        date: d.createdAtLabel.slice(0, 10),
        status: d.status === 'replaced' || d.status === 'delivered' ? 'Resolved' : 'In Review',
      });
    }

    return NextResponse.json({ ok: true, claims });
  } catch (err) {
    console.error('[api/account/warranty GET]', err);
    return NextResponse.json(
      { error: 'Failed to fetch warranty claims' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid or empty JSON body' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Request body must be a valid JSON object' }, { status: 400 });
  }

  try {
    const { orderId, issueType, description, buyerName } = body;
    // Optional: claim only specific items of a mixed order.
    const onlyIds: string[] = Array.isArray(body.deliveryIds)
      ? body.deliveryIds.map((x: unknown) => String(x)).slice(0, 100)
      : [];

    if (!orderId || !issueType || !description) {
      return NextResponse.json(
        { error: 'Order ID, issue type, and description are required' },
        { status: 400 },
      );
    }

    const cleanOrd = String(orderId).trim();
    const deliveries = await db.digitalDelivery.findMany({
      where: onlyIds.length
        ? { orderId: cleanOrd, id: { in: onlyIds } }
        : { orderId: cleanOrd, status: { notIn: ['refunded', 'revoked'] } },
    });

    if (deliveries.length === 0) {
      return NextResponse.json(
        { error: `Order ${cleanOrd} not found` },
        { status: 404 },
      );
    }

    const access = await getBuyerAccess();
    if (access.kind === 'member') {
      if (!deliveries.every((d) => sameEmail(d.buyerEmail, access.email))) {
        return NextResponse.json({ error: 'Not allowed for this order.' }, { status: 403 });
      }
    } else if (access.kind !== 'admin') {
      // Guests prove ownership with the order's private access token, not just an email.
      const order = await db.order.findUnique({ where: { id: cleanOrd }, select: { accessToken: true } });
      if (!accessTokensMatch(order?.accessToken, body.accessToken)) {
        return NextResponse.json({ error: 'Order access token required.' }, { status: 403 });
      }
    }
    if (typeof description !== 'string' || typeof issueType !== 'string') {
      return NextResponse.json({ error: 'Invalid claim details' }, { status: 400 });
    }
    if (deliveries.every((d) => d.status === 'warranty_claim')) {
      return NextResponse.json({ error: 'A claim is already open for this order.' }, { status: 409 });
    }
    if (deliveries.every((d) => d.hasWarranty && warrantyState(d).state !== 'active')) {
      return NextResponse.json(
        { error: 'This item has no running warranty (not started yet or already ended).' },
        { status: 400 },
      );
    }
    if (deliveries.every((d) => !d.hasWarranty)) {
      return NextResponse.json({ error: 'This order has no warranty.' }, { status: 400 });
    }

    const claimReason = `[${String(issueType).slice(0, 60)}] ${description.trim().slice(0, 2000)}`;
    // Only items with a running warranty that aren't already under a claim.
    const eligible = deliveries.filter(
      (d) => d.hasWarranty && d.status !== 'warranty_claim' && warrantyState(d).state === 'active',
    );
    if (eligible.length === 0) {
      return NextResponse.json({ error: 'No item in this order can be claimed right now.' }, { status: 400 });
    }

    for (const d of eligible) {
      await db.digitalDelivery.update({
        where: { id: d.id },
        data: {
          status: 'warranty_claim',
          warrantyClaimReason: claimReason,
        },
      });
    }

    // Increment warranty claims count on subscriber if exists
    {
      await db.adminSubscriber.updateMany({
        where: { email: eligible[0].buyerEmail.trim().toLowerCase() },
        data: {
          warrantyClaimsCount: { increment: 1 },
        },
      });
    }

    // Create Admin notification
    await db.adminNotification.create({
      data: {
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: 'warranty',
        orderId: cleanOrd,
        title: `Warranty claim on ${cleanOrd}`,
        message: `${buyerName || 'Customer'}: ${issueType} — "${description.slice(0, 60)}"`,
        timeLabel: 'Just now',
        read: false,
      },
    });

    return NextResponse.json({
      ok: true,
      orderId: cleanOrd,
      status: 'warranty_claim',
      message: 'Warranty claim submitted successfully',
    });
  } catch (err) {
    console.error('[api/account/warranty POST]', err);
    return NextResponse.json(
      { error: 'Failed to submit warranty claim' },
      { status: 500 },
    );
  }
}
