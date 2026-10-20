'use client';
/** Personal side of the Expenses page (admin only): month hero + budget, quick add / repeats, tips, history and charts. */
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Download, Repeat, Search, Target, X } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import Modal from '../ui/Modal';
import { Button, Card, TextInput, cn, tbl } from './ui';
import { ChipRow } from './expense-kit/EntryKit';
import { categoryIcon } from './expense-kit/icons';
import { TipsCard } from './expenses-tips';
import { categoryLabel, expenseError, undoToast } from './expenses-sheet';
import api from '../../lib/api';
import { useT } from '../../lib/cod/i18n/client';
import { formatDate, formatLKR, formatLKRCompact } from '../../lib/cod/format';
import { monthLabel } from '../../lib/cod/dates';
import { addDays, inRange, localToday, periodRange, type Period } from '../../lib/cod/expenses/dates';
import { byCategory, groupByDay, monthlySeries, monthlySummary, sumAmounts } from '../../lib/cod/expenses/stats';
import { buildTips, monthPace } from '../../lib/cod/expenses/tips';
import { lastMethod, oneTapRepeats } from '../../lib/cod/expenses/suggest';
import { newClientRef } from '../../lib/cod/expenses/client-ref';
import { downloadCsv, toCsv } from '../../lib/cod/expenses/csv';
import { PERSONAL_CATEGORIES, PERSONAL_COLORS, categoryColor, type PersonalExpense } from '../../lib/cod/expenses/types';

const PERIODS: Period[] = ['this_month', 'last_month', 'last_3_months', 'this_year', 'all'];
const PAGE = 40;

