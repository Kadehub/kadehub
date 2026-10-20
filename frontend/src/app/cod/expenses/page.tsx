'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { MascotState } from '../../../components/brand/Mascot';
import { useCod } from '../../../components/cod/CodContext';
import { Button, Card, Dialog, Field, NativeSelect, PageHeader, TextArea, TextInput, tbl } from '../../../components/cod/ui';
import api from '../../../lib/api';
import { useT } from '../../../lib/cod/i18n/client';
import { expenseCategoriesFor, expenseCategoryLabel } from '../../../lib/cod/business-types';
import { resolveRange, type RangeKey } from '../../../lib/cod/dates';
import { formatDate, formatLKR } from '../../../lib/cod/format';
import { apiError } from '../../../lib/cod/session';
import type { Expense } from '../../../lib/cod/types';

const RANGE_KEYS: RangeKey[] = ['today', 'yesterday', 'this_month', 'last_month', 'last_3_months', 'this_year', 'all'];
const CHART_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#0ea5e9', '#84cc16', '#64748b'];
const today = () => new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);

// cod.kadehub.com/expenses — expenses with range/category filters and a by-category chart
export default function CodExpensesPage() {
  const t = useT();
  const { me } = useCod();
  const [expenses, setExpenses] = useState<Expense[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [rangeKey, setRangeKey] = useState<RangeKey>('this_month');
  const [category, setCategory] = useState('all');
  const categoryOptions = expenseCategoriesFor(me.business.business_type, me.business.imports_goods);

  const load = () => {
    setFailed(false);
    api.get<Expense[]>('/cod/expenses').then(r => setExpenses(r.data)).catch(() => setFailed(true));
  };
  useEffect(load, []);

  const categories = useMemo(() => Array.from(new Set((expenses ?? []).map(e => e.category))).sort(), [expenses]);
  const filtered = useMemo(() => {
    const range = resolveRange(rangeKey);
    return (expenses ?? []).filter(e => {
      // expense_date is a Sri Lanka calendar day
      const d = new Date(`${e.expense_date}T00:00:00+05:30`);
      return (rangeKey === 'all' || (d >= range.from && d <= range.to)) && (category === 'all' || e.category === category);
    });
  }, [expenses, rangeKey, category]);
  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of filtered) map.set(e.category, (map.get(e.category) ?? 0) + Number(e.amount));
    return Array.from(map, ([c, amount]) => ({ category: c, name: expenseCategoryLabel(t, c), amount })).sort((a, b) => b.amount - a.amount);
  }, [filtered, t]);

  if (failed) {
    return <MascotState variant="error" title={t('app.loadErrorTitle')} description={t('app.loadErrorBody')}
      action={<Button onClick={load}>{t('common.retry')}</Button>} />;
  }
  if (!expenses) return <MascotState variant="loading" size="sm" title={t('app.loading')} />;

  const total = filtered.reduce((s, e) => s + Number(e.amount), 0);

  async function onDelete(id: number, title: string) {
    if (!confirm(t('exp.deleteConfirm', { title }))) return;
    try {
      await api.delete(`/cod/expenses/${id}`);
      toast.success(t('exp.deleted'));
      setExpenses(list => (list ?? []).filter(e => e.id !== id));
    } catch (err) {
      toast.error(apiError(err, t));
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title={t('nav.expenses')} actions={<ExpenseForm categories={categoryOptions} onSaved={load} />} />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <NativeSelect value={rangeKey} onChange={e => setRangeKey(e.target.value as RangeKey)} className="sm:w-48">
          {RANGE_KEYS.map(k => <option key={k} value={k}>{t(`range.${k}`)}</option>)}
        </NativeSelect>
        <NativeSelect value={category} onChange={e => setCategory(e.target.value)} className="sm:w-48">
          <option value="all">{t('common.allCategories')}</option>
          {categories.map(c => <option key={c} value={c}>{expenseCategoryLabel(t, c)}</option>)}
        </NativeSelect>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title={t('common.total')}>
          <p className="text-3xl font-bold tracking-tight text-ink-900">{formatLKR(total)}</p>
          <p className="mt-1 text-sm text-ink-500">{t.n('exp.count', filtered.length)}</p>
        </Card>
        <Card title={t('exp.byCategory')} className="lg:col-span-2" bodyClassName="h-56">
          {byCategory.length === 0 ? (
            <p className="flex h-full items-center justify-center text-sm text-ink-400">{t('exp.empty')}</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byCategory} dataKey="amount" nameKey="name" outerRadius={80}>
                  {byCategory.map((c, i) => <Cell key={c.category} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatLKR(v)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {filtered.length === 0 ? (
        <MascotState variant="empty" size="sm" title={t('exp.emptyTitle')} description={t('exp.empty')}
          action={<ExpenseForm categories={categoryOptions} onSaved={load} />} />
      ) : (
        <div className={tbl.wrap}>
          <table className={tbl.table}>
            <thead><tr>
              <th className={tbl.th}>{t('common.date')}</th>
              <th className={tbl.th}>{t('common.title')}</th>
              <th className={tbl.th}>{t('common.category')}</th>
              <th className={`${tbl.th} ${tbl.right}`}>{t('common.amount')}</th>
              <th className={tbl.th} />
            </tr></thead>
            <tbody>
              {filtered.slice().sort((a, b) => (a.expense_date < b.expense_date ? 1 : -1)).map(e => (
                <tr key={e.id}>
                  <td className={`${tbl.td} whitespace-nowrap`}>{formatDate(`${e.expense_date}T00:00:00+05:30`, t.locale)}</td>
                  <td className={tbl.td}>{e.title}</td>
                  <td className={tbl.td}>{expenseCategoryLabel(t, e.category)}</td>
                  <td className={`${tbl.td} ${tbl.right}`}>{formatLKR(e.amount)}</td>
                  <td className={tbl.td}>
                    <div className="flex justify-end gap-1">
                      <ExpenseForm expense={e} categories={categoryOptions} onSaved={load} />
                      <Button variant="ghost" size="icon" aria-label={t('exp.deleteAria')} onClick={() => onDelete(e.id, e.title)}><Trash2 /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ExpenseForm({ expense, categories, onSaved }: { expense?: Expense; categories: string[]; onSaved: () => void }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [form, setForm] = useState({
    title: expense?.title ?? '', category: expense?.category ?? 'Misc', amount: expense ? String(expense.amount) : '',
    expense_date: expense?.expense_date ?? today(), notes: expense?.notes ?? '',
  });
  // An old expense may use a category the business no longer offers — keep it selectable
  const options = expense && !categories.includes(expense.category) ? [expense.category, ...categories] : categories;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!form.title.trim() || !(amount > 0)) { setError(t('err.expense')); return; }
    setPending(true);
    setError(undefined);
    try {
      const body = { ...form, amount, notes: form.notes || null };
      if (expense) await api.patch(`/cod/expenses/${expense.id}`, body);
      else await api.post('/cod/expenses', body);
      toast.success(expense ? t('exp.updated') : t('exp.added'));
      setOpen(false);
      if (!expense) setForm(f => ({ ...f, title: '', amount: '', notes: '' }));
      onSaved();
    } catch (err) {
      setError(apiError(err, t));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      {expense
        ? <Button variant="ghost" size="icon" aria-label={t('exp.editAria')} onClick={() => setOpen(true)}><Pencil /></Button>
        : <Button onClick={() => setOpen(true)}><Plus /> {t('exp.add')}</Button>}
      <Dialog open={open} onClose={() => setOpen(false)} title={expense ? t('exp.edit') : t('exp.add')} width="max-w-md">
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label={t('common.title')} htmlFor="exp-title">
            <TextInput id="exp-title" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('common.category')} htmlFor="exp-category">
              <NativeSelect id="exp-category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {options.map(c => <option key={c} value={c}>{expenseCategoryLabel(t, c)}</option>)}
              </NativeSelect>
            </Field>
            <Field label={t('exp.amountLkr')} htmlFor="exp-amount">
              <TextInput id="exp-amount" type="number" step="0.01" min={0} required value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
            </Field>
          </div>
          <Field label={t('common.date')} htmlFor="exp-date">
            <TextInput id="exp-date" type="date" value={form.expense_date} onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))} />
          </Field>
          <Field label={t('common.notes')} htmlFor="exp-notes">
            <TextArea id="exp-notes" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </Field>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>{pending ? t('common.saving') : expense ? t('common.saveChanges') : t('exp.add')}</Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
