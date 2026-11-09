import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-admin';
import { getEmailConfig, saveEmailConfig, type NotificationTriggers } from '@/lib/email/config';
import { recordActivity, requestIp } from '@/lib/audit/record';

/** GET /api/admin/email/triggers */
export async function GET() {
  const { error } = await requirePermission('settings');
  if (error) return error;

  const cfg = await getEmailConfig();
  return NextResponse.json({
    triggers: cfg.triggers,
    provider: cfg.provider,
    isReady: Boolean(cfg.fromEmail && (cfg.provider === 'smtp' ? cfg.smtp.user : cfg.apiKey)),
  });
}

/** PUT /api/admin/email/triggers */
export async function PUT(request: Request) {
  const { session, error } = await requirePermission('settings');
  if (error) return error;

  const body = (await request.json().catch(() => null)) as { triggers?: Partial<NotificationTriggers> } | null;
  if (!body?.triggers || typeof body.triggers !== 'object') {
    return NextResponse.json({ error: 'Invalid triggers payload' }, { status: 400 });
  }

  const saved = await saveEmailConfig({
    triggers: body.triggers as any,
  });

  await recordActivity({
    userId: session.id,
    action: 'email.triggers_update',
    entityType: 'settings',
    summary: `Updated email notification triggers (Master: ${saved.triggers.masterEnabled ? 'ON' : 'OFF'})`,
    ip: requestIp(request),
  });

  return NextResponse.json({ ok: true, triggers: saved.triggers });
}
