import { warrantyState } from '@/lib/warranty';
import { db } from '@/lib/db';
import type {
  AdminNotificationItem,
  AdminSupportTicket,
  CouponCode,
  CredentialAuditEntry,
  DigitalDelivery,
  MediaAsset,
  PaymentTransaction,
  SubscriberUser,
  VaultCredential,
} from '@/lib/admin/types';
import { loadAdminCatalog } from '@/lib/admin/catalog-repo';
import { decryptSecret, encryptSecret } from '@/lib/crypto/secrets';

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** One-time soft-read of legacy payloadJson blob (pre–CredentialAudit table). */
function legacyPayloadFallback(raw: string): {
  credentialPayload: DigitalDelivery['credentialPayload'];
  auditFromPayload: CredentialAuditEntry[];
  vaultCredentialId?: string;
} {
  const parsed = parseJson<
    DigitalDelivery['credentialPayload'] & { __audit?: CredentialAuditEntry[] }
  >(raw, { secretValue: '' });
  const { __audit, ...rest } = parsed;
  return {
    credentialPayload: {
      secretValue: rest.secretValue || '',
      email: rest.email,
      password: rest.password,
      profilePin: rest.profilePin,
      vaultCredentialId: rest.vaultCredentialId,
    },
    auditFromPayload: Array.isArray(__audit) ? __audit : [],
    vaultCredentialId: rest.vaultCredentialId,
  };
}

function hydrateCredentialPayload(
  vaultById: Map<string, VaultCredential>,
  vaultCredentialId: string | undefined,
  legacy: DigitalDelivery['credentialPayload'],
): DigitalDelivery['credentialPayload'] {
  if (vaultCredentialId) {
    const v = vaultById.get(vaultCredentialId);
    if (v) {
      return {
        secretValue: v.secretValue,
        email: v.email,
        password: v.password,
        profilePin: v.profilePin,
        vaultCredentialId: v.id,
      };
    }
  }
  return {
    secretValue: legacy.secretValue || '',
    email: legacy.email,
    password: legacy.password,
    profilePin: legacy.profilePin,
    vaultCredentialId: vaultCredentialId || legacy.vaultCredentialId,
  };
}

/** Join AdminSubscriber rows with User.emailVerifiedAt (authoritative). */
async function mapSubscribersWithEmailStatus(
  rows: Array<{
    id: string;
    name: string;
    email: string;
    phone: string;
    joinedAt: string;
    status: string;
    role: string;
    subscriptionsJson: string;
    totalSpentBdt: number;
    ordersCount: number;
    warrantyClaimsCount: number;
  }>,
): Promise<SubscriberUser[]> {
  const emails = [
    ...new Set(rows.map((s) => s.email.trim().toLowerCase()).filter(Boolean)),
  ];
  const users =
    emails.length === 0
      ? []
      : await db.user.findMany({
          where: { email: { in: emails } },
          select: { email: true, emailVerifiedAt: true },
        });
  const byEmail = new Map(
    users.map((u) => [u.email.trim().toLowerCase(), u.emailVerifiedAt]),
  );
  return rows.map((s) => {
    const key = s.email.trim().toLowerCase();
    const verifiedAt = byEmail.get(key);
    return {
      id: s.id,
      name: s.name,
      email: s.email,
      phone: s.phone,
      joinedAt: s.joinedAt,
      status: s.status as SubscriberUser['status'],
      role: s.role as SubscriberUser['role'],
      emailVerified: byEmail.has(key) ? Boolean(verifiedAt) : null,
      activeSubscriptions: parseJson(s.subscriptionsJson, []),
      totalSpentBDT: s.totalSpentBdt,
      ordersCount: s.ordersCount,
      warrantyClaimsCount: s.warrantyClaimsCount,
    };
  });
}

/** Soft caps so one console load cannot unbounded-scan SQLite as rows grow. */
const CAP = {
  vault: 5000,
  deliveries: 5000,
  audits: 2000,
  tickets: 2000,
  notifications: 500,
  subscribers: 5000,
  payments: 5000,
  coupons: 2000,
  media: 2000,
} as const;

