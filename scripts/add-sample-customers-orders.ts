/**
 * Seed a handful of admin customers + deliveries (orders).
 * Run: npx tsx scripts/add-sample-customers-orders.ts
 */
import { db } from '../lib/db';
import type {
  DigitalDelivery,
  PaymentTransaction,
  SubscriberUser,
} from '../lib/admin/types';

const customers: SubscriberUser[] = [
  {
    id: 'cust-rafi',
    name: 'Rafi Ahmed',
    email: 'rafi.ahmed@gmail.com',
    phone: '+880 1711-223344',
    joinedAt: '2026-02-12',
    status: 'active',
    role: 'subscriber',
    emailVerified: null,
    activeSubscriptions: [],
    totalSpentBDT: 700,
    ordersCount: 2,
    warrantyClaimsCount: 0,
  },
  {
    id: 'cust-nabila',
    name: 'Nabila Rahman',
    email: 'nabila.r@outlook.com',
    phone: '+880 1812-556677',
    joinedAt: '2026-03-04',
    status: 'active',
    role: 'vip',
    emailVerified: null,
    activeSubscriptions: [],
    totalSpentBDT: 450,
    ordersCount: 1,
    warrantyClaimsCount: 0,
  },
  {
    id: 'cust-karim',
    name: 'Karim Hossain',
    email: 'karim.h@yahoo.com',
    phone: '+880 1913-889900',
    joinedAt: '2026-01-28',
    status: 'suspended',
    role: 'reseller',
    emailVerified: null,
    activeSubscriptions: [],
    totalSpentBDT: 250,
    ordersCount: 1,
    warrantyClaimsCount: 1,
  },
  {
    id: 'cust-sadia',
    name: 'Sadia Islam',
    email: 'sadia.islam@gmail.com',
    phone: '+880 1614-112233',
    joinedAt: '2026-04-01',
    status: 'active',
    role: 'subscriber',
    emailVerified: null,
    activeSubscriptions: [],
    totalSpentBDT: 300,
    ordersCount: 1,
    warrantyClaimsCount: 0,
  },
];

async function upsertCustomer(c: SubscriberUser) {
  await db.adminSubscriber.upsert({
    where: { email: c.email },
    create: {
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      joinedAt: c.joinedAt,
      status: c.status,
      role: c.role,
      subscriptionsJson: JSON.stringify(c.activeSubscriptions),
      totalSpentBdt: c.totalSpentBDT,
      ordersCount: c.ordersCount,
      warrantyClaimsCount: c.warrantyClaimsCount,
    },
    update: {
      name: c.name,
      phone: c.phone,
      status: c.status,
      role: c.role,
      totalSpentBdt: c.totalSpentBDT,
      ordersCount: c.ordersCount,
      warrantyClaimsCount: c.warrantyClaimsCount,
    },
  });
}

