import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const status = searchParams.get('status');

    const where: any = {};
    if (status) where.status = status;

    const logs = await db.mfsSmsLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        device: { select: { deviceName: true, phoneNumber: true } },
      },
    });

    return NextResponse.json({ success: true, logs });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