export async function loadAdminWorkspace() {
  const [
    catalog,
    vault,
    deliveries,
    auditRows,
    tickets,
    notifications,
    subscribers,
    payments,
    coupons,
    media,
  ] = await Promise.all([
    loadAdminCatalog(),
    db.vaultCredential.findMany({
      orderBy: { addedAt: 'desc' },
      take: CAP.vault,
    }),
    db.digitalDelivery.findMany({
      orderBy: { createdAt: 'desc' },
      take: CAP.deliveries,
    }),
    db.credentialAudit.findMany({
      orderBy: { createdAt: 'desc' },
      take: CAP.audits,
    }),
    db.supportTicket.findMany({
      orderBy: { updatedAt: 'desc' },
      take: CAP.tickets,
    }),
    db.adminNotification.findMany({
      orderBy: { createdAt: 'desc' },
      take: CAP.notifications,
    }),
    db.adminSubscriber.findMany({
      orderBy: { joinedAt: 'desc' },
      take: CAP.subscribers,
    }),
    db.paymentTransaction.findMany({
      orderBy: { createdAt: 'desc' },
      take: CAP.payments,
    }),
    db.couponCode.findMany({ orderBy: { code: 'asc' }, take: CAP.coupons }),
    db.mediaAsset.findMany({
      orderBy: { uploadedAt: 'desc' },
      take: CAP.media,
    }),
  ]);

  const mappedVault: VaultCredential[] = vault.map((v) => ({
    id: v.id,
    productId: v.productId,
    productName: v.productName,
    variantId: v.variantId,
    variantName: v.variantName,
    credentialType: v.credentialType as VaultCredential['credentialType'],
    secretValue: decryptSecret(v.secretValue),
    email: v.email || undefined,
    password: v.password ? decryptSecret(v.password) : undefined,
    profilePin: v.profilePin || undefined,
    noteBBCode: v.noteBBCode || undefined,
    status: v.status as VaultCredential['status'],
    validDays: (v as { validDays?: number }).validDays ?? 30,
    expiresAt: (v as { expiresAt?: string | null }).expiresAt || undefined,
    batchNote: v.batchNote,
    addedAt: v.addedAt,
    assignedOrderId: v.assignedOrderId || undefined,
    assignedBuyerEmail: v.assignedBuyerEmail || undefined,
  }));
  const vaultById = new Map(mappedVault.map((v) => [v.id, v]));

  const auditsByDelivery = new Map<string, CredentialAuditEntry[]>();
  for (const row of auditRows) {
    const list = auditsByDelivery.get(row.deliveryId) || [];
    list.push({
      id: row.id,
      at: row.atLabel,
      action: row.action as CredentialAuditEntry['action'],
      source: row.source as CredentialAuditEntry['source'],
      secretValue: decryptSecret(row.secretValue),
      previousSecretValue: row.previousSecretValue
        ? decryptSecret(row.previousSecretValue)
        : undefined,
      vaultCredentialId: row.vaultCredentialId || undefined,
      note: row.note || undefined,
      credentialExpiresAt:
        (row as { credentialExpiresAt?: string | null }).credentialExpiresAt ||
        undefined,
    });
    auditsByDelivery.set(row.deliveryId, list);
  }

  return {
    ...catalog,
    vault: mappedVault,
    deliveries: deliveries.map((d): DigitalDelivery => {
      const legacy = legacyPayloadFallback('{}');
      const vaultCredentialId =
        (d as { vaultCredentialId?: string | null }).vaultCredentialId ||
        legacy.vaultCredentialId ||
        undefined;
      const fromTable = auditsByDelivery.get(d.id) || [];
      return {
        id: d.id,
        orderId: d.orderId,
        createdAt: d.createdAtLabel,
        deliveredAt: d.deliveredAt || undefined,
        buyerName: d.buyerName,
        buyerEmail: d.buyerEmail,
        buyerPhone: d.buyerPhone,
        productId: d.productId,
        productName: d.productName,
        variantId: d.variantId,
        variantName: d.variantName,
        credentialType: d.credentialType as DigitalDelivery['credentialType'],
        deliveryMode: d.deliveryMode as DigitalDelivery['deliveryMode'],
        status: d.status as DigitalDelivery['status'],
        vaultCredentialId,
        credentialPayload: hydrateCredentialPayload(
          vaultById,
          vaultCredentialId,
          legacy.credentialPayload,
        ),
        credentialAudit:
          fromTable.length > 0 ? fromTable : legacy.auditFromPayload,
        vpnRequired: d.vpnRequired,
        vpnRegionNote: d.vpnRegionNote,
        hasWarranty: d.hasWarranty,
        warrantyDays: d.warrantyDays,
        warrantyRemainingDays: (() => {
          const w = warrantyState(d);
          return w.state === 'pending' ? d.warrantyDays : w.daysLeft;
        })(),
        warrantyStartsAt: d.warrantyStartsAt || undefined,
        warrantyEndsAt: d.warrantyEndsAt || undefined,
        nextWarrantyStartsAt: d.nextWarrantyStartsAt || undefined,
        nextWarrantyEndsAt: d.nextWarrantyEndsAt || undefined,
        warrantyTerms: d.warrantyTerms,
        warrantyClaimReason: d.warrantyClaimReason || undefined,
        replacementHistoryCount: d.replacementHistoryCount,
        loginInstructions: parseJson(d.loginInstructionsJson, []),
        customAdminNote: d.customAdminNote,
        unreadChatCount: d.unreadChatCount,
        chatMessages: parseJson(d.chatMessagesJson, []),
        pinned: Boolean((d as { pinned?: boolean }).pinned),
        orderExpiresAt:
          (d as { orderExpiresAt?: string | null }).orderExpiresAt || undefined,
        credentialValidDays:
          (d as { credentialValidDays?: number }).credentialValidDays ?? 30,
        credentialAssignedAt:
          (d as { credentialAssignedAt?: string | null }).credentialAssignedAt ||
          undefined,
        credentialExpiresAt:
          (d as { credentialExpiresAt?: string | null }).credentialExpiresAt ||
          undefined,
        renewalPending: Boolean((d as { renewalPending?: boolean }).renewalPending),
        credentialClearedAt:
          (d as { credentialClearedAt?: string | null }).credentialClearedAt ||
          undefined,
        orderQuantity:
          (d as { orderQuantity?: number }).orderQuantity ?? 1,
        unitIndex: (d as { unitIndex?: number }).unitIndex ?? 1,
      };
    }),
    tickets: tickets.map(
      (t): AdminSupportTicket => ({
        id: t.id,
        subject: t.subject,
        orderId: t.orderId,
        deliveryId: t.deliveryId || undefined,
        buyerName: t.buyerName,
        buyerEmail: t.buyerEmail,
        buyerPhone: t.buyerPhone,
        productName: t.productName,
        category: t.category as AdminSupportTicket['category'],
        priority: t.priority as AdminSupportTicket['priority'],
        status: t.status as AdminSupportTicket['status'],
        updatedAt: t.updatedAtLabel,
        unreadCount: t.unreadCount,
        messages: parseJson(t.messagesJson, []),
      }),
    ),
    adminNotifications: notifications.map(
      (n): AdminNotificationItem => ({
        id: n.id,
        type: n.type as AdminNotificationItem['type'],
        orderId: n.orderId || undefined,
        deliveryId: n.deliveryId || undefined,
        ticketId: n.ticketId || undefined,
        title: n.title,
        message: n.message,
        time: n.timeLabel,
        read: n.read,
      }),
    ),
    subscribers: await mapSubscribersWithEmailStatus(subscribers),
    payments: payments.map(
      (p): PaymentTransaction => ({
        id: p.id,
        orderId: p.orderId,
        buyerName: p.buyerName,
        buyerEmail: p.buyerEmail,
        productSummary: p.productSummary,
        amountBDT: p.amountBdt,
        gateway: p.gateway as PaymentTransaction['gateway'],
        senderNumberOrRef: p.senderNumberOrRef,
        trxId: p.trxId,
        status: p.status as PaymentTransaction['status'],
        createdAt: p.createdAtLabel,
        kind: ((p as { kind?: string }).kind ||
          'purchase') as PaymentTransaction['kind'],
        deliveryId: (p as { deliveryId?: string | null }).deliveryId || undefined,
        renewDeliveryIds: p.renewDeliveryIds ? p.renewDeliveryIds.split(',').filter(Boolean) : undefined,
        periodFrom: p.periodFrom || undefined,
        periodTo: p.periodTo || undefined,
        verifiedAt: p.verifiedAtLabel || undefined,
      }),
    ),
    coupons: coupons.map(
      (c): CouponCode => ({
        id: c.id,
        code: c.code,
        discountType: c.discountType as CouponCode['discountType'],
        discountValue: c.discountValue,
        minSpendBDT: c.minSpendBdt,
        usedCount: c.usedCount,
        maxUses: c.maxUses,
        expiresAt: c.expiresAt,
        status: c.status as CouponCode['status'],
      }),
    ),
    mediaAssets: media.map(
      (m): MediaAsset => ({
        id: m.id,
        name: m.name,
        fileName: m.fileName,
        folder: m.folder as MediaAsset['folder'],
        url: m.url,
        dimensions: m.dimensions,
        sizeKB: m.sizeKb,
        mimeType: m.mimeType as MediaAsset['mimeType'],
        uploadedAt: m.uploadedAt,
        usedByProduct: m.usedByProduct || undefined,
      }),
    ),
  };
}

