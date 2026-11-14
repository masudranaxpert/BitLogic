import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-admin';
import { toggleProductActive } from '@/lib/admin/catalog-repo';
import { recordActivity, requestIp } from '@/lib/audit/record';

export async function PATCH(request: Request) {
  const { error, session } = await requirePermission('products');
  if (error) return error;

  try {
    const body = (await request.json().catch(() => null)) as {
      productId?: string;
      isActive?: boolean;
    } | null;

    if (!body?.productId || typeof body.isActive !== 'boolean') {
      return NextResponse.json(
        { error: 'productId and isActive are required' },
        { status: 400 },
      );
    }

    const audit = await toggleProductActive(body.productId, body.isActive);
    if (!audit) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    await recordActivity({
      userId: session.id,
      action: audit.action,
      entityType: audit.entityType,
      entityId: audit.entityId,
      summary: audit.summary,
      ip: requestIp(request),
    });

    return NextResponse.json({ ok: true, isActive: body.isActive });
  } catch (err) {
    console.error('[admin/catalog/products/toggle PATCH]', err);
    return NextResponse.json(
      { error: 'Failed to update product visibility' },
      { status: 500 },
    );
  }
}
