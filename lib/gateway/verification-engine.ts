import { db } from '@/lib/db';
import { parseMfsSms, type MfsParsedTransaction, normalizeBdPhone } from './mfs-parser';
import { dispatchPaymentStatusEmail } from '@/lib/email/dispatch';
import { getStoreSettings } from '@/lib/store-settings';

export type VerificationResult = {
  success: boolean;
  orderId?: string;
  matchedBy?: 'fifo_time_window' | 'ref_order_id' | 'trx_id' | 'manual';
  message: string;
};

/**
 * 3-Mode Autonomous Payment Verification Engine for Blumartbd.
 * Respects Admin Toggles:
 * - verifyModeTrxId (Mode 3: Transaction ID Match)
 * - verifyModeSenderFifo (Mode 1: Sender Number + Time Window FIFO)
 * - verifyModeReference (Mode 2: Reference / Invoice ID + Amount)
 */
export async function processIncomingMfsSms(
  rawSms: string,
  originatingSender?: string,
  deviceId?: string
): Promise<VerificationResult> {
  const parsed = parseMfsSms(rawSms, originatingSender);
  if (!parsed) {
    return { success: false, message: 'SMS could not be parsed into valid MFS transaction structure' };
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
    ? existingLog
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
          status: 'unmatched',
        },
      });

  const activeUnpaidStatuses = ['unpaid', 'pending'];
  const twentyMinutesAgo = new Date(Date.now() - 25 * 60 * 1000);

  // MODE 3: Pending TrxID Claim (User submitted TrxID via Gateway Modal)
  // -------------------------------------------------------------------
  if (settings.verifyModeTrxId !== false) {
    const pendingPayment = await db.paymentTransaction.findFirst({
      where: {
        trxId: { equals: parsed.trxId },
        status: 'pending_verification',
      },
    });

    if (pendingPayment) {
      const targetOrder = await db.order.findUnique({ where: { id: pendingPayment.orderId } });
      if (targetOrder && Math.abs(Number(targetOrder.totalBdt) - parsed.amount) <= 1.0) {
        return await completeOrderVerification(pendingPayment.orderId, smsRecord.id, parsed, 'trx_id');
      }
    }
  }

  // MODE 2: Reference Code (Invoice / Order ID) + Exact Amount
  // ----------------------------------------------------------
  if (settings.verifyModeReference !== false && parsed.reference) {
    const cleanRef = parsed.reference.trim().toUpperCase().replace(/^#/, '');
    if (cleanRef.length >= 4) {
      const orderWithRef = await db.order.findFirst({
        where: {
          id: { contains: cleanRef },
          paymentStatus: { in: activeUnpaidStatuses },
        },
      });

      if (orderWithRef && Math.abs(Number(orderWithRef.totalBdt) - parsed.amount) < 0.01) {
        return await completeOrderVerification(orderWithRef.id, smsRecord.id, parsed, 'ref_order_id');
      }
    }
  }

  // Fetch recent pending orders for Mode 1 & Mode 4
  const candidateOrders = await db.order.findMany({
    where: {
      paymentStatus: { in: activeUnpaidStatuses },
      createdAt: { gte: twentyMinutesAgo },
    },
    include: { user: true },
    orderBy: { createdAt: 'asc' }, // FIFO ordering
  });

  // Also fetch recent pending PaymentTransaction records to check senderNumberOrRef
  const candidateTransactions = await db.paymentTransaction.findMany({
    where: {
      orderId: { in: candidateOrders.map((o) => o.id) },
      status: 'pending_verification',
    },
  });

  // MODE 1: Sender Number + Sliding Time Window (FIFO) + Exact Amount
  // -----------------------------------------------------------------
  if (settings.verifyModeSenderFifo !== false && parsed.senderNumber) {
    const normalizedSmsSender = normalizeBdPhone(parsed.senderNumber);
    // Rocket often appends a 12th check digit or masks digits; compare core 11 digits or suffix
    const smsLast8 = normalizedSmsSender.slice(-8);

    const matchingOrderByPhone = candidateOrders.find((o) => {
      const matchesAmount = Math.abs(Number(o.totalBdt) - parsed.amount) < 0.01;
      if (!matchesAmount) return false;

      // 1. Check Order's PaymentTransaction senderNumberOrRef (updated when user enters sender number on Step 1 of Gateway)
      const orderTrx = candidateTransactions.filter((t) => t.orderId === o.id);
      for (const t of orderTrx) {
        if (t.senderNumberOrRef) {
          const normRef = normalizeBdPhone(t.senderNumberOrRef);
          if (normRef === normalizedSmsSender || (smsLast8.length === 8 && normRef.endsWith(smsLast8))) {
            return true;
          }
        }
      }

      // 2. Check User account phone fallback
      if (o.user?.phone) {
        const normUser = normalizeBdPhone(o.user.phone);
        if (normUser === normalizedSmsSender || (smsLast8.length === 8 && normUser.endsWith(smsLast8))) {
          return true;
        }
      }

      return false;
    });

    if (matchingOrderByPhone) {
      return await completeOrderVerification(matchingOrderByPhone.id, smsRecord.id, parsed, 'fifo_time_window');
    }
  }

  return {
    success: false,
    message: 'SMS logged. Awaiting customer TrxID or sender linkage.',
  };
}

