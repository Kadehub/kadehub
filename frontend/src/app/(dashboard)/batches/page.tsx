'use client';
import { useEffect, useState } from 'react';
import { Batch, Product } from '../../../types';
import { Card } from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import Modal from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';
import { LKR } from '../../../lib/format';
import api from '../../../lib/api';
import toast from 'react-hot-toast';
import { Plus, AlertTriangle, Trash2 } from 'lucide-react';
import { useLang } from '../../../hooks/useLang';

type TabType = 'all' | 'expiring' | 'expired';

export default function BatchesPage() {
  const { t } = useLang();
  const [tab, setTab] = useState<TabType>('all');
  const [batches, setBatches] = useState<Batch[]>([]);
  const [expiring, setExpiring] = useState<any[]>([]);
  const [expired, setExpired] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ product_id: '', batch_number: '', quantity: '', cost: '', manufactured_date: '', expiry_date: '' });

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [b, ex, exp, p] = await Promise.all([api.get('/batches'), api.get('/batches/expiring?days=30'), api.get('/batches/expired'), api.get('/inventory/products')]);
      setBatches(Array.isArray(b.data) ? b.data : []);
      setExpiring(Array.isArray(ex.data) ? ex.data : []);
      setExpired(Array.isArray(exp.data) ? exp.data : []);
      setProducts(Array.isArray(p.data) ? p.data : []);
    } catch (err: any) { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post('/batches', { ...form, product_id: +form.product_id, quantity: +form.quantity, cost: +form.cost || 0, manufactured_date: form.manufactured_date || undefined, expiry_date: form.expiry_date || undefined });
      toast.success('Batch added'); setShowModal(false); setForm({ product_id: '', batch_number: '', quantity: '', cost: '', manufactured_date: '', expiry_date: '' }); fetchAll();
    } catch (err: any) { const msg = err.response?.data?.message; toast.error(Array.isArray(msg) ? msg[0] : msg || 'Failed'); }
    finally { setSaving(false); }
  };

  const remove = async (id: number) => {
    if (!confirm('Delete this batch?')) return;
    try { await api.delete(`/batches/${id}`); toast.success('Deleted'); fetchAll(); }
    catch (err: any) { const msg = err.response?.data?.message; toast.error(Array.isArray(msg) ? msg[0] : msg || 'Failed'); }
  };

  const daysUntilExpiry = (date: string) => Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const currentData = tab === 'all' ? batches : tab === 'expiring' ? expiring : expired;

  return (
    <div className="space-y-5 max-w-5xl">
      {(expiring.length > 0 || expired.length > 0) && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50">
          <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            {expired.length > 0 && <p><strong>{expired.length}</strong> {t('batches.expired')}.</p>}
            {expiring.length > 0 && <p><strong>{expiring.length}</strong> {t('batches.expiringSoon')}.</p>}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 p-1 rounded-xl bg-white border border-ink-200">
          {([
            { key: 'all',      label: `${t('batches.all')} (${batches.length})` },
            { key: 'expiring', label: `${t('batches.expiringSoon')} (${expiring.length})` },
            { key: 'expired',  label: `${t('batches.expired')} (${expired.length})` },
          ] as const).map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key)}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{ background: tab === key ? (key === 'expired' ? '#FF6B6B' : '#009688') : 'transparent', color: tab === key ? 'white' : '#64748B' }}>
              {label}
            </button>
          ))}
        </div>
        <Button size="sm" icon={<Plus size={15} />} onClick={() => setShowModal(true)}>{t('batches.addBatch')}</Button>
      </div>

      <Card padding={false}>
        {loading ? <div className="py-16 text-center text-ink-400 text-sm">{t('common.loading')}</div> :
          currentData.length === 0 ? <div className="py-16 text-center text-ink-400 text-sm">{t('batches.noBatches')}</div> : (
            <div className="overflow-x-auto">
            <table className="mob-cards w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100">
                  {[t('batches.product'), t('batches.batchNo'), t('batches.qty'), t('batches.cost'), t('batches.mfgDate'), t('batches.expiryDate'), t('batches.status'), ''].map(h => (
                    <th key={h} className="px-5 py-3 text-xs font-semibold text-ink-400 uppercase tracking-wide text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentData.map((b: any) => {
                  const days = b.b_expiry_date || b.expiry_date ? daysUntilExpiry(b.b_expiry_date || b.expiry_date) : null;
                  const expStatus = days === null ? null : days < 0 ? 'coral' : days <= 7 ? 'coral' : days <= 30 ? 'amber' : 'teal';
                  const expLabel = days === null ? '' : days < 0 ? `${t('batches.expiredDays')} ${Math.abs(days)}d ${t('batches.expiredDaysAgo')}` : days === 0 ? t('batches.expiresToday') : `${days} ${t('batches.daysLeft')}`;
                  return (
                    <tr key={b.b_id || b.id} className="border-b border-ink-50 hover:bg-ink-50 last:border-0">
                      <td data-label={t('batches.product')} className="px-5 py-3.5 font-semibold text-ink-800">{b.p_name || b.product?.name}</td>
                      <td data-label={t('batches.batchNo')} className="px-5 py-3.5"><code className="text-xs bg-ink-100 px-2 py-0.5 rounded">{b.b_batch_number || b.batch_number}</code></td>
                      <td data-label={t('batches.qty')} className="px-5 py-3.5 font-bold text-ink-700">{b.b_quantity || b.quantity}</td>
                      <td data-label={t('batches.cost')} className="px-5 py-3.5 text-ink-500">{b.b_cost || b.cost ? LKR(+(b.b_cost || b.cost)) : '—'}</td>
                      <td data-label={t('batches.mfgDate')} className="px-5 py-3.5 text-ink-400 text-xs">{b.b_manufactured_date || b.manufactured_date || '—'}</td>
                      <td data-label={t('batches.expiryDate')} className="px-5 py-3.5 text-ink-700 text-xs font-medium">{b.b_expiry_date || b.expiry_date || '—'}</td>
                      <td data-label={t('batches.status')} className="px-5 py-3.5">{expStatus && <Badge variant={expStatus as any} dot>{expLabel}</Badge>}</td>
                      <td className="px-5 py-3.5">
                        <button onClick={() => remove(b.b_id || b.id)} className="text-ink-300 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          )}
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={t('batches.addBatch')}>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink-600 mb-1">{t('batches.product')}</label>
            <select required value={form.product_id} onChange={e => setForm(f => ({ ...f, product_id: e.target.value }))} className="w-full border border-ink-200 rounded-lg px-3 py-2 text-sm">
              <option value="">{t('batches.selectProduct')}</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <Input label={t('batches.batchNumber')} required value={form.batch_number} onChange={e => setForm(f => ({ ...f, batch_number: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label={t('batches.quantity')} type="number" required min="1" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
            <Input label={t('batches.costPerUnit')} type="number" min="0" step="0.01" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label={t('batches.manufacturedDate')} type="date" value={form.manufactured_date} onChange={e => setForm(f => ({ ...f, manufactured_date: e.target.value }))} />
            <Input label={t('batches.expiryDate')} type="date" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowModal(false)}>{t('common.cancel')}</Button>
            <Button type="submit" className="flex-1" loading={saving}>{t('batches.saveBatch')}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
