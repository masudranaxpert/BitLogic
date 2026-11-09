import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-admin';
import { canAccessPermission } from '@/lib/auth/permissions';
import { unitSupplierOptions } from '@/lib/suppliers/admin';

export const runtime = 'nodejs';

/**
 * Supplier choices for "Send credentials" (?orderId=). Readable with Orders permission;
 * `canBuy` says whether this user may spend supplier balance (Suppliers permission).
 */
export async function GET(request: Request) {
  const { error, session } = await requirePermission('orders');
  if (error) return error;
  const orderId = new URL(request.url).searchParams.get('orderId') || '';
  if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 });
  const canBuy = canAccessPermission(session?.role, session?.permissions, 'suppliers');
  return NextResponse.json({ canBuy, units: await unitSupplierOptions(orderId) });
}
