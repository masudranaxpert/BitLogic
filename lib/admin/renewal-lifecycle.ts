import type { DigitalDelivery, VaultCredential } from '@/lib/admin/types';
import {
  addDaysYmd,
  computeCredentialExpiresAt,
  formatStamp,
  isCredentialExpired,
  todayYmd,
} from '@/lib/admin/credential-lifecycle';

function isVaultStockAlive(
  v: VaultCredential | undefined,
  asOf: string,
): v is VaultCredential {
  if (!v) return false;
  if (v.status === 'expired') return false;
  if (v.expiresAt && isCredentialExpired(v.expiresAt, asOf)) return false;
  return Boolean(v.secretValue?.trim());
}

function findAvailableStock(
  vault: VaultCredential[],
  productId: string,
  variantId: string,
  asOf: string,
  excludeId?: string,
): VaultCredential | undefined {
  return vault.find(
    (v) =>
      v.id !== excludeId &&
      v.productId === productId &&
      v.variantId === variantId &&
      v.status === 'available' &&
      isVaultStockAlive(v, asOf),
  );
}

function assignmentEnd(
  assignedDay: string,
  planDays: number,
  vaultExpiresAt?: string | null,
): string {
  const byPlan = computeCredentialExpiresAt(assignedDay, planDays);
  if (!vaultExpiresAt) return byPlan;
  return vaultExpiresAt.slice(0, 10) < byPlan
    ? vaultExpiresAt.slice(0, 10)
    : byPlan;
}

function payloadFromVault(v: VaultCredential) {
  return {
    secretValue: v.secretValue,
    email: v.email,
    password: v.password,
    profilePin: v.profilePin,
    vaultCredentialId: v.id,
  };
}

/**
 * Mark vault rows expired when stock meyaad ends.
 * Available → expired. Delivered stays delivered but flagged expired.
 */
export function expireVaultStock(
  vault: VaultCredential[],
  asOf = todayYmd(),
): VaultCredential[] {
  return vault.map((v) => {
    if (!v.expiresAt || !isCredentialExpired(v.expiresAt, asOf)) return v;
    if (v.status === 'expired') return v;
    if (v.status === 'available') {
      return { ...v, status: 'expired' as const };
    }
    // delivered / replaced — keep assignment history, mark stock dead
    return { ...v, status: 'expired' as const };
  });
}

export type LifecycleResult = {
  deliveries: DigitalDelivery[];
  vault: VaultCredential[];
  changed: boolean;
};

/**
 * When assignment window ends:
 * - No renew → clear secret (audit expired)
 * - Renew + old vault stock still alive → reuse / re-surface same credential (new window)
 * - Renew + new available stock → instant deliver
 * - Renew + no stock → clear + keep renewalPending for admin
 *
 * Early renew does not swap while the current window is still open.
 */
