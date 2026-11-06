import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import { loadAdminCatalog } from '@/lib/admin/catalog-repo';

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const catalog = await loadAdminCatalog();
    return NextResponse.json(catalog);
  } catch (err) {
    console.error('[admin/catalog GET]', err);
    return NextResponse.json(
      { error: 'Failed to load catalog' },
      { status: 500 },
    );
  }
}
