import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import { LangProvider } from '../hooks/useLang';

export const metadata: Metadata = {
  title: 'KadeHub — Business apps for growing businesses',
  description: 'One KadeHub account for POS, COD order management and a local task marketplace.',
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
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Sinhala:wght@400;600;700&display=swap" rel="stylesheet" />
      </head>
      <body suppressHydrationWarning>
        <LangProvider>
        {children}
        <Toaster position="top-right" toastOptions={{
          style: { fontFamily: 'Poppins, sans-serif', fontWeight: 600, fontSize: '13px' },
          success: { iconTheme: { primary: '#00A884', secondary: '#fff' } },
        }} />
        </LangProvider>
      </body>
    </html>
  );
}
