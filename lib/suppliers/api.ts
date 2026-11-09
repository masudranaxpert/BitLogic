import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-admin';
import type { SessionUser } from '@/lib/auth/session';
import { SupplierInputError } from './admin';

/** Permission gate + uniform errors for the Suppliers admin API. */
export async function supplierRoute<T>(
  fn: (actor: string, session: SessionUser) => Promise<T>,
  permission: 'suppliers' | 'products' = 'suppliers',
) {
  const { error, session } = await requirePermission(permission);
  if (error || !session) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const data = await fn(session.email || '', session);
    return NextResponse.json({ ok: true, ...(data as object) });
  } catch (e) {
    if (e instanceof SupplierInputError) return NextResponse.json({ error: e.message }, { status: 400 });
    if (e && typeof e === 'object' && 'code' in e && (e as { code?: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    }
    console.error('[suppliers api]', e instanceof Error ? e.message : e);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}

export async function readJson<T = Record<string, unknown>>(req: Request): Promise<T> {
  return ((await req.json().catch(() => ({}))) || {}) as T;
}
