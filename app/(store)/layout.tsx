import { StoreProviders } from '@/components/storefront';
import { listCatalogProducts } from '@/lib/catalog/queries';
import { getStoreSettings } from '@/lib/store-settings';
import { listHomeBanners } from '@/lib/home-banners';
import { getSession } from '@/lib/auth/session';
import { ROLES } from '@/lib/auth/roles';
import { StoreSettingsProvider } from '@/context/StoreSettingsContext';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getStoreSettings();
  let isAdmin = false;
  try {
    isAdmin = (await getSession())?.role === ROLES.ADMIN;
  } catch {
    isAdmin = false;
  }

  const path = (await headers()).get('x-pathname') || '';
  if (settings.maintenanceMode && !isAdmin && !path.startsWith('/login')) {
    return (
      <main className="storefront-shell flex min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center">
        <BrandLogo />
        <h1 className="max-w-md text-2xl font-extrabold tracking-tight text-[#0F172A]">
          We&apos;ll be right back
        </h1>
        <p className="max-w-md text-base text-slate-600">{settings.maintenanceMessage}</p>
      </main>
    );
  }

  const products = await listCatalogProducts();
  const allBanners = await listHomeBanners();

  return (
    <StoreSettingsProvider
      value={{
        ordersPaused: settings.ordersPaused,
        ordersPausedMessage: settings.ordersPausedMessage,
        whatsappNumber: settings.whatsappNumber,
        supportEmail: settings.supportEmail,
        telegramHandle: settings.telegramHandle,
        supportHours: settings.supportHours,
        facebookUrl: settings.facebookUrl,
        youtubeUrl: settings.youtubeUrl,
        serverNow: Date.now(),
        homeBanners: allBanners.filter((b) => b.isActive),
        homeBannersCustom: allBanners.length > 0,
        bkashEnabled: settings.bkashEnabled,
        bkashNumber: settings.bkashNumber,
        bkashType: settings.bkashType,
        bkashInstructions: settings.bkashInstructions,
        nagadEnabled: settings.nagadEnabled,
        nagadNumber: settings.nagadNumber,
        nagadType: settings.nagadType,
        nagadInstructions: settings.nagadInstructions,
        rocketEnabled: settings.rocketEnabled,
        rocketNumber: settings.rocketNumber,
        rocketType: settings.rocketType,
        rocketInstructions: settings.rocketInstructions,
      }}
    >
      {settings.maintenanceMode && isAdmin ? (
        <div className="bg-amber-500 px-4 py-1.5 text-center text-sm font-semibold text-amber-950">
          Maintenance mode is on — only admins can see the store.
        </div>
      ) : null}
      {settings.announcementEnabled && settings.announcementText.trim() ? (
        <div className="bg-[#0F172A] px-4 py-2 text-center text-sm font-medium text-white">
          {settings.announcementText}
        </div>
      ) : null}
      {settings.ordersPaused ? (
        <div className="bg-amber-50 px-4 py-2 text-center text-sm font-semibold text-amber-900 border-b border-amber-200">
          {settings.ordersPausedMessage}
        </div>
      ) : null}
      <StoreProviders products={products}>{children}</StoreProviders>
    </StoreSettingsProvider>
  );
}
