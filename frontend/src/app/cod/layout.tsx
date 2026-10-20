import type { Metadata } from 'next';
import CodRoot from '../../components/cod/CodRoot';

export const metadata: Metadata = {
  title: { default: 'KadeHub COD', template: '%s · KadeHub COD' },
  description: 'Run your Cash-on-Delivery business: inventory, orders, expenses and reports.',
};

// Everything under cod.kadehub.com (src/proxy.ts rewrites the subdomain into /cod).
export default function CodLayout({ children }: { children: React.ReactNode }) {
  return <CodRoot>{children}</CodRoot>;
}
