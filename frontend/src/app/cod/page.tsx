import type { Metadata } from 'next';
import ComingSoon from '../../components/platform/ComingSoon';

export const metadata: Metadata = { title: 'KadeHub COD' };

// Served at cod.kadehub.com/ (src/proxy.ts rewrites the subdomain into /cod).
export default function CodHomePage() {
  return <ComingSoon slug="cod" />;
}
