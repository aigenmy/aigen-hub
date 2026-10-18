import { Toaster, TooltipProvider } from '@hub/ui';
import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale } from 'next-intl/server';
import './globals.css';

// Inter, self-hosted (no Google Fonts request).
const inter = localFont({
  src: [
    { path: './fonts/inter-latin-wght-normal.woff2', weight: '100 900', style: 'normal' },
    { path: './fonts/inter-latin-ext-wght-normal.woff2', weight: '100 900', style: 'normal' },
  ],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'AIGen Hub', template: '%s · AIGen Hub' },
  description: 'One inbox for WhatsApp, Instagram, Facebook and website chat, with an AI assistant. By AIGen.my.',
  applicationName: 'AIGen Hub',
  robots: { index: false, follow: false },
  icons: { icon: '/aigen-logo.png', apple: '/aigen-logo.png' },
};

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale === 'zh' ? 'zh-Hans' : locale} className={inter.variable}>
      <body className="min-h-dvh">
        <NextIntlClientProvider>
          <TooltipProvider>
            {children}
            <Toaster />
          </TooltipProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