export async function replaceVault(items: VaultCredential[]) {
  await db.$transaction(async (tx) => {
    const keepIds = items.map((v) => v.id);
    await tx.vaultCredential.deleteMany({
      where: {
        id: { notIn: keepIds },
        status: 'available',
      },
    });
    for (const v of items) {
      await tx.vaultCredential.upsert({
        where: { id: v.id },
        create: {
          id: v.id,
          productId: v.productId,
          productName: v.productName,
          variantId: v.variantId,
          variantName: v.variantName,
          credentialType: v.credentialType,
          secretValue: encryptSecret(v.secretValue),
          email: v.email || null,
          password: v.password ? encryptSecret(v.password) : null,
          profilePin: v.profilePin || null,
          noteBBCode: v.noteBBCode || null,
          status: v.status,
          validDays: v.validDays ?? 30,
          expiresAt: v.expiresAt || null,
          batchNote: v.batchNote,
          addedAt: v.addedAt,
          assignedOrderId: v.assignedOrderId || null,
          assignedBuyerEmail: v.assignedBuyerEmail || null,
        },
        update: {
          productId: v.productId,
          productName: v.productName,
          variantId: v.variantId,
          variantName: v.variantName,
          credentialType: v.credentialType,
          secretValue: encryptSecret(v.secretValue),
          email: v.email || null,
          password: v.password ? encryptSecret(v.password) : null,
          profilePin: v.profilePin || null,
          noteBBCode: v.noteBBCode || null,
          status: v.status,
          validDays: v.validDays ?? 30,
          expiresAt: v.expiresAt || null,
          batchNote: v.batchNote,
          assignedOrderId: v.assignedOrderId || null,
          assignedBuyerEmail: v.assignedBuyerEmail || null,
        },
      });
    }
  });
}

