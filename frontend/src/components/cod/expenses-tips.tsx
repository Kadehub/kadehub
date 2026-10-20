'use client';
/**
 * Tips & strategies card for personal spending. Reusable: pass tips from `buildTips(rows, { budget, businessNet, remainingCash })`
 * (lib/cod/expenses/tips). Tone is shown as a word too (Good / Watch / Tip), never by colour alone.
 */
import {
  AlertTriangle, Wallet, TrendingUp, TrendingDown, Wine, PieChart, Clock, Car, Coins, CheckCircle2, PiggyBank, Target, type LucideIcon,
} from 'lucide-react';
import { Card, cn } from './ui';
import { useT } from '../../lib/cod/i18n/client';
import { formatLKR } from '../../lib/cod/format';
import type { Tip, TipIcon, TipTone } from '../../lib/cod/expenses/tips';
import type { MessageKey } from '../../lib/cod/i18n/messages/en';

const ICONS: Record<TipIcon, LucideIcon> = {
  alert: AlertTriangle, wallet: Wallet, trend_up: TrendingUp, trend_down: TrendingDown, glass: Wine, pie: PieChart,
  clock: Clock, car: Car, coins: Coins, check: CheckCircle2, piggy: PiggyBank, target: Target,
};

const TONE: Record<TipTone, { box: string; icon: string; label: MessageKey }> = {
  good: { box: 'border-emerald-200 bg-emerald-50', icon: 'text-emerald-700', label: 'xp.toneGood' },
  warn: { box: 'border-amber-200 bg-amber-50', icon: 'text-amber-700', label: 'xp.toneWarn' },
  info: { box: 'border-sky-200 bg-sky-50', icon: 'text-sky-700', label: 'xp.toneInfo' },
};

/** Money params are formatted; the category param is translated; others pass through. */
const MONEY = new Set(['over', 'amount', 'projected', 'budget', 'safePerDay', 'left', 'save', 'saved']);

export function TipsCard({ tips, className = '' }: { tips: Tip[]; className?: string }) {
  const t = useT();
  if (!tips.length) return null;
  return (
    <Card title={t('xp.tipsTitle')} className={className}>
      <ul className="grid gap-2 md:grid-cols-2">
        {tips.map(tip => {
          const Icon = ICONS[tip.icon];
          const tone = TONE[tip.tone];
          const params: Record<string, string | number> = {};
          for (const [k, v] of Object.entries(tip.params)) {
            params[k] = MONEY.has(k) ? formatLKR(Number(v)).replace(/\.00$/, '') : k === 'category' ? t.lookup('pcat', String(v)) : v;
          }
          return (
            <li key={tip.id} className={cn('flex gap-3 rounded-xl border p-3', tone.box)}>
              <Icon size={20} className={cn('mt-0.5 shrink-0', tone.icon)} aria-hidden />
              <div className="min-w-0">
                <p className="text-sm font-bold text-ink-900">
                  <span className={cn('mr-1.5 rounded px-1.5 py-0.5 text-2xs font-bold uppercase tracking-wide', tone.icon, 'bg-white/70')}>{t(tone.label)}</span>
                  {t(`tip.${tip.id}.title` as MessageKey, params)}
                </p>
                <p className="mt-0.5 text-xs text-ink-600">{t(`tip.${tip.id}.detail` as MessageKey, params)}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