async function main() {
  const products = await db.product.findMany({
    include: { plans: { orderBy: { priceBdt: 'asc' } } },
    orderBy: { name: 'asc' },
  });

  if (products.length === 0) {
    throw new Error('No products in DB. Run add-sample-products.ts first.');
  }

  for (const c of customers) {
    await upsertCustomer(c);
    console.log(`Customer: ${c.name}`);
  }

  const bySlug = (slug: string) => products.find((p) => p.slug === slug);
  const canva = bySlug('prd-canva-pro');
  const chatgpt = bySlug('prd-chatgpt-plus');
  const netflix = bySlug('prd-netflix');
  const capcut = bySlug('prd-capcut-pro');

  const pick = canva || chatgpt || products[0];
  const pickPlan = pick.plans[0];
  const chatgptPlan =
    chatgpt?.plans.find((p) => p.label.toLowerCase().includes('shared')) ||
    chatgpt?.plans[0];
  const netflixPlan = netflix?.plans[0];
  const capcutPlan = capcut?.plans[0];
  const canvaPlan = canva?.plans[0];

  type OrderSpec = {
    orderLabel: string;
    deliveryId: string;
    customer: SubscriberUser;
    product: (typeof products)[0];
    plan: (typeof products)[0]['plans'][0];
    status: DigitalDelivery['status'];
    secret?: string;
    email?: string;
    password?: string;
    pin?: string;
    gateway: PaymentTransaction['gateway'];
    createdAt: string;
  };

  const specs: OrderSpec[] = [];

  if (canva && canvaPlan) {
    specs.push({
      orderLabel: 'ORD-88401',
      deliveryId: 'DLV-9101',
      customer: customers[0],
      product: canva,
      plan: canvaPlan,
      status: 'pending_dispatch',
      gateway: 'bKash',
      createdAt: '2026-11-05 14:22',
    });
  }

  if (chatgpt && chatgptPlan) {
    specs.push({
      orderLabel: 'ORD-88412',
      deliveryId: 'DLV-9102',
      customer: customers[1],
      product: chatgpt,
      plan: chatgptPlan,
      status: 'delivered',
      secret: 'nabila.shared@mail.com | ChatPass#92',
      email: 'nabila.shared@mail.com',
      password: 'ChatPass#92',
      gateway: 'Nagad',
      createdAt: '2026-11-04 09:15',
    });
  }

  if (netflix && netflixPlan) {
    specs.push({
      orderLabel: 'ORD-88425',
      deliveryId: 'DLV-9103',
      customer: customers[2],
      product: netflix,
      plan: netflixPlan,
      status: 'warranty_claim',
      secret: 'karim.nf@mail.com | Nflx#441 | PIN 2',
      email: 'karim.nf@mail.com',
      password: 'Nflx#441',
      pin: '2',
      gateway: 'bKash',
      createdAt: '2026-10-28 19:40',
    });
  }

  if (capcut && capcutPlan) {
    specs.push({
      orderLabel: 'ORD-88433',
      deliveryId: 'DLV-9104',
      customer: customers[3],
      product: capcut,
      plan: capcutPlan,
      status: 'pending_dispatch',
      gateway: 'Rocket',
      createdAt: '2026-11-05 21:05',
    });
  }

  if (specs.length === 0 && pick && pickPlan) {
    specs.push({
      orderLabel: 'ORD-88401',
      deliveryId: 'DLV-9101',
      customer: customers[0],
      product: pick,
      plan: pickPlan,
      status: 'pending_dispatch',
      gateway: 'bKash',
      createdAt: '2026-11-05 14:22',
    });
  }

  for (const spec of specs) {
    const price = Number(spec.plan.priceBdt);
    const order = await db.order.upsert({
      where: { id: spec.orderLabel },
      create: {
        id: spec.orderLabel,
        status:
          spec.status === 'delivered'
            ? 'DELIVERED'
            : spec.status === 'warranty_claim'
              ? 'CLAIM'
              : 'PENDING',
        totalBdt: price,
        items: {
          create: {
            productId: spec.product.id,
            planId: spec.plan.id,
            qty: 1,
            unitPriceBdt: price,
          },
        },
      },
      update: {
        status:
          spec.status === 'delivered'
            ? 'DELIVERED'
            : spec.status === 'warranty_claim'
              ? 'CLAIM'
              : 'PENDING',
        totalBdt: price,
      },
    });

    // Ensure order item exists after update path
    const itemCount = await db.orderItem.count({ where: { orderId: order.id } });
    if (itemCount === 0) {
      await db.orderItem.create({
        data: {
          orderId: order.id,
          productId: spec.product.id,
          planId: spec.plan.id,
          qty: 1,
          unitPriceBdt: price,
        },
      });
    }

    const vaultId = spec.secret ? `vlt-${spec.deliveryId}` : undefined;
    if (spec.secret && vaultId) {
      await db.vaultCredential.upsert({
        where: { id: vaultId },
        create: {
          id: vaultId,
          productId: spec.product.slug,
          productName: spec.product.name,
          variantId: spec.plan.code,
          variantName: spec.plan.label,
          credentialType: spec.plan.credentialType || 'email_login',
          secretValue: spec.secret,
          email: spec.email || null,
          password: spec.password || null,
          profilePin: spec.pin || null,
          status: 'delivered',
          batchNote: 'Seed delivery',
          addedAt: spec.createdAt,
          assignedOrderId: spec.orderLabel,
          assignedBuyerEmail: spec.customer.email,
        },
        update: {
          secretValue: spec.secret,
          status: 'delivered',
          assignedOrderId: spec.orderLabel,
          assignedBuyerEmail: spec.customer.email,
        },
      });
    }

    const delivery: DigitalDelivery = {
      id: spec.deliveryId,
      orderId: spec.orderLabel,
      createdAt: spec.createdAt,
      deliveredAt:
        spec.status === 'delivered' || spec.status === 'warranty_claim'
          ? spec.createdAt
          : undefined,
      buyerName: spec.customer.name,
      buyerEmail: spec.customer.email,
      buyerPhone: spec.customer.phone,
      productId: spec.product.slug,
      productName: spec.product.name,
      variantId: spec.plan.code,
      variantName: spec.plan.label,
      credentialType: (spec.plan.credentialType || 'email_login') as DigitalDelivery['credentialType'],
      deliveryMode: (spec.plan.deliveryMode ||
        'auto_vault') as DigitalDelivery['deliveryMode'],
      status: spec.status,
      vaultCredentialId: vaultId,
      credentialPayload: {
        secretValue: spec.secret || '',
        email: spec.email,
        password: spec.password,
        profilePin: spec.pin,
        vaultCredentialId: vaultId,
      },
      vpnRequired: spec.plan.vpnRequired,
      vpnRegionNote: spec.plan.vpnRegionNote || '',
      hasWarranty: spec.plan.hasWarranty,
      warrantyDays: spec.plan.warrantyDays,
      warrantyRemainingDays:
        spec.status === 'warranty_claim'
          ? Math.max(1, Math.floor(spec.plan.warrantyDays / 2))
          : spec.plan.warrantyDays,
      warrantyTerms: spec.plan.warrantyHeadline || spec.plan.warrantyBadge || '',
      warrantyClaimReason:
        spec.status === 'warranty_claim' ? 'Login failed after password reset' : undefined,
      replacementHistoryCount: 0,
      loginInstructions: [],
      customAdminNote:
        spec.status === 'pending_dispatch'
          ? 'Queued for dispatch.'
          : spec.status === 'warranty_claim'
            ? 'Buyer opened a warranty claim.'
            : 'Auto-delivered.',
      credentialAudit: spec.secret
        ? [
            {
              id: `aud-${spec.deliveryId}-1`,
              at: spec.createdAt,
              action: 'assigned' as const,
              source: 'custom' as const,
              secretValue: spec.secret,
              vaultCredentialId: vaultId,
              note:
                spec.status === 'warranty_claim'
                  ? 'Buyer opened a warranty claim.'
                  : 'Auto-delivered.',
            },
          ]
        : [],
      unreadChatCount: spec.status === 'pending_dispatch' ? 1 : 0,
      chatMessages: [
        {
          id: `chat-${spec.deliveryId}-1`,
          sender: 'customer',
          senderName: spec.customer.name,
          text: `Order ${spec.orderLabel} for ${spec.product.name} (${spec.plan.label}).`,
          time: '2h ago',
        },
      ],
    };

    await db.digitalDelivery.upsert({
      where: { id: delivery.id },
      create: {
        id: delivery.id,
        orderId: delivery.orderId,
        createdAtLabel: delivery.createdAt,
        deliveredAt: delivery.deliveredAt || null,
        buyerName: delivery.buyerName,
        buyerEmail: delivery.buyerEmail,
        buyerPhone: delivery.buyerPhone,
        productId: delivery.productId,
        productName: delivery.productName,
        variantId: delivery.variantId,
        variantName: delivery.variantName,
        credentialType: delivery.credentialType,
        deliveryMode: delivery.deliveryMode,
        status: delivery.status,
        vaultCredentialId: delivery.vaultCredentialId || null,
        vpnRequired: delivery.vpnRequired,
        vpnRegionNote: delivery.vpnRegionNote,
        hasWarranty: delivery.hasWarranty,
        warrantyDays: delivery.warrantyDays,
        warrantyRemainingDays: delivery.warrantyRemainingDays,
        warrantyTerms: delivery.warrantyTerms,
        warrantyClaimReason: delivery.warrantyClaimReason || null,
        replacementHistoryCount: delivery.replacementHistoryCount,
        loginInstructionsJson: JSON.stringify(delivery.loginInstructions),
        customAdminNote: delivery.customAdminNote,
        unreadChatCount: delivery.unreadChatCount || 0,
        chatMessagesJson: JSON.stringify(delivery.chatMessages || []),
      },
      update: {
        status: delivery.status,
        vaultCredentialId: delivery.vaultCredentialId || null,
        warrantyClaimReason: delivery.warrantyClaimReason || null,
        customAdminNote: delivery.customAdminNote,
        unreadChatCount: delivery.unreadChatCount || 0,
        chatMessagesJson: JSON.stringify(delivery.chatMessages || []),
      },
    });

    await db.credentialAudit.deleteMany({ where: { deliveryId: delivery.id } });
    if (delivery.credentialAudit && delivery.credentialAudit.length > 0) {
      await db.credentialAudit.createMany({
        data: delivery.credentialAudit.map((a) => ({
          id: a.id,
          deliveryId: delivery.id,
          atLabel: a.at,
          action: a.action,
          source: a.source,
          secretValue: a.secretValue,
          previousSecretValue: a.previousSecretValue || null,
          vaultCredentialId: a.vaultCredentialId || null,
          note: a.note || null,
        })),
      });
    }

    const payId = `pay-${spec.orderLabel.toLowerCase()}`;
    await db.paymentTransaction.upsert({
      where: { id: payId },
      create: {
        id: payId,
        orderId: spec.orderLabel,
        buyerName: spec.customer.name,
        buyerEmail: spec.customer.email,
        productSummary: `${spec.product.name} — ${spec.plan.label}`,
        amountBdt: Math.round(price),
        gateway: spec.gateway,
        senderNumberOrRef: spec.customer.phone.replace(/\s/g, ''),
        trxId: `TRX${spec.orderLabel.replace(/\D/g, '')}`,
        status: 'verified',
        createdAtLabel: spec.createdAt,
      },
      update: {
        amountBdt: Math.round(price),
        status: 'verified',
      },
    });

    console.log(
      `Order ${spec.orderLabel}: ${spec.customer.name} → ${spec.product.name} (${spec.status})`,
    );
  }

  console.log(
    `Done: ${customers.length} customers, ${specs.length} orders/deliveries.`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
