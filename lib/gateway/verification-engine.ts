import { createHash, randomUUID } from 'node:crypto';
import { db } from '@/lib/db';
import {
  parseMfsSms,
  detectGatewayFromSender,
  type MfsParsedTransaction,
  normalizeBdPhone,
} from './mfs-parser';
import { dispatchPaymentStatusEmail } from '@/lib/email/dispatch';
import { getStoreSettings } from '@/lib/store-settings';
import { warrantyWindow } from '@/lib/warranty';
import { decryptSecret, encryptSecret } from '@/lib/crypto/secrets';
import { dispatchOrder } from '@/lib/suppliers/dispatch';
import { recordSystemActivity } from '@/lib/audit/record';

export type VerificationResult = {
  success: boolean;
  verified?: boolean;
  submitted?: boolean;
  orderId?: string;
  matchedBy?: 'fifo_time_window' | 'ref_order_id' | 'trx_id' | 'manual';
  message: string;
};

function pad(n: number) {
  return String(n).padStart(2, '0');
}
function formatDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function formatStamp(d: Date) {
  return `${formatDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * 3-Mode Autonomous Payment Verification Engine for Blumartbd.
 * Respects Admin Toggles:
 * - verifyModeTrxId (Mode 3: Transaction ID Match)
 * - verifyModeSenderFifo (Mode 1: Sender Number + Time Window FIFO, including overnight offline recovery)
 * - verifyModeReference (Mode 2: Reference / Invoice ID + Amount)
 *
 * Also guarantees 100% Raw SMS Retention: even unparsed or non-matching SMS are stored in MfsSmsLog.
 */
export async function processIncomingMfsSms(
  rawSms: string,
  originatingSender?: string,
  deviceId?: string,
  smsTimestamp?: number,
): Promise<VerificationResult> {
  const cleanSender = (originatingSender || '').trim();
  if (cleanSender.toUpperCase() === 'TEST_PING' || rawSms.includes('Connection Test Ping')) {
    await recordSystemActivity({
      action: 'sms.heartbeat',
      entityType: 'device',
      entityId: deviceId || '',
      summary: `Android Sync App heartbeat ping received${deviceId ? ` from device ${deviceId}` : ''}`,
    });
    return { success: true, message: 'Device heartbeat ping recorded' };
  }

  const receivedDate =
    typeof smsTimestamp === 'number' && smsTimestamp > 1_000_000_000_000
      ? new Date(smsTimestamp)
      : new Date();

  const parsed = parseMfsSms(rawSms, originatingSender);

  // 100% Raw SMS Tracking: Even if parsing fails (e.g. promo SMS or new telco format), save to MfsSmsLog!
  if (!parsed) {
    const rawHash =
      'RAW-' +
      createHash('sha256')
        .update(`${originatingSender || ''}:${rawSms.trim()}`)
        .digest('hex')
        .slice(0, 10)
        .toUpperCase();

    const fallbackGw = detectGatewayFromSender(originatingSender || '') || 'bkash';
    const existingRaw = await db.mfsSmsLog.findUnique({ where: { trxId: rawHash } });
    if (!existingRaw) {
      await db.mfsSmsLog.create({
        data: {
          deviceId: deviceId || null,
          gateway: fallbackGw,
          senderAddress: originatingSender || 'UNKNOWN',
          senderNumber: null,
          amount: 0,
          balance: null,
          trxId: rawHash,
          reference: null,
          rawSms: rawSms.trim(),
          receivedAt: receivedDate,
          status: 'parse_failed',
        },
      });
      await recordSystemActivity({
        action: 'sms.parse_failed',
        entityType: 'sms',
        entityId: rawHash,
        summary: `Saved unparsed raw SMS (${rawHash}) from ${originatingSender || 'unknown'}: "${rawSms.trim().slice(0, 100)}"`,
      });
    }
    return {
      success: false,
      message: 'Raw SMS saved (unparsed format). Available in Admin SMS Logs for inspection or manual link.',
    };
  }

  const settings = await getStoreSettings();

  // Check if this transaction ID was already recorded
  const existingLog = await db.mfsSmsLog.findUnique({
    where: { trxId: parsed.trxId },
  });

  if (existingLog && existingLog.status === 'matched') {
    return {
      success: true,
      orderId: existingLog.matchedOrderId || undefined,
      matchedBy: (existingLog.verificationMode as any) || 'trx_id',
      message: 'Transaction already matched to order ' + existingLog.matchedOrderId,
    };
  }

  // Log or update the SMS in database
  const smsRecord = existingLog
    ? await db.mfsSmsLog.update({
        where: { id: existingLog.id },
        data: {
          gateway: parsed.gateway,
          senderNumber: parsed.senderNumber || existingLog.senderNumber,
          amount: parsed.amount,
          balance: parsed.balance ?? existingLog.balance,
          reference: parsed.reference || existingLog.reference,
          status: existingLog.status === 'parse_failed' ? 'unmatched' : existingLog.status,
        },
      })
    : await db.mfsSmsLog.create({
        data: {
          deviceId: deviceId || null,
          gateway: parsed.gateway,
          senderAddress: parsed.senderAddress,
          senderNumber: parsed.senderNumber,
          amount: parsed.amount,
          balance: parsed.balance,
          trxId: parsed.trxId,
          reference: parsed.reference,
          rawSms: parsed.rawSms,
          receivedAt: receivedDate,
          status: 'unmatched',
        },
      });

  if (!existingLog) {
    await recordSystemActivity({
      action: 'sms.received',
      entityType: 'sms',
      entityId: parsed.trxId,
      summary: `Received ${parsed.gateway.toUpperCase()} SMS · ৳${parsed.amount} · TrxID ${parsed.trxId}${parsed.senderNumber ? ` from ${parsed.senderNumber}` : ''}`,
    });
  }

  const activeUnpaidStatuses = ['unpaid', 'pending'];

  // MODE 3: Pending TrxID Claim (Customer submitted TrxID via Gateway or Renewal)
  // -----------------------------------------------------------------------------
  if (settings.verifyModeTrxId !== false) {
    const pendingPayment = await db.paymentTransaction.findFirst({
      where: {
        trxId: { equals: parsed.trxId },
        status: 'pending_verification',
      },
    });

    if (pendingPayment) {
      const expectedBdt = Number(pendingPayment.amountBdt);
      const targetOrder = await db.order.findUnique({ where: { id: pendingPayment.orderId } });
      const orderBdt = targetOrder ? Number(targetOrder.totalBdt) : expectedBdt;
      if (Math.abs(expectedBdt - parsed.amount) < 0.01 || Math.abs(orderBdt - parsed.amount) < 0.01) {
        return await completeOrderVerification(
          pendingPayment.orderId,
          smsRecord.id,
          parsed,
          'trx_id',
          pendingPayment.id,
        );
      }
    }
  }

  // MODE 2: Reference Code (Invoice / Order ID) + Exact Amount
  // ----------------------------------------------------------
  if (settings.verifyModeReference && parsed.reference) {
    const cleanRef = parsed.reference.trim().toUpperCase().replace(/^#/, '');
    const numericRef = cleanRef.replace(/^ORD-/i, '');
    if (cleanRef.length >= 4 || numericRef.length >= 4) {
      const orderWithRef = await db.order.findFirst({
        where: {
          OR: [
            { id: { equals: cleanRef } },
            { id: { contains: cleanRef } },
            ...(numericRef.length >= 4 ? [{ id: { equals: `ORD-${numericRef}` } }, { id: { contains: numericRef } }] : []),
          ],
          paymentStatus: { in: activeUnpaidStatuses },
          status: { notIn: ['CANCELLED', 'REFUNDED'] },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (orderWithRef && Math.abs(Number(orderWithRef.totalBdt) - parsed.amount) < 0.01) {
        return await completeOrderVerification(orderWithRef.id, smsRecord.id, parsed, 'ref_order_id');
      }
    }
  }

  // MODE 1: Sender Number + Sliding Time Window (FIFO) + Exact Amount
  // Supports Overnight Offline Recovery (up to 48 hours for explicit sender registrations!)
  // ---------------------------------------------------------------------------------------
  if (settings.verifyModeSenderFifo !== false && parsed.senderNumber) {
    const normalizedSmsSender = normalizeBdPhone(parsed.senderNumber);

    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const thirtyMinutesBeforeSms = new Date(receivedDate.getTime() - 35 * 60 * 1000);
    const twoHoursAfterSms = new Date(receivedDate.getTime() + 2 * 60 * 60 * 1000);

    const candidateOrders = await db.order.findMany({
      where: {
        paymentStatus: { in: activeUnpaidStatuses },
        status: { notIn: ['CANCELLED', 'REFUNDED'] },
        createdAt: { gte: fortyEightHoursAgo },
      },
      include: { user: true },
      orderBy: { createdAt: 'asc' }, // FIFO ordering
    });

    const candidateTransactions = await db.paymentTransaction.findMany({
      where: {
        orderId: { in: candidateOrders.map((o) => o.id) },
        status: 'pending_verification',
      },
    });

    // Pass 1: Match orders where the customer explicitly submitted their sender phone on Step 1 of Gateway
    // Strict 11-digit Bangladeshi mobile match required to prevent operator collisions
    let matchedTxId: string | undefined;
    let matchingOrderByPhone = candidateOrders.find((o) => {
      const matchesAmount = Math.abs(Number(o.totalBdt) - parsed.amount) < 0.01;
      if (!matchesAmount) return false;

      const orderTrx = candidateTransactions.filter((t) => t.orderId === o.id);
      for (const t of orderTrx) {
        if (t.senderNumberOrRef) {
          const normRef = normalizeBdPhone(t.senderNumberOrRef);
          if (
            normRef.length === 11 &&
            normalizedSmsSender.length === 11 &&
            normRef === normalizedSmsSender
          ) {
            matchedTxId = t.id;
            return true;
          }
        }
      }
      return false;
    });

    // Pass 2: Fallback to user profile phone number within tight window around SMS timestamp
    if (!matchingOrderByPhone) {
      matchingOrderByPhone = candidateOrders.find((o) => {
        const matchesAmount = Math.abs(Number(o.totalBdt) - parsed.amount) < 0.01;
        if (!matchesAmount) return false;
        if (o.createdAt < thirtyMinutesBeforeSms || o.createdAt > twoHoursAfterSms) return false;
        if (o.user?.phone) {
          const normUser = normalizeBdPhone(o.user.phone);
          if (
            normUser.length === 11 &&
            normalizedSmsSender.length === 11 &&
            normUser === normalizedSmsSender
          ) {
            return true;
          }
        }
        return false;
      });
    }

    if (matchingOrderByPhone) {
      return await completeOrderVerification(
        matchingOrderByPhone.id,
        smsRecord.id,
        parsed,
        'fifo_time_window',
        matchedTxId,
      );
    }

    // Pass 3: Check pending renewal transactions matching sender phone + amount
    const pendingRenewal = await db.paymentTransaction.findFirst({
      where: {
        kind: 'renewal',
        status: 'pending_verification',
        createdAt: { gte: fortyEightHoursAgo },
      },
      orderBy: { createdAt: 'asc' },
    });
    if (
      pendingRenewal &&
      Math.abs(Number(pendingRenewal.amountBdt) - parsed.amount) < 0.01 &&
      pendingRenewal.senderNumberOrRef
    ) {
      const normRenSender = normalizeBdPhone(pendingRenewal.senderNumberOrRef);
      if (
        normRenSender.length === 11 &&
        normalizedSmsSender.length === 11 &&
        normRenSender === normalizedSmsSender
      ) {
        return await completeOrderVerification(
          pendingRenewal.orderId,
          smsRecord.id,
          parsed,
          'fifo_time_window',
          pendingRenewal.id,
        );
      }
    }
  }

  return {
    success: false,
    message: 'SMS logged. Awaiting customer TrxID or sender linkage.',
  };
}

/**
 * Registers the customer's MFS sender phone number on Step 1 of the Gateway UI
 * and immediately checks if a matching SMS from this sender already arrived in the last 24 hours!
 */
export async function registerSenderIntentForOrder(
  orderId: string,
  senderNumber: string,
  gateway: string,
): Promise<VerificationResult> {
  const cleanSender = normalizeBdPhone(senderNumber.trim());
  if (!/^01[3-9]\d{8}$/.test(cleanSender)) {
    return { success: false, message: 'Please enter a valid 11-digit mobile number (e.g. 017XXXXXXXX)' };
  }

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { user: true },
  });

  if (!order) {
    return { success: false, message: 'Order not found' };
  }

  if (order.paymentStatus === 'paid') {
    return { success: true, orderId, matchedBy: 'fifo_time_window', message: 'Order is already paid' };
  }

  if (order.status === 'CANCELLED' || order.status === 'REFUNDED') {
    return { success: false, message: 'Cannot register payment for a cancelled or refunded order.' };
  }

  const existingTx = await db.paymentTransaction.findFirst({
    where: { orderId, status: 'pending_verification' },
  });

  if (existingTx) {
    await db.paymentTransaction.update({
      where: { id: existingTx.id },
      data: {
        senderNumberOrRef: cleanSender,
        gateway: gateway || existingTx.gateway,
      },
    });
  } else {
    await db.paymentTransaction.create({
      data: {
        id: `PAY-${orderId}-INTENT`,
        orderId,
        buyerName: order.user?.name || 'Customer',
        buyerEmail: order.user?.email || 'customer@store.local',
        productSummary: `Order #${orderId}`,
        amountBdt: Math.round(Number(order.totalBdt)),
        gateway: gateway || 'bKash',
        senderNumberOrRef: cleanSender,
        trxId: '',
        status: 'pending_verification',
        createdAtLabel: new Date().toLocaleString('en-BD'),
      },
    });
  }

  await recordSystemActivity({
    userId: order.userId,
    action: 'payment.sender_registered',
    entityType: 'order',
    entityId: orderId,
    summary: `Customer registered ${gateway || 'MFS'} sender number ${cleanSender} on ${orderId}`,
  });

  // Retroactive check: Did an unmatched SMS from this sender with the exact amount arrive around order creation?
  const settings = await getStoreSettings();
  if (settings.verifyModeSenderFifo !== false) {
    const twoHoursBeforeOrder = new Date(order.createdAt.getTime() - 2 * 60 * 60 * 1000);
    const unmatchedLogs = await db.mfsSmsLog.findMany({
      where: {
        status: 'unmatched',
        receivedAt: { gte: twoHoursBeforeOrder },
      },
      orderBy: { receivedAt: 'desc' },
    });

    const matchedSms = unmatchedLogs.find((log) => {
      const amountMatch = Math.abs(Number(log.amount) - Number(order.totalBdt)) < 0.01;
      if (!amountMatch || !log.senderNumber) return false;
      const normLogSender = normalizeBdPhone(log.senderNumber);
      return (
        normLogSender.length === 11 &&
        cleanSender.length === 11 &&
        normLogSender === cleanSender
      );
    });

    if (matchedSms) {
      const parsed: MfsParsedTransaction = {
        gateway: matchedSms.gateway as any,
        senderAddress: matchedSms.senderAddress,
        senderNumber: matchedSms.senderNumber,
        amount: Number(matchedSms.amount),
        balance: matchedSms.balance ? Number(matchedSms.balance) : null,
        trxId: matchedSms.trxId,
        reference: matchedSms.reference,
        rawSms: matchedSms.rawSms,
      };
      return await completeOrderVerification(order.id, matchedSms.id, parsed, 'fifo_time_window');
    }
  }

  return {
    success: true,
    orderId,
    message: 'Sender number registered for automatic verification.',
  };
}

