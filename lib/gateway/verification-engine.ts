import { db } from '@/lib/db';
import { parseMfsSms, type MfsParsedTransaction, normalizeBdPhone } from './mfs-parser';
import { dispatchPaymentStatusEmail } from '@/lib/email/dispatch';

export type VerificationResult = {
  success: boolean;
  orderId?: string;
  matchedBy?: 'fifo_time_window' | 'ref_order_id' | 'trx_id' | 'unique_amount' | 'manual';
  message: string;
};

/**
 * 4-Mode Autonomous Payment Verification Engine for Blumartbd.
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

  // Attempt the 4 Matching Algorithms in Priority Order:
  // ----------------------------------------------------

  // MODE 2: Sender Number + Reference Code (Invoice / Order ID) + Exact Amount
  // -------------------------------------------------------------------------
  if (parsed.reference) {
    const cleanRef = parsed.reference.trim();
    // Search for order matching ID or clean reference
    const orderWithRef = await db.order.findFirst({
      where: {
        id: { contains: cleanRef },
        paymentStatus: 'unpaid',
      },
      include: { items: true },
    });

    if (orderWithRef && Math.abs(Number(orderWithRef.totalBdt) - parsed.amount) < 0.01) {
      return await completeOrderVerification(orderWithRef.id, smsRecord.id, parsed, 'ref_order_id');
    }
  }

  // MODE 3: Pending TrxID Claim (User previously submitted TrxID via the "Not verified? Submit Txn ID" dialog)
  // -----------------------------------------------------------------------------------------------------------
  const pendingPayment = await db.paymentTransaction.findFirst({
    where: {
      trxId: { equals: parsed.trxId },
      status: 'pending_verification',
    },
  });

  if (pendingPayment) {
    return await completeOrderVerification(pendingPayment.orderId, smsRecord.id, parsed, 'trx_id');
  }

  // MODE 4: Unique Amount Matching (Exact Amount match within active time window)
  // If an order was assigned a unique amount (e.g. 150.05 BDT) and is waiting for payment
  // --------------------------------------------------------------------------------------
  const fifteenMinutesAgo = new Date(Date.now() - 20 * 60 * 1000);
  const candidateOrders = await db.order.findMany({
    where: {
      paymentStatus: 'unpaid',
      createdAt: { gte: fifteenMinutesAgo },
    },
    include: { user: true },
    orderBy: { createdAt: 'desc' },
  });

  const exactAmountOrder = candidateOrders.find(
    (o) => Math.abs(Number(o.totalBdt) - parsed.amount) < 0.01
  );

  // If unique amount: check if only 1 order has this exact total in the 20-minute window
  const duplicateAmountCount = candidateOrders.filter(
    (o) => Math.abs(Number(o.totalBdt) - parsed.amount) < 0.01
  ).length;

  if (exactAmountOrder && duplicateAmountCount === 1) {
    // 100% collision-free unique amount match!
    return await completeOrderVerification(exactAmountOrder.id, smsRecord.id, parsed, 'unique_amount');
  }

  // MODE 1: Sender Number + Sliding Time Window (FIFO) + Amount
  // -----------------------------------------------------------
  if (parsed.senderNumber) {
    const normalizedSender = normalizeBdPhone(parsed.senderNumber);

    // Look for pending orders where customer phone or payment note matches sender
    const matchingOrderByPhone = candidateOrders.find((o) => {
      // Check customer phone or payment transaction intent
      const matchesAmount = Math.abs(Number(o.totalBdt) - parsed.amount) < 0.01;
      const userPhone = o.user?.phone ? normalizeBdPhone(o.user.phone) : null;
      return matchesAmount && (userPhone === normalizedSender || userPhone?.includes(normalizedSender));
    });

    if (matchingOrderByPhone) {
      return await completeOrderVerification(matchingOrderByPhone.id, smsRecord.id, parsed, 'fifo_time_window');
    }
  }

  return {
    success: false,
    message: 'SMS logged successfully. Awaiting customer TrxID submission or order linkage.',
  };
}

/**
 * Customer Manual TrxID Claim (When customer clicks "Submit Txn ID" in the gateway modal)
 */
