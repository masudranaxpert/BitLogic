import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(5, parseInt(searchParams.get('limit') || '15', 10)));
    const status = searchParams.get('status');
    const gateway = searchParams.get('gateway');

    const where: any = {};
    if (status && status !== 'all') where.status = status;
    if (gateway && gateway !== 'all') where.gateway = gateway;

    const [total, logs] = await Promise.all([
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
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return NextResponse.json({
      success: true,
      logs,
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