export async function replaceDeliveries(items: DigitalDelivery[]) {
  await db.$transaction(async (tx) => {
    if (items.length === 0) return;
    for (const d of items) {
      const rawCreatedAt = (d as any).createdAt;
      const createdAtStr =
        (d as any).createdAtLabel ||
        (typeof rawCreatedAt === 'string'
          ? rawCreatedAt
          : rawCreatedAt instanceof Date
            ? rawCreatedAt.toISOString().slice(0, 19).replace('T', ' ')
            : 'Just now');

      const loginInstr = Array.isArray(d.loginInstructions)
        ? JSON.stringify(d.loginInstructions)
        : typeof (d as any).loginInstructionsJson === 'string'
          ? (d as any).loginInstructionsJson
          : '[]';

      const chatMsgs = Array.isArray(d.chatMessages)
        ? JSON.stringify(d.chatMessages)
        : typeof (d as any).chatMessagesJson === 'string'
          ? (d as any).chatMessagesJson
          : '[]';

      await tx.digitalDelivery.upsert({
        where: { id: d.id },
        create: {
          id: d.id,
          orderId: d.orderId,
          createdAtLabel: createdAtStr,
          deliveredAt: d.deliveredAt || null,
          buyerName: d.buyerName,
          buyerEmail: d.buyerEmail,
          buyerPhone: d.buyerPhone,
          productId: d.productId,
          productName: d.productName,
          variantId: d.variantId,
          variantName: d.variantName,
          credentialType: d.credentialType,
          deliveryMode: d.deliveryMode,
          status: d.status,
          vaultCredentialId:
            d.vaultCredentialId ||
            d.credentialPayload?.vaultCredentialId ||
            null,
          vpnRequired: d.vpnRequired,
          vpnRegionNote: d.vpnRegionNote,
          hasWarranty: d.hasWarranty,
          warrantyDays: d.warrantyDays,
          warrantyRemainingDays: d.warrantyRemainingDays,
          warrantyStartsAt: d.warrantyStartsAt || null,
          warrantyEndsAt: d.warrantyEndsAt || null,
          nextWarrantyStartsAt: d.nextWarrantyStartsAt || null,
          nextWarrantyEndsAt: d.nextWarrantyEndsAt || null,
          warrantyTerms: d.warrantyTerms,
          warrantyClaimReason: d.warrantyClaimReason || null,
          replacementHistoryCount: d.replacementHistoryCount,
          loginInstructionsJson: loginInstr,
          customAdminNote: d.customAdminNote,
          unreadChatCount: d.unreadChatCount || 0,
          chatMessagesJson: chatMsgs,
          pinned: Boolean(d.pinned),
          orderExpiresAt: d.orderExpiresAt || null,
          credentialValidDays: d.credentialValidDays ?? 30,
          credentialAssignedAt: d.credentialAssignedAt || null,
          credentialExpiresAt: d.credentialExpiresAt || null,
          renewalPending: Boolean(d.renewalPending),
          credentialClearedAt: d.credentialClearedAt || null,
          orderQuantity: d.orderQuantity ?? 1,
          unitIndex: d.unitIndex ?? 1,
        },
        update: {
          deliveredAt: d.deliveredAt || null,
          buyerName: d.buyerName,
          buyerEmail: d.buyerEmail,
          buyerPhone: d.buyerPhone,
          status: d.status,
          vaultCredentialId:
            d.vaultCredentialId ||
            d.credentialPayload?.vaultCredentialId ||
            null,
          vpnRequired: d.vpnRequired,
          vpnRegionNote: d.vpnRegionNote,
          hasWarranty: d.hasWarranty,
          warrantyDays: d.warrantyDays,
          warrantyRemainingDays: d.warrantyRemainingDays,
          warrantyStartsAt: d.warrantyStartsAt || null,
          warrantyEndsAt: d.warrantyEndsAt || null,
          nextWarrantyStartsAt: d.nextWarrantyStartsAt || null,
          nextWarrantyEndsAt: d.nextWarrantyEndsAt || null,
          warrantyTerms: d.warrantyTerms,
          warrantyClaimReason: d.warrantyClaimReason || null,
          replacementHistoryCount: d.replacementHistoryCount,
          ...(Array.isArray(d.loginInstructions)
            ? { loginInstructionsJson: JSON.stringify(d.loginInstructions) }
            : {}),
          customAdminNote: d.customAdminNote,
          unreadChatCount: d.unreadChatCount || 0,
          ...(Array.isArray(d.chatMessages)
            ? { chatMessagesJson: JSON.stringify(d.chatMessages) }
            : {}),
          pinned: Boolean(d.pinned),
          orderExpiresAt: d.orderExpiresAt || null,
          credentialValidDays: d.credentialValidDays ?? 30,
          credentialAssignedAt: d.credentialAssignedAt || null,
          credentialExpiresAt: d.credentialExpiresAt || null,
          renewalPending: Boolean(d.renewalPending),
          credentialClearedAt: d.credentialClearedAt || null,
          orderQuantity: d.orderQuantity ?? 1,
          unitIndex: d.unitIndex ?? 1,
        },
      });
    }

    // Upsert audits only — never wipe history from a stale client list.
    const usedAuditIds = new Set<string>();
    const uniqueAuditId = (raw: string, deliveryId: string, index: number) => {
      let id =
        raw && raw.includes(deliveryId) ? raw : `${raw || 'aud'}-${deliveryId}`;
      if (usedAuditIds.has(id)) id = `${id}-${index}`;
      usedAuditIds.add(id);
      return id;
    };
    for (const d of items) {
      for (const [index, a] of (d.credentialAudit || []).entries()) {
        const id = uniqueAuditId(a.id, d.id, index);
        await tx.credentialAudit.upsert({
          where: { id },
          create: {
            id,
            deliveryId: d.id,
            atLabel: a.at,
            action: a.action,
            source: a.source,
            secretValue: encryptSecret(a.secretValue),
            previousSecretValue: a.previousSecretValue
              ? encryptSecret(a.previousSecretValue)
              : null,
            vaultCredentialId: a.vaultCredentialId || null,
            note: a.note || null,
            credentialExpiresAt: a.credentialExpiresAt || null,
          },
          update: {
            action: a.action,
            note: a.note || null,
            credentialExpiresAt: a.credentialExpiresAt || null,
          },
        });
      }
    }
  });
}

