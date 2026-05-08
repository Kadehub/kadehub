'use client';
import { useEffect, useState } from 'react';
import { CreditSale } from '../../../types';
import { Card } from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import Modal from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';
import { LKR } from '../../../lib/format';
import api from '../../../lib/api';
import toast from 'react-hot-toast';
import { CreditCard, DollarSign } from 'lucide-react';
import { useLang } from '../../../hooks/useLang';

export default function CreditPage() {
  const { t } = useLang();
  const [credits, setCredits] = useState<CreditSale[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [payModal, setPayModal] = useState<CreditSale | null>(null);
  const [payForm, setPayForm] = useState({ amount: '', payment_method: 'CASH' });
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<'all' | 'outstanding' | 'partial' | 'paid'>('outstanding');

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [c, s] = await Promise.all([api.get('/credit'), api.get('/credit/summary')]);
      setCredits(Array.isArray(c.data) ? c.data : []);
      setSummary(s.data);
    } catch { setCredits([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const recordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payModal) return;
    setSaving(true);
    try {
      await api.post(`/credit/${payModal.id}/pay`, { amount: +payForm.amount, payment_method: payForm.payment_method });
      toast.success('Payment recorded');
      setPayModal(null);
      setPayForm({ amount: '', payment_method: 'CASH' });
      fetchAll();
    } catch { toast.error('Failed to record payment'); }
    finally { setSaving(false); }
  };

  const statusVariant = (s: string) => s === 'paid' ? 'teal' : s === 'partial' ? 'amber' : 'coral';
  const filtered = filter === 'all' ? credits : credits.filter(c => c.status === filter);

  return (
    <div className="space-y-5 max-w-5xl">
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: t('credit.totalDue'),    value: LKR(+summary.total_due || 0),         color: '#FF6B6B' },
            { label: t('credit.totalPaid'),   value: LKR(+summary.total_paid || 0),        color: '#009688' },
            { label: t('credit.outstanding'), value: LKR(+summary.total_outstanding || 0), color: '#F59E0B' },
            { label: t('credit.openCredits'), value: (+summary.outstanding_count || 0) + (+summary.partial_count || 0), color: '#6366F1' },
          ].map(({ label, value, color }) => (
            <div key={label} className="kh-card p-4">
              <p className="text-xs text-ink-400 font-medium">{label}</p>
              <p className="text-xl font-bold" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>
      )}

      <Card padding={false}>
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-ink-100">
          <CreditCard size={16} className="text-ink-400" />
          <div className="flex gap-1 ml-2">
            {(['outstanding', 'partial', 'paid', 'all'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className="px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all"
                style={{ background: filter === f ? '#009688' : '#F1F5F9', color: filter === f ? 'white' : '#475569' }}>
                {f}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <div className="py-16 text-center text-ink-400 text-sm">{t('common.loading')}</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-ink-400 text-sm">{t('credit.noCredits')}</div>
        ) : (
          <div className="overflow-x-auto">
          <table className="mob-cards w-full text-sm min-w-[600px] sm:min-w-0">
            <thead>
              <tr className="border-b border-ink-100">
                {[t('credit.customer'), t('credit.amountDue'), t('credit.paid'), t('credit.balance'), t('credit.dueDate'), t('credit.status'), ''].map(h => (
                  <th key={h} className="px-5 py-3 text-xs font-semibold text-ink-400 uppercase tracking-wide text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="border-b border-ink-50 hover:bg-ink-50 last:border-0">
                  <td data-label={t('credit.customer')} className="px-5 py-3.5 font-semibold text-ink-800">{c.customer?.name || `#${c.customer_id}`}</td>
                  <td data-label={t('credit.amountDue')} className="px-5 py-3.5 font-bold" style={{ color: '#FF6B6B' }}>{LKR(c.amount_due)}</td>
                  <td data-label={t('credit.paid')} className="px-5 py-3.5 text-ink-500">{LKR(c.amount_paid)}</td>
                  <td data-label={t('credit.balance')} className="px-5 py-3.5 font-bold" style={{ color: '#F59E0B' }}>{LKR(c.amount_due - c.amount_paid)}</td>
                  <td data-label={t('credit.dueDate')} className="px-5 py-3.5 text-ink-400 text-xs">{c.due_date || '—'}</td>
                  <td data-label={t('credit.status')} className="px-5 py-3.5"><Badge variant={statusVariant(c.status) as any} dot>{c.status}</Badge></td>
                  <td className="px-5 py-3.5">
                    {c.status !== 'paid' && (
                      <Button size="xs" icon={<DollarSign size={12} />} onClick={() => { setPayModal(c); setPayForm({ amount: String(c.amount_due - c.amount_paid), payment_method: 'CASH' }); }}>
                        {t('credit.pay')}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </Card>

      <Modal open={!!payModal} onClose={() => setPayModal(null)} title={t('credit.recordPayment')}>
        {payModal && (
          <form onSubmit={recordPayment} className="space-y-4">
            <div className="p-3 rounded-xl bg-ink-50 text-sm">
              <p className="font-semibold text-ink-800">{payModal.customer?.name}</p>
              <p className="text-ink-500">{t('credit.balance')}: <strong style={{ color: '#F59E0B' }}>{LKR(payModal.amount_due - payModal.amount_paid)}</strong></p>
            </div>
            <Input label={t('credit.paymentAmount')} type="number" required min="0.01" step="0.01"
              max={payModal ? payModal.amount_due - payModal.amount_paid : undefined}
              value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} />
            <div>
              <label className="block text-xs font-semibold text-ink-600 mb-1">{t('credit.paymentMethod')}</label>
              <select value={payForm.payment_method} onChange={e => setPayForm(f => ({ ...f, payment_method: e.target.value }))}
                className="w-full border border-ink-200 rounded-lg px-3 py-2 text-sm">
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="LANKAQR">LankaQR</option>
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setPayModal(null)}>{t('common.cancel')}</Button>
              <Button type="submit" className="flex-1" loading={saving}>{t('credit.recordPayment')}</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
