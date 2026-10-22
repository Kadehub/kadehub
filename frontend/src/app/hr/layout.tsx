import type { Metadata } from 'next';
import HrRoot from '../../components/hr/HrRoot';

export const metadata: Metadata = {
  title: { default: 'KadeHub Staff', template: '%s · KadeHub Staff' },
  description: 'Staff records, rosters, attendance, leave, payroll, hiring and assets for growing businesses.',
};

// Everything under staff.kadehub.com (src/proxy.ts rewrites the subdomain into /hr).
export default function HrLayout({ children }: { children: React.ReactNode }) {
  return <HrRoot>{children}</HrRoot>;
}
