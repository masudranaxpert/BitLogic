import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-admin';
import { db } from '@/lib/db';
import { createOrder, OrderError } from '@/lib/orders/create-order';

/** Order header + priced line items for the admin order page. */
export async function GET(request: Request) {
  const { error } = await requirePermission('orders');
  if (error) return error;
  const orderId = new URL(request.url).searchParams.get('orderId')?.trim();
  if (!orderId) {
    return NextResponse.json({ error: 'orderId required' }, { status: 400 });
  }
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: true, plan: true } } },
  });
  if (!order) return NextResponse.json({ order: null, items: [] });
  return NextResponse.json({
    order: {
      id: order.id,
      totalBdt: Number(order.totalBdt),
      paidBdt: Number(order.paidBdt),
      paymentStatus: order.paymentStatus,
      source: order.source,
      createdAt: order.createdAt.toISOString(),
    },
    items: order.items.map((it) => ({
      productId: it.product.slug,
      planId: it.plan.code,
      qty: it.qty,
      unitPriceBdt: Number(it.unitPriceBdt),
      listPriceBdt: Number(it.plan.priceBdt),
    })),
  });
}

/** Manual order created by an admin (phone/chat/cash sales). */
export async function POST(request: Request) {
  const { session, error } = await requirePermission('orders');
  if (error) return error;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!body || typeof body !== 'object' || !Array.isArray(body.items)) {
    return NextResponse.json({ error: 'Add at least one product line.' }, { status: 400 });
  }

  try {
    const result = await createOrder({
      source: 'admin',
      buyer: {
        name: String(body.customerName ?? ''),
        email: String(body.customerEmail ?? ''),
        phone: String(body.customerPhone ?? ''),
      },
      items: body.items.map((it: any) => ({
        productId: String(it?.productId ?? ''),
        planId: String(it?.planId ?? ''),
        qty: Number(it?.qty),
        unitPriceBdt:
          it?.unitPriceBdt === undefined || it?.unitPriceBdt === ''
            ? undefined
            : Number(it.unitPriceBdt),
      })),
      payment: {
        gateway: body.gateway ? String(body.gateway) : undefined,
        trxId: body.trxId ? String(body.trxId) : undefined,
        paidBdt: body.paidBdt === undefined ? 0 : Number(body.paidBdt),
      },
      note: body.note ? String(body.note) : undefined,
      noteAuthor: session?.name || session?.email || 'Admin',
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof OrderError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('[admin/orders POST]', err);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
