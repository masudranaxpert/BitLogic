import type {
  AdminNotificationItem,
  AdminSupportTicket,
  CouponCode,
  CredentialScheme,
  DigitalDelivery,
  DigitalProduct,
  MediaAsset,
  PaymentTransaction,
  ProductCategory,
  SubscriberUser,
  VaultCredential,
  WarrantyPlan,
} from '@/lib/admin/types';
import {
  persistAdminProduct,
  persistAdminTaxonomies,
} from '@/lib/admin/catalog-client';
import type { ConsoleUser } from '@/components/admin/shell/admin-nav-types';

export type AdminWorkspacePayload = {
  products: DigitalProduct[];
  productCategories: ProductCategory[];
  warranties: WarrantyPlan[];
  credentialSchemes: CredentialScheme[];
  vault: VaultCredential[];
  deliveries: DigitalDelivery[];
  tickets: AdminSupportTicket[];
  adminNotifications: AdminNotificationItem[];
  subscribers: SubscriberUser[];
  payments: PaymentTransaction[];
  coupons: CouponCode[];
  mediaAssets: MediaAsset[];
};

let cachedWorkspace: AdminWorkspacePayload | null = null;
let cachedConsoleUser: ConsoleUser | null = null;

if (typeof window !== 'undefined') {
  try {
    const raw = sessionStorage.getItem('admin_workspace_cache');
    if (raw) cachedWorkspace = JSON.parse(raw);
    const rawUser = sessionStorage.getItem('admin_console_user');
    if (rawUser) cachedConsoleUser = JSON.parse(rawUser);
  } catch {}
}

export function getCachedConsoleUser(): ConsoleUser | null {
  return cachedConsoleUser;
}

export function setCachedConsoleUser(user: ConsoleUser | null) {
  cachedConsoleUser = user;
  if (typeof window !== 'undefined') {
    try {
      if (user) {
        sessionStorage.setItem('admin_console_user', JSON.stringify(user));
      } else {
        sessionStorage.removeItem('admin_console_user');
      }
    } catch {}
  }
}

export function getCachedAdminWorkspace(): AdminWorkspacePayload | null {
  return cachedWorkspace;
}

export function setCachedAdminWorkspace(data: AdminWorkspacePayload) {
  cachedWorkspace = data;
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem('admin_workspace_cache', JSON.stringify(data));
    } catch {}
  }
}

export async function fetchAdminWorkspace(): Promise<AdminWorkspacePayload | null> {
  try {
    const res = await fetch('/api/admin/workspace', { cache: 'no-store' });
    if (!res.ok) return cachedWorkspace;
    const data = (await res.json()) as AdminWorkspacePayload;
    setCachedAdminWorkspace(data);
    return data;
  } catch {
    return cachedWorkspace;
  }
}

type WorkspacePatchBody = {
  vault?: VaultCredential[];
  deliveries?: DigitalDelivery[];
  tickets?: AdminSupportTicket[];
  adminNotifications?: AdminNotificationItem[];
  subscribers?: SubscriberUser[];
  payments?: PaymentTransaction[];
  coupons?: CouponCode[];
  mediaAssets?: MediaAsset[];
};

// Saves are coalesced (latest array per key wins) and sent strictly one at a
// time, so several quick edits can never land out of order and overwrite each other.
let pendingPatch: WorkspacePatchBody = {};
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let waiters: Array<(ok: boolean) => void> = [];
let inflight: Promise<unknown> = Promise.resolve();

/** True while any save is queued or in flight. */
export function hasPendingAdminSaves(): boolean {
  return flushTimer !== null || savesInFlight > 0;
}

let savesInFlight = 0;

export function persistAdminWorkspace(
  patch: WorkspacePatchBody,
): Promise<boolean> {
  pendingPatch = { ...pendingPatch, ...patch };
  return new Promise<boolean>((resolve) => {
    waiters.push(resolve);
    if (flushTimer) return;
    flushTimer = setTimeout(() => {
      flushTimer = null;
      const body = pendingPatch;
      const done = waiters;
      pendingPatch = {};
      waiters = [];
      savesInFlight += 1;
      inflight = inflight.then(async () => {
        let ok = false;
        try {
          const res = await fetch('/api/admin/workspace', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
          ok = res.ok;
        } catch {
          ok = false;
        }
        savesInFlight -= 1;
        done.forEach((r) => r(ok));
      });
    }, 0);
  });
}

export { persistAdminProduct, persistAdminTaxonomies };
