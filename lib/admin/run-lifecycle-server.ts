import { db } from '@/lib/db';
import { decryptSecret, encryptSecret } from '@/lib/crypto/secrets';
import { runCredentialLifecycle } from '@/lib/admin/clear-expired-credentials';
import type {
  CredentialAuditEntry,
  DigitalDelivery,
  VaultCredential,
} from '@/lib/admin/types';
import { todayYmd } from '@/lib/admin/credential-lifecycle';

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Apply credential/vault window rules on the server so expiry does not wait
 * for an admin to open the dashboard.
 */
export async function runServerCredentialLifecycle(asOf = todayYmd()) {
  const [vaultRows, deliveryRows, auditRows] = await Promise.all([
    db.vaultCredential.findMany(),
    db.digitalDelivery.findMany(),
    db.credentialAudit.findMany({ orderBy: { createdAt: 'desc' } }),
  ]);

  const auditsByDelivery = new Map<string, typeof auditRows>();
  for (const a of auditRows) {
    const list = auditsByDelivery.get(a.deliveryId) || [];
    list.push(a);
    auditsByDelivery.set(a.deliveryId, list);
  }

  const vault: VaultCredential[] = vaultRows.map((v) => ({
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
    validDays: v.validDays,
    expiresAt: v.expiresAt || undefined,
    batchNote: v.batchNote,
    addedAt: v.addedAt,
    assignedOrderId: v.assignedOrderId || undefined,
    assignedBuyerEmail: v.assignedBuyerEmail || undefined,
  }));

  const vaultById = new Map(vault.map((v) => [v.id, v]));

  const deliveries: DigitalDelivery[] = deliveryRows.map((d) => {
    const linked = d.vaultCredentialId
      ? vaultById.get(d.vaultCredentialId)
      : undefined;
    const audits: CredentialAuditEntry[] = (
      auditsByDelivery.get(d.id) || []
    ).map((a) => ({
      id: a.id,
      at: a.atLabel,
      action: a.action as CredentialAuditEntry['action'],
      source: a.source as CredentialAuditEntry['source'],
      secretValue: decryptSecret(a.secretValue),
      previousSecretValue: a.previousSecretValue
        ? decryptSecret(a.previousSecretValue)
        : undefined,
      vaultCredentialId: a.vaultCredentialId || undefined,
      note: a.note || undefined,
      credentialExpiresAt: a.credentialExpiresAt || undefined,
    }));
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
      vaultCredentialId: d.vaultCredentialId || undefined,
      credentialPayload: {
        secretValue: linked?.secretValue || '',
        email: linked?.email,
        password: linked?.password,
        profilePin: linked?.profilePin,
        vaultCredentialId: linked?.id,
      },
      vpnRequired: d.vpnRequired,
      vpnRegionNote: d.vpnRegionNote,
      hasWarranty: d.hasWarranty,
      warrantyDays: d.warrantyDays,
      warrantyRemainingDays: d.warrantyRemainingDays,
      warrantyTerms: d.warrantyTerms,
      warrantyClaimReason: d.warrantyClaimReason || undefined,
      replacementHistoryCount: d.replacementHistoryCount,
      loginInstructions: parseJson<string[]>(d.loginInstructionsJson, []),
      customAdminNote: d.customAdminNote,
      unreadChatCount: d.unreadChatCount,
      chatMessages: parseJson(d.chatMessagesJson, []),
      pinned: d.pinned,
      orderExpiresAt: d.orderExpiresAt || undefined,
      credentialValidDays: d.credentialValidDays,
      credentialAssignedAt: d.credentialAssignedAt || undefined,
      credentialExpiresAt: d.credentialExpiresAt || undefined,
      renewalPending: d.renewalPending,
      credentialClearedAt: d.credentialClearedAt || undefined,
      orderQuantity: d.orderQuantity,
      unitIndex: d.unitIndex,
      credentialAudit: audits,
    };
  });

  const result = runCredentialLifecycle(deliveries, vault, asOf);
  if (!result.changed) return { changed: false };

  await db.$transaction(async (tx) => {
    for (const v of result.vault) {
      await tx.vaultCredential.update({
        where: { id: v.id },
        data: {
          status: v.status,
          secretValue: encryptSecret(v.secretValue),
          email: v.email || null,
          password: v.password ? encryptSecret(v.password) : null,
          profilePin: v.profilePin || null,
          assignedOrderId: v.assignedOrderId || null,
          assignedBuyerEmail: v.assignedBuyerEmail || null,
          expiresAt: v.expiresAt || null,
        },
      });
    }
    for (const d of result.deliveries) {
      await tx.digitalDelivery.update({
        where: { id: d.id },
        data: {
          status: d.status,
          deliveredAt: d.deliveredAt || null,
          vaultCredentialId: d.vaultCredentialId || null,
          renewalPending: Boolean(d.renewalPending),
          credentialAssignedAt: d.credentialAssignedAt || null,
          credentialExpiresAt: d.credentialExpiresAt || null,
          credentialClearedAt: d.credentialClearedAt || null,
          replacementHistoryCount: d.replacementHistoryCount,
          orderExpiresAt: d.orderExpiresAt || null,
        },
      });
      for (const a of d.credentialAudit || []) {
        await tx.credentialAudit.upsert({
          where: { id: a.id },
          create: {
            id: a.id,
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

  return { changed: true };
}
