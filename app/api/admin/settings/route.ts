import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-admin';
import {
  getStoreSettings,
  saveStoreSettings,
  type StoreSettings,
} from '@/lib/store-settings';
import { recordActivity, requestIp } from '@/lib/audit/record';

const ALLOWED_PAYMENT_KEYS = new Set([
  'bkashEnabled',
  'bkashNumber',
  'bkashType',
  'bkashInstructions',
  'nagadEnabled',
  'nagadNumber',
  'nagadType',
  'nagadInstructions',
  'rocketEnabled',
  'rocketNumber',
  'rocketType',
  'rocketInstructions',
  'verifyModeTrxId',
  'verifyModeSenderFifo',
  'verifyModeReference',
]);

export async function GET() {
  const { session: paymentsSession } = await requirePermission('payments');
  const { session: settingsSession, error: settingsError } = await requirePermission('settings');
  const session = settingsSession || paymentsSession;
  if (!session) return settingsError!;
  return NextResponse.json({ settings: await getStoreSettings() });
}

export async function PUT(request: Request) {
  const { session: paymentsSession } = await requirePermission('payments');
  const { session: settingsSession, error: settingsError } = await requirePermission('settings');
  const session = settingsSession || paymentsSession;
  if (!session) return settingsError!;
  const body = (await request.json().catch(() => null)) as Partial<StoreSettings> | null;
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const keys = Object.keys(body).filter((key) => body[key as keyof StoreSettings] !== undefined);

  // If user only has payments permission (not store-wide settings), restrict to payment gateway keys
  if (!settingsSession && paymentsSession) {
    const forbiddenKey = keys.find((k) => !ALLOWED_PAYMENT_KEYS.has(k));
    if (forbiddenKey) {
      return NextResponse.json(
        { error: `Forbidden: modifying ${forbiddenKey} requires store settings permission` },
        { status: 403 },
      );
    }
  }

  const settings = await saveStoreSettings(body);
  await recordActivity({
    userId: session.id,
    action: 'settings.update',
    entityType: 'settings',
    summary: `Updated store settings: ${keys.join(', ') || 'settings'}`,
    ip: requestIp(request),
  });
  return NextResponse.json({ ok: true, settings });
}

export const PATCH = PUT;
