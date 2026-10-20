'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Package, Receipt, Wallet, BarChart3, CreditCard, Settings, BookImage, LogOut,
} from 'lucide-react';
import { useAuthHydrated, useAuthStore } from '../../hooks/useAuth';
import api from '../../lib/api';
import { CodI18nProvider, useT } from '../../lib/cod/i18n/client';
import { itemLabelsFor } from '../../lib/cod/business-types';
import { normalizeHex, readableTextColor } from '../../lib/cod/brand';
import { daysRemaining, planLabel } from '../../lib/cod/plans';
import type { CodMe } from '../../lib/cod/session';
import type { Business } from '../../lib/cod/types';
import { MascotState } from '../brand/Mascot';
import ProductSwitcher from '../platform/ProductSwitcher';
import { CodContextProvider } from './CodContext';
import { LanguageSwitcher, codHref } from './bits';
import { Badge, Button, cn } from './ui';

/** COD's own colour until a business has picked one. */
const COD_BLUE = '#2563eb';
/** Reachable after the trial / plan has lapsed (CODPlatform's subscription gate). */
const GATE_EXEMPT = ['/billing', '/settings'];

/** Path inside COD ("/orders"), whether served at cod.kadehub.com/orders or localhost/cod/orders. */
export function useCodPath() {
  const pathname = usePathname() || '/';
  const prefixed = codHref('/x') !== '/x';
  if (prefixed && (pathname === '/cod' || pathname.startsWith('/cod/'))) return pathname.slice(4) || '/';
  return pathname;
}

function BrandStyle({ color }: { color: string }) {
  const brand = normalizeHex(color);
  // A <style> rule on :root (not a wrapper style) so the Modal portal picks it up too; validated #rrggbb
  return <style>{`:root{--cod-primary:${brand};--cod-primary-fg:${readableTextColor(brand)};}`}</style>;
}

export default function CodRoot({ children }: { children: React.ReactNode }) {
  return (
    <CodI18nProvider>
      <CodGate>{children}</CodGate>
    </CodI18nProvider>
  );
}

function CodGate({ children }: { children: React.ReactNode }) {
  const t = useT();
  const router = useRouter();
  const path = useCodPath();
  const hydrated = useAuthHydrated();
  const token = useAuthStore(s => s.token);
  const [me, setMe] = useState<CodMe | null>(null);
  const [failed, setFailed] = useState(false);
  const isRegister = path === '/register';

  const load = useCallback(async () => {
    setFailed(false);
    try {
      const { data } = await api.get<CodMe>('/cod/me');
      setMe(data);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated || isRegister) return;
    if (!token) { window.location.href = '/login'; return; }
    load();
  }, [hydrated, token, isRegister, load]);

  // Route gates: no COD yet → set-up wizard; lapsed plan → billing
  const needsSetup = !!me && (!me.enabled || !me.business);
  const lapsed = !!me && me.enabled && !!me.business && !me.active && !GATE_EXEMPT.includes(path);
  useEffect(() => {
    if (needsSetup) router.replace(codHref('/register'));
    else if (lapsed) router.replace(codHref('/billing'));
  }, [needsSetup, lapsed, router]);

  const labels = useMemo(() => itemLabelsFor(me?.business?.business_type, t), [me?.business?.business_type, t]);

  if (isRegister) {
    return <><BrandStyle color={COD_BLUE} />{children}</>;
  }

  if (failed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50 px-4">
        <BrandStyle color={COD_BLUE} />
        <MascotState variant="error" title={t('app.loadErrorTitle')} description={t('app.loadErrorBody')}
          action={<Button onClick={load}>{t('common.retry')}</Button>} />
      </div>
    );
  }

  if (!me || needsSetup || lapsed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50 px-4">
        <BrandStyle color={me?.business?.brand_color ?? COD_BLUE} />
        <MascotState variant="loading" size="sm" title={t('app.loading')} />
      </div>
    );
  }

  const value = { me: me as CodMe & { business: Business }, labels, refresh: load };
  return (
    <CodContextProvider value={value}>
      <BrandStyle color={me.business!.brand_color} />
      <Shell me={value.me} itemsLabel={labels.plural} path={path}>{children}</Shell>
    </CodContextProvider>
  );
}