/**
 * Customer Manual TrxID Claim (When customer submits TrxID in the gateway)
 * - If SMS already arrived in MfsSmsLog: immediately auto-verifies & delivers credentials.
 * - If SMS has NOT arrived yet (e.g. merchant phone is offline): records the TrxID on PaymentTransaction,
 *   creates an AdminNotification so admin can optionally 1-click verify, logs to ActivityLog, and
 *   returns `{ success: true, verified: false, submitted: true }` so the customer is never trapped waiting!
 */
export async function claimTransactionIdForOrder(
  orderId: string,
  trxId: string,
  senderNumber?: string,
  gateway?: string,
): Promise<VerificationResult> {
  const cleanTrxId = trxId.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (cleanTrxId.length < 4) {
    return { success: false, message: 'সঠিক Transaction ID (TrxID) লিখুন।' };
  }

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: true, plan: true } }, user: true },
  });

  if (!order) {
    return { success: false, message: 'Order not found' };
  }

  if (order.paymentStatus === 'paid') {
    return {
      success: true,
      verified: true,
      orderId,
      matchedBy: 'trx_id',
      message: 'পেমেন্ট ইতিমধ্যে ভেরিফাই হয়েছে।',
    };
  }

  if (order.status === 'CANCELLED' || order.status === 'REFUNDED') {
    return {
      success: false,
      message: 'বাতিল বা রিফান্ড হওয়া অর্ডারে পেমেন্ট দাবি করা যাবে না।',
    };
  }

  // Prevent duplicate TrxID claim across different orders
  const duplicateTx = await db.paymentTransaction.findFirst({
    where: {
      trxId: cleanTrxId,
      orderId: { not: orderId },
      status: { in: ['verified', 'pending_verification'] },
    },
  });
  if (duplicateTx) {
    return {
      success: false,
      message: 'এই Transaction ID টি ইতিমধ্যে অন্য একটি অর্ডারে ব্যবহৃত হয়েছে।',
    };
  }

  // Check if we already received an SMS with this TrxID
  const smsLog = await db.mfsSmsLog.findUnique({
    where: { trxId: cleanTrxId },
  });

  if (smsLog) {
    if (smsLog.status === 'matched' && smsLog.matchedOrderId && smsLog.matchedOrderId !== orderId) {
      return {
        success: false,
        message: 'এই Transaction ID টি ইতিমধ্যে অন্য একটি অর্ডারে ব্যবহৃত হয়েছে।',
      };
    }

    const smsAmount = Number(smsLog.amount);
    const orderTotal = Number(order.totalBdt);

    if (Math.abs(smsAmount - orderTotal) >= 0.01) {
      return {
        success: false,
        message: `পরিমাণ মিলেনি: অর্ডারের পরিমাণ ৳${orderTotal}, কিন্তু এই TrxID তে পাওয়া গেছে ৳${smsAmount}।`,
      };
    }

    const parsed: MfsParsedTransaction = {
      gateway: smsLog.gateway as any,
      senderAddress: smsLog.senderAddress,
      senderNumber: smsLog.senderNumber,
      amount: smsAmount,
      balance: smsLog.balance ? Number(smsLog.balance) : null,
      trxId: smsLog.trxId,
      reference: smsLog.reference,
      rawSms: smsLog.rawSms,
    };

    const res = await completeOrderVerification(order.id, smsLog.id, parsed, 'trx_id');
    return { ...res, verified: true };
  }

  // SMS has not arrived yet (e.g. mobile device is currently offline):
  // Save the TrxID on PaymentTransaction so it auto-verifies the moment the phone syncs,
  // or allows an Admin/Staff to manually 1-click verify in /admin/payments.
  const existingTx = await db.paymentTransaction.findFirst({
    where: { orderId, status: 'pending_verification' },
  });

  const productSummary =
    order.items.map((i) => `${i.product.name} (${i.plan.label})`).join(', ') || `Order #${orderId}`;
  const buyerName = order.user?.name || 'Customer';
  const buyerEmail = order.user?.email || 'customer@store.local';
  const nowLabel = new Date().toLocaleString('en-BD');

  if (existingTx) {
    await db.paymentTransaction.update({
      where: { id: existingTx.id },
      data: {
        trxId: cleanTrxId,
        senderNumberOrRef: senderNumber ? normalizeBdPhone(senderNumber) : existingTx.senderNumberOrRef,
        gateway: gateway || existingTx.gateway,
        productSummary: existingTx.productSummary.startsWith('Order #') ? productSummary : existingTx.productSummary,
      },
    });
  } else {
    await db.paymentTransaction.create({
      data: {
        id: `PAY-${orderId}-${cleanTrxId}`,
        orderId,
        buyerName,
        buyerEmail,
        productSummary,
        amountBdt: Math.round(Number(order.totalBdt)),
        gateway: gateway || 'bKash',
        senderNumberOrRef: senderNumber ? normalizeBdPhone(senderNumber) : '',
        trxId: cleanTrxId,
        status: 'pending_verification',
        createdAtLabel: nowLabel,
      },
    });
  }

  // Create AdminNotification so Admin/Staff can see & verify if phone is offline
  try {
    await db.adminNotification.upsert({
      where: { id: `notif-trx-${orderId}` },
      create: {
        id: `notif-trx-${orderId}`,
        type: 'payment',
        orderId,
        title: `TrxID submitted for ${orderId}`,
        message: `${buyerName} submitted ${gateway || 'MFS'} TrxID ${cleanTrxId} (৳${Math.round(Number(order.totalBdt))}).`,
        timeLabel: 'Just now',
        read: false,
      },
      update: {
        title: `TrxID submitted for ${orderId}`,
        message: `${buyerName} submitted ${gateway || 'MFS'} TrxID ${cleanTrxId} (৳${Math.round(Number(order.totalBdt))}).`,
        timeLabel: 'Just now',
        read: false,
      },
    });
  } catch {
    // Non-fatal notification write
  }

  await recordSystemActivity({
    userId: order.userId,
    action: 'payment.trx_claimed',
    entityType: 'order',
    entityId: orderId,
    summary: `Customer (${buyerName}) submitted ${gateway || 'MFS'} TrxID ${cleanTrxId} (৳${Math.round(Number(order.totalBdt))}) for ${orderId}`,
  });

  return {
    success: true,
    verified: false,
    submitted: true,
    orderId,
    message: 'আপনার Transaction ID সফলভাবে সাবমিট হয়েছে।',
  };
}

