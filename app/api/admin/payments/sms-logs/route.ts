import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/auth/require-admin';
import { manualMatchSmsToOrder } from '@/lib/gateway/verification-engine';
import { recordActivity, requestIp } from '@/lib/audit/record';

export async function GET(req: NextRequest) {
  const { error } = await requirePermission('payments');
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(5, parseInt(searchParams.get('limit') || '20', 10)));
    const status = searchParams.get('status');
    const gateway = searchParams.get('gateway');
    const search = (searchParams.get('search') || '').trim();

    const where: any = {};
    if (status && status !== 'all') where.status = status;
    if (gateway && gateway !== 'all') where.gateway = gateway;
    if (search) {
      where.OR = [
        { trxId: { contains: search } },
        { senderNumber: { contains: search } },
        { rawSms: { contains: search } },
        { matchedOrderId: { contains: search } },
        { reference: { contains: search } },
        { senderAddress: { contains: search } },
      ];
    }

    const [total, logs, matchedCount, unmatchedCount, parseFailedCount] = await Promise.all([
      db.mfsSmsLog.count({ where }),
      db.mfsSmsLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          device: { select: { deviceName: true, phoneNumber: true } },
        },
      }),
      db.mfsSmsLog.count({ where: { status: 'matched' } }),
      db.mfsSmsLog.count({ where: { status: 'unmatched' } }),
      db.mfsSmsLog.count({ where: { status: 'parse_failed' } }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return NextResponse.json({
      success: true,
      logs,
      counts: {
        all: matchedCount + unmatchedCount + parseFailedCount,
        matched: matchedCount,
        unmatched: unmatchedCount,
        parse_failed: parseFailedCount,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { session, error } = await requirePermission('payments');
  if (error) return error;

  try {
    const body = await req.json();
    const { smsLogId, orderId } = body || {};

    if (!smsLogId || !orderId) {
      return NextResponse.json(
        { success: false, message: 'Both smsLogId and orderId are required' },
        { status: 400 },
      );
    }

    const result = await manualMatchSmsToOrder(
      String(smsLogId).trim(),
      String(orderId).trim().toUpperCase(),
      session.id,
    );

    if (result.success) {
      await recordActivity({
        userId: session.id,
        action: 'payment.manual_match',
        entityType: 'order',
        entityId: result.orderId || String(orderId).trim().toUpperCase(),
        summary: `Manually linked SMS log (${smsLogId}) to order ${result.orderId || orderId}`,
        ip: requestIp(req),
      });
    }

    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to manually match SMS' },
      { status: 500 },
    );
  }
}
