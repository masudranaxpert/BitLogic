import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { guardRateLimit } from '@/lib/auth/rate-limit';

function pad(n: number) {
  return String(n).padStart(2, '0');
}
function formatDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export async function POST(req: Request) {
  const rl = guardRateLimit(req, '/api/coupons/validate', 15, 5 * 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { valid: false, message: rl.blocked ? 'Access denied.' : 'Too many coupon attempts. Please try again in a few minutes.' },
      { status: rl.blocked ? 403 : 429 },
    );
  }

  try {
    const body = await req.json().catch(() => null);
    const codeRaw = String(body?.code || '').trim().toUpperCase();
    const subtotalBdt = Math.max(0, Number(body?.subtotalBdt) || 0);

    if (!codeRaw) {
      return NextResponse.json({ valid: false, message: 'Enter a coupon code.' }, { status: 400 });
    }

    const coupon = await db.couponCode.findFirst({
      where: { code: codeRaw, status: 'active' },
    });

    if (!coupon) {
      return NextResponse.json({ valid: false, message: 'Invalid or inactive coupon code.' }, { status: 404 });
    }

    const today = formatDate(new Date());
    if (coupon.expiresAt && coupon.expiresAt.slice(0, 10) < today) {
      return NextResponse.json({ valid: false, message: 'This coupon has expired.' }, { status: 400 });
    }

    if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
      return NextResponse.json({ valid: false, message: 'This coupon has reached its usage limit.' }, { status: 400 });
    }

    if (subtotalBdt < coupon.minSpendBdt) {
      return NextResponse.json(
        {
          valid: false,
          message: `Minimum spend of ৳${coupon.minSpendBdt} required for this coupon.`,
        },
        { status: 400 },
      );
    }

    const discountBdt =
      coupon.discountType === 'percentage'
        ? Math.round((subtotalBdt * coupon.discountValue) / 100)
        : Math.min(subtotalBdt, coupon.discountValue);

    const label =
      coupon.discountType === 'percentage'
        ? `${coupon.discountValue}% discount applied (-৳${discountBdt}).`
        : `৳${discountBdt} discount applied.`;

    return NextResponse.json({
      valid: true,
      code: coupon.code,
      discountBdt,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      message: label,
    });
  } catch (err: any) {
    return NextResponse.json(
      { valid: false, message: err?.message || 'Failed to validate coupon.' },
      { status: 500 },
    );
  }
}