export function processCredentialWindows(
  deliveries: DigitalDelivery[],
  vault: VaultCredential[],
  asOf = todayYmd(),
): LifecycleResult {
  const stamp = formatStamp();
  let nextVault = [...vault];
  let changed = false;

  const vaultById = () => new Map(nextVault.map((v) => [v.id, v]));

  const deliveriesOut = deliveries.map((d) => {
    const planDays = d.credentialValidDays ?? 30;
    const linkedNow = d.vaultCredentialId
      ? nextVault.find((v) => v.id === d.vaultCredentialId)
      : undefined;
    const stockDead =
      Boolean(d.vaultCredentialId) && !isVaultStockAlive(linkedNow, asOf);
    const windowEnded =
      isCredentialExpired(d.credentialExpiresAt, asOf) || stockDead;
    const hasSecret = Boolean(d.credentialPayload?.secretValue?.trim());
    // Delivered without a credential (set up on the buyer's device) still counts as served.
    const servedWithoutSecret =
      !hasSecret && d.status === 'delivered' && Boolean(d.deliveredAt) && !d.credentialClearedAt;
    const active = hasSecret || servedWithoutSecret;

    // Still inside assignment window (and stock alive) — renew only flags
    if (active && !windowEnded) {
      return d;
    }

    // No window / no secret — if renew pending, try to fulfill now
    const needsRenewFulfill =
      d.renewalPending && (!active || windowEnded);

    if (!needsRenewFulfill && !windowEnded) {
      return d;
    }

    if (!needsRenewFulfill && windowEnded && hasSecret) {
      // Order cycle ended, no renew paid → empty for buyer
      changed = true;
      const previous = d.credentialPayload.secretValue || '';
      return {
        ...d,
        vaultCredentialId: undefined,
        credentialPayload: {
          secretValue: '',
          email: undefined,
          password: undefined,
          profilePin: undefined,
          vaultCredentialId: undefined,
        },
        credentialClearedAt: stamp,
        credentialAssignedAt: undefined,
        credentialExpiresAt: undefined,
        status: 'pending_dispatch' as const,
        credentialAudit: [
          {
            id: `aud-exp-${d.id}-${asOf}`,
            at: stamp,
            action: 'expired' as const,
            source: 'system' as const,
            secretValue: previous,
            previousSecretValue: previous,
            vaultCredentialId: d.vaultCredentialId,
            note: `Assignment window ended ${d.credentialExpiresAt}`,
            credentialExpiresAt: d.credentialExpiresAt,
          },
          ...(d.credentialAudit || []),
        ],
      };
    }

    if (!needsRenewFulfill) return d;

    // --- Renew paid and (window ended OR already empty) ---
    changed = true;
    const map = vaultById();
    const linkedId = d.vaultCredentialId;
    const linked = linkedId ? map.get(linkedId) : undefined;
    const previousSecret = d.credentialPayload?.secretValue?.trim() || '';

    // Path 1: old vault stock still valid → reuse
    if (linked && isVaultStockAlive(linked, asOf)) {
      const reuse = linked;
      const assignedDay = asOf;
      const credExpires = assignmentEnd(assignedDay, planDays, reuse.expiresAt);
      nextVault = nextVault.map((v) =>
        v.id === reuse.id
          ? {
              ...v,
              status: 'delivered' as const,
              assignedOrderId: d.orderId,
              assignedBuyerEmail: d.buyerEmail,
            }
          : v,
      );
      return {
        ...d,
        status: 'delivered' as const,
        deliveredAt: stamp,
        vaultCredentialId: reuse.id,
        credentialPayload: payloadFromVault(reuse),
        credentialAssignedAt: assignedDay,
        credentialExpiresAt: credExpires,
        credentialClearedAt: undefined,
        renewalPending: false,
        credentialAudit: [
          {
            id: `aud-reuse-${d.id}-${asOf}`,
            at: stamp,
            action: 'renewed' as const,
            source: 'vault' as const,
            secretValue: reuse.secretValue,
            previousSecretValue: previousSecret || undefined,
            vaultCredentialId: reuse.id,
            note: 'Renewal: reused same credential (stock still valid)',
            credentialExpiresAt: credExpires,
          },
          ...(d.credentialAudit || []),
        ],
      };
    }

    // Path 2: instant new from vault
    const available = findAvailableStock(
      nextVault,
      d.productId,
      d.variantId,
      asOf,
      linkedId,
    );
    if (available) {
      const assignedDay = asOf;
      const credExpires = assignmentEnd(
        assignedDay,
        planDays,
        available.expiresAt,
      );
      nextVault = nextVault.map((v) => {
        if (v.id === available.id) {
          return {
            ...v,
            status: 'delivered' as const,
            assignedOrderId: d.orderId,
            assignedBuyerEmail: d.buyerEmail,
          };
        }
        if (linkedId && v.id === linkedId && v.status === 'delivered') {
          return { ...v, status: 'replaced' as const };
        }
        return v;
      });
      return {
        ...d,
        status: 'delivered' as const,
        deliveredAt: stamp,
        vaultCredentialId: available.id,
        credentialPayload: payloadFromVault(available),
        credentialAssignedAt: assignedDay,
        credentialExpiresAt: credExpires,
        credentialClearedAt: undefined,
        renewalPending: false,
        replacementHistoryCount: d.replacementHistoryCount + (previousSecret ? 1 : 0),
        credentialAudit: [
          {
            id: `aud-inst-${d.id}-${asOf}`,
            at: stamp,
            action: 'renewed' as const,
            source: 'vault' as const,
            secretValue: available.secretValue,
            previousSecretValue: previousSecret || undefined,
            vaultCredentialId: available.id,
            note: 'Renewal: instant delivery from stock',
            credentialExpiresAt: credExpires,
          },
          ...(d.credentialAudit || []),
        ],
      };
    }

    // Path 3: no stock — clear old if any, wait for admin assign
    return {
      ...d,
      vaultCredentialId: undefined,
      credentialPayload: {
        secretValue: '',
        email: undefined,
        password: undefined,
        profilePin: undefined,
        vaultCredentialId: undefined,
      },
      credentialClearedAt: hasSecret ? stamp : d.credentialClearedAt,
      credentialAssignedAt: undefined,
      credentialExpiresAt: undefined,
      renewalPending: true,
      status: 'pending_dispatch' as const,
      credentialAudit: hasSecret
        ? [
            {
              id: `aud-wait-${d.id}-${asOf}`,
              at: stamp,
              action: 'expired' as const,
              source: 'system' as const,
              secretValue: previousSecret,
              previousSecretValue: previousSecret,
              vaultCredentialId: linkedId,
              note: 'Renewal paid — waiting for admin assign (no stock)',
              credentialExpiresAt: d.credentialExpiresAt,
            },
            ...(d.credentialAudit || []),
          ]
        : d.credentialAudit,
    };
  });

  return { deliveries: deliveriesOut, vault: nextVault, changed };
}

/** Cap a new assign window by vault stock end. */
export function cappedCredentialExpiresAt(
  assignedAt: string,
  planDays: number,
  vaultExpiresAt?: string | null,
): string {
  return assignmentEnd(assignedAt.slice(0, 10), planDays, vaultExpiresAt);
}

export function computeVaultExpiresAt(
  addedAt: string,
  validDays: number,
): string {
  return addDaysYmd(addedAt.slice(0, 10), Math.max(1, validDays));
}
