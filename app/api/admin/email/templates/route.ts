import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-admin';
import { EMAIL_RE } from '@/lib/auth/password-policy';
import { getEmailConfig, saveEmailConfig, type EmailBranding } from '@/lib/email/config';
import { sendEmail } from '@/lib/email/send';
import {
  layout,
  orderPlacedCustomerMail,
  orderPlacedAdminMail,
  paymentVerifiedCustomerMail,
  paymentRejectedCustomerMail,
  renewalReminderCustomerMail,
  verifyEmailMail,
  resetPasswordMail,
  passwordChangedByAdminMail,
  testMail,
} from '@/lib/email/templates';
import type { OutgoingEmail } from '@/lib/email/send';

export type TemplateMeta = {
  id: string;
  name: string;
  category: 'Orders' | 'Payments' | 'Auth' | 'System';
  description: string;
  recipientType: 'Customer' | 'Admin';
  previewSubject: string;
  triggerKey?: string;
  defaultVariables: string[];
};

export const TEMPLATES_META: TemplateMeta[] = [
  {
    id: 'order_placed_customer',
    name: 'Order Placed (Customer)',
    category: 'Orders',
    description: 'Sent to the customer right after checkout with order details and payment tracking link.',
    recipientType: 'Customer',
    previewSubject: 'Order Confirmed: ORD-604631 (Canva Pro · Shared 1 Month)',
    triggerKey: 'orderPlaced',
    defaultVariables: ['customerName', 'orderId', 'itemsSummary', 'totalBdt', 'gateway', 'trxId', 'accessUrl'],
  },
  {
    id: 'order_placed_admin',
    name: 'New Order Alert (Admin)',
    category: 'Orders',
    description: 'Instant notification to admin when a new transaction is submitted for verification.',
    recipientType: 'Admin',
    previewSubject: '[Admin Alert] New Order: ORD-604631 from Hasan Mahmud',
    triggerKey: 'orderPlaced',
    defaultVariables: ['customerName', 'customerEmail', 'customerPhone', 'orderId', 'itemsSummary', 'totalBdt', 'gateway', 'trxId', 'adminOrderUrl'],
  },
  {
    id: 'payment_verified_customer',
    name: 'Payment Verified & Credentials',
    category: 'Payments',
    description: 'Sent when payment is verified, includes login credentials table or activation instructions.',
    recipientType: 'Customer',
    previewSubject: 'Access Ready: Order ORD-604631 (Canva Pro · Shared 1 Month)',
    triggerKey: 'paymentVerified',
    defaultVariables: ['customerName', 'orderId', 'itemsSummary', 'accessUrl', 'credentialsTable'],
  },
  {
    id: 'payment_rejected_customer',
    name: 'Payment Rejected / Issue',
    category: 'Payments',
    description: 'Sent if the TrxID does not match or payment fails, prompting them to contact support.',
    recipientType: 'Customer',
    previewSubject: 'Payment Issue: Order ORD-604631',
    triggerKey: 'paymentRejected',
    defaultVariables: ['customerName', 'orderId', 'reason', 'supportUrl'],
  },
  {
    id: 'renewal_reminder_customer',
    name: 'Subscription Renewal Reminder',
    category: 'Orders',
    description: 'Automatic warning to the customer before their digital subscription expires.',
    recipientType: 'Customer',
    previewSubject: 'Upcoming Renewal: Canva Pro (5 Days Remaining)',
    triggerKey: 'renewalReminder',
    defaultVariables: ['customerName', 'productName', 'expiresInDays', 'renewalUrl'],
  },
  {
    id: 'verify_email',
    name: 'Email Address Verification',
    category: 'Auth',
    description: 'Sent to new users when sign-up email confirmation is turned on.',
    recipientType: 'Customer',
    previewSubject: 'Confirm your email for Bitlogic',
    triggerKey: 'emailVerification',
    defaultVariables: ['customerName', 'verificationUrl'],
  },
  {
    id: 'reset_password',
    name: 'Password Reset Request',
    category: 'Auth',
    description: 'Sent when a customer or staff requests a secure one-time password reset link.',
    recipientType: 'Customer',
    previewSubject: 'Reset your Bitlogic password',
    triggerKey: 'passwordReset',
    defaultVariables: ['resetUrl'],
  },
  {
    id: 'password_changed_admin',
    name: 'Password Reset by Admin',
    category: 'Auth',
    description: 'Sent when an administrator manually resets a customer account password.',
    recipientType: 'Customer',
    previewSubject: 'Your password was changed',
    defaultVariables: ['loginUrl'],
  },
  {
    id: 'test_mail',
    name: 'System Connection Test',
    category: 'System',
    description: 'Diagnostic email sent from the admin panel to verify SMTP / API connectivity.',
    recipientType: 'Admin',
    previewSubject: 'Bitlogic email test',
    defaultVariables: [],
  },
];

