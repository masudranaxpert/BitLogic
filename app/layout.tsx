import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Inter, JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google';
import {
  DEFAULT_STORE_SETTINGS,
  getStoreSettings,
} from '@/lib/store-settings';
import { getSiteUrl } from '@/lib/seo/site-url';
import { BrandProvider } from '@/components/brand/BrandLogo';
import { TopProgressBar } from '@/components/common/TopProgressBar';
import './globals.css';
import './storefront.css';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta-face',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter-face',
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-face',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f8fa' },
    { media: '(prefers-color-scheme: dark)', color: '#090d16' },
  ],
};

export async function generateMetadata(): Promise<Metadata> {
  const s = await getStoreSettings();
  const title = s.siteTitle.trim() || DEFAULT_STORE_SETTINGS.siteTitle;
  const description =
    s.siteDescription.trim() || DEFAULT_STORE_SETTINGS.siteDescription;
  const ogDesc = description.slice(0, 200);
  const base = getSiteUrl();
  return {
    metadataBase: new URL(base),
    title: {
      default: title,
      template: '%s | Blumartbd',
    },
    description,
    applicationName: 'Blumartbd',
    alternates: {
      canonical: '/',
    },
    openGraph: {
      title,
      description: ogDesc,
      type: 'website',
      url: base,
      siteName: 'Blumartbd',
      locale: 'en_BD',
      images: [{ url: '/og-image-1200x630.png', width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: ogDesc,
      images: ['/og-image-1200x630.png'],
    },
    icons: s.faviconUrl
      ? { icon: s.faviconUrl, apple: s.faviconUrl }
      : {
          icon: [
            { url: '/favicon.ico', sizes: '48x48' },
            { url: '/favicon.svg', type: 'image/svg+xml' },
          ],
          apple: '/apple-touch-icon.png',
        },
    manifest: '/site.webmanifest',
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getStoreSettings();
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${jakarta.variable} ${inter.variable} ${jetbrains.variable}`}
    >
      <body
        className="font-sans bg-[#f6f8fa] text-slate-900 dark:bg-[#090d16] dark:text-slate-100 selection:bg-emerald-600 selection:text-white antialiased overflow-x-hidden"
        suppressHydrationWarning
      >
        <Script id="admin-dark-init" strategy="beforeInteractive">
          {`(function(){try{if(location.pathname.indexOf('/admin')===0&&localStorage.getItem('blumart_admin_dark')==='1'){document.documentElement.classList.add('dark');}}catch(e){}})();`}
        </Script>
        <TopProgressBar />
        <BrandProvider logoUrl={settings.logoUrl}>{children}</BrandProvider>
      </body>
    </html>
  );
}
