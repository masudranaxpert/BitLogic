import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { GatewayCheckoutView } from '@/components/gateway/GatewayCheckoutView';
import { getStoreSettings } from '@/lib/store-settings';

export const metadata: Metadata = {
  title: 'Secure Payment Gateway | Blumartbd',
  description: 'Complete your instant MFS payment securely on Blumartbd.',
};

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

  const settings = await getStoreSettings();

  return (
    <GatewayCheckoutView
      orderId={order.id}
      initialMethod={(method as any) || 'bkash'}
      totalBdt={Number(order.totalBdt)}
      itemsSummary={order.items.map((i) => `${i.product.name} (${i.plan.label})`).join(', ')}
      paymentStatus={order.paymentStatus}
      customerEmail={order.user?.email || ''}
      customerPhone={order.user?.phone || ''}
      settings={{
        bkashNumber: settings.bkashNumber || '01700-123456',
        bkashType: settings.bkashType || 'Personal',
        nagadNumber: settings.nagadNumber || '01700-123456',
        nagadType: settings.nagadType || 'Personal',
        rocketNumber: settings.rocketNumber || '01700-123456',
        rocketType: settings.rocketType || 'Personal',
      }}
    />
  );
}
