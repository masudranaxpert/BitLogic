import type { OutgoingEmail } from '@/lib/email/send';
import type { EmailBranding } from '@/lib/email/config';

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

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
  const headerBg = branding?.headerBg || '#0F172A';
  const ctaBg = branding?.primaryColor || '#0F172A';
  const footerNote = branding?.footerNote || options?.footerNote || 'If you did not request this email or need support, contact us at support@blumartbd.com';

  let logoMarkup = `
    <span style="font-size:22px;font-weight:900;letter-spacing:-0.5px;color:#FFFFFF">Bit<span style="color:#38BDF8">Logic</span></span>
  `;

  if (branding?.logoType === 'image' && branding?.logoImageUrl) {
    logoMarkup = `<img src="${esc(branding.logoImageUrl)}" alt="Logo" style="max-height:36px;max-width:180px;display:block;object-fit:contain" />`;
  } else if (branding) {
    const p1 = esc(branding.logoTextPrimary || 'Bit');
    const p2 = esc(branding.logoTextSecondary || 'Logic');
    const c2 = esc(branding.logoTextSecondaryColor || '#38BDF8');
    logoMarkup = `<span style="font-size:22px;font-weight:900;letter-spacing:-0.5px;color:#FFFFFF">${p1}<span style="color:${c2}">${p2}</span></span>`;
  }

  const badgeHtml = options?.badge
    ? `<span style="display:inline-block;padding:4px 10px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;border-radius:9999px;background:${esc(
        options.badge.bg,
      )};color:${esc(options.badge.color)};margin-bottom:12px">${esc(options.badge.label)}</span>`
    : '';

  const subtitleHtml = options?.subtitle
    ? `<p style="margin:0 0 16px;color:#64748B;font-size:14px;line-height:1.5">${esc(options.subtitle)}</p>`
    : '';

  const buttonHtml = options?.cta
    ? `<div style="margin:28px 0 16px;text-align:center">
         <a href="${esc(options.cta.url)}" style="background:${esc(ctaBg)};color:#FFFFFF;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:700;font-size:14px;display:inline-block;box-shadow:0 1px 2px rgba(0,0,0,0.08)">
           ${esc(options.cta.label)}
         </a>
       </div>
       <p style="color:#94A3B8;font-size:12px;text-align:center;margin:0 0 16px">Or open this link directly: <br>
         <a href="${esc(options.cta.url)}" style="color:#2563EB;word-break:break-all">${esc(options.cta.url)}</a>
       </p>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0F172A;-webkit-font-smoothing:antialiased">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#F8FAFC;padding:32px 16px">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:540px;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.02)">
          <!-- Header Bar -->
          <tr>
            <td style="padding:22px 32px;background:${esc(headerBg)};border-bottom:1px solid rgba(255,255,255,0.08)">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    ${logoMarkup}
                  </td>
                  <td align="right">
                    <span style="font-size:12px;color:rgba(255,255,255,0.7);letter-spacing:0.5px">Official Notification</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding:32px">
              ${badgeHtml}
              <h1 style="font-size:20px;font-weight:800;letter-spacing:-0.3px;margin:0 0 8px;color:#0F172A">${esc(title)}</h1>
              ${subtitleHtml}
              <div style="font-size:14px;line-height:1.6;color:#334155">
                ${bodyHtml}
              </div>
              ${buttonHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;background:#F8FAFC;border-top:1px solid #E2E8F0;font-size:12px;color:#64748B;line-height:1.5">
              ${esc(footerNote)}
              <div style="margin-top:8px;font-size:11px;color:#94A3B8">
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
// Customer Templates
// -------------------------------------------------------------

export function orderPlacedCustomerMail(data: {
  customerName: string;
  orderId: string;
  itemsSummary: string;
  totalBdt: number;
  gateway: string;
  trxId: string;
  accessUrl: string;
}): OutgoingEmail {
  const bodyHtml = `
    <p>Hi <strong>${esc(data.customerName || 'Valued Customer')}</strong>,</p>
    <p>We have successfully received your order! Our verification team is reviewing your payment transaction.</p>
    
    <div style="background:#F1F5F9;border-radius:10px;padding:16px;margin:20px 0">
      <table width="100%" style="font-size:13px;border-collapse:collapse">
        <tr>
          <td style="padding:6px 0;color:#64748B">Order ID:</td>
          <td align="right" style="padding:6px 0;font-weight:700;font-family:monospace">${esc(data.orderId)}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#64748B">Product:</td>
          <td align="right" style="padding:6px 0;font-weight:600">${esc(data.itemsSummary)}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#64748B">Total Amount:</td>
          <td align="right" style="padding:6px 0;font-weight:700;color:#0F172A">BDT ${data.totalBdt}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#64748B">Payment Method:</td>
          <td align="right" style="padding:6px 0;font-weight:600">${esc(data.gateway)}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#64748B">Transaction ID:</td>
          <td align="right" style="padding:6px 0;font-weight:700;font-family:monospace;color:#0284C7">${esc(data.trxId || 'Pending')}</td>
        </tr>
      </table>
    </div>
    
    <p style="font-size:13px;color:#64748B">
      Digital credentials will be unlocked automatically on your order tracking page as soon as verification completes (typically within 10–30 minutes during operating hours).
    </p>
  `;

  return {
    to: '',
    subject: `Order Confirmed: ${data.orderId} (${data.itemsSummary})`,
    html: layout(`Order Confirmed`, bodyHtml, {
      subtitle: `Your order ${data.orderId} is being verified.`,
      badge: { label: 'Pending Verification', bg: '#FEF3C7', color: '#92400E' },
      cta: { label: 'View Order Status', url: data.accessUrl },
    }),
    text: `Hi ${data.customerName},\n\nWe received your order ${data.orderId} for BDT ${data.totalBdt}.\nTrack status: ${data.accessUrl}\n`,
  };
}

export function orderPlacedAdminMail(data: {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  orderId: string;
  itemsSummary: string;
  totalBdt: number;
  gateway: string;
  trxId: string;
  adminOrderUrl: string;
}): OutgoingEmail {
  const bodyHtml = `
    <p>A new order has been placed on the storefront and requires payment verification.</p>
    
    <div style="background:#F1F5F9;border-radius:10px;padding:16px;margin:20px 0">
      <table width="100%" style="font-size:13px;border-collapse:collapse">
        <tr>
          <td style="padding:6px 0;color:#64748B">Order ID:</td>
          <td align="right" style="padding:6px 0;font-weight:700;font-family:monospace">${esc(data.orderId)}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#64748B">Buyer:</td>
          <td align="right" style="padding:6px 0;font-weight:600">${esc(data.customerName)} (${esc(data.customerEmail)})</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#64748B">Phone:</td>
          <td align="right" style="padding:6px 0;font-weight:600">${esc(data.customerPhone || 'N/A')}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#64748B">Product:</td>
          <td align="right" style="padding:6px 0;font-weight:600">${esc(data.itemsSummary)}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#64748B">Amount to Verify:</td>
          <td align="right" style="padding:6px 0;font-weight:800;color:#0F172A">BDT ${data.totalBdt}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#64748B">Gateway / TrxID:</td>
          <td align="right" style="padding:6px 0;font-weight:700;color:#0284C7">${esc(data.gateway)} &bull; ${esc(data.trxId)}</td>
        </tr>
      </table>
    </div>
  `;

  return {
    to: '',
    subject: `[Admin Alert] New Order ${data.orderId} (BDT ${data.totalBdt}) - ${data.gateway}`,
    html: layout(`New Storefront Order`, bodyHtml, {
      subtitle: `Order ${data.orderId} submitted by ${data.customerName}`,
      badge: { label: 'Action Required', bg: '#EFF6FF', color: '#1D4ED8' },
      cta: { label: 'Open in Admin Panel', url: data.adminOrderUrl },
    }),
    text: `New Order ${data.orderId} from ${data.customerName} (${data.customerEmail}) for BDT ${data.totalBdt}.\nVerify at: ${data.adminOrderUrl}\n`,
  };
}

export function paymentVerifiedCustomerMail(data: {
  customerName: string;
  orderId: string;
  itemsSummary: string;
  accessUrl: string;
  credentials?: Array<{ label: string; email?: string; password?: string; pin?: string; note?: string }>;
}): OutgoingEmail {
  let credsTable = '';
  if (data.credentials && data.credentials.length > 0) {
    const rows = data.credentials
      .map(
        (c) => `
        <tr style="border-bottom:1px solid #E2E8F0">
          <td style="padding:10px 8px;font-weight:700">${esc(c.label)}</td>
          <td style="padding:10px 8px;font-family:monospace">${esc(c.email || '—')}</td>
          <td style="padding:10px 8px;font-family:monospace;color:#0F172A;font-weight:700">${esc(c.password || '—')}</td>
          <td style="padding:10px 8px;font-family:monospace">${esc(c.pin || '—')}</td>
        </tr>
      `,
      )
      .join('');

    credsTable = `
      <div style="margin:20px 0;overflow-x:auto">
        <table width="100%" style="font-size:13px;border-collapse:collapse;border:1px solid #E2E8F0;border-radius:8px">
          <thead>
            <tr style="background:#F8FAFC;border-bottom:1px solid #E2E8F0;color:#64748B;font-size:11px;text-transform:uppercase">
              <th align="left" style="padding:8px">Item</th>
              <th align="left" style="padding:8px">Account / Email</th>
              <th align="left" style="padding:8px">Password</th>
              <th align="left" style="padding:8px">PIN</th>
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
    <p>Hi <strong>${esc(data.customerName || 'Customer')}</strong>,</p>
    <p>Good news! Your payment has been confirmed and your digital subscription is now active.</p>
    ${credsTable}
    <p style="font-size:13px;color:#64748B">
      You can access your credentials, renewal options, and warranty assistance anytime from your private tracking dashboard.
    </p>
  `;

  return {
    to: '',
    subject: `Access Ready: Order ${data.orderId} (${data.itemsSummary})`,
    html: layout(`Payment Confirmed & Access Ready`, bodyHtml, {
      subtitle: `Your subscription is active and ready to use.`,
      badge: { label: 'Verified & Active', bg: '#DCFCE7', color: '#15803D' },
      cta: { label: 'Access Your Subscription', url: data.accessUrl },
    }),
    text: `Hi ${data.customerName},\n\nPayment confirmed for ${data.orderId}! Access your credentials here:\n${data.accessUrl}\n`,
  };
}

export function paymentRejectedCustomerMail(data: {
  customerName: string;
  orderId: string;
  reason?: string;
  supportUrl: string;
}): OutgoingEmail {
  const bodyHtml = `
    <p>Hi <strong>${esc(data.customerName || 'Customer')}</strong>,</p>
    <p>We were unable to verify your payment transaction for order <strong>${esc(data.orderId)}</strong>.</p>
    <div style="background:#FEF2F2;border:1px solid #FCA5A5;border-radius:8px;padding:14px;margin:18px 0;font-size:13px;color:#991B1B">
      <strong>Reason:</strong> ${esc(data.reason || 'The Transaction ID provided could not be matched with our accounts.')}
    </div>
    <p style="font-size:13px;color:#475569">
      If you made the payment, please check your mobile banking SMS for the exact Transaction ID and update it, or message our support team with a screenshot.
    </p>
  `;

  return {
    to: '',
    subject: `Payment Issue: Order ${data.orderId}`,
    html: layout(`Payment Verification Issue`, bodyHtml, {
      subtitle: `We could not confirm the payment for your order.`,
      badge: { label: 'Attention Needed', bg: '#FEE2E2', color: '#B91C1C' },
      cta: { label: 'Contact Support / Update Details', url: data.supportUrl },
    }),
    text: `Hi ${data.customerName},\n\nPayment could not be verified for ${data.orderId}. Please contact support: ${data.supportUrl}\n`,
  };
}

export function renewalReminderCustomerMail(data: {
  customerName: string;
  productName: string;
  expiresInDays: number;
  renewalUrl: string;
}): OutgoingEmail {
  const bodyHtml = `
    <p>Hi <strong>${esc(data.customerName || 'Customer')}</strong>,</p>
    <p>Your subscription for <strong>${esc(data.productName)}</strong> is set to expire in <strong>${data.expiresInDays} days</strong>.</p>
    <p style="font-size:13px;color:#64748B">
      Renew before expiration to keep your profile settings, playlist history, and private access without interruption.
    </p>
  `;

  return {
    to: '',
    subject: `Expiring Soon: ${data.productName} (${data.expiresInDays} days left)`,
    html: layout(`Subscription Renewal Reminder`, bodyHtml, {
      subtitle: `Keep your service running smoothly without interruption.`,
      badge: { label: `${data.expiresInDays} Days Remaining`, bg: '#FEF3C7', color: '#92400E' },
      cta: { label: 'Renew Subscription Now', url: data.renewalUrl },
    }),
    text: `Your subscription for ${data.productName} expires in ${data.expiresInDays} days. Renew now: ${data.renewalUrl}\n`,
  };
}

// -------------------------------------------------------------
// Existing Auth & System Templates
// -------------------------------------------------------------

export function verifyEmailMail(to: string, name: string | null, url: string): OutgoingEmail {
  return {
    to,
    subject: 'Confirm your email',
    html: layout(
      'Confirm your email',
      `<p>Hi ${esc(name || 'there')}, tap the button to confirm this address and finish creating your Blumartbd account. The link works for 24 hours.</p>`,
      { cta: { label: 'Confirm email', url } },
    ),
    text: `Hi ${name || 'there'},\n\nConfirm your email to finish creating your Blumartbd account (link valid for 24 hours):\n${url}\n`,
  };
}

export function resetPasswordMail(to: string, url: string): OutgoingEmail {
  return {
    to,
    subject: 'Reset your password',
    html: layout(
      'Reset your password',
      '<p>Someone asked to reset the password for this account. The link works for 1 hour and only once.</p>',
      { cta: { label: 'Choose a new password', url } },
    ),
    text: `Reset your Blumartbd password (link valid for 1 hour, single use):\n${url}\n`,
  };
}

export function passwordChangedByAdminMail(to: string, loginUrl: string): OutgoingEmail {
  return {
    to,
    subject: 'Your password was changed',
    html: layout(
      'Your password was changed',
      '<p>Our support team set a new password for your account at your request. You have been signed out on other devices.</p>',
      { cta: { label: 'Sign in', url: loginUrl } },
    ),
    text: `Our support team set a new password for your Blumartbd account at your request. Sign in: ${loginUrl}\n`,
  };
}

export function testMail(to: string): OutgoingEmail {
  return {
    to,
    subject: 'Blumartbd email test',
    html: layout(
      'Email is working',
      '<p>This test came from Admin → Settings → Email. Your store can now send verification and password reset emails.</p>',
    ),
    text: 'Email is working. This test came from Admin → Settings → Email.\n',
  };
}
