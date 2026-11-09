import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/auth/require-admin';
import { processIncomingMfsSms } from '@/lib/gateway/verification-engine';
import { recordActivity, requestIp } from '@/lib/audit/record';

/**
 * Manual Sync & Re-Verification Engine (POST /api/admin/payments/reconcile)
 * Scans all unmatched / parse_failed MFS SMS logs from the last 72 hours
 * and re-runs the 3-Mode Verification Engine against pending/unpaid orders
 * and pending_verification payment transactions.
 */
export async function POST(req: NextRequest) {
  const { session, error } = await requirePermission('payments');
  if (error) return error;

  try {
    const seventyTwoHoursAgo = new Date(Date.now() - 72 * 60 * 60 * 1000);

    const candidateLogs = await db.mfsSmsLog.findMany({
      where: {
        status: { in: ['unmatched', 'parse_failed'] },
        createdAt: { gte: seventyTwoHoursAgo },
      },
      orderBy: { receivedAt: 'asc' },
      take: 250,
    });

    let verifiedCount = 0;
    const verifiedOrders: string[] = [];

    for (const log of candidateLogs) {
      if (!log.rawSms || !log.rawSms.trim()) continue;
      const res = await processIncomingMfsSms(
        log.rawSms,
        log.senderAddress,
        log.deviceId || undefined,
        log.receivedAt ? log.receivedAt.getTime() : undefined,
      );
      if (res.success && res.orderId) {
        verifiedCount += 1;
        if (!verifiedOrders.includes(res.orderId)) {
          verifiedOrders.push(res.orderId);
        }
      }
    }

    await recordActivity({
      userId: session.id,
      action: 'payment.manual_sync',
      entityType: 'payment',
      entityId: verifiedOrders.join(', ') || 'reconcile',
      summary: `Manual payment sync executed by ${session.email} · Checked ${candidateLogs.length} unmatched SMS · Auto-verified ${verifiedCount} order(s)${verifiedOrders.length ? ` (${verifiedOrders.join(', ')})` : ''}`,
      ip: requestIp(req),
    });

    return NextResponse.json({
      success: true,
      checkedCount: candidateLogs.length,
      verifiedCount,
      verifiedOrders,
      message:
        verifiedCount > 0
          ? `Synced ${candidateLogs.length} SMS logs and auto-verified ${verifiedCount} pending order(s): ${verifiedOrders.join(', ')}`
          : `Checked ${candidateLogs.length} unmatched SMS logs (last 72h). No new pending order matches found.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || 'Failed to run manual payment sync' },
      { status: 500 },
    );
  }
}
