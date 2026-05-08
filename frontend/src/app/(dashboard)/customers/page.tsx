'use client';
import { useEffect, useState } from 'react';
import { Customer } from '../../../types';
import { Card } from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import Modal from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';
import api from '../../../lib/api';
import toast from 'react-hot-toast';
import { Plus, Search, Star, Phone, Users } from 'lucide-react';
import { useLang } from '../../../hooks/useLang';

export default function CustomersPage() {
  const { t } = useLang();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '' });
  const [saving, setSaving] = useState(false);

  const fetchAll = () => {
    setLoading(true);
    api.get('/customers')
      .then((r) => setCustomers(Array.isArray(r.data) ? r.data : []))
      .catch(() => setCustomers([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/customers', form);
      toast.success('Customer added');
      setForm({ name: '', phone: '' });
      setShowModal(false);
      fetchAll();
    } catch {
      toast.error('Failed to add customer');
    } finally {
      setSaving(false);
    }
  };

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || '').includes(search)
  );

  const totalPoints = customers.reduce((s, c) => s + c.loyalty_points, 0);

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="kh-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#E0F2F1' }}>
            <Users size={18} style={{ color: '#009688' }} />
          </div>
          <div>
            <p className="text-xs text-ink-400 font-medium">{t('customers.total')}</p>
            <p className="text-xl font-bold text-ink-800">{customers.length}</p>
          </div>
        </div>
        <div className="kh-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#FFF8E1' }}>
            <Star size={18} style={{ color: '#FFB703' }} />
          </div>
          <div>
            <p className="text-xs text-ink-400 font-medium">{t('customers.loyaltyPoints')}</p>
            <p className="text-xl font-bold text-ink-800">{totalPoints.toLocaleString()}</p>
          </div>
        </div>
        <div className="kh-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#E0F2F1' }}>
            <Phone size={18} style={{ color: '#009688' }} />
          </div>
          <div>
            <p className="text-xs text-ink-400 font-medium">{t('customers.withPhone')}</p>
            <p className="text-xl font-bold text-ink-800">{customers.filter((c) => c.phone).length}</p>
          </div>
        </div>
      </div>

      {/* Table card */}
      <Card padding={false}>
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-ink-100">
          <div className="relative w-full sm:flex-1 sm:max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input placeholder={t('customers.searchPlaceholder')} value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 border border-ink-200 rounded-lg text-sm bg-white" />
          </div>
          <Button size="sm" icon={<Plus size={15} />} onClick={() => setShowModal(true)}>
            {t('customers.addCustomer')}
          </Button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-ink-400 text-sm">{t('customers.loading')}</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-ink-400 text-sm">
            {search ? t('customers.noMatch') : t('customers.noCustomers')}
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="mob-cards w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-ink-400 uppercase tracking-wide">{t('customers.customer')}</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-ink-400 uppercase tracking-wide">{t('customers.phone')}</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-ink-400 uppercase tracking-wide">{t('customers.loyaltyPoints')}</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-ink-400 uppercase tracking-wide">{t('customers.memberSince')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-ink-50 hover:bg-ink-50 transition-colors last:border-0">
                  <td data-label={t('customers.customer')} className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg,#00796B,#009688)' }}>
                        {c.name[0].toUpperCase()}
                      </div>
                      <span className="font-semibold text-ink-800">{c.name}</span>
                    </div>
                  </td>
                  <td data-label={t('customers.phone')} className="px-5 py-3.5 text-ink-500">{c.phone || <span className="text-ink-300">—</span>}</td>
                  <td data-label={t('customers.loyaltyPoints')} className="px-5 py-3.5 text-center">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
                      style={{ background: '#FFF8E1', color: '#F59E0B' }}>
                      <Star size={11} fill="currentColor" />
                      {c.loyalty_points}
                    </span>
                  </td>
                  <td data-label={t('customers.memberSince')} className="px-5 py-3.5 text-ink-400 text-xs">
                    {new Date(c.created_at).toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </Card>

      {/* Add customer modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={t('customers.addNew')}>
        <form onSubmit={submit} className="space-y-4">
          <Input label={t('customers.fullName')} placeholder="e.g. Sunil Fernando" required
            value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <Input label={t('customers.phoneNumber')} placeholder="e.g. 0771234567"
            value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowModal(false)}>{t('common.cancel')}</Button>
            <Button type="submit" className="flex-1" loading={saving}>{t('customers.saveCustomer')}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
