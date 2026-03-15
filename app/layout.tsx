import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Plus_Jakarta_Sans, Playfair_Display } from 'next/font/google';
import MainShell from './components/MainShell';
import PWARegister from './components/PWARegister';
import { PWAProvider } from './components/PWAContext';
import { ToastProvider } from '@/components/Toast';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-plus-jakarta',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['700'],
  style: ['normal', 'italic'],
  variable: '--font-playfair',
});

export const metadata: Metadata = {
  title: 'MapLists',
  description: 'Curated maps of places you want to visit.',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#2563eb',
  viewportFit: 'cover',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${plusJakarta.variable} ${playfair.variable}`}>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>
      <body suppressHydrationWarning>
        <ToastProvider>
          <PWAProvider>
            <PWARegister />
            <MainShell>{children}</MainShell>
          </PWAProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