export async function claimTransactionIdForOrder(
  orderId: string,
  trxId: string,
  senderNumber?: string
): Promise<VerificationResult> {
  const cleanTrxId = trxId.trim().toUpperCase();
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

    // Match found! Auto-complete the order
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

  // SMS has not arrived yet: Create a pending payment claim so that when SMS arrives, it immediately approves
  await db.paymentTransaction.upsert({
    where: { id: `PAY-${orderId}-${cleanTrxId}` },
    update: {
      status: 'pending_verification',
      senderNumberOrRef: senderNumber || '',
      trxId: cleanTrxId,
    },
    create: {
      id: `PAY-${orderId}-${cleanTrxId}`,
      orderId,
      buyerName: order.user?.name || 'Customer',
      buyerEmail: order.user?.email || 'customer@store.local',
      productSummary: `Order #${orderId}`,
      amountBdt: Math.round(Number(order.totalBdt)),
      gateway: 'mfs_auto',
      senderNumberOrRef: senderNumber || '',
      trxId: cleanTrxId,
      status: 'pending_verification',
      createdAtLabel: new Date().toLocaleString('en-BD'),
    },
  });

  return {
    success: false,
    message: 'Transaction ID submitted. Verifying with mobile network...',
  };
}

/**
 * Transitions Order to PAID, updates MfsSmsLog to MATCHED, and triggers auto-delivery.
 */
async function completeOrderVerification(
  orderId: string,
  smsLogId: string,
  parsed: MfsParsedTransaction,
  matchedBy: 'fifo_time_window' | 'ref_order_id' | 'trx_id' | 'unique_amount' | 'manual'
): Promise<VerificationResult> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: true, plan: true } }, user: true },
  });

  if (!order) return { success: false, message: 'Order missing' };

  await db.$transaction([
    // Update Order
    db.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: 'paid',
        paidBdt: parsed.amount,
        status: order.status === 'PENDING' ? 'PROCESSING' : order.status,
      },
    }),

    // Update MfsSmsLog
    db.mfsSmsLog.update({
      where: { id: smsLogId },
      data: {
        status: 'matched',
        matchedOrderId: orderId,
        verificationMode: matchedBy,
      },
    }),

    // Upsert PaymentTransaction record
    db.paymentTransaction.upsert({
      where: { id: `PAY-${orderId}-${parsed.trxId}` },
      update: {
        status: 'verified',
        amountBdt: Math.round(parsed.amount),
        gateway: parsed.gateway,
        senderNumberOrRef: parsed.senderNumber || parsed.reference || '',
        verifiedAtLabel: new Date().toLocaleString('en-BD'),
      },
      create: {
        id: `PAY-${orderId}-${parsed.trxId}`,
        orderId,
        buyerName: order.user?.name || 'Customer',
        buyerEmail: order.user?.email || 'customer@store.local',
        productSummary: order.items[0]?.product?.name || `Order #${orderId}`,
        amountBdt: Math.round(parsed.amount),
        gateway: parsed.gateway,
        senderNumberOrRef: parsed.senderNumber || parsed.reference || '',
        trxId: parsed.trxId,
        status: 'verified',
        verifiedAtLabel: new Date().toLocaleString('en-BD'),
        createdAtLabel: new Date().toLocaleString('en-BD'),
      },
    }),
  ]);

  // Send automated confirmation email
  if (order.user?.email) {
    try {
      await dispatchPaymentStatusEmail({
        orderId: order.id,
        buyerName: order.user.name || 'Valued Customer',
        buyerEmail: order.user.email,
        productSummary: order.items[0]?.product?.name || `Order #${order.id}`,
        status: 'verified',
        note: `Payment verified automatically via ${matchedBy.replace(/_/g, ' ')}. TrxID: ${parsed.trxId}`,
      });
    } catch (e) {
      console.error('Error dispatching payment success email:', e);
    }
  }

  return {
    success: true,
    orderId,
    matchedBy,
    message: `Payment successfully verified via ${matchedBy.replace(/_/g, ' ')}!`,
  };
}