export default function PersonalExpenses({ rows, budget, onAdd, onEdit, onChanged, onBudgetChanged }: {
  rows: PersonalExpense[];
  budget: number | null;
  onAdd: (category?: string) => void;
  onEdit: (row: PersonalExpense) => void;
  onChanged: () => void;
  onBudgetChanged: (budget: number | null) => void;
}) {
  const t = useT();
  const [period, setPeriod] = useState<Period>('this_month');
  const [catFilter, setCatFilter] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [shown, setShown] = useState(PAGE);
  const [budgetOpen, setBudgetOpen] = useState(false);

  const pace = useMemo(() => monthPace(rows, budget), [rows, budget]);
  const tips = useMemo(() => buildTips(rows, { budget }), [rows, budget]);
  const repeats = useMemo(() => oneTapRepeats(rows), [rows]);
  const range = useMemo(() => periodRange(period), [period]);
  const periodRows = useMemo(() => rows.filter(r => inRange(r.expense_date, range)), [rows, range]);
  const slices = useMemo(() => byCategory(periodRows), [periodRows]);
  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return periodRows.filter(r => (!catFilter || r.category === catFilter)
      && (!needle || `${r.notes ?? ''} ${r.title}`.toLowerCase().includes(needle)));
  }, [periodRows, catFilter, q]);
  const days = useMemo(() => groupByDay(visible.slice(0, shown)), [visible, shown]);
  const chartCats = useMemo(() => PERSONAL_CATEGORIES.filter(c => rows.some(r => r.category === c)), [rows]);
  const chart = useMemo(() => monthlySeries(rows, 6).map(m => ({ label: monthLabel(m.key, t.locale), ...m.byCategory })), [rows, t.locale]);
  const summary = useMemo(() => monthlySummary(rows), [rows]);
  const lastMonthTotal = useMemo(() => sumAmounts(rows.filter(r => inRange(r.expense_date, periodRange('last_month')))), [rows]);

  const today = localToday();
  const yesterday = addDays(today, -1);
  const changePct = pace.lastMonthSameDays > 0 ? Math.round(((pace.spent - pace.lastMonthSameDays) / pace.lastMonthSameDays) * 100) : null;

  async function repeat(category: string, amount: number, allowDuplicate = false) {
    try {
      const { data } = await api.post('/cod/personal-expenses', {
        category, amount, expense_date: localToday(), payment_method: lastMethod(rows), client_ref: newClientRef(), allow_duplicate: allowDuplicate,
      });
      if (data?.duplicate) {
        toast.custom(tt => (
          <div className={cn('flex items-center gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-lg ring-1 ring-amber-300', tt.visible ? 'opacity-100' : 'opacity-0')}>
            <span>{t('xp.repeatLookalike', { category: categoryLabel(t, 'personal', category), amount: formatLKR(amount) })}</span>
            <button type="button" className="font-bold underline underline-offset-4" onClick={() => { toast.dismiss(tt.id); repeat(category, amount, true); }}>
              {t('xp.addAgain')}
            </button>
          </div>
        ), { duration: 6000 });
        return;
      }
      onChanged();
      undoToast(t, t('xp.addedAmount', { category: categoryLabel(t, 'personal', category), amount: formatLKR(amount) }), async () => {
        try { await api.delete(`/cod/personal-expenses/${data.id}`); toast.success(t('xp.undone')); onChanged(); }
        catch (err) { toast.error(expenseError(err, t)); }
      });
    } catch (err) {
      toast.error(expenseError(err, t));
    }
  }

  function exportCsv() {
    const csv = toCsv(
      [t('common.date'), t('common.category'), t('common.amount'), t('xp.method'), t('xp.note')],
      visible.map(r => [r.expense_date, categoryLabel(t, 'personal', r.category), r.amount.toFixed(2), r.payment_method ? t(`pm.${r.payment_method}` as 'pm.cash') : '', r.notes]),
    );
    downloadCsv(`personal-expenses-${period}.csv`, csv);
  }

  const dayLabel = (d: string) => d === today ? t('xp.today') : d === yesterday ? t('xp.yesterday') : formatDate(`${d}T12:00:00`, t.locale);
  const budgetPct = budget ? Math.min(100, Math.round((pace.spent / budget) * 100)) : 0;
  const over = budget ? pace.spent > budget : false;

  return (
    <div className="space-y-4">
      {/* Hero: this month */}
      <section className="kh-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-ink-500">{t('xp.spentThisMonth')}</p>
            <p className="mt-0.5 text-3xl font-extrabold tracking-tight tabular-nums text-ink-900">{formatLKR(pace.spent)}</p>
            {changePct !== null && (
              <p className={cn('mt-0.5 text-xs font-semibold', changePct > 0 ? 'text-red-600' : 'text-emerald-600')}>
                {changePct > 0 ? '▲' : '▼'} {t('xp.vsLastMonth', { pct: Math.abs(changePct) })}
              </p>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => setBudgetOpen(true)}>
            <Target /> {budget ? t('xp.editBudget') : t('xp.setBudget')}
          </Button>
        </div>
        {budget ? (
          <div className="mt-4">
            <div className="h-2.5 rounded-full bg-ink-100" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={budgetPct} aria-label={t('xp.budget')}>
              <div className={cn('h-2.5 rounded-full', over ? 'bg-red-500' : budgetPct > 85 ? 'bg-amber-500' : 'bg-emerald-500')} style={{ width: `${budgetPct}%` }} />
            </div>
            <p className={cn('mt-1.5 text-sm font-semibold', over ? 'text-red-600' : 'text-ink-700')}>
              {over ? t('xp.overBudget', { amount: formatLKR(pace.spent - budget) }) : t('xp.leftOf', { amount: formatLKR(budget - pace.spent), budget: formatLKR(budget) })}
            </p>
          </div>
        ) : null}
        <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Stat label={t('xp.perDay')} value={formatLKRCompact(pace.spent / pace.daysElapsed)} />
          <Stat label={t('xp.monthEnd')} value={formatLKRCompact(pace.projected)} />
          {budget
            ? <Stat label={t('xp.safePerDay')} value={formatLKRCompact(pace.safePerDay ?? 0)} />
            : <Stat label={t('xp.lastMonthTotal')} value={formatLKRCompact(lastMonthTotal)} />}
        </dl>
      </section>

      {/* Quick add + one-tap repeats */}
      <Card title={t('xp.quickAdd')} bodyClassName="pt-2 space-y-3">
        <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-8">
          {PERSONAL_CATEGORIES.map(c => {
            const Icon = categoryIcon('personal', c);
            const color = PERSONAL_COLORS[c];
            return (
              <button key={c} type="button" onClick={() => onAdd(c)} aria-label={`${t('xp.addPersonal')}: ${categoryLabel(t, 'personal', c)}`}
                className="flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 hover:bg-ink-50">
                <span className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: `${color}1f`, color }}><Icon size={18} /></span>
                <span className="text-[11px] font-semibold leading-tight text-ink-600">{categoryLabel(t, 'personal', c)}</span>
              </button>
            );
          })}
        </div>
        {repeats.length > 0 && (
          <div>
            <p className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-ink-500"><Repeat size={13} /> {t('xp.repeats')}</p>
            <div className="flex flex-wrap gap-1.5">
              {repeats.map(rp => {
                const Icon = categoryIcon('personal', rp.category);
                return (
                  <button key={`${rp.category}-${rp.amount}`} type="button" onClick={() => repeat(rp.category, rp.amount)}
                    className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3 text-sm font-semibold text-ink-700 hover:bg-ink-50">
                    <Icon size={14} style={{ color: categoryColor(rp.category) }} />
                    {categoryLabel(t, 'personal', rp.category)} · {formatLKR(rp.amount).replace(/\.00$/, '')}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      <TipsCard tips={tips} />

      {/* Period + search + export */}
      <div className="flex flex-wrap items-center gap-2">
        <ChipRow label={t('xp.period')} value={period} onChange={p => { setPeriod(p); setShown(PAGE); }}
          options={PERIODS.map(p => ({ value: p, label: t(`xp.period.${p}` as 'xp.period.all') }))} className="flex-1" />
        <Button variant="outline" size="icon" aria-label={t('xp.searchToggle')} aria-pressed={searchOpen} onClick={() => setSearchOpen(s => !s)}><Search /></Button>
        <Button variant="outline" size="icon" aria-label={t('xp.exportCsv')} onClick={exportCsv} disabled={!visible.length}><Download /></Button>
      </div>
      {searchOpen && <TextInput autoFocus placeholder={t('xp.searchPersonal')} aria-label={t('xp.searchPersonal')} value={q} onChange={e => setQ(e.target.value)} />}

      {/* Where it went */}
      <Card title={t('xp.whereItWent')} action={catFilter && (
        <button type="button" onClick={() => setCatFilter(null)} className="inline-flex items-center gap-1 text-xs font-semibold text-ink-500 hover:text-ink-900">
          <X size={13} /> {t('xp.clearFilter')}
        </button>
      )}>
        {slices.length === 0 ? <p className="py-6 text-center text-sm text-ink-400">{t('xp.noPersonal')}</p> : (
          <>
            <div className="flex h-3 overflow-hidden rounded-full bg-ink-100" aria-hidden>
              {slices.map(s => <div key={s.category} style={{ width: `${s.pct}%`, background: categoryColor(s.category) }} />)}
            </div>
            <ul className="mt-3 space-y-1">
              {slices.map(s => {
                const Icon = categoryIcon('personal', s.category);
                const color = categoryColor(s.category);
                const on = catFilter === s.category;
                return (
                  <li key={s.category}>
                    <button type="button" aria-pressed={on} onClick={() => { setCatFilter(on ? null : s.category); setShown(PAGE); }}
                      className={cn('flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left', on ? 'bg-ink-100' : 'hover:bg-ink-50')}>
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: `${color}1f`, color }}><Icon size={16} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="flex justify-between gap-2 text-sm">
                          <span className="truncate font-semibold text-ink-800">{categoryLabel(t, 'personal', s.category)}</span>
                          <span className="shrink-0 tabular-nums text-ink-700">{formatLKR(s.amount)}</span>
                        </span>
                        <span className="mt-1 flex items-center gap-2">
                          <span className="h-1.5 flex-1 rounded-full bg-ink-100"><span className="block h-1.5 rounded-full" style={{ width: `${s.pct}%`, background: color }} /></span>
                          <span className="w-24 shrink-0 text-right text-2xs text-ink-400">{s.pct}% · {t.n('xp.entries', s.count)}</span>
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Card>

      {/* Transactions by day */}
      {visible.length === 0 ? null : (
        <section className="space-y-3">
          {days.map(d => (
            <div key={d.date}>
              <div className="flex items-baseline justify-between px-1">
                <h3 className="text-xs font-bold uppercase tracking-wide text-ink-500">{dayLabel(d.date)}</h3>
                <span className="text-xs font-semibold tabular-nums text-ink-500">{formatLKR(d.total)}</span>
              </div>
              <ul className="mt-1 divide-y divide-ink-100 rounded-xl border border-ink-200 bg-white">
                {d.rows.map(r => {
                  const Icon = categoryIcon('personal', r.category);
                  const color = categoryColor(r.category);
                  return (
                    <li key={r.id}>
                      <button type="button" onClick={() => onEdit(r)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-ink-50">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: `${color}1f`, color }}><Icon size={17} /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-ink-900">{categoryLabel(t, 'personal', r.category)}</span>
                          <span className="block truncate text-xs text-ink-500">
                            {r.notes || t.lookup('pcatHint', r.category)}{r.payment_method ? ` · ${t(`pm.${r.payment_method}` as 'pm.cash')}` : ''}
                          </span>
                        </span>
                        <span className="shrink-0 text-sm font-bold tabular-nums text-ink-900">− {formatLKR(r.amount)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          {visible.length > shown && (
            <div className="text-center"><Button variant="outline" onClick={() => setShown(s => s + PAGE)}>{t('xp.showMore')}</Button></div>
          )}
        </section>
      )}

      {/* 6-month chart + monthly summary */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={t('xp.monthlyChart')} bodyClassName="h-72">
          {chartCats.length === 0 ? <p className="py-10 text-center text-sm text-ink-400">{t('xp.noPersonal')}</p> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="label" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} width={64} tickFormatter={v => formatLKRCompact(v)} />
                <Tooltip formatter={(v: number, name: string) => [formatLKR(v), name]} />
                {chartCats.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
                {chartCats.map(c => (
                  <Bar key={c} dataKey={c} name={categoryLabel(t, 'personal', c)} stackId="p" fill={categoryColor(c)} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
        <Card title={t('xp.monthlySummary')}>
          {summary.length === 0 ? <p className="py-6 text-center text-sm text-ink-400">{t('xp.noPersonal')}</p> : (
            <div className={tbl.wrap}>
              <table className={tbl.table}>
                <thead><tr>
                  <th className={tbl.th}>{t('xp.month')}</th>
                  <th className={`${tbl.th} ${tbl.right}`}>{t('xp.kpiEntries')}</th>
                  <th className={tbl.th}>{t('xp.topCategory')}</th>
                  <th className={`${tbl.th} ${tbl.right}`}>{t('common.total')}</th>
                </tr></thead>
                <tbody>
                  {summary.slice(0, 12).map(m => (
                    <tr key={m.key}>
                      <td className={tbl.td}>{monthLabel(m.key, t.locale)} {m.key.slice(0, 4)}</td>
                      <td className={`${tbl.td} ${tbl.right}`}>{m.entries}</td>
                      <td className={tbl.td}>{categoryLabel(t, 'personal', m.top)}</td>
                      <td className={`${tbl.td} ${tbl.right} tabular-nums font-semibold`}>{formatLKR(m.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <BudgetDialog open={budgetOpen} onClose={() => setBudgetOpen(false)} budget={budget} lastMonth={lastMonthTotal}
        onSaved={b => { setBudgetOpen(false); onBudgetChanged(b); }} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-ink-50 px-2 py-2">
      <dt className="text-2xs text-ink-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-bold tabular-nums text-ink-900">{value}</dd>
    </div>
  );
}

const PRESETS = [25000, 50000, 75000, 100000, 150000, 200000];

function BudgetDialog({ open, onClose, budget, lastMonth, onSaved }: {
  open: boolean; onClose: () => void; budget: number | null; lastMonth: number; onSaved: (b: number | null) => void;
}) {
  const t = useT();
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const under = lastMonth > 0 ? Math.round(lastMonth * 0.9 / 100) * 100 : 0;
  useEffect(() => { if (open) setValue(budget ? String(budget) : ''); }, [open, budget]);

  async function save(amount: number | null) {
    if (amount !== null && !(amount > 0)) return;
    setSaving(true);
    try {
      const { data } = await api.put('/cod/personal-settings', { monthly_budget: amount });
      toast.success(amount === null ? t('xp.budgetRemoved') : t('xp.budgetSaved'));
      onSaved(data.monthly_budget ?? null);
    } catch (err) {
      toast.error(expenseError(err, t));
    } finally {
      setSaving(false);
    }
  }

  const typed = Number(value);
  return (
    <Modal open={open} onClose={onClose} title={t('xp.budgetTitle')} width="max-w-md">
      <form onSubmit={e => { e.preventDefault(); save(typed); }} className="space-y-4">
        <p className="text-sm text-ink-500">{t('xp.budgetHint')}</p>
        <ChipRow label={t('xp.budgetTitle')} value={typed > 0 ? typed : budget}
          options={[
            ...PRESETS.map(p => ({ value: p, label: formatLKRCompact(p) })),
            ...(under > 0 ? [{ value: under, label: `${t('xp.budgetUnder')} (${formatLKRCompact(under)})` }] : []),
          ]}
          onChange={v => setValue(String(v))} />
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-ink-600">{t('xp.budgetCustom')}</span>
          <TextInput type="number" inputMode="decimal" min={1} step="100" value={value} placeholder={budget ? String(budget) : '50000'} onChange={e => setValue(e.target.value)} />
        </label>
        <div className="flex gap-2">
          {budget !== null && (
            <Button variant="outline" onClick={() => save(null)} disabled={saving}>{t('xp.remove')}</Button>
          )}
          <Button type="submit" className="flex-1 justify-center" disabled={saving || !(typed > 0)}>{saving ? t('common.saving') : t('xp.save')}</Button>
        </div>
      </form>
    </Modal>
  );
}
