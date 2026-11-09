import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-admin';
import {
  getStoreSettings,
  saveStoreSettings,
  type StoreSettings,
} from '@/lib/store-settings';
import { recordActivity, requestIp } from '@/lib/audit/record';

export async function GET() {
  const { error } = await requirePermission('settings');
  if (error) return error;
  return NextResponse.json({ settings: await getStoreSettings() });
}

export async function PUT(request: Request) {
  const { session, error } = await requirePermission('settings');
  if (error) return error;
  const body = (await request.json().catch(() => null)) as Partial<StoreSettings> | null;
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  const settings = await saveStoreSettings(body);
  const keys = Object.keys(body).filter((key) => body[key as keyof StoreSettings] !== undefined);
  await recordActivity({
    userId: session.id,
    action: 'settings.update',
    entityType: 'settings',
    summary: `Updated store settings: ${keys.join(', ') || 'settings'}`,
    ip: requestIp(request),
  });
  return NextResponse.json({ ok: true, settings });
}
