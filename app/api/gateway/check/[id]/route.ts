import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { claimTransactionIdForOrder, registerSenderIntentForOrder } from '@/lib/gateway/verification-engine';

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
      status: order.paymentStatus === 'paid' ? 'paid' : order.status,
      paymentStatus: order.paymentStatus,
      isPaid,
      totalBdt: Number(order.totalBdt),
      paidBdt: Number(order.paidBdt),
      itemsSummary: order.items.map((i) => `${i.product.name} (${i.plan.label})`).join(', '),
      redirectUrl: `/account?order=${order.id}&paid=1`,
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
    const { action, trxId, senderNumber, gateway } = body;

    if (action === 'register_sender') {
      if (!senderNumber || typeof senderNumber !== 'string') {
        return NextResponse.json({ success: false, message: 'Sender number is required' }, { status: 400 });
      }
      const res = await registerSenderIntentForOrder(orderId, senderNumber, gateway || 'bKash');
      return NextResponse.json(res);
    }

    if (!trxId || typeof trxId !== 'string') {
      return NextResponse.json({ success: false, message: 'Transaction ID is required' }, { status: 400 });
    }

    const result = await claimTransactionIdForOrder(orderId, trxId, senderNumber, gateway);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
