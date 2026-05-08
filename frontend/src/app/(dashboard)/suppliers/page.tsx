'use client';
import { useEffect, useState } from 'react';
import { Supplier, PurchaseOrder, Product } from '../../../types';
import { Card } from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import Modal from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';
import { LKR } from '../../../lib/format';
import api from '../../../lib/api';
import toast from 'react-hot-toast';
import { Plus, Truck, ShoppingBag, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { useLang } from '../../../hooks/useLang';

export default function SuppliersPage() {
  const { t } = useLang();
  const [tab, setTab] = useState<'suppliers' | 'orders'>('suppliers');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [supplierForm, setSupplierForm] = useState({ name: '', contact_person: '', phone: '', email: '', address: '' });
  const [orderForm, setOrderForm] = useState({ supplier_id: '', notes: '', items: [{ product_id: '', quantity: '1', cost: '' }] });

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [s, o, p] = await Promise.all([api.get('/suppliers'), api.get('/suppliers/orders'), api.get('/inventory/products')]);
      setSuppliers(Array.isArray(s.data) ? s.data : []);
      setOrders(Array.isArray(o.data) ? o.data : []);
      setProducts(Array.isArray(p.data) ? p.data : []);
    } catch (err: any) { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const saveSupplier = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try { await api.post('/suppliers', supplierForm); toast.success('Supplier added'); setShowSupplierModal(false); setSupplierForm({ name: '', contact_person: '', phone: '', email: '', address: '' }); fetchAll(); }
    catch (err: any) { const msg = err.response?.data?.message; toast.error(Array.isArray(msg) ? msg[0] : msg || 'Failed'); }
    finally { setSaving(false); }
  };

  const saveOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const items = orderForm.items.filter(i => i.product_id && i.quantity && i.cost).map(i => ({ product_id: +i.product_id, quantity: +i.quantity, cost: +i.cost }));
    if (items.length === 0) return toast.error('Add at least one item');
    setSaving(true);
    try { await api.post('/suppliers/orders', { supplier_id: +orderForm.supplier_id, notes: orderForm.notes, items }); toast.success('Order created'); setShowOrderModal(false); setOrderForm({ supplier_id: '', notes: '', items: [{ product_id: '', quantity: '1', cost: '' }] }); fetchAll(); }
    catch (err: any) { const msg = err.response?.data?.message; toast.error(Array.isArray(msg) ? msg[0] : msg || 'Failed'); }
    finally { setSaving(false); }
  };

  const receiveOrder = async (id: number) => {
    if (!confirm('Mark as received? This will update stock.')) return;
    try { await api.patch(`/suppliers/orders/${id}/receive`); toast.success('Stock updated'); fetchAll(); }
    catch (err: any) { const msg = err.response?.data?.message; toast.error(Array.isArray(msg) ? msg[0] : msg || 'Failed'); }
  };

  const cancelOrder = async (id: number) => {
    if (!confirm('Cancel this order?')) return;
    try { await api.patch(`/suppliers/orders/${id}/cancel`); toast.success('Cancelled'); fetchAll(); }
    catch (err: any) { const msg = err.response?.data?.message; toast.error(Array.isArray(msg) ? msg[0] : msg || 'Failed'); }
  };

  const addOrderItem = () => setOrderForm(f => ({ ...f, items: [...f.items, { product_id: '', quantity: '1', cost: '' }] }));
  const removeOrderItem = (i: number) => setOrderForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  const updateOrderItem = (i: number, field: string, val: string) => setOrderForm(f => ({ ...f, items: f.items.map((item, idx) => idx === i ? { ...item, [field]: val } : item) }));
  const statusVariant = (s: string) => s === 'received' ? 'teal' : s === 'cancelled' ? 'coral' : 'amber';

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 p-1 rounded-xl bg-white border border-ink-200">
          {(['suppliers', 'orders'] as const).map(tabKey => (
            <button key={tabKey} onClick={() => setTab(tabKey)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all"
              style={{ background: tab === tabKey ? '#009688' : 'transparent', color: tab === tabKey ? 'white' : '#64748B' }}>
              {tabKey === 'suppliers' ? <Truck size={15} /> : <ShoppingBag size={15} />}
              {tabKey === 'suppliers' ? t('suppliers.suppliers') : t('suppliers.orders')}
            </button>
          ))}
        </div>
        <Button size="sm" icon={<Plus size={15} />} onClick={() => tab === 'suppliers' ? setShowSupplierModal(true) : setShowOrderModal(true)}>
          {tab === 'suppliers' ? t('suppliers.addSupplier') : t('suppliers.newOrder')}
        </Button>
      </div>

      {tab === 'suppliers' && (
        <Card padding={false}>
          {loading ? <div className="py-16 text-center text-ink-400 text-sm">{t('common.loading')}</div> :
            suppliers.length === 0 ? <div className="py-16 text-center text-ink-400 text-sm">{t('suppliers.noSuppliers')}</div> : (
              <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[500px]">
                <thead>
                  <tr className="border-b border-ink-100">
                    {[t('suppliers.name'), t('suppliers.contact'), t('suppliers.phone'), t('suppliers.email'), t('suppliers.status')].map(h => (
                      <th key={h} className="px-5 py-3 text-xs font-semibold text-ink-400 uppercase tracking-wide text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map(s => (
                    <tr key={s.id} className="border-b border-ink-50 hover:bg-ink-50 last:border-0">
                      <td className="px-5 py-3.5 font-semibold text-ink-800">{s.name}</td>
                      <td className="px-5 py-3.5 text-ink-500">{s.contact_person || '—'}</td>
                      <td className="px-5 py-3.5 text-ink-500">{s.phone || '—'}</td>
                      <td className="px-5 py-3.5 text-ink-500">{s.email || '—'}</td>
                      <td className="px-5 py-3.5"><Badge variant={s.is_active ? 'teal' : 'gray'} dot>{s.is_active ? t('suppliers.active') : t('suppliers.inactive')}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
        </Card>
      )}

      {tab === 'orders' && (
        <Card padding={false}>
          {loading ? <div className="py-16 text-center text-ink-400 text-sm">{t('common.loading')}</div> :
            orders.length === 0 ? <div className="py-16 text-center text-ink-400 text-sm">{t('suppliers.noOrders')}</div> : (
              <div className="overflow-x-auto">
              <table className="mob-cards w-full text-sm min-w-[600px] sm:min-w-0">
                <thead>
                  <tr className="border-b border-ink-100">
                    {[t('suppliers.orderId'), t('suppliers.supplier'), t('suppliers.items'), t('suppliers.total'), t('suppliers.status'), t('suppliers.date'), t('suppliers.actions')].map(h => (
                      <th key={h} className="px-5 py-3 text-xs font-semibold text-ink-400 uppercase tracking-wide text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id} className="border-b border-ink-50 hover:bg-ink-50 last:border-0">
                      <td data-label={t('suppliers.orderId')} className="px-5 py-3.5 text-ink-400 text-xs">#{o.id}</td>
                      <td data-label={t('suppliers.supplier')} className="px-5 py-3.5 font-semibold text-ink-800">{o.supplier?.name}</td>
                      <td data-label={t('suppliers.items')} className="px-5 py-3.5 text-ink-500">{o.items?.length || 0}</td>
                      <td data-label={t('suppliers.total')} className="px-5 py-3.5 font-bold" style={{ color: '#009688' }}>{LKR(o.total_amount)}</td>
                      <td data-label={t('suppliers.status')} className="px-5 py-3.5"><Badge variant={statusVariant(o.status) as any} dot>{o.status}</Badge></td>
                      <td data-label={t('suppliers.date')} className="px-5 py-3.5 text-ink-400 text-xs">{new Date(o.created_at).toLocaleDateString('en-LK')}</td>
                      <td className="px-5 py-3.5">
                        {o.status === 'pending' && (
                          <div className="flex gap-1">
                            <button onClick={() => receiveOrder(o.id)} className="text-green-500 hover:text-green-700"><CheckCircle size={16} /></button>
                            <button onClick={() => cancelOrder(o.id)} className="text-red-400 hover:text-red-600"><XCircle size={16} /></button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
        </Card>
      )}

      <Modal open={showSupplierModal} onClose={() => setShowSupplierModal(false)} title={t('suppliers.addSupplier')}>
        <form onSubmit={saveSupplier} className="space-y-4">
          <Input label={t('suppliers.name')} required value={supplierForm.name} onChange={e => setSupplierForm(f => ({ ...f, name: e.target.value }))} />
          <Input label={t('suppliers.contactPerson')} value={supplierForm.contact_person} onChange={e => setSupplierForm(f => ({ ...f, contact_person: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label={t('suppliers.phone')} value={supplierForm.phone} onChange={e => setSupplierForm(f => ({ ...f, phone: e.target.value }))} />
            <Input label={t('suppliers.email')} type="email" value={supplierForm.email} onChange={e => setSupplierForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <Input label={t('suppliers.address')} value={supplierForm.address} onChange={e => setSupplierForm(f => ({ ...f, address: e.target.value }))} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowSupplierModal(false)}>{t('common.cancel')}</Button>
            <Button type="submit" className="flex-1" loading={saving}>{t('common.save')}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={showOrderModal} onClose={() => setShowOrderModal(false)} title={t('suppliers.newOrder')}>
        <form onSubmit={saveOrder} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink-600 mb-1">{t('suppliers.supplier')}</label>
            <select required value={orderForm.supplier_id} onChange={e => setOrderForm(f => ({ ...f, supplier_id: e.target.value }))}
              className="w-full border border-ink-200 rounded-lg px-3 py-2 text-sm">
              <option value="">{t('suppliers.selectSupplier')}</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-ink-600">{t('suppliers.items')}</label>
            {orderForm.items.map((item, i) => (
              <div key={i} className="flex gap-2 items-center">
                <select value={item.product_id} onChange={e => updateOrderItem(i, 'product_id', e.target.value)} className="flex-1 border border-ink-200 rounded-lg px-2 py-1.5 text-xs">
                  <option value="">{t('suppliers.selectProduct')}</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <input type="number" placeholder="Qty" min="1" value={item.quantity} onChange={e => updateOrderItem(i, 'quantity', e.target.value)} className="w-16 border border-ink-200 rounded-lg px-2 py-1.5 text-xs text-center" />
                <input type="number" placeholder="Cost" min="0" step="0.01" value={item.cost} onChange={e => updateOrderItem(i, 'cost', e.target.value)} className="w-24 border border-ink-200 rounded-lg px-2 py-1.5 text-xs text-right" />
                {orderForm.items.length > 1 && <button type="button" onClick={() => removeOrderItem(i)} className="text-red-400 hover:text-red-600"><Trash2 size={13} /></button>}
              </div>
            ))}
            <button type="button" onClick={addOrderItem} className="text-xs text-teal-600 hover:underline">{t('suppliers.addItem')}</button>
          </div>
          <Input label={t('suppliers.notes')} value={orderForm.notes} onChange={e => setOrderForm(f => ({ ...f, notes: e.target.value }))} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowOrderModal(false)}>{t('common.cancel')}</Button>
            <Button type="submit" className="flex-1" loading={saving}>{t('suppliers.createOrder')}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
