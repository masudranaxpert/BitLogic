import { db } from '@/lib/db';

export type StoreSettings = {
  /** Browser tab / OG title for the public store. */
  siteTitle: string;
  /** Meta description for search / social previews. */
  siteDescription: string;
  /** Storefront shows a maintenance screen to everyone except signed-in admins. */
  maintenanceMode: boolean;
  maintenanceMessage: string;
  /** Catalog stays browsable; checkout and the order API refuse new orders. */
  ordersPaused: boolean;
  ordersPausedMessage: string;
  /** Thin bar above the storefront header; empty text hides it. */
  announcementEnabled: boolean;
  announcementText: string;
  /** Renewal opens this many days before an item ends… */
  renewOpenDaysBefore: number;
  /** …and stays open this many days after it ended (grace). */
  renewGraceDaysAfter: number;
  /** Digits, optional leading +. Empty hides WhatsApp links. */
  whatsappNumber: string;
  supportEmail: string;
  telegramHandle: string;
  supportHours: string;
  facebookUrl: string;
  youtubeUrl: string;
};

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  siteTitle: 'BitLogic | Digital Subscriptions',
  siteDescription:
    'Buy digital subscriptions with fast delivery, warranty tracking, and account access — plus an admin console for vault, payments, and support.',
  maintenanceMode: false,
  maintenanceMessage: "We're doing some upkeep and will be back shortly.",
  ordersPaused: false,
  ordersPausedMessage: 'New orders are paused for a short while. Please check back soon.',
  announcementEnabled: false,
  announcementText: '',
  renewOpenDaysBefore: 7,
  renewGraceDaysAfter: 3,
  whatsappNumber: '',
  supportEmail: '',
  telegramHandle: '',
  supportHours: '',
  facebookUrl: '',
  youtubeUrl: '',
};

const KEYS = Object.keys(DEFAULT_STORE_SETTINGS) as Array<keyof StoreSettings>;

export async function getStoreSettings(): Promise<StoreSettings> {
  try {
    const rows = await db.storeSetting.findMany();
    const out: StoreSettings = { ...DEFAULT_STORE_SETTINGS };
    for (const r of rows) {
      const k = r.key as keyof StoreSettings;
      if (!KEYS.includes(k)) continue;
      const def = DEFAULT_STORE_SETTINGS[k];
      (out as Record<string, unknown>)[k] =
        typeof def === 'boolean'
          ? r.value === 'true'
          : typeof def === 'number'
            ? Math.max(0, Math.min(365, Math.round(Number(r.value)) || 0))
            : r.value;
    }
    return out;
  } catch {
    return { ...DEFAULT_STORE_SETTINGS };
  }
}

export async function saveStoreSettings(patch: Partial<StoreSettings>) {
  const ops = [];
  for (const k of KEYS) {
    if (!(k in patch)) continue;
    const def = DEFAULT_STORE_SETTINGS[k];
    const raw = patch[k];
    const maxLen =
      k === 'siteDescription'
        ? 320
        : k === 'siteTitle'
          ? 80
          : k === 'whatsappNumber'
            ? 20
            : k === 'supportEmail' || k === 'telegramHandle'
              ? 120
              : k === 'supportHours'
                ? 80
                : 500;
    const value =
      typeof def === 'boolean'
        ? String(Boolean(raw))
        : typeof def === 'number'
          ? String(
              Math.max(0, Math.min(365, Math.round(Number(raw)) || 0)),
            )
          : String(raw ?? '').slice(0, maxLen);
    ops.push(
      db.storeSetting.upsert({
        where: { key: k },
        create: { key: k, value },
        update: { value },
      }),
    );
  }
  await db.$transaction(ops);
  return getStoreSettings();
}
