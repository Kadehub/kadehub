'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, CalendarDays, Clock, Plane, Wallet, Briefcase, Award, Package, BarChart3, Settings, CreditCard,
  LogOut, MoreHorizontal, LayoutGrid, Home, MonitorSmartphone, type LucideIcon,
} from 'lucide-react';
import { useAuthHydrated, useAuthStore } from '../../hooks/useAuth';
import api from '../../lib/api';
import { useHrT, type HrKey } from '../../lib/hr/i18n';
import type { HrMe } from '../../lib/hr/types';
import { normalizeHex, readableTextColor } from '../../lib/cod/brand';
import { hubUrl } from '../../lib/platform';
import { MascotState } from '../brand/Mascot';
import ProductSwitcher from '../platform/ProductSwitcher';
import LanguageSwitcher from '../ui/LanguageSwitcher';
import { HrContextProvider, hrHref, useHr, type HrContextValue } from './HrContext';
import { Badge, BranchSelect, Button, cn } from './ui';

/** Staff's own colour until the business picks one. */
export const STAFF_PURPLE = '#7c3aed';
const BRANCH_KEY = 'hr_branch';

/** Path inside Staff ("/roster"), whether served at staff.kadehub.com/roster or localhost/hr/roster. */
export function useHrPath() {
  const pathname = usePathname() || '/';
  // During server rendering of the subdomain rewrite usePathname() reports the internal /hr/... path
  if (pathname === '/hr' || pathname.startsWith('/hr/')) return pathname.slice(3) || '/';
  return pathname;
}

export function BrandStyle({ color }: { color: string }) {
  const brand = normalizeHex(color);
  // On :root (not a wrapper) so dialogs rendered in a portal pick it up too
  return <style>{`:root{--cod-primary:${brand};--cod-primary-fg:${readableTextColor(brand)};}`}</style>;
}

/** Public pages: the landing page, sign-up and job adverts. Everything else needs a Staff session. */
const isPublic = (path: string) => path === '/' || path === '/register' || path.startsWith('/jobs/');

export default function HrRoot({ children }: { children: React.ReactNode }) {
  const path = useHrPath();
  if (isPublic(path)) return <><BrandStyle color={STAFF_PURPLE} />{children}</>;
  return <HrGate path={path}>{children}</HrGate>;
}

function readBranch(): number | null {
  try { const v = localStorage.getItem(BRANCH_KEY); return v ? Number(v) : null; } catch { return null; }
}

function HrGate({ path, children }: { path: string; children: React.ReactNode }) {
  const { t } = useHrT();
  const router = useRouter();
  const hydrated = useAuthHydrated();
  const token = useAuthStore(s => s.token);
  const logout = useAuthStore(s => s.logout);
  const [me, setMe] = useState<HrMe | null>(null);
  const [failed, setFailed] = useState(false);
  const [branch, setBranchState] = useState<number | null>(null);

  const load = useCallback(async () => {
    setFailed(false);
    try {
      const { data } = await api.get<HrMe>('/hr/me');
      setMe(data);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!token) { window.location.href = '/login'; return; }
    load();
  }, [hydrated, token, load]);

  const owner = me?.role === 'owner';
  const needsSetup = !!me && (!me.enabled || !me.setup_done);
  useEffect(() => { if (needsSetup && (owner || !me?.enabled)) router.replace(hrHref('/register')); }, [needsSetup, owner, me?.enabled, router]);

  // Keep the picked branch valid: a manager with one branch always has it; "all" only when there is more than one
  const branches = useMemo(() => me?.branches ?? [], [me?.branches]);
  useEffect(() => {
    if (!me?.branches) return;
    const saved = readBranch();
    const valid = saved !== null && branches.some(b => b.id === saved) ? saved : null;
    setBranchState(valid ?? (branches.length === 1 || !owner ? branches[0]?.id ?? null : null));
  }, [me?.branches, branches, owner]);

  const setBranch = useCallback((id: number | null) => {
    setBranchState(id);
    try { if (id === null) localStorage.removeItem(BRANCH_KEY); else localStorage.setItem(BRANCH_KEY, String(id)); } catch {}
  }, []);

  const brand = me?.settings?.brand_color ?? STAFF_PURPLE;

  if (failed) {
    return (
      <Centered color={brand}>
        <MascotState variant="error" title={t('app.loadErrorTitle')} description={t('app.loadErrorBody')}
          action={<Button onClick={load}>{t('common.retry')}</Button>} />
      </Centered>
    );
  }
  if (me && me.enabled && me.setup_done && me.role === 'none') {
    return (
      <Centered color={brand}>
        <MascotState variant="empty" scene="sleep" title={t('app.noAccessTitle')} description={t('app.noAccessBody')}
          action={<Button variant="outline" onClick={() => { logout(); window.location.href = '/login'; }}>{t('common.signOut')}</Button>} />
      </Centered>
    );
  }
  if (me && needsSetup && me.enabled && !owner) {
    return (
      <Centered color={brand}>
        <MascotState variant="empty" scene="grow" title={t('app.notSetUpTitle')} description={t('app.notSetUpBody')} />
      </Centered>
    );
  }
  if (!me || needsSetup) {
    return <Centered color={brand}><MascotState variant="loading" size="sm" title={t('app.loading')} /></Centered>;
  }

  const value: HrContextValue = {
    me: me as HrContextValue['me'],
    owner,
    branches,
    branch,
    setBranch,
    branchName: id => branches.find(b => b.id === id)?.name ?? (id ? '' : t('common.unassigned')),
    refresh: load,
  };

  return (
    <HrContextProvider value={value}>
      <BrandStyle color={brand} />
      {/* The kiosk is a full-screen app for the shop's shared tablet */}
      {path === '/kiosk' ? children : <Shell path={path}>{children}</Shell>}
    </HrContextProvider>
  );
}

