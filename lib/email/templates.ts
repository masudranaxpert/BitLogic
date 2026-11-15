import type { OutgoingEmail } from '@/lib/email/send';
import type { EmailBranding } from '@/lib/email/config';

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const normalizeHex = (value: string | undefined, fallback: string) =>
  value && /^#[0-9a-fA-F]{3,8}$/.test(value.trim()) ? value.trim() : fallback;

function buildLogoMarkup(branding?: EmailBranding): string {
  if (branding?.logoType === 'image' && branding.logoImageUrl?.trim()) {
    return `<img src="${esc(branding.logoImageUrl.trim())}" alt="Blumartbd" style="max-height:36px;max-width:180px;display:block;object-fit:contain" />`;
  }
  const p1 = esc(branding?.logoTextPrimary || 'Blu');
  const p2 = esc(branding?.logoTextSecondary || 'martbd');
  const accent = normalizeHex(branding?.logoTextSecondaryColor, '#FF5E5B');
  return `<table role="presentation" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td style="width:30px;height:30px;border-radius:8px;background:${esc(accent)};text-align:center;vertical-align:middle;font-size:16px;font-weight:900;color:#FFFFFF;line-height:30px">B</td>
      <td style="padding-left:10px;vertical-align:middle;font-size:20px;font-weight:800;letter-spacing:-0.4px;color:#FFFFFF">${p1}<span style="color:${esc(accent)}">${p2}</span></td>
    </tr>
  </table>`;
}

