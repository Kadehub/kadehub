'use client';
import { useEffect, useState } from 'react';
import { Customer } from '../../../types';
import { Card } from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';
import { LKR } from '../../../lib/format';
import api from '../../../lib/api';
import toast from 'react-hot-toast';
import { Plus, Search, Star, Phone, Users, Pencil, ShoppingBag } from 'lucide-react';
import { useLang } from '../../../hooks/useLang';

export default function CustomersPage() {
  const { t } = useLang();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '' });
  const [saving, setSaving] = useState(false);

  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [editForm, setEditForm] = useState({ name: '', phone: '' });
  const [editing, setEditing] = useState(false);

  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

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
    } catch { toast.error('Failed to add customer'); }
    finally { setSaving(false); }
  };

  const openEdit = (c: Customer) => {
    setEditCustomer(c);
    setEditForm({ name: c.name, phone: c.phone || '' });
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCustomer) return;
    setEditing(true);
    try {
      await api.patch(`/customers/${editCustomer.id}`, editForm);
      toast.success('Customer updated');
      setEditCustomer(null);
      fetchAll();
    } catch { toast.error('Failed to update customer'); }
    finally { setEditing(false); }
  };

  const openHistory = async (c: Customer) => {
    setHistoryCustomer(c);
    setHistoryLoading(true);
    try {
      const r = await api.get(`/customers/${c.id}/purchases`);
      setPurchases(Array.isArray(r.data) ? r.data : []);
    } catch { setPurchases([]); }
    finally { setHistoryLoading(false); }
  };

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || '').includes(search)
  );

  const totalPoints = customers.reduce((s, c) => s + c.loyalty_points, 0);

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: t('customers.total'), value: customers.length, icon: Users, color: '#009688', bg: '#E0F2F1' },
          { label: t('customers.loyaltyPoints'), value: totalPoints.toLocaleString(), icon: Star, color: '#FFB703', bg: '#FFF8E1' },
          { label: t('customers.withPhone'), value: customers.filter((c) => c.phone).length, icon: Phone, color: '#009688', bg: '#E0F2F1' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="kh-card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: bg }}>
              <Icon size={18} style={{ color }} />
            </div>
            <div>
              <p className="text-xs text-ink-400 font-medium">{label}</p>
              <p className="text-xl font-bold text-ink-800">{value}</p>
            </div>
          </div>
        ))}
      </div>

      <Card padding={false}>
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-ink-100">
          <div className="relative w-full sm:flex-1 sm:max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input placeholder={t('customers.searchPlaceholder')} aria-label={t('customers.searchPlaceholder')} value={search}
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
                <th className="px-5 py-3"></th>
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
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => openHistory(c)} title="Purchase History"
                        className="p-1.5 rounded-lg text-ink-300 hover:text-teal-600 hover:bg-teal-50 transition-colors">
                        <ShoppingBag size={14} />
                      </button>
                      <button onClick={() => openEdit(c)} title="Edit"
                        className="p-1.5 rounded-lg text-ink-300 hover:text-ink-700 hover:bg-ink-100 transition-colors">
                        <Pencil size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </Card>

      {/* Add modal */}
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

      {/* Edit modal */}
      <Modal open={!!editCustomer} onClose={() => setEditCustomer(null)} title="Edit Customer">
        <form onSubmit={submitEdit} className="space-y-4">
          <Input label="Full Name" required value={editForm.name}
            onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
          <Input label="Phone Number" value={editForm.phone}
            onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setEditCustomer(null)}>{t('common.cancel')}</Button>
            <Button type="submit" className="flex-1" loading={editing}>Save Changes</Button>
          </div>
        </form>
      </Modal>

      {/* Purchase history modal */}
      <Modal open={!!historyCustomer} onClose={() => setHistoryCustomer(null)}
        title={`${historyCustomer?.name} — Purchase History`} width="max-w-2xl">
        {historyLoading ? (
          <div className="py-10 text-center text-ink-400 text-sm">Loading…</div>
        ) : purchases.length === 0 ? (
          <div className="py-10 text-center text-ink-400 text-sm">No purchases yet</div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-500">{purchases.length} purchases</span>
              <span className="font-bold" style={{ color: '#00A884' }}>
                Total: {LKR(purchases.reduce((s, p) => s + +p.total_amount, 0))}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-100">
                    {['#', 'Date', 'Payment', 'Total'].map(h => (
                      <th key={h} className={`px-3 py-2 text-xs font-semibold text-ink-400 uppercase ${h === 'Total' ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {purchases.map(p => (
                    <tr key={p.id} className="border-b border-ink-50 last:border-0">
                      <td className="px-3 py-2 text-ink-400 text-xs">#{p.id}</td>
                      <td className="px-3 py-2 text-ink-600 text-xs">
                        {new Date(p.created_at).toLocaleString('en-LK', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{
                            background: p.payment_method === 'CASH' ? '#E0F2F1' : p.payment_method === 'CARD' ? '#EFF6FF' : '#FFF8E1',
                            color: p.payment_method === 'CASH' ? '#00796B' : p.payment_method === 'CARD' ? '#1D4ED8' : '#F59E0B',
                          }}>
                          {p.payment_method}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-bold" style={{ color: '#FF7A00' }}>{LKR(+p.total_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
