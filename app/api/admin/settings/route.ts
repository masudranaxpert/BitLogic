import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-admin';
import {
  getStoreSettings,
  saveStoreSettings,
  type StoreSettings,
} from '@/lib/store-settings';

export async function GET() {
  const { error } = await requirePermission('settings');
  if (error) return error;
  return NextResponse.json({ settings: await getStoreSettings() });
}

export async function PUT(request: Request) {
  const { error } = await requirePermission('settings');
  if (error) return error;
  const body = (await request.json().catch(() => null)) as Partial<StoreSettings> | null;
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  const settings = await saveStoreSettings(body);
  return NextResponse.json({ ok: true, settings });
}