export function layout(
  title: string,
  bodyHtml: string,
  options?: {
    subtitle?: string;
    badge?: { label: string; bg: string; color: string };
    cta?: { label: string; url: string };
    footerNote?: string;
    branding?: EmailBranding;
  },
) {
  const branding = options?.branding;
  const headerBg = normalizeHex(branding?.headerBg, '#151A2D');
  const ctaBg = normalizeHex(branding?.primaryColor, '#FF5E5B');
  const accentStrip = normalizeHex(branding?.logoTextSecondaryColor, ctaBg);
  const linkColor = ctaBg.toUpperCase() === '#FF5E5B' ? '#D93B38' : ctaBg;
  const footerNote = (branding?.footerNote ?? options?.footerNote ?? '').trim();
  const logoMarkup = buildLogoMarkup(branding);

  const badgeHtml = options?.badge
    ? `<span style="display:inline-block;padding:4px 11px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;border-radius:9999px;background:${esc(
        options.badge.bg,
      )};color:${esc(options.badge.color)};margin-bottom:14px">${esc(options.badge.label)}</span>`
    : '';

  const subtitleHtml = options?.subtitle
    ? `<p style="margin:0 0 18px;color:#64748B;font-size:14px;line-height:1.55">${esc(options.subtitle)}</p>`
    : '';

  const buttonHtml = options?.cta
    ? `<div style="margin:26px 0 16px;text-align:center">
         <a href="${esc(options.cta.url)}" style="background:${esc(ctaBg)};color:#FFFFFF;text-decoration:none;padding:13px 26px;border-radius:10px;font-weight:700;font-size:14px;display:inline-block;letter-spacing:0.1px">
           ${esc(options.cta.label)}
         </a>
       </div>
       <p style="color:#64748B;font-size:12px;text-align:center;line-height:1.55;margin:0 0 8px">
         Or open this link directly:<br>
         <a href="${esc(options.cta.url)}" style="color:${esc(linkColor)};text-decoration:underline;word-break:break-all">${esc(options.cta.url)}</a>
       </p>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#FDF7F7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#151A2D;-webkit-font-smoothing:antialiased">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#FDF7F7;padding:32px 16px">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:560px;background:#FFFFFF;border:1px solid #EFE4E4;border-top:3px solid ${esc(accentStrip)};border-radius:16px;overflow:hidden;box-shadow:0 4px 16px -4px rgba(21,26,45,0.06)">
          <!-- Header Bar -->
          <tr>
            <td style="padding:20px 32px;background:${esc(headerBg)}">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>${logoMarkup}</td>
                  <td align="right" style="vertical-align:middle">
                    <span style="display:inline-block;padding:4px 10px;border-radius:9999px;background:rgba(255,255,255,0.08);font-size:11px;font-weight:600;color:rgba(255,255,255,0.82);letter-spacing:0.3px">Notification</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding:32px">
              ${badgeHtml}
              <h1 style="font-size:21px;font-weight:800;letter-spacing:-0.3px;margin:0 0 8px;color:#151A2D;line-height:1.3">${esc(title)}</h1>
              ${subtitleHtml}
              <div style="font-size:14px;line-height:1.65;color:#334155">
                ${bodyHtml}
              </div>
              ${buttonHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:18px 32px;background:#FDF7F7;border-top:1px solid #F2E6E6;font-size:12px;color:#64748B;line-height:1.55">
              ${footerNote ? `<div style="margin-bottom:8px">${esc(footerNote)}</div>` : ''}
              <div style="font-size:11px;color:#64748B">
                &copy; ${new Date().getFullYear()} Blumartbd. All rights reserved.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// -------------------------------------------------------------
// Customer & Order Templates
// -------------------------------------------------------------

export function orderPlacedCustomerMail(
  data: {
    customerName: string;
    orderId: string;
    itemsSummary: string;
    totalBdt: number;
    gateway: string;
    trxId: string;
    accessUrl: string;
  },
  branding?: EmailBranding,
): OutgoingEmail {
  const accent = normalizeHex(branding?.primaryColor, '#FF5E5B');
  const highlight = accent.toUpperCase() === '#FF5E5B' ? '#D93B38' : accent;
  const bodyHtml = `
    <p style="margin:0 0 12px">Hi <strong style="color:#151A2D">${esc(data.customerName || 'Valued Customer')}</strong>,</p>
    <p style="margin:0 0 18px">We received your order and our team is verifying your payment.</p>
    <div style="background:#FDF7F7;border:1px solid #F2E6E6;border-radius:12px;padding:16px 18px;margin:18px 0">
      <table width="100%" style="font-size:13px;border-collapse:collapse">
        <tr>
          <td style="padding:7px 0;color:#64748B;border-bottom:1px solid #F3E7E7">Order ID</td>
          <td align="right" style="padding:7px 0;font-weight:700;font-family:monospace;color:#151A2D;border-bottom:1px solid #F3E7E7">${esc(data.orderId)}</td>
        </tr>
        <tr>
          <td style="padding:7px 0;color:#64748B;border-bottom:1px solid #F3E7E7">Product</td>
          <td align="right" style="padding:7px 0;font-weight:600;color:#151A2D;border-bottom:1px solid #F3E7E7">${esc(data.itemsSummary)}</td>
        </tr>
        <tr>
          <td style="padding:7px 0;color:#64748B;border-bottom:1px solid #F3E7E7">Total Amount</td>
          <td align="right" style="padding:7px 0;font-weight:800;color:#151A2D;font-variant-numeric:tabular-nums;border-bottom:1px solid #F3E7E7">BDT ${data.totalBdt}</td>
        </tr>
        <tr>
          <td style="padding:7px 0;color:#64748B;border-bottom:1px solid #F3E7E7">Payment Method</td>
          <td align="right" style="padding:7px 0;font-weight:600;color:#151A2D;border-bottom:1px solid #F3E7E7">${esc(data.gateway)}</td>
        </tr>
        <tr>
          <td style="padding:7px 0 2px;color:#64748B">Transaction ID</td>
          <td align="right" style="padding:7px 0 2px;font-weight:700;font-family:monospace;color:${esc(highlight)}">${esc(data.trxId || 'Pending')}</td>
        </tr>
      </table>
    </div>
    <p style="font-size:13px;color:#64748B;margin:0">
      Your digital credentials will appear on your order page as soon as verification completes.
    </p>
  `;

  return {
    to: '',
    subject: `Order Confirmed: ${data.orderId} (${data.itemsSummary})`,
    html: layout('Order Confirmed', bodyHtml, {
      subtitle: `Your order ${data.orderId} is being verified.`,
      badge: { label: 'Pending Verification', bg: '#FEF3C7', color: '#92400E' },
      cta: { label: 'View Order Status', url: data.accessUrl },
      branding,
    }),
    text: `Hi ${data.customerName},\n\nWe received your order ${data.orderId} for BDT ${data.totalBdt}.\nTrack status: ${data.accessUrl}\n`,
  };
}

export function orderPlacedAdminMail(
  data: {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    orderId: string;
    itemsSummary: string;
    totalBdt: number;
    gateway: string;
    trxId: string;
    adminOrderUrl: string;
  },
  branding?: EmailBranding,
): OutgoingEmail {
  const accent = normalizeHex(branding?.primaryColor, '#FF5E5B');
  const highlight = accent.toUpperCase() === '#FF5E5B' ? '#D93B38' : accent;
  const bodyHtml = `
    <p style="margin:0 0 16px">A new storefront order needs payment verification.</p>
    <div style="background:#FDF7F7;border:1px solid #F2E6E6;border-radius:12px;padding:16px 18px;margin:18px 0">
      <table width="100%" style="font-size:13px;border-collapse:collapse">
        <tr>
          <td style="padding:7px 0;color:#64748B;border-bottom:1px solid #F3E7E7">Order ID</td>
          <td align="right" style="padding:7px 0;font-weight:700;font-family:monospace;color:#151A2D;border-bottom:1px solid #F3E7E7">${esc(data.orderId)}</td>
        </tr>
        <tr>
          <td style="padding:7px 0;color:#64748B;border-bottom:1px solid #F3E7E7">Buyer</td>
          <td align="right" style="padding:7px 0;font-weight:600;color:#151A2D;border-bottom:1px solid #F3E7E7">${esc(data.customerName)} (${esc(data.customerEmail)})</td>
        </tr>
        <tr>
          <td style="padding:7px 0;color:#64748B;border-bottom:1px solid #F3E7E7">Phone</td>
          <td align="right" style="padding:7px 0;font-weight:600;color:#151A2D;border-bottom:1px solid #F3E7E7">${esc(data.customerPhone || 'N/A')}</td>
        </tr>
        <tr>
          <td style="padding:7px 0;color:#64748B;border-bottom:1px solid #F3E7E7">Product</td>
          <td align="right" style="padding:7px 0;font-weight:600;color:#151A2D;border-bottom:1px solid #F3E7E7">${esc(data.itemsSummary)}</td>
        </tr>
        <tr>
          <td style="padding:7px 0;color:#64748B;border-bottom:1px solid #F3E7E7">Amount to Verify</td>
          <td align="right" style="padding:7px 0;font-weight:800;color:#151A2D;font-variant-numeric:tabular-nums;border-bottom:1px solid #F3E7E7">BDT ${data.totalBdt}</td>
        </tr>
        <tr>
          <td style="padding:7px 0 2px;color:#64748B">Gateway / TrxID</td>
          <td align="right" style="padding:7px 0 2px;font-weight:700;font-family:monospace;color:${esc(highlight)}">${esc(data.gateway)} &bull; ${esc(data.trxId)}</td>
        </tr>
      </table>
    </div>
  `;

  return {
    to: '',
    subject: `[Admin Alert] New Order ${data.orderId} (BDT ${data.totalBdt}) - ${data.gateway}`,
    html: layout('New Storefront Order', bodyHtml, {
      subtitle: `Order ${data.orderId} submitted by ${data.customerName}`,
      badge: { label: 'Action Required', bg: '#FFF1F0', color: '#C8322F' },
      cta: { label: 'Open in Admin Panel', url: data.adminOrderUrl },
      branding,
    }),
    text: `New Order ${data.orderId} from ${data.customerName} (${data.customerEmail}) for BDT ${data.totalBdt}.\nVerify at: ${data.adminOrderUrl}\n`,
  };
}

export function paymentVerifiedCustomerMail(
  data: {
    customerName: string;
    orderId: string;
    itemsSummary: string;
    accessUrl: string;
    credentials?: Array<{ label: string; email?: string; password?: string; pin?: string; note?: string }>;
  },
  branding?: EmailBranding,
): OutgoingEmail {
  let credsTable = '';
  if (data.credentials && data.credentials.length > 0) {
    const rows = data.credentials
      .map(
        (c) => `
        <tr style="border-bottom:1px solid #F2E6E6">
          <td style="padding:10px;font-weight:700;color:#151A2D">${esc(c.label)}</td>
          <td style="padding:10px;font-family:monospace;color:#334155">${esc(c.email || '—')}</td>
          <td style="padding:10px;font-family:monospace;color:#D93B38;font-weight:700">${esc(c.password || '—')}</td>
          <td style="padding:10px;font-family:monospace;color:#151A2D">${esc(c.pin || '—')}</td>
        </tr>
      `,
      )
      .join('');

    credsTable = `
      <div style="margin:20px 0;overflow-x:auto;border:1px solid #EFE4E4;border-radius:12px;overflow:hidden">
        <table width="100%" style="font-size:13px;border-collapse:collapse">
          <thead>
            <tr style="background:#FDF7F7;border-bottom:1px solid #EFE4E4;color:#64748B;font-size:11px;text-transform:uppercase;letter-spacing:0.4px">
              <th align="left" style="padding:10px">Item</th>
              <th align="left" style="padding:10px">Account / Email</th>
              <th align="left" style="padding:10px">Password</th>
              <th align="left" style="padding:10px">PIN</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  }

  const bodyHtml = `
    <p style="margin:0 0 12px">Hi <strong style="color:#151A2D">${esc(data.customerName || 'Customer')}</strong>,</p>
    <p style="margin:0 0 16px">Your payment is confirmed and your digital subscription is now active.</p>
    ${credsTable}
    <p style="font-size:13px;color:#64748B;margin:0">
      You can view your credentials, renewal options, and warranty support anytime from your order page.
    </p>
  `;

  return {
    to: '',
    subject: `Access Ready: Order ${data.orderId} (${data.itemsSummary})`,
    html: layout('Payment Confirmed & Access Ready', bodyHtml, {
      subtitle: 'Your subscription is active and ready to use.',
      badge: { label: 'Verified & Active', bg: '#DCFCE7', color: '#15803D' },
      cta: { label: 'Access Your Subscription', url: data.accessUrl },
      branding,
    }),
    text: `Hi ${data.customerName},\n\nPayment confirmed for ${data.orderId}! Access your credentials here:\n${data.accessUrl}\n`,
  };
}