export async function replaceTickets(items: AdminSupportTicket[]) {
  await db.$transaction(async (tx) => {
    if (items.length === 0) return;
    for (const t of items) {
      await tx.supportTicket.upsert({
        where: { id: t.id },
        create: {
          id: t.id,
          subject: t.subject,
          orderId: t.orderId,
          deliveryId: t.deliveryId || null,
          buyerName: t.buyerName,
          buyerEmail: t.buyerEmail,
          buyerPhone: t.buyerPhone,
          productName: t.productName,
          category: t.category,
          priority: t.priority,
          status: t.status,
          updatedAtLabel: t.updatedAt,
          unreadCount: t.unreadCount || 0,
          messagesJson: JSON.stringify(t.messages || []),
        },
        update: {
          subject: t.subject,
          category: t.category,
          priority: t.priority,
          status: t.status,
          updatedAtLabel: t.updatedAt,
          unreadCount: t.unreadCount || 0,
          messagesJson: JSON.stringify(t.messages || []),
        },
      });
    }
  });
}

export async function replaceNotifications(items: AdminNotificationItem[]) {
  await db.$transaction(async (tx) => {
    if (items.length === 0) return;
    for (const n of items) {
      await tx.adminNotification.upsert({
        where: { id: n.id },
        create: {
          id: n.id,
          type: n.type,
          orderId: n.orderId || null,
          deliveryId: n.deliveryId || null,
          ticketId: n.ticketId || null,
          title: n.title,
          message: n.message,
          timeLabel: n.time,
          read: n.read,
        },
        update: {
          read: n.read,
        },
      });
    }
  });
}

