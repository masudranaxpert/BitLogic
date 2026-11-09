import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-admin';
import { EMAIL_RE } from '@/lib/auth/password-policy';
import {
  getEmailConfig,
  publicEmailConfig,
  saveEmailConfig,
  SMTP_PRESETS,
  type EmailConfig,
} from '@/lib/email/config';
import { sendEmail } from '@/lib/email/send';
import { testMail } from '@/lib/email/templates';
import { recordActivity, requestIp } from '@/lib/audit/record';

const PROVIDERS = ['none', 'smtp', 'resend', 'brevo', 'sendgrid', 'postmark', 'mailgun'];

export async function GET() {
  const { error } = await requirePermission('settings');
  if (error) return error;
  return NextResponse.json({ config: publicEmailConfig(await getEmailConfig()), presets: SMTP_PRESETS });
}

export async function PUT(request: Request) {
  const { session, error } = await requirePermission('settings');
  if (error) return error;
  const body = (await request.json().catch(() => null)) as Partial<EmailConfig> | null;
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  if (body.provider && !PROVIDERS.includes(body.provider)) {
    return NextResponse.json({ error: 'Unknown provider' }, { status: 400 });
  }
  if (body.fromEmail && !EMAIL_RE.test(body.fromEmail)) {
    return NextResponse.json({ error: 'Sender email is not valid.' }, { status: 400 });
  }
  if (body.replyTo && !EMAIL_RE.test(body.replyTo)) {
    return NextResponse.json({ error: 'Reply-to email is not valid.' }, { status: 400 });
  }
  const saved = await saveEmailConfig({
    provider: body.provider,
    fromName: body.fromName?.slice(0, 60),
    fromEmail: body.fromEmail?.trim(),
    replyTo: body.replyTo?.trim(),
    requireVerification: body.requireVerification,
    smtp: body.smtp,
    apiKey: body.apiKey?.trim(),
    mailgunDomain: body.mailgunDomain?.trim(),
    mailgunRegion: body.mailgunRegion === 'eu' ? 'eu' : body.mailgunRegion === 'us' ? 'us' : undefined,
    triggers: body.triggers,
  } as Partial<EmailConfig>);
  await recordActivity({
    userId: session.id,
    action: 'email.save',
    entityType: 'settings',
    summary: 'Updated email settings',
    ip: requestIp(request),
  });
  return NextResponse.json({ ok: true, config: publicEmailConfig(saved) });
}

/** Send a test email with the saved settings. */
export async function POST(request: Request) {
  const { session, error } = await requirePermission('settings');
  if (error) return error;
  const body = (await request.json().catch(() => ({}))) as { to?: string };
  const to = String(body.to || session?.email || '').trim();
  if (!EMAIL_RE.test(to)) return NextResponse.json({ error: 'Enter a valid email to send the test to.' }, { status: 400 });
  const result = await sendEmail(testMail(to));
  return result.ok
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: result.error }, { status: 502 });
}