function Centered({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50 px-4">
      <BrandStyle color={color} />
      {children}
    </div>
  );
}

interface NavItem { href: string; key: HrKey; icon: LucideIcon; ownerOnly?: boolean }

const NAV: NavItem[] = [
  { href: '/dashboard', key: 'nav.dashboard', icon: LayoutDashboard },
  { href: '/employees', key: 'nav.employees', icon: Users },
  { href: '/roster', key: 'nav.roster', icon: CalendarDays },
  { href: '/attendance', key: 'nav.attendance', icon: Clock },
  { href: '/leave', key: 'nav.leave', icon: Plane },
  { href: '/payroll', key: 'nav.payroll', icon: Wallet, ownerOnly: true },
  { href: '/hiring', key: 'nav.hiring', icon: Briefcase },
  { href: '/performance', key: 'nav.performance', icon: Award },
  { href: '/assets', key: 'nav.assets', icon: Package },
  { href: '/reports', key: 'nav.reports', icon: BarChart3 },
  { href: '/settings', key: 'nav.settings', icon: Settings, ownerOnly: true },
  { href: '/billing', key: 'nav.billing', icon: CreditCard, ownerOnly: true },
];

/** Phone bottom bar, in priority order; the rest sit under "More". */
const BOTTOM_NAV = ['/dashboard', '/attendance', '/roster', '/employees'];

function Shell({ path, children }: { path: string; children: React.ReactNode }) {
  const { t } = useHrT();
  const logout = useAuthStore(s => s.logout);
  const { me, owner, branches, branch, setBranch } = useHr();
  const nav = NAV.filter(n => !n.ownerOnly || owner);
  const isActive = (href: string) => path === href || path.startsWith(`${href}/`);
  const sub = me.subscription!;
  const trialDaysLeft = sub.status === 'trialing' && sub.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(sub.trial_ends_at).getTime() - Date.now()) / 86_400_000)) : null;
  const s = me.settings;
  const signOut = () => { logout(); window.location.href = '/login'; };

  return (
    <div className="flex min-h-screen bg-ink-50">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-ink-200 bg-white md:flex">
        <div className="flex h-14 items-center gap-2 border-b border-ink-100 px-4">
          <Link href={hrHref('/dashboard')} className="flex min-w-0 items-center gap-2">
            {s.logo_url
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={s.logo_url} alt="" className="h-7 w-7 shrink-0 rounded object-contain" />
              : <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[color:var(--cod-primary)] text-xs font-extrabold text-[color:var(--cod-primary-fg)]">{(s.business_name || 'S').slice(0, 1).toUpperCase()}</span>}
            <span className="truncate text-sm font-bold text-ink-900">{s.business_name || t('app.name')}</span>
          </Link>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {nav.map(({ href, key, icon: Icon }) => (
            <Link key={href} href={hrHref(href)}
              className={cn('flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                isActive(href) ? 'bg-[color:var(--cod-primary)] text-[color:var(--cod-primary-fg)]' : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900')}>
              <Icon size={17} /> {t(key)}
            </Link>
          ))}
          <a href={hrHref('/kiosk')} className="mt-2 flex items-center gap-2.5 rounded-xl border border-dashed border-ink-200 px-3 py-2.5 text-sm font-medium text-ink-600 hover:bg-ink-50">
            <MonitorSmartphone size={17} /> {t('nav.kiosk')}
          </a>
        </nav>
        <div className="border-t border-ink-100 p-3">
          <ProductSwitcher current="hr" label={t('nav.apps')} />
          <a href={hrHref('/')} className="block px-3 pt-2 text-2xs text-ink-400 hover:text-ink-600">{t('app.name')}</a>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-ink-200 bg-white/95 backdrop-blur">
          <div className="flex h-14 items-center justify-between gap-3 px-4">
            <div className="flex min-w-0 items-center gap-2">
              {s.logo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.logo_url} alt="" className="h-6 w-6 shrink-0 rounded object-contain md:hidden" />
              )}
              <BranchSelect branches={branches} value={branch} onChange={setBranch} allowAll={owner && branches.length > 1} className="h-9 max-w-[11rem] text-xs sm:max-w-none" />
              {branches.length <= 1 && <p className="truncate text-sm font-semibold text-ink-800">{branches[0]?.name ?? s.business_name}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge tone="gray" className="hidden lg:inline-flex">{owner ? t('role.owner') : t('role.manager')}</Badge>
              {owner && (
                <Link href={hrHref('/billing')} className="hidden sm:block">
                  <Badge tone={sub.status === 'free' ? 'amber' : 'gray'}>{t(`plan.${me.plan!.key}` as HrKey)} · {t(`sub.${sub.status}` as HrKey)}</Badge>
                </Link>
              )}
              <div className="hidden sm:block"><LanguageSwitcher /></div>
              <Button variant="ghost" size="icon" aria-label={t('common.signOut')} title={t('common.signOut')} onClick={signOut}><LogOut /></Button>
            </div>
          </div>
        </header>

        {owner && trialDaysLeft !== null && trialDaysLeft <= 5 && (
          <div className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-900">
            {trialDaysLeft === 0 ? t('app.trialEndsToday') : t('app.trialEndsIn', { n: trialDaysLeft })}{' '}
            <Link href={hrHref('/billing')} className="font-semibold underline underline-offset-4">{t('app.viewPlans')}</Link>
          </div>
        )}
        {owner && sub.status === 'free' && (me.usage?.employees ?? 0) >= (me.plan?.max_employees ?? Infinity) && (
          <div className="bg-violet-50 px-4 py-2 text-center text-sm text-violet-900">
            {t('app.onFree', { n: me.plan?.max_employees ?? 3 })}{' '}
            <Link href={hrHref('/billing')} className="font-semibold underline underline-offset-4">{t('app.viewPlans')}</Link>
          </div>
        )}
        <main className="flex-1 p-4 pb-[calc(5rem+env(safe-area-inset-bottom))] md:p-6">{children}</main>
      </div>

      <MobileNav nav={nav} isActive={isActive} path={path} />
    </div>
  );
}

