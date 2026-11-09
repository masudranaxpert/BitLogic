import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { GatewayCheckoutView } from '@/components/gateway/GatewayCheckoutView';
import { getStoreSettings } from '@/lib/store-settings';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Secure Payment Gateway | Blumartbd',
  description: 'Complete your instant MFS payment securely on Blumartbd.',
  robots: { index: false, follow: false },
};

function maskEmail(email?: string | null): string {
  if (!email) return '';
  const parts = email.split('@');
  if (parts.length !== 2) return '***';
  const name = parts[0];
  const domain = parts[1];
  const maskedName = name.length > 2 ? `${name.slice(0, 2)}***${name.slice(-1)}` : `${name}***`;
  return `${maskedName}@${domain}`;
}

function maskPhone(phone?: string | null): string {
  if (!phone) return '';
  const clean = phone.replace(/\s+/g, '');
  if (clean.length >= 7) {
    return `${clean.slice(0, 3)}****${clean.slice(-3)}`;
  }
  return '***';
}

export default async function PaymentGatewayPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ method?: string }>;
}) {
  const { id: orderId } = await params;
  const { method } = await searchParams;

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { product: true, plan: true } },
      user: true,
    },
  });

  if (!order) {
    notFound();
  }

  const latestTxn = await db.paymentTransaction.findFirst({
    where: { orderId: order.id },
    orderBy: { createdAt: 'desc' },
  });

  const settings = await getStoreSettings();

  return (
    <GatewayCheckoutView
      orderId={order.id}
      initialMethod={
        (method?.toLowerCase() as 'bkash' | 'nagad' | 'rocket') ||
        (latestTxn?.gateway?.toLowerCase() as 'bkash' | 'nagad' | 'rocket') ||
        'bkash'
      }
      totalBdt={Number(order.totalBdt)}
      itemsSummary={order.items.map((i) => `${i.product.name} (${i.plan.label})`).join(', ')}
      paymentStatus={order.paymentStatus}
      customerName={order.user?.name || 'Customer'}
      customerEmail={maskEmail(order.user?.email)}
      customerPhone={maskPhone(order.user?.phone)}
      registeredSenderNumber={latestTxn?.senderNumberOrRef ? maskPhone(latestTxn.senderNumberOrRef) : ''}
      settings={{
        bkashEnabled: settings.bkashEnabled !== false,
        bkashNumber: settings.bkashNumber || '01700-123456',
        bkashType: settings.bkashType || 'Personal',
        nagadEnabled: settings.nagadEnabled !== false,
        nagadNumber: settings.nagadNumber || '01700-123456',
        nagadType: settings.nagadType || 'Personal',
        rocketEnabled: Boolean(settings.rocketEnabled),
        rocketNumber: settings.rocketNumber || '01700-123456',
        rocketType: settings.rocketType || 'Personal',
        verifyModeTrxId: settings.verifyModeTrxId !== false,
        verifyModeSenderFifo: settings.verifyModeSenderFifo !== false,
        verifyModeReference: settings.verifyModeReference !== false,
      }}
    />
  );
}
