'use client';
/** Business side of the Expenses page: quick add, filters, KPIs (incl. Business Tour), charts, list, CSV. */
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Download, MoreVertical, Plane } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button, Card, Menu, MenuItem, NativeSelect, SearchInput, cn, tbl } from './ui';
import { categoryIcon } from './expense-kit/icons';
import { categoryLabel, expenseError } from './expenses-sheet';
import { MascotState } from '../brand/Mascot';
import api from '../../lib/api';
import { useT } from '../../lib/cod/i18n/client';
import { formatDate, formatLKR, formatLKRCompact } from '../../lib/cod/format';
import { monthLabel, resolveRange, type RangeKey } from '../../lib/cod/dates';
import { inRange, ymd, type YmdRange } from '../../lib/cod/expenses/dates';
import { businessKpis, byCategory, monthlySeries } from '../../lib/cod/expenses/stats';
import { downloadCsv, toCsv } from '../../lib/cod/expenses/csv';
import { BUSINESS_CATEGORIES, BUSINESS_TOUR, PAYMENT_METHODS, categoryColor, type BusinessExpense } from '../../lib/cod/expenses/types';

const RANGE_KEYS: RangeKey[] = ['today', 'yesterday', 'this_month', 'last_month', 'last_3_months', 'this_year', 'all'];

function toYmdRange(key: RangeKey): YmdRange {
  if (key === 'all') return { from: null, to: null };
  const r = resolveRange(key);
  return { from: ymd(r.from), to: ymd(r.to) };
}