export function paymentRejectedCustomerMail(
  data: {
    customerName: string;
    orderId: string;
    reason?: string;
    supportUrl: string;
  },
  branding?: EmailBranding,
): OutgoingEmail {
  const bodyHtml = `
    <p style="margin:0 0 12px">Hi <strong style="color:#151A2D">${esc(data.customerName || 'Customer')}</strong>,</p>
    <p style="margin:0 0 16px">We could not verify the payment transaction for order <strong style="color:#151A2D">${esc(data.orderId)}</strong>.</p>
    <div style="background:#FFF5F5;border:1px solid #FECACA;border-radius:10px;padding:14px 16px;margin:18px 0;font-size:13px;color:#991B1B">
      <strong>Reason:</strong> ${esc(data.reason || 'The Transaction ID provided could not be matched with our accounts.')}
    </div>
    <p style="font-size:13px;color:#475569;margin:0">
      If you already paid, please check your SMS for the exact Transaction ID or reach out to support with a screenshot.
    </p>
  `;

  return {
    to: '',
    subject: `Payment Issue: Order ${data.orderId}`,
    html: layout('Payment Verification Issue', bodyHtml, {
      subtitle: 'We could not confirm the payment for your order.',
      badge: { label: 'Attention Needed', bg: '#FEE2E2', color: '#B91C1C' },
      cta: { label: 'Contact Support / Update Details', url: data.supportUrl },
      branding,
    }),
    text: `Hi ${data.customerName},\n\nPayment could not be verified for ${data.orderId}. Please contact support: ${data.supportUrl}\n`,
  };
}

