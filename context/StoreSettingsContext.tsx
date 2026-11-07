'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { HomeBannerItem } from '@/lib/home-banners-shared';

export type PublicStoreSettings = {
  ordersPaused: boolean;
  ordersPausedMessage: string;
  whatsappNumber: string;
  supportEmail: string;
  telegramHandle: string;
  supportHours: string;
  facebookUrl: string;
  youtubeUrl: string;
  /** Server time (ms) when the page was rendered; lets countdowns ignore a wrong visitor clock. */
  serverNow?: number;
  /** Visible homepage banners, in order. */
  homeBanners?: HomeBannerItem[];
  /** True once an admin has added any banner (even hidden): then the built-in defaults are not used. */
  homeBannersCustom?: boolean;
};

const Ctx = createContext<PublicStoreSettings>({
  ordersPaused: false,
  ordersPausedMessage: '',
  whatsappNumber: '',
  supportEmail: '',
  telegramHandle: '',
  supportHours: '',
  facebookUrl: '',
  youtubeUrl: '',
});

export function StoreSettingsProvider({
  value,
  children,
}: {
  value: PublicStoreSettings;
  children: ReactNode;
}) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useStoreSettings = () => useContext(Ctx);
