import type { OutgoingEmail } from '@/lib/email/send';

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function layout(title: string, body: string, cta?: { label: string; url: string }) {
  const button = cta
    ? `<p style="margin:24px 0"><a href="${esc(cta.url)}" style="background:#0F172A;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:700;display:inline-block">${esc(cta.label)}</a></p>
       <p style="color:#64748b;font-size:13px">Or open this link: <br><a href="${esc(cta.url)}" style="color:#0F172A;word-break:break-all">${esc(cta.url)}</a></p>`
    : '';
  return `<!doctype html><html><body style="margin:0;background:#f6f8fa;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0f172a">
  <div style="max-width:520px;margin:0 auto;padding:32px 20px">
    <div style="font-size:20px;font-weight:800;margin-bottom:20px">Bit<span style="color:#FF5E5B">logic</span></div>
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:24px">
      <h1 style="font-size:18px;margin:0 0 12px">${esc(title)}</h1>
      ${body}
      ${button}
    </div>
    <p style="color:#94a3b8;font-size:12px;margin-top:16px">If you didn't ask for this, you can ignore this email.</p>
  </div></body></html>`;
}

export function verifyEmailMail(to: string, name: string | null, url: string): OutgoingEmail {
  return {
    to,
    subject: 'Confirm your email',
    html: layout('Confirm your email', `<p>Hi ${esc(name || 'there')}, tap the button to confirm this address and finish creating your Bitlogic account. The link works for 24 hours.</p>`, { label: 'Confirm email', url }),
    text: `Hi ${name || 'there'},\n\nConfirm your email to finish creating your Bitlogic account (link valid for 24 hours):\n${url}\n`,
  };
}

export function resetPasswordMail(to: string, url: string): OutgoingEmail {
  return {
    to,
    subject: 'Reset your password',
    html: layout('Reset your password', '<p>Someone asked to reset the password for this account. The link works for 1 hour and only once.</p>', { label: 'Choose a new password', url }),
    text: `Reset your Bitlogic password (link valid for 1 hour, single use):\n${url}\n`,
  };
}

export function passwordChangedByAdminMail(to: string, loginUrl: string): OutgoingEmail {
  return {
    to,
    subject: 'Your password was changed',
    html: layout('Your password was changed', '<p>Our support team set a new password for your account at your request. You have been signed out on other devices.</p>', { label: 'Sign in', url: loginUrl }),
    text: `Our support team set a new password for your Bitlogic account at your request. Sign in: ${loginUrl}\n`,
  };
}

export function testMail(to: string): OutgoingEmail {
  return {
    to,
    subject: 'Bitlogic email test',
    html: layout('Email is working', '<p>This test came from Admin → Settings → Email. Your store can now send verification and password reset emails.</p>'),
    text: 'Email is working. This test came from Admin → Settings → Email.\n',
  };
}
