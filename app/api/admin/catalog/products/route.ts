import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-admin';
import { saveDigitalProduct } from '@/lib/admin/catalog-repo';
import { recordActivities, requestIp } from '@/lib/audit/record';
import type { DigitalProduct } from '@/lib/admin/types';

export async function PUT(request: Request) {
  const { error, session } = await requirePermission('products');
  if (error) return error;

  try {
    const body = (await request.json()) as { product?: DigitalProduct };
    if (!body.product?.id || !body.product.name) {
      return NextResponse.json({ error: 'Invalid product' }, { status: 400 });
    }
    const events = await saveDigitalProduct(body.product, session?.email || '');
    const ip = requestIp(request);
    await recordActivities(
      events.map((ev) => ({
        userId: session.id,
        action: ev.action,
        entityType: ev.entityType,
        entityId: ev.entityId,
        summary: ev.summary,
        ip,
      })),
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[admin/catalog/products PUT]', err);
    return NextResponse.json(
      { error: 'Failed to save product' },
      { status: 500 },
    );
  }
}
