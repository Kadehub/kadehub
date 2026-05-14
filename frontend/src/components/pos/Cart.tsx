'use client';
import { useState, useEffect } from 'react';
import { useCartStore } from '../../hooks/useCart';
import { LKR } from '../../lib/format';
import { Trash2, Plus, Minus, Banknote, CreditCard, QrCode, ShoppingBag, UserCheck } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { queueSale } from '../../hooks/useOfflineSync';
import ReceiptModal, { ReceiptData } from './receipt/ReceiptModal';

const PAYMENT_METHODS = [
  { key: 'CASH',    label: 'Cash',   icon: Banknote },
  { key: 'CARD',    label: 'Card',   icon: CreditCard },
  { key: 'LANKAQR', label: 'QR',     icon: QrCode },
  { key: 'CREDIT',  label: 'Credit', icon: UserCheck },
];

interface Props { onSaleComplete?: () => void; }

export default function Cart({ onSaleComplete }: Props) {
  const { items, removeItem, updateQty, clear, total } = useCartStore();
  const [payment, setPayment] = useState('CASH');
  const [discount, setDiscount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [company, setCompany] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [dueDate, setDueDate] = useState('');

  const subtotal = total();
  const grandTotal = Math.max(0, subtotal - discount);

  // Load company profile once
  useEffect(() => {
    api.get('/billing/profile')
      .then(r => { if (r.data && !r.data.statusCode) setCompany(r.data); })
      .catch(() => {});
    api.get('/customers')
      .then(r => setCustomers(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
  }, []);

  const checkout = async () => {
    if (!items.length) return toast.error('Cart is empty');
    if (payment === 'CREDIT' && !customerId) return toast.error('Select a customer for credit sale');
    setLoading(true);
    const salePayload: any = {
      items: items.map(i => ({ product_id: i.product.id, quantity: i.quantity, price: Number(i.product.price) })),
      payment_method: payment,
      discount: Number(discount),
      ...(customerId && { customer_id: customerId }),
      ...(payment === 'CREDIT' && dueDate && { due_date: dueDate }),
    };
    try {
      if (!navigator.onLine) {
        queueSale(salePayload);
        toast.success('Offline: Sale queued');
        clear(); setDiscount(0); return;
      }
      const res = await api.post('/pos/sales', salePayload);
      const saleData = res.data;

      // Build receipt data
      const receiptData: ReceiptData = {
        id: saleData.id,
        created_at: saleData.created_at,
        payment_method: saleData.payment_method,
        total_amount: Number(saleData.total_amount),
        discount: Number(saleData.discount),
        items: saleData.items?.map((si: any) => ({
          product: { name: si.product?.name || 'Product', category: si.product?.category },
          quantity: si.quantity,
          price: Number(si.price),
        })) || items.map(i => ({
          product: { name: i.product.name, category: i.product.category },
          quantity: i.quantity,
          price: Number(i.product.price),
        })),
        user: saleData.user,
        customer: saleData.customer,
        company: company ? {
          name: company.name || 'KadeHub Shop',
          address: company.address,
          city: company.city,
          phone: company.phone,
          email: company.email,
          logo_url: company.logo_url,
          tax_number: company.tax_number,
        } : undefined,
      };

      clear(); setDiscount(0); setCustomerId(null); setDueDate('');
      onSaleComplete?.();
      setReceipt(receiptData); // show receipt modal
    } catch (e: any) {
      const msg = e.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'Sale failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex flex-col h-full kh-card overflow-hidden lg:kh-card">

        {/* Header — hidden on mobile (drawer has its own header) */}
        <div className="hidden lg:flex flex-shrink-0 items-center justify-between px-4 py-3 border-b border-ink-100">
          <div className="flex items-center gap-2">
            <ShoppingBag size={16} style={{ color: '#00A884' }} />
            <span className="font-semibold text-ink-800 text-sm">Cart</span>
            {items.length > 0 && (
              <span className="w-5 h-5 rounded-full text-xs font-bold text-white flex items-center justify-center"
                style={{ background: '#FFB703', color: '#0F172A' }}>
                {items.length}
              </span>
            )}
          </div>
          {items.length > 0 && (
            <button onClick={() => { clear(); setDiscount(0); }}
              className="text-xs text-ink-400 hover:text-red-500 transition-colors">
              Clear all
            </button>
          )}
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto min-h-0 p-2 space-y-1.5">
          {items.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-ink-300 py-8">
              <ShoppingBag size={32} className="mb-2 opacity-20" />
              <p className="text-sm">Cart is empty</p>
              <p className="text-xs mt-0.5 opacity-70">Tap a product to add</p>
            </div>
          )}
          {items.map(item => {
            const lineTotal = Number(item.product.price) * item.quantity;
            return (
              <div key={item.product.id} className="rounded-xl bg-ink-50 border border-ink-100 px-2.5 py-2">
                <div className="flex items-start justify-between gap-1 mb-1.5">
                  <p className="text-xs font-semibold text-ink-800 leading-tight flex-1 min-w-0 pr-1"
                    style={{ wordBreak: 'break-word' }}>
                    {item.product.name}
                  </p>
                  <button onClick={() => removeItem(item.product.id)}
                    aria-label={`Remove ${item.product.name} from cart`}
                    className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-red-100 text-ink-300 hover:text-red-500 transition-colors mt-0.5">
                    <Trash2 size={11} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateQty(item.product.id, item.quantity - 1)}
                      className="w-5 h-5 rounded bg-white border border-ink-200 hover:bg-ink-100 flex items-center justify-center transition-colors">
                      <Minus size={9} />
                    </button>
                    <span className="w-6 text-center text-xs font-bold text-ink-800">{item.quantity}</span>
                    <button onClick={() => updateQty(item.product.id, item.quantity + 1)}
                      className="w-5 h-5 rounded bg-white border border-ink-200 hover:bg-ink-100 flex items-center justify-center transition-colors">
                      <Plus size={9} />
                    </button>
                    <span className="text-2xs text-ink-400 ml-1">× {LKR(Number(item.product.price))}</span>
                  </div>
                  <span className="text-xs font-bold" style={{ color: '#00A884' }}>{LKR(lineTotal)}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-ink-100 px-4 py-3 space-y-2.5">
          <div className="flex justify-between text-xs text-ink-500">
            <span>{items.length} item{items.length !== 1 ? 's' : ''}</span>
            <span>{LKR(subtotal)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink-500 flex-1">Discount (LKR)</span>
            <input type="number" min={0} max={subtotal} value={discount}
              onChange={e => setDiscount(Math.min(subtotal, Math.max(0, +e.target.value)))}
              className="w-20 border border-ink-200 rounded-lg px-2 py-1 text-xs text-right font-medium bg-white" />
          </div>
          <div className="flex justify-between items-center pt-1 border-t border-ink-100">
            <span className="text-sm font-semibold text-ink-700">Total</span>
            <span className="text-xl font-extrabold" style={{ color: '#00A884' }}>{LKR(grandTotal)}</span>
          </div>

          {/* Payment method */}
          <div className="grid grid-cols-4 gap-1.5">
            {PAYMENT_METHODS.map(({ key, label, icon: Icon }) => {
              const active = payment === key;
              return (
                <button key={key} onClick={() => setPayment(key)}
                  className="flex flex-col items-center gap-1 py-2 rounded-xl border-2 text-xs font-semibold transition-all"
                  style={{
                    borderColor: active ? '#FFB703' : '#E2E8F0',
                    background:  active ? '#FFF8E1' : 'white',
                    color:       active ? '#F59E0B' : '#64748B',
                    boxShadow:   active ? '0 0 0 3px rgb(255 183 3 / 0.15)' : 'none',
                  }}>
                  <Icon size={15} />
                  {label}
                </button>
              );
            })}
          </div>

          {/* Customer selector — shown for CREDIT */}
          {payment === 'CREDIT' && (
            <div className="space-y-1.5">
              <select value={customerId ?? ''} onChange={e => setCustomerId(e.target.value ? +e.target.value : null)}
                className="w-full border border-ink-200 rounded-lg px-2 py-1.5 text-xs">
                <option value="">Select customer…</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}{c.phone ? ` · ${c.phone}` : ''}</option>)}
              </select>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                placeholder="Due date (optional)"
                className="w-full border border-ink-200 rounded-lg px-2 py-1.5 text-xs" />
            </div>
          )}

          <button onClick={checkout} disabled={loading || !items.length}
            className="kh-btn-primary w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2">
            {loading
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : `Charge ${LKR(grandTotal)}`
            }
          </button>
        </div>
      </div>

      {/* Receipt modal — shown after successful sale */}
      {receipt && (
        <ReceiptModal
          data={receipt}
          onClose={() => setReceipt(null)}
        />
      )}
    </>
  );
}
