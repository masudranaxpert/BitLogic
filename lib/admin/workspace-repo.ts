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
  SystemFeatureFlag,
  VaultCredential,
} from '@/lib/admin/types';
import { loadAdminCatalog } from '@/lib/admin/catalog-repo';

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
    features,
    media,
  ] = await Promise.all([
    loadAdminCatalog(),
    db.vaultCredential.findMany({ orderBy: { addedAt: 'desc' } }),
    db.digitalDelivery.findMany({ orderBy: { createdAt: 'desc' } }),
    db.credentialAudit.findMany({ orderBy: { createdAt: 'desc' } }),
    db.supportTicket.findMany({ orderBy: { updatedAt: 'desc' } }),
    db.adminNotification.findMany({ orderBy: { createdAt: 'desc' } }),
    db.adminSubscriber.findMany({ orderBy: { joinedAt: 'desc' } }),
    db.paymentTransaction.findMany({ orderBy: { createdAt: 'desc' } }),
    db.couponCode.findMany({ orderBy: { code: 'asc' } }),
    db.systemFeatureFlag.findMany({ orderBy: { category: 'asc' } }),
    db.mediaAsset.findMany({ orderBy: { uploadedAt: 'desc' } }),
  ]);

  const mappedVault: VaultCredential[] = vault.map((v) => ({
    id: v.id,
    productId: v.productId,
    productName: v.productName,
    variantId: v.variantId,
    variantName: v.variantName,
    credentialType: v.credentialType as VaultCredential['credentialType'],
    secretValue: v.secretValue,
    email: v.email || undefined,
    password: v.password || undefined,
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
      secretValue: row.secretValue,
      previousSecretValue: row.previousSecretValue || undefined,
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
      const legacy = legacyPayloadFallback(d.payloadJson);
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
        warrantyRemainingDays: d.warrantyRemainingDays,
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
    subscribers: subscribers.map(
      (s): SubscriberUser => ({
        id: s.id,
        name: s.name,
        email: s.email,
        phone: s.phone,
        joinedAt: s.joinedAt,
        status: s.status as SubscriberUser['status'],
        role: s.role as SubscriberUser['role'],
        activeSubscriptions: parseJson(s.subscriptionsJson, []),
        totalSpentBDT: s.totalSpentBdt,
        ordersCount: s.ordersCount,
        warrantyClaimsCount: s.warrantyClaimsCount,
      }),
    ),
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
    features: features.map(
      (f): SystemFeatureFlag => ({
        id: f.id,
        category: f.category as SystemFeatureFlag['category'],
        name: f.name,
        key: f.key,
        description: f.description,
        enabled: f.enabled,
        impactNote: f.impactNote,
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
    await tx.vaultCredential.deleteMany();
    if (items.length === 0) return;
    await tx.vaultCredential.createMany({
      data: items.map((v) => ({
        id: v.id,
        productId: v.productId,
        productName: v.productName,
        variantId: v.variantId,
        variantName: v.variantName,
        credentialType: v.credentialType,
        secretValue: v.secretValue,
        email: v.email || null,
        password: v.password || null,
        profilePin: v.profilePin || null,
        noteBBCode: v.noteBBCode || null,
        status: v.status,
        validDays: v.validDays ?? 30,
        expiresAt: v.expiresAt || null,
        batchNote: v.batchNote,
        addedAt: v.addedAt,
        assignedOrderId: v.assignedOrderId || null,
        assignedBuyerEmail: v.assignedBuyerEmail || null,
      })),
    });
  });
}

export async function replaceDeliveries(items: DigitalDelivery[]) {
  await db.$transaction(async (tx) => {
    await tx.credentialAudit.deleteMany();
    await tx.digitalDelivery.deleteMany();
    if (items.length === 0) return;

    await tx.digitalDelivery.createMany({
      data: items.map((d) => ({
        id: d.id,
        orderId: d.orderId,
        createdAtLabel: d.createdAt,
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
        // Secrets live in Vault; keep blob empty for Postgres-ready shape
        payloadJson: '{}',
        vaultCredentialId:
          d.vaultCredentialId ||
          d.credentialPayload?.vaultCredentialId ||
          null,
        vpnRequired: d.vpnRequired,
        vpnRegionNote: d.vpnRegionNote,
        hasWarranty: d.hasWarranty,
        warrantyDays: d.warrantyDays,
        warrantyRemainingDays: d.warrantyRemainingDays,
        warrantyTerms: d.warrantyTerms,
        warrantyClaimReason: d.warrantyClaimReason || null,
        replacementHistoryCount: d.replacementHistoryCount,
        loginInstructionsJson: JSON.stringify(d.loginInstructions || []),
        customAdminNote: d.customAdminNote,
        unreadChatCount: d.unreadChatCount || 0,
        chatMessagesJson: JSON.stringify(d.chatMessages || []),
        pinned: Boolean(d.pinned),
        orderExpiresAt: d.orderExpiresAt || null,
        credentialValidDays: d.credentialValidDays ?? 30,
        credentialAssignedAt: d.credentialAssignedAt || null,
        credentialExpiresAt: d.credentialExpiresAt || null,
        renewalPending: Boolean(d.renewalPending),
        credentialClearedAt: d.credentialClearedAt || null,
        orderQuantity: d.orderQuantity ?? 1,
        unitIndex: d.unitIndex ?? 1,
      })),
    });

    const auditRows = items.flatMap((d) =>
      (d.credentialAudit || []).map((a, index) => ({
        id: a.id || `aud-${d.id}-${index}`,
        deliveryId: d.id,
        atLabel: a.at,
        action: a.action,
        source: a.source,
        secretValue: a.secretValue,
        previousSecretValue: a.previousSecretValue || null,
        vaultCredentialId: a.vaultCredentialId || null,
        note: a.note || null,
        credentialExpiresAt: a.credentialExpiresAt || null,
        // Preserve newest-first order via staggered timestamps
        createdAt: new Date(Date.now() - index),
      })),
    );
    if (auditRows.length > 0) {
      await tx.credentialAudit.createMany({ data: auditRows });
    }
  });
}

export async function replaceTickets(items: AdminSupportTicket[]) {
  await db.$transaction(async (tx) => {
    await tx.supportTicket.deleteMany();
    if (items.length === 0) return;
    await tx.supportTicket.createMany({
      data: items.map((t) => ({
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
      })),
    });
  });
}

export async function replaceNotifications(items: AdminNotificationItem[]) {
  await db.$transaction(async (tx) => {
    await tx.adminNotification.deleteMany();
    if (items.length === 0) return;
    await tx.adminNotification.createMany({
      data: items.map((n) => ({
        id: n.id,
        type: n.type,
        orderId: n.orderId || null,
        deliveryId: n.deliveryId || null,
        ticketId: n.ticketId || null,
        title: n.title,
        message: n.message,
        timeLabel: n.time,
        read: n.read,
      })),
    });
  });
}

export async function replaceSubscribers(items: SubscriberUser[]) {
  await db.$transaction(async (tx) => {
    await tx.adminSubscriber.deleteMany();
    if (items.length === 0) return;
    await tx.adminSubscriber.createMany({
      data: items.map((s) => ({
        id: s.id,
        name: s.name,
        email: s.email,
        phone: s.phone,
        joinedAt: s.joinedAt,
        status: s.status,
        role: s.role,
        subscriptionsJson: JSON.stringify(s.activeSubscriptions || []),
        totalSpentBdt: s.totalSpentBDT,
        ordersCount: s.ordersCount,
        warrantyClaimsCount: s.warrantyClaimsCount,
      })),
    });
  });
}

export async function replacePayments(items: PaymentTransaction[]) {
  await db.$transaction(async (tx) => {
    await tx.paymentTransaction.deleteMany();
    if (items.length === 0) return;
    await tx.paymentTransaction.createMany({
      data: items.map((p) => ({
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
        createdAtLabel: p.createdAt,
      })),
    });
  });
}

export async function replaceCoupons(items: CouponCode[]) {
  await db.$transaction(async (tx) => {
    await tx.couponCode.deleteMany();
    if (items.length === 0) return;
    await tx.couponCode.createMany({
      data: items.map((c) => ({
        id: c.id,
        code: c.code,
        discountType: c.discountType,
        discountValue: c.discountValue,
        minSpendBdt: c.minSpendBDT,
        usedCount: c.usedCount,
        maxUses: c.maxUses,
        expiresAt: c.expiresAt,
        status: c.status,
      })),
    });
  });
}

export async function replaceFeatures(items: SystemFeatureFlag[]) {
  await db.$transaction(async (tx) => {
    await tx.systemFeatureFlag.deleteMany();
    if (items.length === 0) return;
    await tx.systemFeatureFlag.createMany({
      data: items.map((f) => ({
        id: f.id,
        category: f.category,
        name: f.name,
        key: f.key,
        description: f.description,
        enabled: f.enabled,
        impactNote: f.impactNote,
      })),
    });
  });
}

export async function replaceMediaAssets(items: MediaAsset[]) {
  await db.$transaction(async (tx) => {
    await tx.mediaAsset.deleteMany();
    if (items.length === 0) return;
    await tx.mediaAsset.createMany({
      data: items.map((m) => ({
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
      })),
    });
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
  features?: SystemFeatureFlag[];
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
  if (patch.features) await replaceFeatures(patch.features);
  if (patch.mediaAssets) await replaceMediaAssets(patch.mediaAssets);
}