/**
 * Registers the customer's MFS sender phone number on Step 1 of the Gateway UI
 * and immediately checks if a matching SMS from this sender already arrived in the last 20 minutes!
 */
export async function registerSenderIntentForOrder(
  orderId: string,
  senderNumber: string,
  gateway: string
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

  // Update existing pending PaymentTransaction or create one with the customer's actual MFS sender number
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

  // Retroactive check: Did an unmatched SMS from this sender with the exact amount already arrive in the last 20 mins?
  const settings = await getStoreSettings();
  if (settings.verifyModeSenderFifo !== false) {
    const twentyMinsAgo = new Date(Date.now() - 20 * 60 * 1000);
    const unmatchedLogs = await db.mfsSmsLog.findMany({
      where: {
        status: 'unmatched',
        createdAt: { gte: twentyMinsAgo },
      },
      orderBy: { createdAt: 'desc' },
    });

    const senderLast8 = cleanSender.slice(-8);
    const matchedSms = unmatchedLogs.find((log) => {
      const amountMatch = Math.abs(Number(log.amount) - Number(order.totalBdt)) < 0.01;
      if (!amountMatch || !log.senderNumber) return false;
      const normLogSender = normalizeBdPhone(log.senderNumber);
      return normLogSender === cleanSender || normLogSender.endsWith(senderLast8);
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
 */
export async function claimTransactionIdForOrder(
  orderId: string,
  trxId: string,
  senderNumber?: string,
  gateway?: string
): Promise<VerificationResult> {
  const cleanTrxId = trxId.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (cleanTrxId.length < 5) {
    return { success: false, message: 'Please enter a valid Transaction ID.' };
  }

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { user: true },
  });

  if (!order) {
    return { success: false, message: 'Order not found' };
  }

  if (order.paymentStatus === 'paid') {
    return { success: true, orderId, matchedBy: 'trx_id', message: 'Order is already paid.' };
  }

  // Check if we already received an SMS with this TrxID
  const smsLog = await db.mfsSmsLog.findUnique({
    where: { trxId: cleanTrxId },
  });

  if (smsLog) {
    if (smsLog.status === 'matched' && smsLog.matchedOrderId && smsLog.matchedOrderId !== orderId) {
      return { success: false, message: 'This Transaction ID has already been used for another order.' };
    }

    const smsAmount = Number(smsLog.amount);
    const orderTotal = Number(order.totalBdt);

    if (Math.abs(smsAmount - orderTotal) > 1.0) {
      return {
        success: false,
        message: `Amount mismatch: Order requires ৳${orderTotal}, but SMS was received for ৳${smsAmount}.`,
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

    return await completeOrderVerification(order.id, smsLog.id, parsed, 'trx_id');
  }

  // SMS has not arrived yet: Record pending claim so when SMS arrives, it auto-verifies
  const existingTx = await db.paymentTransaction.findFirst({
    where: { orderId, status: 'pending_verification' },
  });

  if (existingTx) {
    await db.paymentTransaction.update({
      where: { id: existingTx.id },
      data: {
        trxId: cleanTrxId,
        senderNumberOrRef: senderNumber ? normalizeBdPhone(senderNumber) : existingTx.senderNumberOrRef,
        gateway: gateway || existingTx.gateway,
      },
    });
  } else {
    await db.paymentTransaction.create({
      data: {
        id: `PAY-${orderId}-${cleanTrxId}`,
        orderId,
        buyerName: order.user?.name || 'Customer',
        buyerEmail: order.user?.email || 'customer@store.local',
        productSummary: `Order #${orderId}`,
        amountBdt: Math.round(Number(order.totalBdt)),
        gateway: gateway || 'bKash',
        senderNumberOrRef: senderNumber ? normalizeBdPhone(senderNumber) : '',
        trxId: cleanTrxId,
        status: 'pending_verification',
        createdAtLabel: new Date().toLocaleString('en-BD'),
      },
    });
  }

  return {
    success: false,
    message: 'TrxID recorded! Waiting for mobile network SMS confirmation (usually 5-15 seconds)...',
  };
}

/**
 * Transitions Order to PAID, updates MfsSmsLog to MATCHED, and updates PaymentTransaction without creating duplicates.
 */
async function completeOrderVerification(
  orderId: string,
  smsLogId: string,
  parsed: MfsParsedTransaction,
  matchedBy: 'fifo_time_window' | 'ref_order_id' | 'trx_id' | 'manual'
): Promise<VerificationResult> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: true, plan: true } }, user: true },
  });

  if (!order) return { success: false, message: 'Order missing' };

  const existingPendingTx = await db.paymentTransaction.findFirst({
    where: { orderId },
    orderBy: { createdAt: 'desc' },
  });

  const nowLabel = new Date().toLocaleString('en-BD');

  await db.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: 'paid',
        paidBdt: parsed.amount,
        status: order.status === 'PENDING' ? 'PROCESSING' : order.status,
      },
    });

    await tx.mfsSmsLog.update({
      where: { id: smsLogId },
      data: {
        status: 'matched',
        matchedOrderId: orderId,
        verificationMode: matchedBy,
      },
    });

    if (existingPendingTx) {
      await tx.paymentTransaction.update({
        where: { id: existingPendingTx.id },
        data: {
          status: 'verified',
          trxId: parsed.trxId,
          amountBdt: Math.round(parsed.amount),
          gateway: parsed.gateway.toUpperCase(),
          senderNumberOrRef: parsed.senderNumber || existingPendingTx.senderNumberOrRef || parsed.reference || '',
          verifiedAtLabel: nowLabel,
        },
      });
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

  // Send automated confirmation email
  if (order.user?.email) {
    try {
      await dispatchPaymentStatusEmail({
        orderId: order.id,
        buyerName: order.user.name || 'Valued Customer',
        buyerEmail: order.user.email,
        productSummary: order.items[0]?.product?.name || `Order #${order.id}`,
        status: 'verified',
        note: `Payment verified automatically (${matchedBy.replace(/_/g, ' ')}). TrxID: ${parsed.trxId}`,
      });
    } catch (e) {
      console.error('Error dispatching payment success email:', e);
    }
  }

  return {
    success: true,
    orderId,
    matchedBy,
    message: `Payment verified via ${matchedBy.replace(/_/g, ' ')}!`,
  };
}
