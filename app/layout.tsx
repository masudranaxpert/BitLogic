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
  title: {
    default: 'BitLogic | Digital Subscriptions',
    template: '%s | BitLogic',
  },
  description:
    'Buy digital subscriptions with fast delivery, warranty tracking, and account access — plus an admin console for vault, payments, and support.',
  openGraph: {
    title: 'BitLogic | Digital Subscriptions',
    description:
      'Buy digital subscriptions with fast delivery, warranty tracking, and account access.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BitLogic | Digital Subscriptions',
    description:
      'Buy digital subscriptions with fast delivery, warranty tracking, and account access.',
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
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,600..900&family=Inter:opsz,wght@14..32,400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,500..900;1,500..900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&display=swap"
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
