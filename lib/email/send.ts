import nodemailer from 'nodemailer';
import { getEmailConfig, isEmailReady, type EmailConfig } from '@/lib/email/config';

export type OutgoingEmail = { to: string; subject: string; html: string; text: string };
export type SendResult = { ok: true } | { ok: false; error: string };

const fromHeader = (c: EmailConfig) => (c.fromName ? `${c.fromName} <${c.fromEmail}>` : c.fromEmail);

async function viaHttp(url: string, init: RequestInit): Promise<SendResult> {
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(15000) });
    if (res.ok) return { ok: true };
    const body = (await res.text()).slice(0, 300);
    return { ok: false, error: `Provider replied ${res.status}: ${body}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}

/** Sends through whichever provider is configured in Admin → Settings → Email. */
export async function sendEmail(mail: OutgoingEmail, override?: EmailConfig): Promise<SendResult> {
  const c = override ?? (await getEmailConfig());
  if (!isEmailReady(c)) return { ok: false, error: 'Email is not set up.' };
  const json = { 'Content-Type': 'application/json' };

  switch (c.provider) {
    case 'smtp': {
      try {
        const t = nodemailer.createTransport({
          host: c.smtp.host,
          port: c.smtp.port,
          secure: c.smtp.secure,
          auth: { user: c.smtp.user, pass: c.smtp.pass },
          connectionTimeout: 15000,
        });
        await t.sendMail({
          from: fromHeader(c),
          to: mail.to,
          replyTo: c.replyTo || undefined,
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
        });
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'SMTP error' };
      }
    }
    case 'resend':
      return viaHttp('https://api.resend.com/emails', {
        method: 'POST',
        headers: { ...json, Authorization: `Bearer ${c.apiKey}` },
        body: JSON.stringify({
          from: fromHeader(c),
          to: [mail.to],
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
          ...(c.replyTo ? { reply_to: c.replyTo } : {}),
        }),
      });
    case 'brevo':
      return viaHttp('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { ...json, 'api-key': c.apiKey, accept: 'application/json' },
        body: JSON.stringify({
          sender: { name: c.fromName, email: c.fromEmail },
          to: [{ email: mail.to }],
          subject: mail.subject,
          htmlContent: mail.html,
          textContent: mail.text,
          ...(c.replyTo ? { replyTo: { email: c.replyTo } } : {}),
        }),
      });
    case 'sendgrid':
      return viaHttp('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: { ...json, Authorization: `Bearer ${c.apiKey}` },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: mail.to }] }],
          from: { email: c.fromEmail, name: c.fromName },
          ...(c.replyTo ? { reply_to: { email: c.replyTo } } : {}),
          subject: mail.subject,
          content: [
            { type: 'text/plain', value: mail.text },
            { type: 'text/html', value: mail.html },
          ],
        }),
      });
    case 'postmark':
      return viaHttp('https://api.postmarkapp.com/email', {
        method: 'POST',
        headers: { ...json, Accept: 'application/json', 'X-Postmark-Server-Token': c.apiKey },
        body: JSON.stringify({
          From: fromHeader(c),
          To: mail.to,
          Subject: mail.subject,
          HtmlBody: mail.html,
          TextBody: mail.text,
          MessageStream: 'outbound',
          ...(c.replyTo ? { ReplyTo: c.replyTo } : {}),
        }),
      });
    case 'mailgun': {
      const base = c.mailgunRegion === 'eu' ? 'https://api.eu.mailgun.net' : 'https://api.mailgun.net';
      const form = new URLSearchParams({
        from: fromHeader(c),
        to: mail.to,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        ...(c.replyTo ? { 'h:Reply-To': c.replyTo } : {}),
      });
      return viaHttp(`${base}/v3/${encodeURIComponent(c.mailgunDomain)}/messages`, {
        method: 'POST',
        headers: { Authorization: `Basic ${Buffer.from(`api:${c.apiKey}`).toString('base64')}` },
        body: form,
      });
    }
    default:
      return { ok: false, error: 'Email is not set up.' };
  }
}
