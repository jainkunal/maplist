import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Plus_Jakarta_Sans, Playfair_Display } from 'next/font/google';
import MainShell from './components/MainShell';
import PWARegister from './components/PWARegister';

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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${plusJakarta.variable} ${playfair.variable}`}>
      <body suppressHydrationWarning>
        <PWARegister />
        <MainShell>{children}</MainShell>
      </body>
    </html>
  );
}
