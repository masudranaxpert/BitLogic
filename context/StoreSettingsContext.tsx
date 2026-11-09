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
  bkashEnabled?: boolean;
  bkashNumber?: string;
  bkashType?: string;
  bkashInstructions?: string;
  nagadEnabled?: boolean;
  nagadNumber?: string;
  nagadType?: string;
  nagadInstructions?: string;
  rocketEnabled?: boolean;
  rocketNumber?: string;
  rocketType?: string;
  rocketInstructions?: string;
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
  bkashEnabled: true,
  bkashNumber: '01700-123456',
  bkashType: 'Personal',
  bkashInstructions: 'Send Money to our personal bKash number and enter the Transaction ID (TrxID) below.',
  nagadEnabled: true,
  nagadNumber: '01700-123456',
  nagadType: 'Personal',
  nagadInstructions: 'Send Money to our personal Nagad number and enter the Transaction ID (TrxID) below.',
  rocketEnabled: false,
  rocketNumber: '',
  rocketType: 'Personal',
  rocketInstructions: 'Send Money to our Rocket number and enter the Transaction ID (TrxID) below.',
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
