'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '../../hooks/useAuth';
import Sidebar from '../../components/ui/Sidebar';
import LanguageSwitcher from '../../components/ui/LanguageSwitcher';
import { useLang } from '../../hooks/useLang';
import { TranslationKey } from '../../lib/i18n';
import { Wifi, WifiOff, X, Info, AlertTriangle, CheckCircle, AlertCircle, Menu } from 'lucide-react';
import api from '../../lib/api';

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

const ANN_ICONS: Record<string, any> = { info: Info, warning: AlertTriangle, success: CheckCircle, error: AlertCircle };
const ANN_STYLES: Record<string, string> = {
  info:    'bg-blue-50 border-blue-200 text-blue-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  success: 'bg-green-50 border-green-200 text-green-800',
  error:   'bg-red-50 border-red-200 text-red-800',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { token, setLogoUrl } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLang();
  const [hydrated, setHydrated] = useState(false);
  const [online, setOnline] = useState(true);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [dismissedIds, setDismissedIds] = useState<number[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
  useEffect(() => {
    api.get('/super-admin/announcements/active').then(({ data }) => setAnnouncements(data)).catch(() => {});
  }, []);
  useEffect(() => {
    api.get('/billing/profile').then(({ data }) => setLogoUrl(data.logo_url || null)).catch(() => {});
  }, []);

  if (!hydrated || !token) return null;

  const titleKey = Object.entries(pageTitleKeys).find(([k]) => pathname.startsWith(k))?.[1];
  const title = titleKey ? t(titleKey) : 'KadeHub';
  const today = new Date().toLocaleDateString('en-LK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const visible = announcements.filter(a => !dismissedIds.includes(a.id));

  return (
    <div className="flex h-screen overflow-hidden bg-ink-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <div className={`fixed inset-y-0 left-0 z-30 lg:static lg:z-auto transition-transform duration-200 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Announcement banners */}
        {visible.map(ann => {
          const Icon = ANN_ICONS[ann.type] || Info;
          return (
            <div key={ann.id} className={`flex-shrink-0 flex items-center gap-3 px-6 py-2.5 border-b text-sm font-medium ${ANN_STYLES[ann.type] || ANN_STYLES.info}`}>
              <Icon size={15} className="flex-shrink-0" />
              <span className="font-semibold mr-1">{ann.title}:</span>
              <span className="flex-1">{ann.message}</span>
              <button onClick={() => setDismissedIds(ids => [...ids, ann.id])} className="flex-shrink-0 opacity-60 hover:opacity-100">
                <X size={14} />
              </button>
            </div>
          );
        })}
        {/* Top bar */}
        <header className="flex-shrink-0 h-14 bg-white border-b border-ink-200 flex items-center justify-between px-4 lg:px-6">
          <button className="lg:hidden mr-2 p-1.5 rounded-lg hover:bg-ink-100 text-ink-500" onClick={() => setSidebarOpen(true)}>
            <Menu size={20} />
          </button>
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
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