export default function BusinessExpenses({ rows, onAdd, onEdit, onChanged }: {
  rows: BusinessExpense[];
  onAdd: (category?: string) => void;
  onEdit: (row: BusinessExpense) => void;
  onChanged: () => void;
}) {
  const t = useT();
  const [q, setQ] = useState('');
  const [rangeKey, setRangeKey] = useState<RangeKey>('this_month');
  const [category, setCategory] = useState('all');
  const [method, setMethod] = useState('all');
  const range = useMemo(() => toYmdRange(rangeKey), [rangeKey]);

  // Search / category / method apply everywhere; the date range applies to KPIs, donut and list (not the 6-month trend)
  const base = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter(r =>
      (category === 'all' || r.category === category)
      && (method === 'all' || r.payment_method === method)
      && (!needle || [r.title, r.vendor, r.reference, r.notes].some(v => (v ?? '').toLowerCase().includes(needle))));
  }, [rows, q, category, method]);
  const filtered = useMemo(() => base.filter(r => inRange(r.expense_date, range)), [base, range]);
  const kpis = useMemo(() => businessKpis(base, range), [base, range]);
  const slices = useMemo(() => byCategory(filtered), [filtered]);
  const trend = useMemo(() => monthlySeries(base, 6).map(m => ({ ...m, label: monthLabel(m.key, t.locale) })), [base, t.locale]);
  const categoryOptions = useMemo(() => Array.from(new Set([...BUSINESS_CATEGORIES, ...rows.map(r => r.category)])), [rows]);

  async function remove(row: BusinessExpense) {
    if (!confirm(t('exp.deleteConfirm', { title: row.title }))) return;
    try {
      await api.delete(`/cod/expenses/${row.id}`);
      toast.success(t('xp.deleted'));
      onChanged();
    } catch (err) {
      toast.error(expenseError(err, t));
    }
  }

  function exportCsv() {
    const csv = toCsv(
      [t('common.date'), t('common.title'), t('common.category'), t('common.amount'), t('xp.method'), t('xp.vendor'), t('xp.reference'), t('common.notes')],
      filtered.map(r => [r.expense_date, r.title, categoryLabel(t, 'business', r.category), r.amount.toFixed(2), r.payment_method ? t(`pm.${r.payment_method}` as 'pm.cash') : '', r.vendor, r.reference, r.notes]),
    );
    downloadCsv(`business-expenses-${rangeKey}.csv`, csv);
  }

  const change = kpis.change;

  return (
    <div className="space-y-4">
      {/* Quick add */}
      <Card title={t('xp.quickAdd')} bodyClassName="pt-2">
        <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6 lg:grid-cols-11">
          {BUSINESS_CATEGORIES.map(c => {
            const Icon = categoryIcon('business', c);
            const color = categoryColor(c);
            return (
              <button key={c} type="button" onClick={() => onAdd(c)} aria-label={`${t('xp.addBusiness')}: ${categoryLabel(t, 'business', c)}`}
                className="flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 hover:bg-ink-50">
                <span className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: `${color}1f`, color }}><Icon size={18} /></span>
                <span className="text-[11px] font-semibold leading-tight text-ink-600 line-clamp-1">{categoryLabel(t, 'business', c)}</span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Filters */}
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <SearchInput value={q} onChange={setQ} placeholder={t('xp.search')} />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex">
          <NativeSelect aria-label={t('xp.dateRange')} value={rangeKey} onChange={e => setRangeKey(e.target.value as RangeKey)} className="lg:w-40">
            {RANGE_KEYS.map(k => <option key={k} value={k}>{t(`range.${k}`)}</option>)}
          </NativeSelect>
          <NativeSelect aria-label={t('common.category')} value={category} onChange={e => setCategory(e.target.value)} className="lg:w-44">
            <option value="all">{t('common.allCategories')}</option>
            {categoryOptions.map(c => <option key={c} value={c}>{categoryLabel(t, 'business', c)}</option>)}
          </NativeSelect>
          <NativeSelect aria-label={t('xp.method')} value={method} onChange={e => setMethod(e.target.value)} className="col-span-2 sm:col-span-1 lg:w-36">
            <option value="all">{t('xp.allMethods')}</option>
            {PAYMENT_METHODS.map(m => <option key={m} value={m}>{t(`pm.${m}` as const)}</option>)}
          </NativeSelect>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={!filtered.length} className="justify-center" aria-label={t('xp.exportCsv')}>
          <Download /> <span className="lg:hidden xl:inline">{t('xp.exportCsv')}</span>
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <KpiTile label={t('xp.kpiTotal')} value={formatLKR(kpis.total)} />
        <KpiTile label={t('xp.kpiTour')} value={formatLKR(kpis.tour)} icon={<Plane size={14} />} />
        <KpiTile label={t('xp.kpiEntries')} value={String(kpis.entries)} />
        <KpiTile label={t('xp.kpiPerDay')} value={formatLKR(kpis.perDay)} />
        <KpiTile label={t('xp.kpiChange')} className="col-span-2 lg:col-span-1"
          value={change === null ? '—' : `${change > 0 ? '▲' : change < 0 ? '▼' : ''} ${Math.abs(change)}%`}
          tone={change === null || change === 0 ? undefined : change > 0 ? 'up' : 'down'} />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={t('xp.byCategory')}>
          {slices.length === 0 ? <p className="py-10 text-center text-sm text-ink-400">{t('xp.noRows')}</p> : (
            <div className="grid items-center gap-4 sm:grid-cols-[180px_1fr]">
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={slices} dataKey="amount" nameKey="category" innerRadius={48} outerRadius={78} paddingAngle={1}>
                      {slices.map(s => <Cell key={s.category} fill={categoryColor(s.category)} />)}
                    </Pie>
                    <Tooltip formatter={(v: number, _n, p: any) => [formatLKR(v), categoryLabel(t, 'business', p?.payload?.category ?? '')]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-2">
                {slices.map(s => (
                  <li key={s.category} className="text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: categoryColor(s.category) }} aria-hidden />
                        <span className={cn('truncate', s.category === BUSINESS_TOUR && 'font-semibold')}>{categoryLabel(t, 'business', s.category)}</span>
                      </span>
                      <span className="shrink-0 tabular-nums text-ink-700">{formatLKR(s.amount)} · {s.pct}%</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-ink-100"><div className="h-1.5 rounded-full" style={{ width: `${s.pct}%`, background: categoryColor(s.category) }} /></div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
        <Card title={t('xp.trend')} bodyClassName="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="label" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis fontSize={12} tickLine={false} axisLine={false} width={64} tickFormatter={v => formatLKRCompact(v)} />
              <Tooltip formatter={(v: number) => [formatLKR(v), t('xp.kpiTotal')]} />
              <Bar dataKey="total" name={t('xp.kpiTotal')} fill="var(--cod-primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <MascotState variant="empty" size="sm" title={t('exp.emptyTitle')} description={t('xp.noRows')}
          action={<Button onClick={() => onAdd()}>{t('xp.addBusiness')}</Button>} />
      ) : (
        <>
          <div className={cn(tbl.wrap, 'hidden md:block')}>
            <table className={tbl.table}>
              <thead><tr>
                <th className={tbl.th}>{t('common.date')}</th>
                <th className={tbl.th}>{t('common.title')}</th>
                <th className={tbl.th}>{t('common.category')}</th>
                <th className={tbl.th}>{t('xp.method')}</th>
                <th className={tbl.th}>{t('xp.vendor')}</th>
                <th className={`${tbl.th} ${tbl.right}`}>{t('common.amount')}</th>
                <th className={tbl.th}><span className="sr-only">{t('xp.more')}</span></th>
              </tr></thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className="cursor-pointer hover:bg-ink-50" onClick={() => onEdit(r)}>
                    <td className={`${tbl.td} whitespace-nowrap`}>{formatDate(`${r.expense_date}T12:00:00`, t.locale)}</td>
                    <td className={tbl.td}>{r.title}{r.reference && <span className="ml-1 text-xs text-ink-400">#{r.reference}</span>}</td>
                    <td className={tbl.td}><CategoryPill category={r.category} /></td>
                    <td className={tbl.td}>{r.payment_method ? t(`pm.${r.payment_method}` as 'pm.cash') : '—'}</td>
                    <td className={tbl.td}>{r.vendor || '—'}</td>
                    <td className={`${tbl.td} ${tbl.right} tabular-nums font-semibold`}>{formatLKR(r.amount)}</td>
                    <td className={tbl.td} onClick={e => e.stopPropagation()}>
                      <Menu trigger={<MoreVertical />} label={t('xp.more')}>
                        {close => (<>
                          <MenuItem onClick={() => { close(); onEdit(r); }}>{t('exp.edit')}</MenuItem>
                          <MenuItem danger onClick={() => { close(); remove(r); }}>{t('xp.delete')}</MenuItem>
                        </>)}
                      </Menu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="space-y-2 md:hidden">
            {filtered.map(r => (
              <li key={r.id} className="flex items-stretch gap-1 rounded-xl border border-ink-200 bg-white">
                <button type="button" onClick={() => onEdit(r)} className="flex min-w-0 flex-1 items-center gap-3 p-3 text-left">
                  <CategoryDot category={r.category} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink-900">{r.title}</span>
                    <span className="block truncate text-xs text-ink-500">
                      {formatDate(`${r.expense_date}T12:00:00`, t.locale)} · {categoryLabel(t, 'business', r.category)}{r.payment_method ? ` · ${t(`pm.${r.payment_method}` as 'pm.cash')}` : ''}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-bold tabular-nums text-ink-900">{formatLKR(r.amount)}</span>
                </button>
                <div className="flex items-center pr-1">
                  <Menu trigger={<MoreVertical />} label={t('xp.more')}>
                    {close => <MenuItem danger onClick={() => { close(); remove(r); }}>{t('xp.delete')}</MenuItem>}
                  </Menu>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function KpiTile({ label, value, icon, tone, className = '' }: { label: string; value: string; icon?: React.ReactNode; tone?: 'up' | 'down'; className?: string }) {
  return (
    <div className={cn('kh-card p-4', className)}>
      <p className="flex items-center gap-1 text-xs text-ink-500">{icon}{label}</p>
      {/* More spending is "up" (red); less is "down" (green); the arrow carries the meaning too */}
      <p className={cn('mt-1 text-lg font-bold tracking-tight tabular-nums sm:text-xl', tone === 'up' ? 'text-red-600' : tone === 'down' ? 'text-emerald-600' : 'text-ink-900')}>{value}</p>
    </div>
  );
}

function CategoryDot({ category }: { category: string }) {
  const Icon = categoryIcon('business', category);
  const color = categoryColor(category);
  return <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: `${color}1f`, color }} aria-hidden><Icon size={17} /></span>;
}

function CategoryPill({ category }: { category: string }) {
  const t = useT();
  const Icon = categoryIcon('business', category);
  const color = categoryColor(category);
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: `${color}1a`, color }}>
      <Icon size={12} /> {categoryLabel(t, 'business', category)}
    </span>
  );
}