export function renewalReminderCustomerMail(
  data: {
    customerName: string;
    productName: string;
    expiresInDays: number;
    renewalUrl: string;
  },
  branding?: EmailBranding,
): OutgoingEmail {
  const bodyHtml = `
    <p style="margin:0 0 12px">Hi <strong style="color:#151A2D">${esc(data.customerName || 'Customer')}</strong>,</p>
    <p style="margin:0 0 14px">Your subscription for <strong style="color:#151A2D">${esc(data.productName)}</strong> will expire in <strong style="color:#D93B38">${data.expiresInDays} days</strong>.</p>
    <p style="font-size:13px;color:#64748B;margin:0">
      Renew before expiration to keep your access active without interruption.
    </p>
  `;

  return {
    to: '',
    subject: `Expiring Soon: ${data.productName} (${data.expiresInDays} days left)`,
    html: layout('Subscription Renewal Reminder', bodyHtml, {
      subtitle: 'Keep your service running smoothly without interruption.',
      badge: { label: `${data.expiresInDays} Days Remaining`, bg: '#FFF1F0', color: '#C8322F' },
      cta: { label: 'Renew Subscription Now', url: data.renewalUrl },
      branding,
    }),
    text: `Your subscription for ${data.productName} expires in ${data.expiresInDays} days. Renew now: ${data.renewalUrl}\n`,
  };
}

