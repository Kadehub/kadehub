'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '../../hooks/useAuth';
import Sidebar from '../../components/ui/Sidebar';
import LanguageSwitcher from '../../components/ui/LanguageSwitcher';
import { useLang } from '../../hooks/useLang';
import { TranslationKey } from '../../lib/i18n';
import { Wifi, WifiOff } from 'lucide-react';

const pageTitleKeys: Record<string, TranslationKey> = {
  '/pos':       'page.pos',
  '/products':  'page.products',
  '/inventory': 'page.inventory',
  '/customers': 'page.customers',
  '/reports':   'page.reports',
  '/expenses':  'page.expenses',
  '/credit':    'page.credit',
  '/discounts': 'page.discounts',
  '/suppliers': 'page.suppliers',
  '/batches':   'page.batches',
  '/staff':     'page.staff',
  '/settings':  'page.settings',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLang();
  const [hydrated, setHydrated] = useState(false);
  const [online, setOnline] = useState(true);

  useEffect(() => { setHydrated(true); }, []);
  useEffect(() => { if (hydrated && !token) router.push('/login'); }, [hydrated, token, router]);
  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  if (!hydrated || !token) return null;

  const titleKey = Object.entries(pageTitleKeys).find(([k]) => pathname.startsWith(k))?.[1];
  const title = titleKey ? t(titleKey) : 'KadeHub';
  const today = new Date().toLocaleDateString('en-LK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    /* Full viewport, no overflow on the outer shell */
    <div className="flex h-screen overflow-hidden bg-ink-50">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top bar — fixed height, never shrinks */}
        <header className="flex-shrink-0 h-14 bg-white border-b border-ink-200 flex items-center justify-between px-6">
          <div>
            <h1 className="text-base font-semibold text-ink-800">{title}</h1>
            <p className="text-2xs text-ink-400">{today}</p>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            {!online ? (
              <span className="flex items-center gap-1.5 text-xs font-medium text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-200">
                <WifiOff size={12} /> {t('topbar.offline')}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                <Wifi size={12} /> {t('topbar.online')}
              </span>
            )}
          </div>
        </header>
        {/* Scrollable page content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
