import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google';
import {
  DEFAULT_STORE_SETTINGS,
  getStoreSettings,
} from '@/lib/store-settings';
import { getSiteUrl } from '@/lib/seo/site-url';
import './globals.css';
import './storefront.css';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta-face',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter-face',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-face',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
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
      template: '%s | BitLogic',
    },
    description,
    applicationName: 'BitLogic',
    alternates: {
      canonical: '/',
    },
    openGraph: {
      title,
      description: ogDesc,
      type: 'website',
      url: base,
      siteName: 'BitLogic',
      locale: 'en_BD',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: ogDesc,
    },
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
        {children}
      </body>
    </html>
  );
}
