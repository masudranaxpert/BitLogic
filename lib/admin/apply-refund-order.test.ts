import { applyRefundOrder } from '@/lib/admin/apply-refund-order';
import type {
  DigitalDelivery,
  PaymentTransaction,
} from '@/lib/admin/types';

function pay(partial: Partial<PaymentTransaction> & Pick<PaymentTransaction, 'id' | 'amountBDT'>): PaymentTransaction {
  return {
    orderId: 'ORD-1',
    buyerName: 'A',
    buyerEmail: 'a@example.com',
    productSummary: 'X',
    gateway: 'Cash',
    senderNumberOrRef: '',
    trxId: 'T1',
    status: 'verified',
    createdAt: '2026-11-01 10:00',
    kind: 'purchase',
    ...partial,
  };
}

function unit(partial: Partial<DigitalDelivery> & Pick<DigitalDelivery, 'id'>): DigitalDelivery {
  return {
    orderId: 'ORD-1',
    createdAt: '2026-11-01',
    buyerName: 'A',
    buyerEmail: 'a@example.com',
    buyerPhone: '',
    productId: 'p1',
    productName: 'P',
    variantId: 'v1',
    variantName: 'V',
    credentialType: 'email_login',
    deliveryMode: 'manual_dispatch',
    status: 'pending_dispatch',
    credentialPayload: { secretValue: '' },
    vpnRequired: false,
    vpnRegionNote: '',
    hasWarranty: false,
    warrantyDays: 0,
    warrantyRemainingDays: 0,
    warrantyTerms: '',
    replacementHistoryCount: 0,
    loginInstructions: [],
    customAdminNote: '',
    ...partial,
  };
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

const payments = [
  pay({ id: 'p-buy', amountBDT: 1550 }),
  pay({ id: 'p-ren', amountBDT: 900, kind: 'renewal', trxId: 'R1' }),
];
const deliveries = [
  unit({ id: 'd1' }),
  unit({ id: 'd2' }),
];

const full = applyRefundOrder(
  payments,
  deliveries,
  {
    orderId: 'ORD-1',
    paymentIds: ['p-ren'],
    revokeDeliveryIds: ['d1'],
    reason: 'test',
    amountBdt: 900,
  },
  '2026-11-07 15:00',
);
assert(full.amount === 900, 'full amount');
assert(
  full.nextPayments.find((p) => p.id === 'p-ren')?.status === 'refunded',
  'renewal marked refunded',
);
assert(full.nextDeliveries.find((d) => d.id === 'd1')?.status === 'refunded', 'seat refunded');
assert(full.nextDeliveries.find((d) => d.id === 'd2')?.status === 'pending_dispatch', 'other seat live');

const partial = applyRefundOrder(
  payments,
  deliveries,
  {
    orderId: 'ORD-1',
    paymentIds: ['p-buy', 'p-ren'],
    revokeDeliveryIds: ['d1'],
    reason: 'partial',
    amountBdt: 900,
  },
  '2026-11-07 15:01',
);
assert(partial.amount === 900, 'partial amount');
assert(
  partial.nextPayments.some((p) => p.trxId === 'REFUND' && p.amountBDT === 900),
  'refund row created',
);
assert(
  partial.nextPayments.find((p) => p.id === 'p-buy')?.status === 'verified',
  'original buy stays verified',
);

console.log('apply-refund-order: ok');
