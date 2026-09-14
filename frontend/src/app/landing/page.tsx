import type { Metadata } from 'next';
import LandingContent from './LandingContent';
import './landing.css';

export const metadata: Metadata = {
  title: 'KadeHub — Smart POS & Shop Management for Sri Lankan Retailers',
  description:
    'All-in-one POS, inventory, loyalty, LANKAQR payments, and offline sales for grocery stores, pharmacies, and retail shops. 14-day free trial — no payment required.',
  keywords: [
    'POS Sri Lanka',
    'shop management',
    'inventory software',
    'pharmacy POS',
    'LANKAQR',
    'offline POS',
    'retail software LKR',
  ],
  openGraph: {
    title: 'KadeHub — Smart Retail, Simplified',
    description:
      'POS, inventory, CRM, analytics & LANKAQR — built for Sri Lankan shops. Start with a free 14-day trial.',
    type: 'website',
    url: 'https://www.kadehub.lk',
    siteName: 'KadeHub',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KadeHub — Smart POS for Sri Lankan Retailers',
    description: 'All-in-one shop management with offline POS, LANKAQR, and Sinhala UI support.',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'KadeHub',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '2999',
    priceCurrency: 'LKR',
    description: 'Free 14-day trial. Monthly subscription from LKR 2,999 after trial ends.',
  },
  description: 'Smart POS and shop management platform for Sri Lankan retailers.',
};

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingContent />
    </>
  );
}
