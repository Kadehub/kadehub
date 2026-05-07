'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '../../hooks/useAuth';
import Link from 'next/link';
import KadeHubLogo from '../../components/ui/KadeHubLogo';
import {
  LayoutDashboard, Store, CreditCard, Package,
  LogOut, ChevronRight, ShieldCheck, BarChart2, Settings,
  Tag, Megaphone, Activity,
} from 'lucide-react';

const NAV = [
  {
    group: 'Overview',
    items: [
      { href: '/super-admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
      { href: '/super-admin/analytics', label: 'Analytics', icon: BarChart2 },
    ],
  },
  {
    group: 'Management',
    items: [
      { href: '/super-admin/shops', label: 'All Shops', icon: Store },
      { href: '/super-admin/transactions', label: 'Transactions', icon: CreditCard },
      { href: '/super-admin/packages', label: 'Packages', icon: Package },
      { href: '/super-admin/coupons', label: 'Coupons', icon: Tag },
    ],
  },
  {
    group: 'Communication',
    items: [
      { href: '/super-admin/announcements', label: 'Announcements', icon: Megaphone },
    ],
  },
  {
    group: 'System',
    items: [
      { href: '/super-admin/api-monitor', label: 'API Monitor', icon: Activity },
      { href: '/super-admin/settings', label: 'Settings', icon: Settings },
    ],
  },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const { user, token, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => setHydrated(true), []);
  useEffect(() => {
    if (hydrated && (!token || user?.role !== 'SUPER_ADMIN')) router.push('/login');
  }, [hydrated, token, user]);

  if (!hydrated || !token || user?.role !== 'SUPER_ADMIN') return null;

  return (
    <div className="flex h-screen overflow-hidden bg-ink-50" style={{ background: '#F1F5F9' }}>
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 flex flex-col h-full border-r border-ink-200 bg-white">
        {/* Logo */}
        <div className="flex-shrink-0 px-4 py-4 border-b border-ink-100">
          <KadeHubLogo width={168} variant="full" theme="color" />
        </div>

        {/* Super Admin badge */}
        <div className="flex-shrink-0 mx-3 mt-4 mb-2 px-3 py-2.5 rounded-xl border"
          style={{ background: '#E0F2F1', borderColor: '#B2DFDB' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#00796B,#00A884)' }}>
              <ShieldCheck size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: '#0F172A' }}>{user?.name}</p>
              <p className="text-2xs font-semibold" style={{ color: '#00A884' }}>SUPER ADMIN</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
          {NAV.map((group) => (
            <div key={group.group}>
              <p className="px-3 mb-1 text-2xs font-semibold uppercase tracking-widest text-ink-400">
                {group.group}
              </p>
              <div className="space-y-0.5">
                {group.items.map(({ href, label, icon: Icon, exact }) => {
                  const active = exact ? pathname === href : pathname.startsWith(href);
                  return (
                    <Link key={href} href={href}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                        active ? 'text-white' : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900'
                      }`}
                      style={active ? { background: 'linear-gradient(135deg,#00796B,#00A884)' } : {}}>
                      <Icon size={17} style={active ? { color: 'white' } : {}} className={active ? '' : 'text-ink-400 group-hover:text-ink-600'} />
                      <span className="flex-1">{label}</span>
                      {active && <ChevronRight size={14} className="opacity-60" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Logout */}
        <div className="flex-shrink-0 px-3 py-3 border-t border-ink-100">
          <button
            onClick={() => { logout(); router.push('/login'); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-ink-500 hover:bg-red-50 hover:text-red-600 transition-all group">
            <LogOut size={17} className="group-hover:text-red-500 transition-colors" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex-shrink-0 h-14 bg-white border-b border-ink-200 flex items-center justify-between px-6">
          <div>
            <h1 className="text-base font-semibold text-ink-800">Platform Administration</h1>
            <p className="text-2xs text-ink-400">
              {new Date().toLocaleDateString('en-LK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{ background: '#E0F2F1', color: '#00796B' }}>
            <ShieldCheck size={13} />
            Super Admin Portal
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
