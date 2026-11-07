import { db } from '@/lib/db';
import { decryptSecret, encryptSecret } from '@/lib/crypto/secrets';

export type EmailProvider = 'none' | 'smtp' | 'resend' | 'brevo' | 'sendgrid' | 'postmark' | 'mailgun';

/** SMTP presets for common hosts (free tiers included). Values are the providers' documented defaults. */
export const SMTP_PRESETS = {
  gmail: { label: 'Gmail / Google Workspace', host: 'smtp.gmail.com', port: 465, secure: true, hint: 'Use a 16-character App Password (2-Step Verification must be on).' },
  outlook: { label: 'Outlook / Microsoft 365', host: 'smtp.office365.com', port: 587, secure: false, hint: 'SMTP AUTH must be enabled for the mailbox.' },
  zoho: { label: 'Zoho Mail', host: 'smtp.zoho.com', port: 465, secure: true, hint: 'Use an app-specific password.' },
  brevo: { label: 'Brevo SMTP', host: 'smtp-relay.brevo.com', port: 587, secure: false, hint: 'Login is your Brevo SMTP login; password is an SMTP key.' },
  sendgrid: { label: 'SendGrid SMTP', host: 'smtp.sendgrid.net', port: 587, secure: false, hint: 'Username is literally "apikey"; password is the API key.' },
  mailgun: { label: 'Mailgun SMTP', host: 'smtp.mailgun.org', port: 587, secure: false, hint: 'Use the domain’s SMTP credentials.' },
  ses: { label: 'Amazon SES SMTP', host: 'email-smtp.us-east-1.amazonaws.com', port: 587, secure: false, hint: 'Change the region in the host if needed.' },
  custom: { label: 'Other SMTP server', host: '', port: 587, secure: false, hint: '' },
} as const;
export type SmtpPreset = keyof typeof SMTP_PRESETS;

export type EmailConfig = {
  provider: EmailProvider;
  fromName: string;
  fromEmail: string;
  replyTo: string;
  /** New accounts must click the emailed link before they can sign in. */
  requireVerification: boolean;
  smtp: { preset: SmtpPreset; host: string; port: number; secure: boolean; user: string; pass: string };
  apiKey: string;
  mailgunDomain: string;
  mailgunRegion: 'us' | 'eu';
};

export const DEFAULT_EMAIL_CONFIG: EmailConfig = {
  provider: 'none',
  fromName: 'Bitlogic',
  fromEmail: '',
  replyTo: '',
  requireVerification: true,
  smtp: { preset: 'gmail', host: SMTP_PRESETS.gmail.host, port: 465, secure: true, user: '', pass: '' },
  apiKey: '',
  mailgunDomain: '',
  mailgunRegion: 'us',
};

const KEY = 'emailConfig';

export async function getEmailConfig(): Promise<EmailConfig> {
  try {
    const row = await db.storeSetting.findUnique({ where: { key: KEY } });
    if (!row) return { ...DEFAULT_EMAIL_CONFIG };
    const raw = JSON.parse(row.value) as Partial<EmailConfig>;
    const cfg: EmailConfig = {
      ...DEFAULT_EMAIL_CONFIG,
      ...raw,
      smtp: { ...DEFAULT_EMAIL_CONFIG.smtp, ...(raw.smtp || {}) },
    };
    cfg.smtp.pass = cfg.smtp.pass ? decryptSecret(cfg.smtp.pass) : '';
    cfg.apiKey = cfg.apiKey ? decryptSecret(cfg.apiKey) : '';
    return cfg;
  } catch {
    return { ...DEFAULT_EMAIL_CONFIG };
  }
}

/** True when a provider is chosen and has what it needs to send. */
export function isEmailReady(c: EmailConfig): boolean {
  if (!c.fromEmail) return false;
  switch (c.provider) {
    case 'smtp':
      return Boolean(c.smtp.host && c.smtp.port && c.smtp.user && c.smtp.pass);
    case 'mailgun':
      return Boolean(c.apiKey && c.mailgunDomain);
    case 'resend':
    case 'brevo':
    case 'sendgrid':
    case 'postmark':
      return Boolean(c.apiKey);
    default:
      return false;
  }
}

/** Safe copy for the admin UI: secrets never leave the server. */
export function publicEmailConfig(c: EmailConfig) {
  return {
    ...c,
    smtp: { ...c.smtp, pass: '', hasPass: Boolean(c.smtp.pass) },
    apiKey: '',
    apiKeyHint: c.apiKey ? `••••${c.apiKey.slice(-4)}` : '',
    ready: isEmailReady(c),
  };
}

/** Empty secret fields keep the stored value (the UI never receives it). */
export async function saveEmailConfig(input: Partial<EmailConfig>): Promise<EmailConfig> {
  const cur = await getEmailConfig();
  // Fields left undefined keep their saved value.
  const patch = Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined)) as Partial<EmailConfig>;
  const next: EmailConfig = {
    ...cur,
    ...patch,
    smtp: { ...cur.smtp, ...(patch.smtp || {}) },
  };
  if (patch.smtp && !patch.smtp.pass) next.smtp.pass = cur.smtp.pass;
  if (!patch.apiKey) next.apiKey = cur.apiKey;
  next.smtp.port = Math.max(1, Math.min(65535, Math.round(Number(next.smtp.port)) || 587));
  const stored = {
    ...next,
    smtp: { ...next.smtp, pass: next.smtp.pass ? encryptSecret(next.smtp.pass) : '' },
    apiKey: next.apiKey ? encryptSecret(next.apiKey) : '',
  };
  await db.storeSetting.upsert({
    where: { key: KEY },
    create: { key: KEY, value: JSON.stringify(stored) },
    update: { value: JSON.stringify(stored) },
  });
  return next;
}
