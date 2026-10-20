'use client';

import Link from 'next/link';
import { Globe, Lock } from 'lucide-react';
import { LOCALES, LOCALE_NAMES, type Locale } from '../../lib/cod/i18n/config';
import { useSetLocale, useT } from '../../lib/cod/i18n/client';
import { STATUS_STYLE } from '../../lib/cod/order-status';
import type { OrderStatus } from '../../lib/cod/types';
import { productPath } from '../../lib/platform';
import { btnClass, cn } from './ui';

export const codHref = (path: string) => productPath('cod', path);

/** English / සිංහල / தமிழ් picker — each language labelled in itself. */
export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const t = useT();
  const setLocale = useSetLocale();
  return (
    <label className={cn('relative inline-flex items-center', className)}>
      <Globe size={14} className="pointer-events-none absolute left-2.5 text-ink-400" />
      <select aria-label={t('app.language')} value={t.locale} onChange={e => setLocale(e.target.value as Locale)}
        className="h-8 rounded-lg border border-ink-200 bg-white pl-7 pr-2 text-xs font-medium text-ink-700">
        {LOCALES.map(l => <option key={l} value={l}>{LOCALE_NAMES[l]}</option>)}
      </select>
    </label>
  );
}

export function StatusDot({ status, className = '' }: { status: OrderStatus; className?: string }) {
  return <span aria-hidden className={cn('inline-block h-2 w-2 shrink-0 rounded-full', STATUS_STYLE[status].dot, className)} />;
}

/**
 * Blurs its children and overlays an upgrade prompt when `locked`. Only the visual half of the
 * gate: the backend already sends placeholder data for locked sections.
 */
export function PremiumLock({ locked, title, message, compact = false, className = '', children }: {
  locked: boolean; title?: string; message: string; compact?: boolean; className?: string; children: React.ReactNode;
}) {
  const t = useT();
  if (!locked) return <>{children}</>;
  if (compact) {
    return (
      <div className={cn('relative overflow-hidden', className)}>
        <div aria-hidden className="pointer-events-none min-h-[3.5rem] select-none opacity-70 blur-[5px]">{children}</div>
        <Link href={codHref('/billing')} title={message} className="absolute inset-0 flex items-center justify-center bg-white/30">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold shadow-sm">
            <Lock size={13} className="text-[color:var(--cod-primary)]" /> {title ?? t('premium.badge')}
          </span>
        </Link>
      </div>
    );
  }
  return (
    <div className={cn('relative overflow-hidden rounded-lg', className)}>
      <div aria-hidden className="pointer-events-none h-full select-none opacity-70 blur-[5px]">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center bg-white/40 p-4">
        <div className="flex max-w-xs flex-col items-center gap-2 rounded-xl border border-ink-200 bg-white/95 p-4 text-center shadow-sm">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-100 text-[color:var(--cod-primary)]"><Lock size={16} /></span>
          <p className="text-sm font-semibold text-ink-900">{title ?? t('premium.feature')}</p>
          <p className="text-xs text-ink-500">{message}</p>
          <Link href={codHref('/billing')} className={btnClass('primary', 'sm')}>{t('premium.upgrade')}</Link>
        </div>
      </div>
    </div>
  );
}
