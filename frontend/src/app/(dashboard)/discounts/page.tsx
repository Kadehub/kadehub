'use client';
import { useEffect, useState } from 'react';
import { Discount } from '../../../types';
import { Card } from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import Modal from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';
import { LKR } from '../../../lib/format';
import api from '../../../lib/api';
import toast from 'react-hot-toast';
import { Plus, Tag, Trash2, ToggleLeft, ToggleRight, Pencil } from 'lucide-react';
import { useLang } from '../../../hooks/useLang';

const today = () => new Date().toISOString().split('T')[0];
const EMPTY = { name: '', type: 'percentage', value: '', min_purchase: '0', valid_from: '', valid_to: '' };

export default function DiscountsPage() {
  const { t } = useLang();
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editDiscount, setEditDiscount] = useState<Discount | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const fetchAll = () => {
    setLoading(true);
    api.get('/discounts').then(r => setDiscounts(Array.isArray(r.data) ? r.data : [])).catch(() => setDiscounts([])).finally(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, []);

  const openEdit = (d: Discount) => {
    setEditDiscount(d);
    setForm({ name: d.name, type: d.type, value: String(d.value), min_purchase: String(d.min_purchase), valid_from: d.valid_from || '', valid_to: d.valid_to || '' });
  };

  const closeModal = () => { setShowModal(false); setEditDiscount(null); setForm(EMPTY); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form, value: +form.value, min_purchase: +form.min_purchase, valid_from: form.valid_from || undefined, valid_to: form.valid_to || undefined };
    try {
      if (editDiscount) { await api.patch(`/discounts/${editDiscount.id}`, payload); toast.success('Updated'); }
      else { await api.post('/discounts', payload); toast.success('Created'); }
      closeModal(); fetchAll();
    } catch (err: any) {
      const msg = err.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'Failed');
    } finally { setSaving(false); }
  };

  const toggle = async (d: Discount) => {
    try { await api.patch(`/discounts/${d.id}`, { is_active: !d.is_active }); fetchAll(); }
    catch { toast.error('Failed'); }
  };

  const remove = async (id: number) => {
    if (!confirm('Delete this discount?')) return;
    try { await api.delete(`/discounts/${id}`); toast.success('Deleted'); fetchAll(); }
    catch (err: any) { const msg = err.response?.data?.message; toast.error(Array.isArray(msg) ? msg[0] : msg || 'Failed'); }
  };

  const isValid = (d: Discount) => {
    const t2 = today();
    if (d.valid_from && d.valid_from > t2) return false;
    if (d.valid_to && d.valid_to < t2) return false;
    return d.is_active;
  };

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex justify-end">
        <Button size="sm" icon={<Plus size={15} />} onClick={() => { setForm(EMPTY); setShowModal(true); }}>{t('discounts.newDiscount')}</Button>
      </div>

      <Card padding={false}>
        <div className="flex items-center gap-2 px-5 py-4 border-b border-ink-100">
          <Tag size={16} className="text-ink-400" />
          <span className="text-sm font-semibold text-ink-700">{discounts.length} {t('discounts.promotions')}</span>
        </div>
        {loading ? (
          <div className="py-16 text-center text-ink-400 text-sm">{t('common.loading')}</div>
        ) : discounts.length === 0 ? (
          <div className="py-16 text-center text-ink-400 text-sm">{t('discounts.noDiscounts')}</div>
        ) : (
          <div className="overflow-x-auto">
          <table className="mob-cards w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100">
                {[t('discounts.name'), t('discounts.type'), t('discounts.value'), t('discounts.minPurchase'), t('discounts.validPeriod'), t('discounts.status'), ''].map(h => (
                  <th key={h} className="px-5 py-3 text-xs font-semibold text-ink-400 uppercase tracking-wide text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {discounts.map(d => (
                <tr key={d.id} className="border-b border-ink-50 hover:bg-ink-50 last:border-0">
                  <td data-label={t('discounts.name')} className="px-5 py-3.5 font-semibold text-ink-800">{d.name}</td>
                  <td data-label={t('discounts.type')} className="px-5 py-3.5"><Badge variant={d.type === 'percentage' ? 'teal' : 'amber'}>{d.type}</Badge></td>
                  <td data-label={t('discounts.value')} className="px-5 py-3.5 font-bold" style={{ color: '#009688' }}>{d.type === 'percentage' ? `${d.value}%` : LKR(d.value)}</td>
                  <td data-label={t('discounts.minPurchase')} className="px-5 py-3.5 text-ink-500">{d.min_purchase > 0 ? LKR(d.min_purchase) : '—'}</td>
                  <td data-label={t('discounts.validPeriod')} className="px-5 py-3.5 text-ink-400 text-xs">{d.valid_from || d.valid_to ? `${d.valid_from || '∞'} → ${d.valid_to || '∞'}` : t('discounts.always')}</td>
                  <td data-label={t('discounts.status')} className="px-5 py-3.5"><Badge variant={isValid(d) ? 'teal' : 'gray'} dot>{isValid(d) ? t('discounts.active') : t('discounts.inactive')}</Badge></td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(d)} className="text-ink-400 hover:text-ink-700 transition-colors"><Pencil size={14} /></button>
                      <button onClick={() => toggle(d)} className="text-ink-400 hover:text-ink-700 transition-colors">
                        {d.is_active ? <ToggleRight size={18} style={{ color: '#009688' }} /> : <ToggleLeft size={18} />}
                      </button>
                      <button onClick={() => remove(d.id)} className="text-ink-300 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </Card>

      <Modal open={showModal || !!editDiscount} onClose={closeModal} title={editDiscount ? t('discounts.editDiscount') : t('discounts.newPromotion')}>
        <form onSubmit={submit} className="space-y-4">
          <Input label={t('discounts.name')} placeholder="e.g. Weekend 10% Off" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <div>
            <label className="block text-xs font-semibold text-ink-600 mb-1">{t('discounts.type')}</label>
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="w-full border border-ink-200 rounded-lg px-3 py-2 text-sm">
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed Amount (LKR)</option>
            </select>
          </div>
          <Input label={form.type === 'percentage' ? t('discounts.discountPct') : t('discounts.discountAmt')} type="number" required min="0" step="0.01" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} />
          <Input label={t('discounts.minPurchaseLkr')} type="number" min="0" step="0.01" value={form.min_purchase} onChange={e => setForm(f => ({ ...f, min_purchase: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label={t('discounts.validFrom')} type="date" value={form.valid_from} onChange={e => setForm(f => ({ ...f, valid_from: e.target.value }))} />
            <Input label={t('discounts.validTo')} type="date" value={form.valid_to} onChange={e => setForm(f => ({ ...f, valid_to: e.target.value }))} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={closeModal}>{t('common.cancel')}</Button>
            <Button type="submit" className="flex-1" loading={saving}>{editDiscount ? t('common.save') : t('discounts.create')}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
