import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getStoreSettings } from '@/lib/store-settings';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  try {
    const devices = await db.mfsDevice.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { smsLogs: true } },
      },
    });

    return NextResponse.json({ success: true, devices });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { deviceName, phoneNumber, gateway = 'all', simSlot = 'SIM 1' } = body;

    if (!deviceName) {
      return NextResponse.json({ success: false, message: 'Device name is required' }, { status: 400 });
    }

    // Automatically resolve phone number from configured payment methods if not explicitly passed
    let resolvedPhone = (phoneNumber || '').trim();
    if (!resolvedPhone) {
      const settings = await getStoreSettings();
      if (gateway === 'bkash') {
        resolvedPhone = settings.bkashNumber || 'Linked bKash SIM';
      } else if (gateway === 'nagad') {
        resolvedPhone = settings.nagadNumber || 'Linked Nagad SIM';
      } else if (gateway === 'rocket') {
        resolvedPhone = settings.rocketNumber || 'Linked Rocket SIM';
      } else {
        const numbers = [settings.bkashNumber, settings.nagadNumber].filter(Boolean);
        resolvedPhone = numbers[0] || 'Multi-Gateway SIM';
      }
    }

    const apiKey = 'mfs_' + crypto.randomBytes(16).toString('hex');

    const device = await db.mfsDevice.create({
      data: {
        deviceName: deviceName.trim(),
        phoneNumber: resolvedPhone,
        gateway,
        simSlot,
        apiKey,
        status: 'active',
      },
    });

    return NextResponse.json({ success: true, device });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, message: 'ID required' }, { status: 400 });

    await db.mfsDevice.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
