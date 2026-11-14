import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-admin';
import { toggleProductPlanActive } from '@/lib/admin/catalog-repo';
import { recordActivity, requestIp } from '@/lib/audit/record';

type TogglePlanBody = {
  productId?: string;
  planCode?: string;
  isActive?: boolean;
};

export async function PATCH(request: Request) {
  const { error, session } = await requirePermission('products');
  if (error) return error;

  try {
    const body = (await request.json()) as TogglePlanBody;
    if (!body.productId || !body.planCode || typeof body.isActive !== 'boolean') {
      return NextResponse.json(
        { error: 'productId, planCode, and boolean isActive are required' },
        { status: 400 },
      );
    }

    const audit = await toggleProductPlanActive(
      body.productId,
      body.planCode,
      body.isActive,
    );
    if (!audit) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
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
    console.error('[admin/catalog/plans/toggle PATCH]', err);
    return NextResponse.json(
      { error: 'Failed to update plan status' },
      { status: 500 },
    );
  }
}
