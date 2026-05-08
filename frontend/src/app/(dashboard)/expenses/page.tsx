'use client';
import { useEffect, useState } from 'react';
import { Expense } from '../../../types';
import { Card } from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';
import { LKR } from '../../../lib/format';
import api from '../../../lib/api';
import toast from 'react-hot-toast';
import { Plus, Trash2, Receipt } from 'lucide-react';
import { useLang } from '../../../hooks/useLang';

const CATEGORIES = ['Rent', 'Utilities', 'Salaries', 'Transport', 'Maintenance', 'Marketing', 'Other'];
const today = () => new Date().toISOString().split('T')[0];

export default function ExpensesPage() {
  const { t } = useLang();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<{ category: string; total: string; count: string }[]>([]);
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ category: 'Rent', description: '', amount: '', expense_date: today() });

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [e, s] = await Promise.all([
        api.get(`/expenses?from=${from}&to=${to}`),
        api.get(`/expenses/summary?from=${from}&to=${to}`),
      ]);
      setExpenses(Array.isArray(e.data) ? e.data : []);
      setSummary(Array.isArray(s.data) ? s.data : []);
    } catch { setExpenses([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, [from, to]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/expenses', { ...form, amount: +form.amount });
      toast.success('Expense recorded');
      setShowModal(false);
      setForm({ category: 'Rent', description: '', amount: '', expense_date: today() });
      fetchAll();
    } catch { toast.error('Failed to save expense'); }
    finally { setSaving(false); }
  };

  const remove = async (id: number) => {
    if (!confirm('Delete this expense?')) return;
    try {
      await api.delete(`/expenses/${id}`);
      toast.success('Deleted');
      fetchAll();
    } catch (err: any) {
      const msg = err.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'Failed');
    }
  };

  const totalAmount = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-xs text-ink-500 font-medium">{t('expenses.from')}</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="border border-ink-200 rounded-lg px-3 py-1.5 text-sm" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-ink-500 font-medium">{t('expenses.to')}</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="border border-ink-200 rounded-lg px-3 py-1.5 text-sm" />
        </div>
        <Button size="sm" icon={<Plus size={15} />} onClick={() => setShowModal(true)} className="ml-auto">
          {t('expenses.addExpense')}
        </Button>
      </div>

      {summary.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {summary.slice(0, 4).map(s => (
            <div key={s.category} className="kh-card p-4">
              <p className="text-xs text-ink-400 font-medium">{s.category}</p>
              <p className="text-lg font-bold text-ink-800">{LKR(+s.total)}</p>
              <p className="text-2xs text-ink-400">{s.count} {t('expenses.entries')}</p>
            </div>
          ))}
        </div>
      )}

      <Card padding={false}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink-100">
          <div className="flex items-center gap-2">
            <Receipt size={16} className="text-ink-400" />
            <span className="text-sm font-semibold text-ink-700">
              {expenses.length} {t('expenses.entries')} — {t('expenses.total')}: <span style={{ color: '#FF6B6B' }}>{LKR(totalAmount)}</span>
            </span>
          </div>
        </div>
        {loading ? (
          <div className="py-16 text-center text-ink-400 text-sm">{t('common.loading')}</div>
        ) : expenses.length === 0 ? (
          <div className="py-16 text-center text-ink-400 text-sm">{t('expenses.noExpenses')}</div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="border-b border-ink-100">
                {[t('expenses.date'), t('expenses.category'), t('expenses.description'), t('expenses.amount'), ''].map(h => (
                  <th key={h} className={`px-5 py-3 text-xs font-semibold text-ink-400 uppercase tracking-wide ${h === t('expenses.amount') ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {expenses.map(e => (
                <tr key={e.id} className="border-b border-ink-50 hover:bg-ink-50 last:border-0">
                  <td className="px-5 py-3.5 text-ink-500 text-xs">{e.expense_date}</td>
                  <td className="px-5 py-3.5"><span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-ink-100 text-ink-600">{e.category}</span></td>
                  <td className="px-5 py-3.5 text-ink-700">{e.description}</td>
                  <td className="px-5 py-3.5 text-right font-bold" style={{ color: '#FF6B6B' }}>{LKR(e.amount)}</td>
                  <td className="px-5 py-3.5 text-right">
                    <button onClick={() => remove(e.id)} className="text-ink-300 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={t('expenses.addExpense')}>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink-600 mb-1">{t('expenses.category')}</label>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="w-full border border-ink-200 rounded-lg px-3 py-2 text-sm">
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <Input label={t('expenses.description')} required value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <Input label={t('expenses.amountLkr')} type="number" required min="0" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
          <Input label={t('expenses.date')} type="date" required value={form.expense_date} onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowModal(false)}>{t('common.cancel')}</Button>
            <Button type="submit" className="flex-1" loading={saving}>{t('expenses.save')}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
