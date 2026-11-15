import assert from 'node:assert/strict';
import { appUrl } from '../auth/tokens';
import { DEFAULT_BRANDING } from './config';
import {
  orderPlacedAdminMail,
  orderPlacedCustomerMail,
  passwordChangedByAdminMail,
  paymentRejectedCustomerMail,
  paymentVerifiedCustomerMail,
  renewalReminderCustomerMail,
  resetPasswordMail,
  testMail,
  verifyEmailMail,
} from './templates';

// Verify Blumartbd theme defaults and no unwanted support footer text
assert.equal(DEFAULT_BRANDING.footerNote, '');
assert.equal(DEFAULT_BRANDING.primaryColor, '#FF5E5B');
assert.equal(DEFAULT_BRANDING.headerBg, '#151A2D');

const mails = [
  orderPlacedCustomerMail({
    customerName: 'Hasan',
    orderId: 'ORD-1',
    itemsSummary: 'Canva Pro',
    totalBdt: 250,
    gateway: 'bKash',
    trxId: 'TRX1',
    accessUrl: 'https://blumartbd.com/orders/ORD-1',
  }, DEFAULT_BRANDING),
  orderPlacedAdminMail({
    customerName: 'Hasan',
    customerEmail: 'h@example.com',
    customerPhone: '01700000000',
    orderId: 'ORD-1',
    itemsSummary: 'Canva Pro',
    totalBdt: 250,
    gateway: 'bKash',
    trxId: 'TRX1',
    adminOrderUrl: 'https://blumartbd.com/admin/orders?id=ORD-1',
  }, DEFAULT_BRANDING),
  paymentVerifiedCustomerMail({
    customerName: 'Hasan',
    orderId: 'ORD-1',
    itemsSummary: 'Canva Pro',
    accessUrl: 'https://blumartbd.com/orders/ORD-1',
    credentials: [{ label: 'Canva', email: 'a@b.com', password: 'pw', pin: '1234' }],
  }, DEFAULT_BRANDING),
  paymentRejectedCustomerMail({
    customerName: 'Hasan',
    orderId: 'ORD-1',
    reason: 'Mismatch',
    supportUrl: 'https://blumartbd.com/contact',
  }, DEFAULT_BRANDING),
  renewalReminderCustomerMail({
    customerName: 'Hasan',
    productName: 'Canva Pro',
    expiresInDays: 3,
    renewalUrl: 'https://blumartbd.com/orders/ORD-1',
  }, DEFAULT_BRANDING),
  verifyEmailMail('a@b.com', 'Hasan', 'https://blumartbd.com/api/auth/verify-email?token=t', DEFAULT_BRANDING),
  resetPasswordMail('a@b.com', 'https://blumartbd.com/reset-password?token=t', DEFAULT_BRANDING),
  passwordChangedByAdminMail('a@b.com', 'https://blumartbd.com/login', DEFAULT_BRANDING),
  testMail('a@b.com', DEFAULT_BRANDING),
];

for (const m of mails) {
  assert.ok(!m.html.includes('support@blumartbd.com'), `Unexpected support email in ${m.subject}`);
  assert.ok(!m.html.includes('did not request this email'), `Unexpected footer disclaimer in ${m.subject}`);
  assert.ok(!/bitlogic/i.test(m.html), `Unexpected BitLogic mention in ${m.subject}`);
  assert.ok(m.html.includes('#FF5E5B') && m.html.includes('#151A2D'), `Missing Blumartbd palette in ${m.subject}`);
}

// Verify reverse-proxied Docker host never falls back to 0.0.0.0:3000
const prevEnv = process.env.APP_URL;
delete process.env.APP_URL;
try {
  const proxied = new Request('https://0.0.0.0:3000/api/auth/verify-email?token=abc', {
    headers: { 'x-forwarded-host': 'blumartbd.com', 'x-forwarded-proto': 'https', host: '0.0.0.0:3000' },
  });
  assert.equal(appUrl(proxied), 'https://blumartbd.com');
} finally {
  if (prevEnv !== undefined) process.env.APP_URL = prevEnv;
}

console.log('email-templates-and-url: ok');
