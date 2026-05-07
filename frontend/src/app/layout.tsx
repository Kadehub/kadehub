import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import { LangProvider } from '../hooks/useLang';

export const metadata: Metadata = {
  title: 'KadeHub - Smart Shop Platform',
  description: 'POS & Shop Management for Sri Lankan Businesses',
  icons: {
    icon: [
      { url: '/logo-icon.png', sizes: '32x32',  type: 'image/png' },
      { url: '/logo-icon.png', sizes: '64x64',  type: 'image/png' },
      { url: '/logo-icon.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/logo-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/logo-icon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Force browser to pick up the icon immediately */}
        <link rel="icon" href="/logo-icon.png" type="image/png" sizes="any" />
        <link rel="shortcut icon" href="/logo-icon.png" />
        <link rel="apple-touch-icon" href="/logo-icon.png" />
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
