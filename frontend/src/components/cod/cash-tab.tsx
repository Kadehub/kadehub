'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Plane } from 'lucide-react';
import api from '../../lib/api';
import { useT } from '../../lib/cod/i18n/client';
import { formatDate, formatLKR, formatLKRCompact } from '../../lib/cod/format';
import { monthLabel } from '../../lib/cod/dates';
import { buildTips } from '../../lib/cod/expenses/tips';
import { BUSINESS_COLORS, PERSONAL_COLORS } from '../../lib/cod/expenses/types';
import { MascotState } from '../brand/Mascot';
import { categoryIcon } from './expense-kit/icons';
import { categoryLabel } from './expenses-sheet';
import { TipsCard } from './expenses-tips';
import { codHref } from './bits';
import { Button, Card, Kpi, cn, tbl } from './ui';

type Figures = {
  income: number; cogs: number; businessExpenses: number; businessTourExpenses: number;
  businessNetProfit: number; personalExpenses: number; netRemainingCash: number; keptPct: number | null;
};
type CatRow = { category: string; amount: number; count: number };
type FinanceResponse = {
  period: Figures; allTime: Figures;
  months: (Figures & { key: string; label: string })[];
  businessByCategory: CatRow[]; personalByCategory: CatRow[];
  personalInRange: { id: number; category: string; amount: number; expense_date: string; title: string; notes: string | null }[];
  personalRows: { category: string; amount: number; expense_date: string; notes: string | null }[];
};

const RANGES = ['this_month', 'last_month', 'last_3_months', 'this_year', 'all'] as const;
type Range = (typeof RANGES)[number];
const GREEN = '#059669';
const RED = '#dc2626';
const SLATE = '#64748b';
// Same colour per category as the Expenses page (colour follows the category, never its rank)
const personalColor = (c: string) => (PERSONAL_COLORS as Record<string, string>)[c] ?? SLATE;
const businessColor = (c: string) => (BUSINESS_COLORS as Record<string, string>)[c] ?? SLATE;

/** Dashboard tab "Personal & Cash" (owner only): business profit, personal spending and what's left. */
export default function CashTab() {
  const t = useT();
  const [range, setRange] = useState<Range>('this_month');
  const [data, setData] = useState<FinanceResponse | null>(null);
  const [budget, setBudget] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);

  const load = (r: Range) => {
    setFailed(false);
    setData(null);
    api.get<FinanceResponse>('/cod/finance', { params: { range: r } }).then(res => setData(res.data)).catch(() => setFailed(true));
  };
  useEffect(() => { load(range); }, [range]);
  useEffect(() => {
    api.get<{ monthly_budget: number | null }>('/cod/personal-settings').then(r => setBudget(r.data?.monthly_budget ?? null)).catch(() => {});
  }, []);

  // Tips work month-to-date, so feed them this month's business figures
  const tips = useMemo(() => {
    if (!data) return [];
    const thisMonth = data.months[data.months.length - 1];
    return buildTips(data.personalRows, { budget, businessNet: thisMonth?.businessNetProfit, remainingCash: thisMonth?.netRemainingCash });
  }, [data, budget]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('fin.tabCash')}>
        {RANGES.map(r => (
          <button key={r} type="button" role="radio" aria-checked={range === r} onClick={() => setRange(r)}
            className={cn('min-h-[36px] rounded-full border px-3.5 text-sm font-semibold transition-colors',
              range === r ? 'border-[color:var(--cod-primary)] bg-[color:var(--cod-primary)] text-[color:var(--cod-primary-fg)]' : 'border-ink-200 bg-white text-ink-600 hover:bg-ink-50')}>
            {t(`range.${r}`)}
          </button>
        ))}
      </div>

      {failed && <MascotState variant="error" title={t('app.loadErrorTitle')} description={t('app.loadErrorBody')}
        action={<Button onClick={() => load(range)}>{t('common.retry')}</Button>} />}
      {!failed && !data && <MascotState variant="loading" size="sm" title={t('app.loading')} />}
      {data && <CashBody data={data} tips={tips} />}
    </div>
  );
}

