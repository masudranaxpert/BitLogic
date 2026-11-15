import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-admin';
import {
  toggleProductActive,
  toggleProductPlacement,
  type ProductPlacementField,
} from '@/lib/admin/catalog-repo';
import { recordActivity, requestIp } from '@/lib/audit/record';

export async function PATCH(request: Request) {
  const { error, session } = await requirePermission('products');
  if (error) return error;

  try {
    const body = (await request.json().catch(() => null)) as {
      productId?: string;
      isActive?: boolean;
      field?: ProductPlacementField;
      value?: boolean;
    } | null;

    if (!body?.productId) {
      return NextResponse.json(
        { error: 'productId is required' },
        { status: 400 },
      );
    }

    if (
      (body.field === 'sale' || body.field === 'featured') &&
      typeof body.value === 'boolean'
    ) {
      const audit = await toggleProductPlacement(
        body.productId,
        body.field,
        body.value,
      );
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

      return NextResponse.json({
        ok: true,
        field: body.field,
        value: body.value,
      });
    }

    if (typeof body.isActive !== 'boolean') {
      return NextResponse.json(
        { error: 'isActive or (field, value) is required' },
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
      { error: 'Failed to update product settings' },
      { status: 500 },
    );
  }
}