function MobileNav({ nav, isActive, path }: { nav: NavItem[]; isActive: (href: string) => boolean; path: string }) {
  const { t } = useHrT();
  const [moreOpen, setMoreOpen] = useState(false);
  useEffect(() => setMoreOpen(false), [path]);
  const primary = BOTTOM_NAV.map(h => nav.find(n => n.href === h)).filter(Boolean) as NavItem[];
  const rest = nav.filter(n => !primary.includes(n));
  const moreActive = rest.some(n => isActive(n.href));

  return (
    <>
      {moreOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMoreOpen(false)} aria-hidden>
          <div className="absolute inset-0 bg-ink-900/30" />
        </div>
      )}
      {moreOpen && (
        <div className="fixed inset-x-0 z-50 mx-2 rounded-2xl border border-ink-200 bg-white p-2 shadow-lg md:hidden"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 4.25rem)' }}>
          <ul className="grid grid-cols-3 gap-1">
            {rest.map(({ href, key, icon: Icon }) => (
              <li key={href}>
                <Link href={hrHref(href)} className={cn('flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-xl px-1 text-center text-xs font-semibold',
                  isActive(href) ? 'bg-ink-100 text-ink-900' : 'text-ink-600 hover:bg-ink-50')}>
                  <Icon size={19} /> {t(key)}
                </Link>
              </li>
            ))}
            <li>
              <a href={hrHref('/kiosk')} className="flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-xl px-1 text-center text-xs font-semibold text-ink-600 hover:bg-ink-50">
                <MonitorSmartphone size={19} /> {t('nav.kiosk')}
              </a>
            </li>
          </ul>
          <div className="mt-1 flex justify-center border-t border-ink-100 pt-2"><LanguageSwitcher /></div>
          <div className="mt-1 grid grid-cols-2 gap-1 border-t border-ink-100 pt-1">
            <a href={hubUrl('/apps')} className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl text-xs font-semibold text-ink-600 hover:bg-ink-50">
              <LayoutGrid size={16} /> {t('nav.apps')}
            </a>
            <a href={hubUrl('/')} className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl text-xs font-semibold text-ink-600 hover:bg-ink-50">
              <Home size={16} /> {t('nav.home')}
            </a>
          </div>
        </div>
      )}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-200 bg-white/95 backdrop-blur md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <ul className="grid h-16" style={{ gridTemplateColumns: `repeat(${primary.length + 1}, minmax(0, 1fr))` }}>
          {primary.map(({ href, key, icon: Icon }) => (
            <li key={href}>
              <Link href={hrHref(href)} aria-current={isActive(href) ? 'page' : undefined}
                className={cn('flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-semibold', isActive(href) ? 'text-[color:var(--cod-primary)]' : 'text-ink-500')}>
                <Icon size={20} /> <span className="max-w-full truncate px-1">{t(key)}</span>
              </Link>
            </li>
          ))}
          <li>
            <button type="button" onClick={() => setMoreOpen(o => !o)} aria-expanded={moreOpen}
              className={cn('flex h-full w-full flex-col items-center justify-center gap-0.5 text-[11px] font-semibold', moreActive || moreOpen ? 'text-[color:var(--cod-primary)]' : 'text-ink-500')}>
              <MoreHorizontal size={20} /> {t('nav.more')}
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
