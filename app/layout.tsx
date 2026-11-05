import type { Metadata, Viewport } from 'next';
import './globals.css';
import './storefront.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f8fa' },
    { media: '(prefers-color-scheme: dark)', color: '#090d16' },
  ],
};

export const metadata: Metadata = {
  title: 'BitLogic Admin | Digital Subscription & Credential Console',
  description:
    'Enterprise admin dashboard for digital products, multi-variant subscriptions, pre-stocked token/key vault, instant digital delivery, warranty tracking, payment verification, and feature control.',
  openGraph: {
    title: 'BitLogic Admin | Digital Subscription & Credential Console',
    description:
      'Enterprise admin dashboard for digital products, multi-variant subscriptions, pre-stocked token/key vault, instant digital delivery, warranty tracking, payment verification, and feature control.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BitLogic Admin | Digital Subscription & Credential Console',
    description:
      'Enterprise admin dashboard for digital products, multi-variant subscriptions, pre-stocked token/key vault, instant digital delivery, warranty tracking, payment verification, and feature control.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,600..900&family=JetBrains+Mono:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,500..900;1,500..900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&display=swap"
        />
      </head>
      <body
        className="font-sans bg-[#f6f8fa] text-slate-900 dark:bg-[#090d16] dark:text-slate-100 selection:bg-emerald-600 selection:text-white antialiased overflow-x-hidden"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