function CashBody({ data, tips }: { data: FinanceResponse; tips: ReturnType<typeof buildTips> }) {
  const t = useT();
  const p = data.period;
  const positive = p.netRemainingCash >= 0;
  const kept = p.keptPct == null ? null : Math.max(0, Math.min(100, p.keptPct));
  const chart = data.months.map(m => ({
    label: monthLabel(m.key, t.locale),
    profit: m.businessNetProfit, personal: m.personalExpenses, remaining: m.netRemainingCash,
  }));

  return (
    <>
      {/* Hero: net remaining cash */}
      <section className="kh-card p-5" style={{ borderColor: positive ? '#A7F3D0' : '#FECACA', background: positive ? '#ECFDF5' : '#FEF2F2' }}>
        <p className="text-sm font-semibold" style={{ color: positive ? GREEN : RED }}>{t('fin.remaining')}</p>
        <p className="mt-1 text-3xl font-extrabold" style={{ color: positive ? GREEN : RED }}>{formatLKR(p.netRemainingCash)}</p>
        <p className="mt-1 text-sm text-ink-600">
          {t('fin.heroLine', { profit: formatLKR(p.businessNetProfit), personal: formatLKR(p.personalExpenses) })}
          {p.keptPct != null && <> · {t('fin.kept', { pct: String(Math.round(p.keptPct)) })}</>}
        </p>
        {!positive && <p className="mt-1 text-xs font-semibold" style={{ color: RED }}>{t('fin.negative')}</p>}
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/80" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={kept ?? 0}>
          <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${positive ? kept ?? 0 : 100}%`, background: positive ? GREEN : RED }} />
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label={t('fin.income')} value={formatLKRCompact(p.income)} />
        <Kpi label={t('fin.bizExpenses')} value={formatLKRCompact(p.businessExpenses)} hint={t('fin.tourSub', { amount: formatLKR(p.businessTourExpenses) })} />
        <Kpi label={t('fin.netProfit')} value={formatLKRCompact(p.businessNetProfit)} tone={p.businessNetProfit < 0 ? 'danger' : undefined} />
        <Kpi label={t('fin.personal')} value={formatLKRCompact(p.personalExpenses)} />
      </div>

      <TipsCard tips={tips} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={t('fin.statement')}>
          <Statement period={data.period} allTime={data.allTime} />
        </Card>
        <Card title={t('fin.monthly')} bodyClassName="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={v => formatLKRCompact(v)} width={64} />
              <Tooltip formatter={(v: number) => formatLKR(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="profit" name={t('fin.chartProfit')} fill="var(--cod-primary)" radius={4} />
              <Bar dataKey="personal" name={t('fin.chartPersonal')} fill="#d97706" radius={4} />
              <Line dataKey="remaining" name={t('fin.chartRemaining')} stroke={GREEN} strokeWidth={2.5} dot={{ r: 3 }} type="monotone" />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card title={t('fin.monthly')}>
        <div className="overflow-x-auto">
          <table className={tbl.table}>
            <thead><tr>
              <th className={tbl.th}>{t('fin.month')}</th>
              <th className={`${tbl.th} ${tbl.right}`}>{t('fin.income')}</th>
              <th className={`${tbl.th} ${tbl.right}`}>{t('fin.cogs')}</th>
              <th className={`${tbl.th} ${tbl.right}`}>{t('fin.bizExpenses')}</th>
              <th className={`${tbl.th} ${tbl.right}`}>{t('fin.tour')}</th>
              <th className={`${tbl.th} ${tbl.right}`}>{t('fin.netProfit')}</th>
              <th className={`${tbl.th} ${tbl.right}`}>{t('fin.personal')}</th>
              <th className={`${tbl.th} ${tbl.right}`}>{t('fin.remaining')}</th>
            </tr></thead>
            <tbody>
              {[...data.months].reverse().map(m => (
                <tr key={m.key}>
                  <td className={tbl.td}>{monthLabel(m.key, t.locale)} {m.key.slice(0, 4)}</td>
                  <td className={`${tbl.td} ${tbl.right}`}>{formatLKR(m.income)}</td>
                  <td className={`${tbl.td} ${tbl.right}`}>{formatLKR(m.cogs)}</td>
                  <td className={`${tbl.td} ${tbl.right}`}>{formatLKR(m.businessExpenses)}</td>
                  <td className={`${tbl.td} ${tbl.right}`}>{formatLKR(m.businessTourExpenses)}</td>
                  <td className={`${tbl.td} ${tbl.right}`}>{formatLKR(m.businessNetProfit)}</td>
                  <td className={`${tbl.td} ${tbl.right}`}>{formatLKR(m.personalExpenses)}</td>
                  <td className={`${tbl.td} ${tbl.right} font-semibold`} style={{ color: m.netRemainingCash < 0 ? RED : undefined }}>{formatLKR(m.netRemainingCash)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={t('fin.byBusiness')}><Breakdown kind="business" rows={data.businessByCategory} /></Card>
        <Card title={t('fin.byPersonal')}><Breakdown kind="personal" rows={data.personalByCategory} /></Card>
      </div>

      <Card title={t('fin.recentPersonal')} action={<a href={codHref('/expenses?tab=personal')} className="text-sm font-semibold text-[color:var(--cod-primary)] hover:underline">{t('fin.manage')}</a>}>
        {data.personalInRange.length === 0 ? (
          <p className="text-sm text-ink-400">{t('fin.noPersonal')}</p>
        ) : (
          <ul className="divide-y divide-ink-100">
            {data.personalInRange.slice(0, 12).map(r => {
              const Icon = categoryIcon('personal', r.category);
              const color = personalColor(r.category);
              return (
                <li key={r.id} className="flex items-center gap-3 py-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: `${color}1f`, color }}><Icon size={17} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink-800">{categoryLabel(t, 'personal', r.category)}</span>
                    <span className="block truncate text-xs text-ink-400">{formatDate(r.expense_date)}{r.notes ? ` · ${r.notes}` : ''}</span>
                  </span>
                  <span className="text-sm font-bold text-ink-900">− {formatLKR(r.amount)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}

function Statement({ period, allTime }: { period: Figures; allTime: Figures }) {
  const t = useT();
  const rows: { label: string; key: keyof Figures; sign: '' | '−' | '='; indent?: boolean; strong?: boolean }[] = [
    { label: t('fin.income'), key: 'income', sign: '' },
    { label: t('fin.cogs'), key: 'cogs', sign: '−' },
    { label: t('fin.bizExpenses'), key: 'businessExpenses', sign: '−' },
    { label: t('fin.inclTour'), key: 'businessTourExpenses', sign: '', indent: true },
    { label: t('fin.netProfit'), key: 'businessNetProfit', sign: '=', strong: true },
    { label: t('fin.personal'), key: 'personalExpenses', sign: '−' },
    { label: t('fin.remaining'), key: 'netRemainingCash', sign: '=', strong: true },
  ];
  return (
    <table className="w-full text-sm">
      <thead><tr className="text-xs text-ink-400">
        <th className="py-1.5 text-left font-medium" />
        <th className="py-1.5 text-right font-medium">{t('fin.thisPeriod')}</th>
        <th className="py-1.5 text-right font-medium">{t('fin.allTime')}</th>
      </tr></thead>
      <tbody>
        {rows.map(r => (
          <tr key={r.key} className={cn(r.strong && 'border-t border-ink-200')}>
            <td className={cn('py-1.5', r.indent ? 'pl-5 text-xs text-ink-400' : 'text-ink-700', r.strong && 'font-bold text-ink-900')}>
              {r.indent ? <span className="inline-flex items-center gap-1"><Plane size={12} /> {r.label}</span> : <>{r.sign && <span className="mr-1 text-ink-400">{r.sign}</span>}{r.label}</>}
            </td>
            {[period, allTime].map((f, i) => {
              const v = f[r.key] as number;
              return (
                <td key={i} className={cn('py-1.5 text-right tabular-nums', r.indent && 'text-xs text-ink-400', r.strong && 'font-bold')}
                  style={r.strong && v < 0 ? { color: RED } : undefined}>{formatLKR(v)}</td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Breakdown({ kind, rows }: { kind: 'business' | 'personal'; rows: CatRow[] }) {
  const t = useT();
  if (!rows.length) return <p className="text-sm text-ink-400">{t('fin.none')}</p>;
  const total = rows.reduce((s, r) => s + r.amount, 0) || 1;
  return (
    <ul className="space-y-2.5">
      {rows.map(r => {
        const Icon = categoryIcon(kind, r.category);
        const color = kind === 'personal' ? personalColor(r.category) : businessColor(r.category);
        const pct = Math.round((r.amount / total) * 100);
        return (
          <li key={r.category} className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: `${color}1f`, color }}><Icon size={16} /></span>
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate font-semibold text-ink-800">{categoryLabel(t, kind, r.category)}</span>
                <span className="shrink-0 font-bold text-ink-900">{formatLKR(r.amount)}</span>
              </span>
              <span className="mt-1 flex items-center gap-2">
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-100"><span className="block h-full rounded-full" style={{ width: `${pct}%`, background: color }} /></span>
                <span className="w-9 text-right text-2xs text-ink-400">{pct}%</span>
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
