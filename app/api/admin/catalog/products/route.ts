import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import { saveDigitalProduct } from '@/lib/admin/catalog-repo';
import type { DigitalProduct } from '@/lib/admin/types';

export async function PUT(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const body = (await request.json()) as { product?: DigitalProduct };
    if (!body.product?.id || !body.product.name) {
      return NextResponse.json({ error: 'Invalid product' }, { status: 400 });
    }
    await saveDigitalProduct(body.product);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[admin/catalog/products PUT]', err);
    return NextResponse.json(
      { error: 'Failed to save product' },
      { status: 500 },
    );
  }
}
