import { db } from '@/lib/db';
import { getEmailConfig } from '@/lib/email/config';
import { sendEmail } from '@/lib/email/send';
import {
  orderPlacedCustomerMail,
  orderPlacedAdminMail,
  paymentVerifiedCustomerMail,
  paymentRejectedCustomerMail,
} from '@/lib/email/templates';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://bitlogic.local';

/**
 * Triggered after an order is successfully created in create-order.ts
 */
export async function dispatchOrderPlacedEmails(params: {
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  summary: string;
  totalBdt: number;
  gateway: string;
  trxId: string;
  accessToken: string;
}) {
  try {
    const cfg = await getEmailConfig();
    if (!cfg.triggers.masterEnabled || !cfg.triggers.orderPlaced.enabled) {
      return;
    }

    const accessUrl = `${BASE_URL}/orders/${params.orderId}?token=${params.accessToken}`;
    const adminOrderUrl = `${BASE_URL}/admin/orders?id=${params.orderId}`;

    // 1. Notify Customer
    if (cfg.triggers.orderPlaced.notifyCustomer && params.customerEmail) {
      const mail = orderPlacedCustomerMail({
        customerName: params.customerName,
        orderId: params.orderId,
        itemsSummary: params.summary,
        totalBdt: params.totalBdt,
        gateway: params.gateway,
        trxId: params.trxId,
        accessUrl,
      });
      mail.to = params.customerEmail;
      if (cfg.triggers.orderPlaced.customSubject?.trim()) {
        mail.subject = cfg.triggers.orderPlaced.customSubject.trim();
      }
      void sendEmail(mail).catch((err) =>
        console.error('[EmailTrigger] Failed sending customer orderPlaced mail:', err),
      );
    }

    // 2. Notify Admin
    if (cfg.triggers.orderPlaced.notifyAdmin) {
      const adminTo = cfg.triggers.orderPlaced.adminEmail || cfg.fromEmail;
      if (adminTo) {
        const mail = orderPlacedAdminMail({
          customerName: params.customerName,
          customerEmail: params.customerEmail,
          customerPhone: params.customerPhone,
          orderId: params.orderId,
          itemsSummary: params.summary,
          totalBdt: params.totalBdt,
          gateway: params.gateway,
          trxId: params.trxId,
          adminOrderUrl,
        });
        mail.to = adminTo;
        void sendEmail(mail).catch((err) =>
          console.error('[EmailTrigger] Failed sending admin orderPlaced alert:', err),
        );
      }
    }
  } catch (e) {
    console.error('[EmailTrigger] orderPlaced dispatcher error:', e);
  }
}

/**
 * Triggered when a payment transaction status changes to 'verified' or 'rejected'
 */
export async function dispatchPaymentStatusEmail(payment: {
  orderId: string;
  buyerName: string;
  buyerEmail: string;
  productSummary: string;
  status: 'verified' | 'rejected' | string;
  note?: string;
}) {
  try {
    const cfg = await getEmailConfig();
    if (!cfg.triggers.masterEnabled || !payment.buyerEmail) {
      return;
    }

    if (payment.status === 'verified' && cfg.triggers.paymentVerified.enabled && cfg.triggers.paymentVerified.notifyCustomer) {
      // Fetch associated delivery items to include provisioned credentials if any
      const deliveries = await db.digitalDelivery.findMany({
        where: { orderId: payment.orderId },
      });

      const vaultIds = deliveries
        .map((d) => d.vaultCredentialId)
        .filter((id): id is string => Boolean(id));

      const vaultItems = vaultIds.length > 0
        ? await db.vaultCredential.findMany({
            where: { id: { in: vaultIds } },
          })
        : [];

      const vaultMap = new Map(vaultItems.map((v) => [v.id, v]));

      const creds = deliveries
        .filter((d) => d.vaultCredentialId || d.status === 'delivered')
        .map((d) => {
          const v = d.vaultCredentialId ? vaultMap.get(d.vaultCredentialId) : null;
          return {
            label: `${d.productName} · ${d.variantName}`,
            email: v?.email || undefined,
            password: v?.password || undefined,
            pin: v?.profilePin || undefined,
            note: v?.noteBBCode || undefined,
          };
        });

      const accessUrl = `${BASE_URL}/orders/${payment.orderId}`;
      const mail = paymentVerifiedCustomerMail({
        customerName: payment.buyerName,
        orderId: payment.orderId,
        itemsSummary: payment.productSummary,
        accessUrl,
        credentials: creds.length > 0 ? creds : undefined,
      });
      mail.to = payment.buyerEmail;
      if (cfg.triggers.paymentVerified.customSubject?.trim()) {
        mail.subject = cfg.triggers.paymentVerified.customSubject.trim();
      }
      void sendEmail(mail).catch((err) =>
        console.error('[EmailTrigger] Failed sending paymentVerified mail:', err),
      );
    } else if (payment.status === 'rejected' && cfg.triggers.paymentRejected.enabled && cfg.triggers.paymentRejected.notifyCustomer) {
      const mail = paymentRejectedCustomerMail({
        customerName: payment.buyerName,
        orderId: payment.orderId,
        reason: payment.note || 'The transaction ID could not be confirmed on our payment gateway records.',
        supportUrl: `${BASE_URL}/contact`,
      });
      mail.to = payment.buyerEmail;
      if (cfg.triggers.paymentRejected.customSubject?.trim()) {
        mail.subject = cfg.triggers.paymentRejected.customSubject.trim();
      }
      void sendEmail(mail).catch((err) =>
        console.error('[EmailTrigger] Failed sending paymentRejected mail:', err),
      );
    }
  } catch (e) {
    console.error('[EmailTrigger] dispatchPaymentStatusEmail error:', e);
  }
}