// -------------------------------------------------------------
// Auth & System Templates
// -------------------------------------------------------------

export function verifyEmailMail(
  to: string,
  name: string | null,
  url: string,
  branding?: EmailBranding,
): OutgoingEmail {
  return {
    to,
    subject: 'Confirm your email',
    html: layout(
      'Confirm your email',
      `<p style="margin:0">Hi <strong style="color:#151A2D">${esc(name || 'there')}</strong>, tap the button below to confirm this address and finish creating your Blumartbd account. This link works for 24 hours.</p>`,
      {
        badge: { label: 'Email Verification', bg: '#FFF1F0', color: '#C8322F' },
        cta: { label: 'Confirm email', url },
        branding,
      },
    ),
    text: `Hi ${name || 'there'},\n\nConfirm your email to finish creating your Blumartbd account (link valid for 24 hours):\n${url}\n`,
  };
}

export function resetPasswordMail(
  to: string,
  url: string,
  branding?: EmailBranding,
): OutgoingEmail {
  return {
    to,
    subject: 'Reset your password',
    html: layout(
      'Reset your password',
      '<p style="margin:0">Someone asked to reset the password for this Blumartbd account. This single-use link works for 1 hour.</p>',
      {
        badge: { label: 'Password Reset', bg: '#FFF1F0', color: '#C8322F' },
        cta: { label: 'Choose a new password', url },
        branding,
      },
    ),
    text: `Reset your Blumartbd password (link valid for 1 hour, single use):\n${url}\n`,
  };
}

export function passwordChangedByAdminMail(
  to: string,
  loginUrl: string,
  branding?: EmailBranding,
): OutgoingEmail {
  return {
    to,
    subject: 'Your password was changed',
    html: layout(
      'Your password was changed',
      '<p style="margin:0">Our support team set a new password for your Blumartbd account at your request. You have been signed out on other devices.</p>',
      {
        badge: { label: 'Account Security', bg: '#DCFCE7', color: '#15803D' },
        cta: { label: 'Sign in', url: loginUrl },
        branding,
      },
    ),
    text: `Our support team set a new password for your Blumartbd account at your request. Sign in: ${loginUrl}\n`,
  };
}

export function testMail(to: string, branding?: EmailBranding): OutgoingEmail {
  return {
    to,
    subject: 'Blumartbd email test',
    html: layout(
      'Email is working',
      '<p style="margin:0">This test came from Admin &rarr; Email &rarr; Settings &amp; SMTP. Your Blumartbd store is ready to send verification, order, and password reset emails.</p>',
      {
        badge: { label: 'SMTP Connected', bg: '#DCFCE7', color: '#15803D' },
        branding,
      },
    ),
    text: 'Email is working. This test came from Admin -> Email -> Settings & SMTP.\n',
  };
}
