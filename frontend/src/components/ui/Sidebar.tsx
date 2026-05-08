'use client';
import { useAuthStore } from '../../hooks/useAuth';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  ShoppingCart, Package, Users, BarChart2, LogOut, Boxes,
  ChevronRight, Truck, Receipt, Tag, CreditCard, FlaskConical,
  UserCog, Settings, X,
} from 'lucide-react';
import KadeHubLogo from './KadeHubLogo';
import { useSubscribedModules } from '../../hooks/useSubscribedModules';
import { useLang } from '../../hooks/useLang';
import { TranslationKey } from '../../lib/i18n';

const ALL_NAV: { href: string; labelKey: TranslationKey; icon: any; module: string; groupKey: TranslationKey }[] = [
  { href: '/pos',       labelKey: 'nav.pos',       icon: ShoppingCart, module: 'pos',       groupKey: 'nav.operations' },
  { href: '/products',  labelKey: 'nav.products',  icon: Package,      module: 'inventory', groupKey: 'nav.operations' },
  { href: '/inventory', labelKey: 'nav.inventory', icon: Boxes,        module: 'inventory', groupKey: 'nav.operations' },
  { href: '/customers', labelKey: 'nav.customers', icon: Users,        module: 'customer',  groupKey: 'nav.operations' },
  { href: '/expenses',  labelKey: 'nav.expenses',  icon: Receipt,      module: 'expense',   groupKey: 'nav.finance' },
  { href: '/credit',    labelKey: 'nav.credit',    icon: CreditCard,   module: 'credit',    groupKey: 'nav.finance' },
  { href: '/discounts', labelKey: 'nav.discounts', icon: Tag,          module: 'discount',  groupKey: 'nav.finance' },
  { href: '/suppliers', labelKey: 'nav.suppliers', icon: Truck,        module: 'supplier',  groupKey: 'nav.supplyChain' },
  { href: '/batches',   labelKey: 'nav.batches',   icon: FlaskConical, module: 'batch',     groupKey: 'nav.supplyChain' },
  { href: '/reports',   labelKey: 'nav.reports',   icon: BarChart2,    module: 'analytics', groupKey: 'nav.insights' },
  { href: '/staff',     labelKey: 'nav.staff',     icon: UserCog,      module: 'staff',     groupKey: 'nav.insights' },
];

const GROUP_KEYS: TranslationKey[] = ['nav.operations', 'nav.finance', 'nav.supplyChain', 'nav.insights'];

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const { user, logout, logoUrl } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const { hasModule, loaded } = useSubscribedModules();
  const { t } = useLang();

  const visibleNav = ALL_NAV.filter(item => hasModule(item.module));
  const grouped = GROUP_KEYS.map(gk => ({
    labelKey: gk,
    items: visibleNav.filter(n => n.groupKey === gk),
  })).filter(g => g.items.length > 0);

  const handleNav = () => onClose?.();

  return (
    <aside className="w-60 flex-shrink-0 flex flex-col h-full border-r border-ink-200 bg-white">
      {/* Logo */}
      <div className="flex-shrink-0 px-4 py-4 border-b border-ink-100 flex items-center justify-between">
        {logoUrl ? (
          <div className="flex flex-col items-start gap-1.5">
            <img src={logoUrl} alt="Shop logo" className="h-9 w-auto max-w-[130px] object-contain" />
            <div className="flex items-center gap-1">
              <span className="text-2xs text-ink-400">Powered by</span>
              <KadeHubLogo height={11} variant="full" theme="mono" />
            </div>
          </div>
        ) : (
          <KadeHubLogo width={140} variant="full" theme="color" />
        )}
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-1.5 rounded-lg hover:bg-ink-100 text-ink-400 ml-2 flex-shrink-0">
            <X size={18} />
          </button>
        )}
      </div>

      {/* User pill */}
      <div className="flex-shrink-0 mx-3 mt-4 mb-2 px-3 py-2.5 rounded-xl border"
        style={{ background: '#E0F2F1', borderColor: '#B2DFDB' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#00796B,#00A884)' }}>
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: '#0F172A' }}>{user?.name}</p>
            <p className="text-2xs font-semibold" style={{ color: '#00A884' }}>{user?.role}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
        {!loaded ? (
          <div className="space-y-2 px-3 pt-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-9 rounded-xl bg-ink-100 animate-pulse" style={{ opacity: 1 - i * 0.15 }} />
            ))}
          </div>
        ) : (
          grouped.map(group => (
            <div key={group.labelKey}>
              <p className="px-3 mb-1 text-2xs font-semibold uppercase tracking-widest text-ink-400">
                {t(group.labelKey)}
              </p>
              <div className="space-y-0.5">
                {group.items.map(({ href, labelKey, icon: Icon }) => {
                  const active = pathname.startsWith(href);
                  return (
                    <Link key={href} href={href} onClick={handleNav}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                        active ? 'text-white' : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900'
                      }`}
                      style={active ? { background: 'linear-gradient(135deg,#00796B,#00A884)' } : {}}>
                      <Icon size={17} style={active ? { color: 'white' } : {}} className={active ? '' : 'text-ink-400 group-hover:text-ink-600'} />
                      <span className="flex-1">{t(labelKey)}</span>
                      {active && <ChevronRight size={14} className="opacity-60" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </nav>

      {/* Bottom: Settings + Logout */}
      <div className="flex-shrink-0 px-3 py-3 border-t border-ink-100 space-y-0.5">
        <Link href="/settings" onClick={handleNav}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
            pathname.startsWith('/settings') ? 'text-white' : 'text-ink-500 hover:bg-ink-50 hover:text-ink-800'
          }`}
          style={pathname.startsWith('/settings') ? { background: 'linear-gradient(135deg,#00796B,#00A884)' } : {}}>
          <Settings size={17} />
          {t('nav.settings')}
        </Link>
        <button
          onClick={() => { logout(); router.push('/login'); }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-ink-500 hover:bg-red-50 hover:text-red-600 transition-all group">
          <LogOut size={17} className="group-hover:text-red-500 transition-colors" />
          {t('nav.signOut')}
        </button>
      </div>
    </aside>
  );
}
