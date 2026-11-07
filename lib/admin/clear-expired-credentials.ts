import type { DigitalDelivery, VaultCredential } from '@/lib/admin/types';
import { todayYmd } from '@/lib/admin/credential-lifecycle';
import {
  expireVaultStock,
  processCredentialWindows,
  type LifecycleResult,
} from '@/lib/admin/renewal-lifecycle';

/**
 * Full sweep: expire vault stock meyaad, then resolve assignment windows
 * (clear / reuse / instant renew / pending assign).
 */
export function runCredentialLifecycle(
  deliveries: DigitalDelivery[],
  vault: VaultCredential[],
  asOf = todayYmd(),
): LifecycleResult {
  const nextVault = expireVaultStock(vault, asOf);
  const vaultChanged = nextVault.some(
    (v, i) => v.status !== vault[i]?.status,
  );
  const result = processCredentialWindows(deliveries, nextVault, asOf);
  return {
    ...result,
    vault: result.vault,
    changed: result.changed || vaultChanged,
  };
}