/**
 * Admin Manual Match: Links any unmatched or parse_failed SMS log directly to an order.
 */
export async function manualMatchSmsToOrder(
  smsLogId: string,
  orderId: string,
  adminUserId?: string,
): Promise<VerificationResult> {
  const smsLog = await db.mfsSmsLog.findUnique({ where: { id: smsLogId } });
  if (!smsLog) {
    return { success: false, message: 'SMS Log entry not found' };
  }

  const cleanOrderId = orderId.trim().toUpperCase().replace(/^#/, '');
  const order = await db.order.findFirst({
    where: {
      OR: [{ id: cleanOrderId }, { id: { contains: cleanOrderId } }],
    },
  });

  if (!order) {
    return { success: false, message: `Order "${cleanOrderId}" not found` };
  }

  const reParsed = parseMfsSms(smsLog.rawSms, smsLog.senderAddress);
  const amount =
    Number(smsLog.amount) > 0
      ? Number(smsLog.amount)
      : reParsed?.amount || Number(order.totalBdt);

  const parsed: MfsParsedTransaction = {
    gateway: (reParsed?.gateway || smsLog.gateway || 'bkash') as any,
    senderAddress: smsLog.senderAddress,
    senderNumber: reParsed?.senderNumber || smsLog.senderNumber,
    amount,
    balance: reParsed?.balance ?? (smsLog.balance ? Number(smsLog.balance) : null),
    trxId: reParsed?.trxId || smsLog.trxId,
    reference: reParsed?.reference || smsLog.reference,
    rawSms: smsLog.rawSms,
  };

  return await completeOrderVerification(order.id, smsLog.id, parsed, 'manual', undefined, adminUserId);
}

/**
 * Provisions available VaultCredentials for any 'pending_dispatch' auto_vault units of an order,
 * and triggers supplier dispatch for supplier-backed units. Safe and idempotent.
 */
export async function fulfillPaidOrderDeliveries(orderId: string): Promise<number> {
  const now = new Date();
  const startedAt = formatDate(now);
  const stamp = formatStamp(now);
  let provisionedCount = 0;

  try {
    const pendingUnits = await db.digitalDelivery.findMany({
      where: {
        orderId,
        status: 'pending_dispatch',
        vaultCredentialId: null,
      },
      orderBy: [{ unitIndex: 'asc' }, { id: 'asc' }],
    });

    if (pendingUnits.length > 0) {
      await db.$transaction(async (tx) => {
        for (const unit of pendingUnits) {
          if (unit.deliveryMode !== 'auto_vault') continue;

          const plan = await tx.productPlan.findFirst({
            where: {
              product: { OR: [{ slug: unit.productId }, { id: unit.productId }] },
              OR: [{ code: unit.variantId }, { id: unit.variantId }],
            },
            include: { product: true },
          });

          const candidate = await tx.vaultCredential.findFirst({
            where: {
              OR: [
                { productId: unit.productId, variantId: unit.variantId },
                ...(plan
                  ? [
                      { productId: plan.product.slug, variantId: plan.code },
                      { productId: plan.product.slug, variantId: plan.id },
                      { productId: plan.product.id, variantId: plan.code },
                      { productId: plan.product.id, variantId: plan.id },
                    ]
                  : []),
              ],
              status: 'available',
            },
            orderBy: { createdAt: 'asc' },
          });

          if (!candidate) continue;

          const claimed = await tx.vaultCredential.updateMany({
            where: { id: candidate.id, status: 'available' },
            data: {
              status: 'delivered',
              assignedOrderId: orderId,
              assignedBuyerEmail: unit.buyerEmail,
            },
          });

          if (claimed.count !== 1) continue;

          const durationDays = unit.credentialValidDays || plan?.durationDays || 30;
          const expires = new Date(now.getTime() + Math.max(0, durationDays) * 86_400_000);
          const expiresAt =
            unit.orderExpiresAt ||
            (durationDays % 1 !== 0 ? formatStamp(expires) : formatDate(expires));
          const credExpires = candidate.expiresAt || expiresAt;

          const warrantyPatch =
            unit.hasWarranty && unit.warrantyDays > 0
              ? (() => {
                  const w = warrantyWindow(now, unit.warrantyDays, expiresAt);
                  return { warrantyStartsAt: w.startsAt, warrantyEndsAt: w.endsAt };
                })()
              : {};

          await tx.digitalDelivery.update({
            where: { id: unit.id },
            data: {
              status: 'delivered',
              deliveredAt: stamp,
              vaultCredentialId: candidate.id,
              credentialAssignedAt: startedAt,
              credentialExpiresAt: credExpires,
              ...warrantyPatch,
            },
          });

          await tx.credentialAudit.create({
            data: {
              id: `aud-${unit.id}-${randomUUID().slice(0, 6)}`,
              deliveryId: unit.id,
              atLabel: stamp,
              action: 'assigned',
              source: 'vault',
              secretValue: encryptSecret(decryptSecret(candidate.secretValue)),
              vaultCredentialId: candidate.id,
              credentialExpiresAt: credExpires,
              note: 'Auto-provisioned upon payment verification',
            },
          });

          provisionedCount++;
        }

        // Update order status if all units are now delivered
        const remainingPending = await tx.digitalDelivery.count({
          where: { orderId, status: 'pending_dispatch' },
        });
        if (remainingPending === 0) {
          await tx.order.updateMany({
            where: { id: orderId, status: { in: ['PENDING', 'PROCESSING'] } },
            data: { status: 'DELIVERED' },
          });
        }
      });
    }
  } catch (err) {
    console.error('[fulfillPaidOrderDeliveries vault claim error]', err);
  }

  // Trigger supplier auto-dispatch if any supplier-backed plans exist
  void dispatchOrder(orderId, { trigger: 'verify' }).catch((err) =>
    console.error('[fulfillPaidOrderDeliveries supplier dispatch error]', err),
  );

  return provisionedCount;
}

/**
 * Transitions Order to PAID, updates MfsSmsLog to MATCHED, updates PaymentTransaction,
 * auto-provisions Vault / Supplier credentials, and records ActivityLog.
 */
async function completeOrderVerification(
  orderId: string,
  smsLogId: string,
  parsed: MfsParsedTransaction,
  matchedBy: 'fifo_time_window' | 'ref_order_id' | 'trx_id' | 'manual',
  specificTxId?: string,
  actorUserId?: string,
): Promise<VerificationResult> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: true, plan: true } }, user: true },
  });

  if (!order) return { success: false, message: 'Order missing' };

  const existingPendingTx = specificTxId
    ? await db.paymentTransaction.findUnique({ where: { id: specificTxId } })
    : await db.paymentTransaction.findFirst({
        where: { orderId },
        orderBy: { createdAt: 'desc' },
      });

  const nowLabel = new Date().toLocaleString('en-BD');

  await db.$transaction(async (tx) => {
    // Atomic state transition: Ensure SMS has not already been matched
    const updatedSms = await tx.mfsSmsLog.updateMany({
      where: {
        id: smsLogId,
        status: { not: 'matched' },
      },
      data: {
        status: 'matched',
        matchedOrderId: orderId,
        verificationMode: matchedBy,
        trxId: parsed.trxId,
        amount: parsed.amount,
      },
    });

    if (updatedSms.count === 0) {
      const existing = await tx.mfsSmsLog.findUnique({ where: { id: smsLogId } });
      if (existing?.status === 'matched' && existing.matchedOrderId !== orderId) {
        throw new Error(`SMS log ${smsLogId} has already been matched to another order (${existing.matchedOrderId}).`);
      }
    }

    // Atomic order update: Ensure order is not already paid or cancelled/refunded
    const updatedOrder = await tx.order.updateMany({
      where: {
        id: orderId,
        paymentStatus: { not: 'paid' },
        status: { notIn: ['CANCELLED', 'REFUNDED'] },
      },
      data: {
        paymentStatus: 'paid',
        paidBdt: parsed.amount,
        status: order.status === 'PENDING' ? 'PROCESSING' : order.status,
      },
    });

    if (updatedOrder.count === 0 && order.paymentStatus !== 'paid') {
      throw new Error(`Order ${orderId} cannot be verified (current paymentStatus: ${order.paymentStatus}, status: ${order.status}).`);
    }

    if (existingPendingTx) {
      await tx.paymentTransaction.update({
        where: { id: existingPendingTx.id },
        data: {
          status: 'verified',
          trxId: parsed.trxId,
          amountBdt: Math.round(parsed.amount),
          gateway: parsed.gateway.toUpperCase(),
          senderNumberOrRef:
            parsed.senderNumber || existingPendingTx.senderNumberOrRef || parsed.reference || '',
          verifiedAtLabel: nowLabel,
        },
      });

      // If this was a subscription renewal payment, flag the renewed delivery units
      if (existingPendingTx.kind === 'renewal') {
        const renewIds = (existingPendingTx.renewDeliveryIds || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        await tx.digitalDelivery.updateMany({
          where: {
            orderId,
            ...(renewIds.length > 0 ? { id: { in: renewIds } } : {}),
          },
          data: { renewalPending: true },
        });
      }
    } else {
      await tx.paymentTransaction.create({
        data: {
          id: `PAY-${orderId}-${parsed.trxId}`,
          orderId,
          buyerName: order.user?.name || 'Customer',
          buyerEmail: order.user?.email || 'customer@store.local',
          productSummary: order.items[0]?.product?.name || `Order #${orderId}`,
          amountBdt: Math.round(parsed.amount),
          gateway: parsed.gateway.toUpperCase(),
          senderNumberOrRef: parsed.senderNumber || parsed.reference || '',
          trxId: parsed.trxId,
          status: 'verified',
          verifiedAtLabel: nowLabel,
          createdAtLabel: nowLabel,
        },
      });
    }
  });

  // Automatically fulfill auto_vault credentials and supplier orders now that payment is verified!
  const provisionedUnits = await fulfillPaidOrderDeliveries(orderId);

  const modeLabels: Record<typeof matchedBy, string> = {
    fifo_time_window: 'AUTO-VERIFIED · Mode 1 (Sender + Time FIFO)',
    ref_order_id: 'AUTO-VERIFIED · Mode 2 (Reference + Amount)',
    trx_id: 'AUTO-VERIFIED · Mode 3 (TrxID Match)',
    manual: 'MANUAL SMS LINK',
  };

  let manualActorInfo = '';
  if (matchedBy === 'manual' && actorUserId) {
    const actor = await db.user.findUnique({
      where: { id: actorUserId },
      select: { name: true, email: true, role: true },
    });
    if (actor) {
      manualActorInfo = ` by ${actor.name || actor.email} (${actor.role})`;
    }
  }

  await recordSystemActivity({
    userId: actorUserId || order.userId,
    action: matchedBy === 'manual' ? 'payment.manual_match' : 'payment.auto_verified',
    entityType: 'order',
    entityId: orderId,
    summary: `[${modeLabels[matchedBy]}${manualActorInfo}] Verified ৳${parsed.amount} via ${parsed.gateway.toUpperCase()} (TrxID: ${parsed.trxId}${parsed.senderNumber ? `, Sender: ${parsed.senderNumber}` : ''}) on ${orderId}${provisionedUnits > 0 ? ` · Auto-delivered ${provisionedUnits} vault unit(s)` : ''}`,
  });

  // Send automated confirmation email
  if (order.user?.email) {
    try {
      await dispatchPaymentStatusEmail({
        orderId: order.id,
        buyerName: order.user.name || 'Valued Customer',
        buyerEmail: order.user.email,
        productSummary: order.items[0]?.product?.name || `Order #${order.id}`,
        status: 'verified',
        note: `Payment verified (${matchedBy.replace(/_/g, ' ')}). TrxID: ${parsed.trxId}`,
      });
    } catch (e) {
      console.error('Error dispatching payment success email:', e);
    }
  }

  return {
    success: true,
    verified: true,
    orderId,
    matchedBy,
    message: `Payment verified via ${matchedBy.replace(/_/g, ' ')}!`,
  };
}