function generateRender(
  id: string,
  branding?: EmailBranding,
  customSubject?: string,
  customHtml?: string,
): OutgoingEmail {
  const dummyBase = 'https://bitlogic.local';

  // If raw custom HTML is provided, wrap it with the brand layout or use direct HTML
  if (customHtml && customHtml.trim()) {
    let finalHtml = customHtml;
    if (!customHtml.includes('<html') && !customHtml.includes('<!doctype')) {
      finalHtml = layout('Notification', customHtml, { branding });
    }
    return {
      to: '',
      subject: customSubject?.trim() || 'Custom Notification',
      html: finalHtml,
      text: 'Notification content',
    };
  }

  let email: OutgoingEmail;

  switch (id) {
    case 'order_placed_customer':
      email = orderPlacedCustomerMail({
        customerName: 'Hasan Mahmud',
        orderId: 'ORD-604631',
        itemsSummary: 'Canva Pro · Shared 1 Month',
        totalBdt: 250,
        gateway: 'bKash',
        trxId: 'BL9842XQ87',
        accessUrl: `${dummyBase}/orders/ORD-604631?token=sample-preview-token`,
      });
      break;
    case 'order_placed_admin':
      email = orderPlacedAdminMail({
        customerName: 'Hasan Mahmud',
        customerEmail: 'hasan.customer@example.com',
        customerPhone: '01712345678',
        orderId: 'ORD-604631',
        itemsSummary: 'Canva Pro · Shared 1 Month',
        totalBdt: 250,
        gateway: 'bKash',
        trxId: 'BL9842XQ87',
        adminOrderUrl: `${dummyBase}/admin/orders?id=ORD-604631`,
      });
      break;
    case 'payment_verified_customer':
      email = paymentVerifiedCustomerMail({
        customerName: 'Hasan Mahmud',
        orderId: 'ORD-604631',
        itemsSummary: 'Canva Pro · Shared 1 Month',
        accessUrl: `${dummyBase}/orders/ORD-604631?token=sample-preview-token`,
        credentials: [
          {
            label: 'Canva Pro (Shared Profile 1)',
            email: 'canva.vip.user@streamhub.io',
            password: 'ProSecretKey#2026',
            pin: '4821',
            note: 'Do not change the account password or profile name.',
          },
        ],
      });
      break;
    case 'payment_rejected_customer':
      email = paymentRejectedCustomerMail({
        customerName: 'Hasan Mahmud',
        orderId: 'ORD-604631',
        reason: 'Transaction ID "BL9842XQ87" could not be verified on bKash statement. Please recheck your SMS.',
        supportUrl: `${dummyBase}/contact`,
      });
      break;
    case 'renewal_reminder_customer':
      email = renewalReminderCustomerMail({
        customerName: 'Hasan Mahmud',
        productName: 'Canva Pro',
        expiresInDays: 5,
        renewalUrl: `${dummyBase}/orders/ORD-604631`,
      });
      break;
    case 'verify_email':
      email = verifyEmailMail('hasan.customer@example.com', 'Hasan Mahmud', `${dummyBase}/api/auth/verify-email?token=sample-token`);
      break;
    case 'reset_password':
      email = resetPasswordMail('hasan.customer@example.com', `${dummyBase}/reset-password?token=sample-token`);
      break;
    case 'password_changed_admin':
      email = passwordChangedByAdminMail('hasan.customer@example.com', `${dummyBase}/login`);
      break;
    case 'test_mail':
    default:
      email = testMail('admin@bitlogic.local');
      break;
  }

  // Inject branding if available
  if (branding) {
    const titleMatch = email.html.match(/<h1[^>]*>([^<]+)<\/h1>/);
    const title = titleMatch ? titleMatch[1] : 'Notification';
    // re-wrap with dynamic branding
    const bodyMatch = email.html.match(/<div style="font-size:14px;line-height:1.6;color:#334155">([\s\S]*?)<\/div>\s*<\/td>/);
    if (bodyMatch) {
      email.html = layout(title, bodyMatch[1], { branding });
    }
  }

  if (customSubject?.trim()) {
    email.subject = customSubject.trim();
  }
  return email;
}

