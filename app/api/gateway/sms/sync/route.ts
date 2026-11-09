import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { processIncomingMfsSms } from '@/lib/gateway/verification-engine';
import { isValidMfsSender } from '@/lib/gateway/mfs-parser';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization') || '';
    const apiKey = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!apiKey) {
      return NextResponse.json({ success: false, message: 'Unauthorized: Missing API Key' }, { status: 401 });
    }

    // Authenticate the device
    const device = await db.mfsDevice.findUnique({
      where: { apiKey },
    });

    if (!device || device.status === 'paused') {
      return NextResponse.json({ success: false, message: 'Unauthorized or device paused' }, { status: 403 });
    }

    const body = await req.json();
    const {
      batteryPct,
      isCharging,
      transactions, // Array of { rawSms, sender, timestamp } or single object
    } = body;

    // Update Device telemetry / heartbeat
    await db.mfsDevice.update({
      where: { id: device.id },
      data: {
        lastSeenAt: new Date(),
        batteryPct: typeof batteryPct === 'number' ? batteryPct : device.batteryPct,
        isCharging: typeof isCharging === 'boolean' ? isCharging : device.isCharging,
      },
    });

    const items = Array.isArray(transactions) ? transactions : [body];
    const results = [];

    for (const item of items) {
      const rawSms = item.rawSms || item.messageBody || item.text || '';
      const sender = item.sender || item.originatingAddress || '';

      if (!rawSms) continue;

      // Anti-spoofing sender check
      if (!isValidMfsSender(sender)) {
        console.warn(`[MFS Sync] Ignored SMS from untrusted sender: ${sender}`);
        continue;
      }

      const res = await processIncomingMfsSms(rawSms, sender, device.id);
      results.push({ trxId: item.trxId, ...res });
    }

    return NextResponse.json({
      success: true,
      processedCount: results.length,
      results,
    });
  } catch (error: any) {
    console.error('Error in /api/gateway/sms/sync:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
