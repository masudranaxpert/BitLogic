import type {
  DigitalDelivery,
  PaymentTransaction,
} from '@/lib/admin/types';

export type RefundOrderRequest = {
  orderId: string;
  paymentIds: string[];
  revokeDeliveryIds: string[];
  reason: string;
  amountBdt: number;
};

/**
 * Pure refund state transition — payments + deliveries for one order.
 * Persist + note are the caller's job (avoids race with partial saves).
 */
export function applyRefundOrder(
  payments: PaymentTransaction[],
  deliveries: DigitalDelivery[],
  req: RefundOrderRequest,
  stamp: string,
): {
  nextPayments: PaymentTransaction[];
  nextDeliveries: DigitalDelivery[];
  amount: number;
} {
  const payIds = new Set(req.paymentIds);
  const unitIds = new Set(req.revokeDeliveryIds);
  const selected = payments.filter((p) => payIds.has(p.id));
  const full = selected.reduce((n, p) => n + p.amountBDT, 0);
  const amount = Math.max(0, Math.min(full, Math.round(req.amountBdt)));

  let nextPayments = payments;
  if (amount > 0 && amount >= full && selected.length > 0) {
    nextPayments = payments.map((p) =>
      payIds.has(p.id)
        ? { ...p, status: 'refunded' as const, verifiedAt: stamp }
        : p,
    );
  } else if (amount > 0 && selected[0]) {
    const src = selected[0];
    const refundRow: PaymentTransaction = {
      id: `pay-refund-${Date.now()}`,
      orderId: req.orderId,
      buyerName: src.buyerName,
      buyerEmail: src.buyerEmail,
      productSummary: `Refund · ${src.productSummary}`,
      amountBDT: amount,
      gateway: src.gateway,
      senderNumberOrRef: src.senderNumberOrRef,
      trxId: 'REFUND',
      status: 'refunded',
      createdAt: stamp,
      verifiedAt: stamp,
      kind: 'manual',
    };
    nextPayments = [refundRow, ...payments];
  }

  const msg = {
    id: `adm-msg-${Date.now()}-refund`,
    sender: 'admin' as const,
    senderName: 'Support Admin',
    text:
      (amount > 0
        ? `A refund of BDT ${amount} for order ${req.orderId} has been issued.`
        : `Order ${req.orderId} has been cancelled.`) +
      (req.reason ? ` ${req.reason}` : ''),
    time: stamp,
  };

  const nextDeliveries = deliveries.map((d) => {
    if (d.orderId !== req.orderId) return d;
    const next = { ...d, chatMessages: [...(d.chatMessages || []), msg] };
    return unitIds.has(d.id)
      ? { ...next, status: 'refunded' as const, renewalPending: false }
      : next;
  });

  return { nextPayments, nextDeliveries, amount };
}
