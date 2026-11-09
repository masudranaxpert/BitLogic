import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { claimTransactionIdForOrder } from '@/lib/gateway/verification-engine';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { product: true, plan: true } },
      },
    });

    if (!order) {
      return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
    }

    const isPaid = order.paymentStatus === 'paid';
    return NextResponse.json({
      success: true,
      orderId: order.id,
      status: order.status,
      paymentStatus: order.paymentStatus,
      isPaid,
      totalBdt: Number(order.totalBdt),
      paidBdt: Number(order.paidBdt),
      itemsSummary: order.items.map((i) => `${i.product.name} (${i.plan.label})`).join(', '),
      redirectUrl: `/account?order=${order.id}`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const body = await req.json();
    const { trxId, senderNumber } = body;

    if (!trxId || typeof trxId !== 'string') {
      return NextResponse.json({ success: false, message: 'Transaction ID is required' }, { status: 400 });
    }

    const result = await claimTransactionIdForOrder(orderId, trxId, senderNumber);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