export async function replaceSubscribers(items: SubscriberUser[]) {
  await db.$transaction(async (tx) => {
    if (items.length === 0) return;
    for (const s of items) {
      const email = s.email.trim().toLowerCase();
      const before = await tx.adminSubscriber.findUnique({ where: { id: s.id }, select: { status: true } });
      if (s.status === 'suspended' && before?.status !== 'suspended') {
        // Suspending a customer signs them out of every device.
        await tx.user.updateMany({
          where: { email, role: 'CUSTOMER' },
          data: { sessionVersion: { increment: 1 } },
        });
      }
      await tx.adminSubscriber.upsert({
        where: { id: s.id },
        create: {
          id: s.id,
          name: s.name,
          email,
          phone: s.phone,
          joinedAt: s.joinedAt,
          status: s.status,
          role: s.role,
          subscriptionsJson: JSON.stringify(s.activeSubscriptions || []),
          totalSpentBdt: s.totalSpentBDT,
          ordersCount: s.ordersCount,
          warrantyClaimsCount: s.warrantyClaimsCount,
        },
        update: {
          name: s.name,
          email,
          phone: s.phone,
          status: s.status,
          role: s.role,
          subscriptionsJson: JSON.stringify(s.activeSubscriptions || []),
          totalSpentBdt: s.totalSpentBDT,
          ordersCount: s.ordersCount,
          warrantyClaimsCount: s.warrantyClaimsCount,
        },
      });
    }
  });
}

