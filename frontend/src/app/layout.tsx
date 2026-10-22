import type { Metadata } from 'next';
import './fonts.css';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import { LangProvider } from '../hooks/useLang';

export const metadata: Metadata = {
  title: 'KadeHub — Business apps for growing businesses',
  description: 'One KadeHub account for POS and COD order management.',
  // Square icons made from the K mark (public/logo-icon.png is a wide logo and shrinks to a speck in a tab)
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '16x16 32x32 48x48' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Viewport for proper mobile scaling */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* The two weights almost every page paints first; the rest load when used */}
        <link rel="preload" href="/fonts/poppins-400-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/poppins-600-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body suppressHydrationWarning>
        <LangProvider>
        {children}
        <Toaster position="top-right" toastOptions={{
          style: { fontFamily: 'Poppins, sans-serif', fontWeight: 600, fontSize: '13px' },
          success: { iconTheme: { primary: '#00796B', secondary: '#fff' } },
        }} />
        </LangProvider>
      </body>
    </html>
  );
}