/** GET /api/admin/email/templates */
export async function GET() {
  const { error } = await requirePermission('settings');
  if (error) return error;

  const cfg = await getEmailConfig();

  const list = TEMPLATES_META.map((t) => {
    const triggerConf = t.triggerKey ? (cfg.triggers as any)?.[t.triggerKey] : null;
    const custom = cfg.customTemplates?.[t.id];
    return {
      ...t,
      isTriggerActive: triggerConf ? Boolean(cfg.triggers.masterEnabled && triggerConf.enabled) : true,
      customSubject: custom?.subject || triggerConf?.customSubject || '',
      customHtml: custom?.bodyHtml || '',
    };
  });

  return NextResponse.json({
    templates: list,
    branding: cfg.branding,
  });
}

/** PUT /api/admin/email/templates — Save branding or custom template HTML/subject */
export async function PUT(request: Request) {
  const { error } = await requirePermission('settings');
  if (error) return error;

  const body = await request.json().catch(() => ({}));
  const { branding, templateId, customSubject, customHtml } = body;

  const patch: any = {};
  if (branding && typeof branding === 'object') {
    patch.branding = branding;
  }

  if (templateId) {
    const cur = await getEmailConfig();
    const customTemplates = { ...(cur.customTemplates || {}) };
    customTemplates[templateId] = {
      subject: customSubject !== undefined ? customSubject : customTemplates[templateId]?.subject,
      bodyHtml: customHtml !== undefined ? customHtml : customTemplates[templateId]?.bodyHtml,
    };
    patch.customTemplates = customTemplates;
  }

  const saved = await saveEmailConfig(patch);
  return NextResponse.json({ ok: true, branding: saved.branding, customTemplates: saved.customTemplates });
}

/** POST /api/admin/email/templates — Preview HTML or Send Sample Email */
export async function POST(request: Request) {
  const { session, error } = await requirePermission('settings');
  if (error) return error;

  const body = (await request.json().catch(() => ({}))) as {
    action?: 'preview' | 'send_sample';
    templateId?: string;
    to?: string;
    customSubject?: string;
    customHtml?: string;
    branding?: EmailBranding;
  };

  const cfg = await getEmailConfig();
  const effectiveBranding = body.branding || cfg.branding;
  const templateId = String(body.templateId || 'order_placed_customer');
  const rendered = generateRender(templateId, effectiveBranding, body.customSubject, body.customHtml);

  if (body.action === 'send_sample') {
    const to = String(body.to || session?.email || '').trim();
    if (!EMAIL_RE.test(to)) {
      return NextResponse.json({ error: 'Please enter a valid email address to receive the test sample.' }, { status: 400 });
    }
    const sendPayload: OutgoingEmail = {
      ...rendered,
      to,
      subject: `[SAMPLE] ${rendered.subject}`,
    };
    const result = await sendEmail(sendPayload);
    if (!result.ok) {
      return NextResponse.json({ error: result.error || 'Failed to send sample email.' }, { status: 502 });
    }
    return NextResponse.json({ ok: true, sentTo: to });
  }

  // Default: Return preview HTML and subject
  return NextResponse.json({
    templateId,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
  });
}