export async function replacePayments(items: PaymentTransaction[]) {
  await db.$transaction(async (tx) => {
    if (items.length === 0) return;
    for (const p of items) {
      await tx.paymentTransaction.upsert({
        where: { id: p.id },
        create: {
          id: p.id,
          orderId: p.orderId,
          buyerName: p.buyerName,
          buyerEmail: p.buyerEmail,
          productSummary: p.productSummary,
          amountBdt: p.amountBDT,
          gateway: p.gateway,
          senderNumberOrRef: p.senderNumberOrRef,
          trxId: p.trxId,
          status: p.status,
          kind: p.kind || 'purchase',
          deliveryId: p.deliveryId || null,
          renewDeliveryIds: (p.renewDeliveryIds || []).join(','),
          createdAtLabel: p.createdAt,
          periodFrom: p.periodFrom || null,
          periodTo: p.periodTo || null,
          verifiedAtLabel: p.verifiedAt || null,
        },
        update: {
          status: p.status,
          kind: p.kind || 'purchase',
          deliveryId: p.deliveryId || null,
          ...(p.periodFrom ? { periodFrom: p.periodFrom, periodTo: p.periodTo || null } : {}),
          ...(p.verifiedAt ? { verifiedAtLabel: p.verifiedAt } : {}),
        },
      });
    }
  });
}

export async function replaceCoupons(items: CouponCode[]) {
  // Upsert instead of wipe-and-recreate: checkout increments usedCount on the
  // server, and a stale admin list must never roll that number back.
  await db.$transaction(async (tx) => {
    const keep = items.map((c) => c.id);
    await tx.couponCode.deleteMany({ where: { id: { notIn: keep } } });
    for (const c of items) {
      const existing = await tx.couponCode.findUnique({ where: { id: c.id } });
      const data = {
        code: c.code,
        discountType: c.discountType,
        discountValue: c.discountValue,
        minSpendBdt: c.minSpendBDT,
        maxUses: c.maxUses,
        expiresAt: c.expiresAt,
        status: c.status,
      };
      if (existing) {
        await tx.couponCode.update({
          where: { id: c.id },
          data: { ...data, usedCount: Math.max(existing.usedCount, c.usedCount) },
        });
      } else {
        await tx.couponCode.create({ data: { id: c.id, usedCount: c.usedCount, ...data } });
      }
    }
  });
}

export async function replaceMediaAssets(items: MediaAsset[]) {
  // Empty array must not wipe the library (stale client / coalesce bug).
  if (items.length === 0) return;
  await db.$transaction(async (tx) => {
    const keep = items.map((m) => m.id);
    await tx.mediaAsset.deleteMany({ where: { id: { notIn: keep } } });
    for (const m of items) {
      await tx.mediaAsset.upsert({
        where: { id: m.id },
        create: {
          id: m.id,
          name: m.name,
          fileName: m.fileName,
          folder: m.folder,
          url: m.url,
          dimensions: m.dimensions,
          sizeKb: m.sizeKB,
          mimeType: m.mimeType,
          uploadedAt: m.uploadedAt,
          usedByProduct: m.usedByProduct || null,
        },
        update: {
          name: m.name,
          fileName: m.fileName,
          folder: m.folder,
          url: m.url,
          dimensions: m.dimensions,
          sizeKb: m.sizeKB,
          mimeType: m.mimeType,
          uploadedAt: m.uploadedAt,
          usedByProduct: m.usedByProduct || null,
        },
      });
    }
  });
}

export type WorkspacePatch = {
  vault?: VaultCredential[];
  deliveries?: DigitalDelivery[];
  tickets?: AdminSupportTicket[];
  adminNotifications?: AdminNotificationItem[];
  subscribers?: SubscriberUser[];
  payments?: PaymentTransaction[];
  coupons?: CouponCode[];
  mediaAssets?: MediaAsset[];
};

export async function applyWorkspacePatch(patch: WorkspacePatch) {
  if (patch.vault) await replaceVault(patch.vault);
  if (patch.deliveries) await replaceDeliveries(patch.deliveries);
  if (patch.tickets) await replaceTickets(patch.tickets);
  if (patch.adminNotifications) {
    await replaceNotifications(patch.adminNotifications);
  }
  if (patch.subscribers) await replaceSubscribers(patch.subscribers);
  if (patch.payments) await replacePayments(patch.payments);
  if (patch.coupons) await replaceCoupons(patch.coupons);
  if (patch.mediaAssets) await replaceMediaAssets(patch.mediaAssets);
}
