import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-admin';
import { saveDigitalProduct } from '@/lib/admin/catalog-repo';
import { recordActivity, requestIp } from '@/lib/audit/record';
import type { DigitalProduct } from '@/lib/admin/types';

export async function PUT(request: Request) {
  const { error, session } = await requirePermission('products');
  if (error) return error;

  try {
    const body = (await request.json()) as { product?: DigitalProduct };
    if (!body.product?.id || !body.product.name) {
      return NextResponse.json({ error: 'Invalid product' }, { status: 400 });
    }
    await saveDigitalProduct(body.product, session?.email || '');
    await recordActivity({
      userId: session.id,
      action: 'product.save',
      entityType: 'product',
      entityId: body.product.id,
      summary: `Saved product ${body.product.name}`,
      ip: requestIp(request),
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[admin/catalog/products PUT]', err);
    return NextResponse.json(
      { error: 'Failed to save product' },
      { status: 500 },
    );
  }
}