function navItems(t: ReturnType<typeof useT>, itemsLabel: string) {
  return [
    { href: '/', label: t('nav.dashboard'), icon: LayoutDashboard },
    { href: '/items', label: itemsLabel, icon: Package },
    { href: '/orders', label: t('nav.orders'), icon: Receipt },
    { href: '/catalog', label: t('nav.catalog'), icon: BookImage },
    { href: '/expenses', label: t('nav.expenses'), icon: Wallet },
    { href: '/reports', label: t('nav.reports'), icon: BarChart3 },
    { href: '/billing', label: t('nav.billing'), icon: CreditCard },
    { href: '/settings', label: t('nav.settings'), icon: Settings },
  ];
}

function Shell({ me, itemsLabel, path, children }: { me: CodMe & { business: Business }; itemsLabel: string; path: string; children: React.ReactNode }) {
  const t = useT();
  const logout = useAuthStore(s => s.logout);
  const nav = navItems(t, itemsLabel);
  const isActive = (href: string) => (href === '/' ? path === '/' : path === href || path.startsWith(`${href}/`));
  const sub = me.subscription!;
  const trialDaysLeft = sub.status === 'trialing' ? daysRemaining(sub.trial_ends_at) : null;
  const signOut = () => { logout(); window.location.href = '/login'; };
  const b = me.business;

  return (
    <div className="flex min-h-screen bg-ink-50">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-ink-200 bg-white md:flex">
        <div className="flex h-14 items-center gap-2 border-b border-ink-100 px-4">
          <Link href={codHref('/')} className="flex min-w-0 items-center gap-2">
            {b.logo_url
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={b.logo_url} alt="" className="h-7 w-7 shrink-0 rounded object-contain" />
              : <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[color:var(--cod-primary)] text-xs font-extrabold text-[color:var(--cod-primary-fg)]">{b.name.slice(0, 1).toUpperCase()}</span>}
            <span className="truncate text-sm font-bold text-ink-900">{b.name || 'KadeHub COD'}</span>
          </Link>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={codHref(href)}
              className={cn('flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                isActive(href) ? 'bg-[color:var(--cod-primary)] text-[color:var(--cod-primary-fg)]' : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900')}>
              <Icon size={17} /> {label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-ink-100 p-3">
          <ProductSwitcher current="cod" label={t('common.apps')} />
          <p className="px-3 pt-2 text-2xs text-ink-400">KadeHub COD</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-ink-200 bg-white/95 backdrop-blur">
          <div className="flex h-14 items-center justify-between gap-3 px-4">
            <div className="flex min-w-0 items-center gap-2">
              {b.logo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={b.logo_url} alt="" className="h-6 w-6 shrink-0 rounded object-contain md:hidden" />
              )}
              <p className="truncate text-sm font-semibold text-ink-800">{b.name}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge tone={sub.status === 'past_due' || sub.status === 'canceled' ? 'red' : 'gray'} className="hidden sm:inline-flex">
                {planLabel(t, { id: me.plan!.key, name: me.plan!.name })} · {t(`subStatus.${sub.status}`)}
              </Badge>
              <LanguageSwitcher />
              <Button variant="ghost" size="icon" aria-label={t('common.signOut')} title={t('common.signOut')} onClick={signOut}>
                <LogOut />
              </Button>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto border-t border-ink-100 px-2 py-1.5 md:hidden">
            {nav.map(({ href, label }) => (
              <Link key={href} href={codHref(href)}
                className={cn('shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium',
                  isActive(href) ? 'bg-[color:var(--cod-primary)] text-[color:var(--cod-primary-fg)]' : 'text-ink-500 hover:bg-ink-100')}>
                {label}
              </Link>
            ))}
          </nav>
        </header>

        {trialDaysLeft !== null && trialDaysLeft <= 5 && (
          <div className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-900">
            {trialDaysLeft === 0 ? t('app.trialEndsToday') : t.n('app.trialEndsIn', trialDaysLeft)}{' '}
            <Link href={codHref('/billing')} className="font-semibold underline underline-offset-4">{t('app.viewPlans')}</Link>
          </div>
        )}
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
