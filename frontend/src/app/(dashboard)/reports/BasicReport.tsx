'use client';
import { useEffect, useState } from 'react';
import { StatCard } from '../../../components/ui/Card';
import { LKR } from '../../../lib/format';
import api from '../../../lib/api';
import { ShoppingCart, TrendingUp, Package, AlertTriangle, FileText, Ban } from 'lucide-react';
import ReceiptModal, { ReceiptData } from '../../../components/pos/receipt/ReceiptModal';

interface Props { from: string; to: string; }

export default function BasicReport({ from, to }: Props) {
  const [data, setData] = useState<any>(null);
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/analytics/basic-report?from=${from}&to=${to}`),
      api.get(`/analytics/basic-sales?from=${from}&to=${to}`),
    ])
      .then(([report, salesList]) => {
        setData(report.data);
        setSales(Array.isArray(salesList.data) ? salesList.data : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [from, to]);

  const [voiding, setVoiding] = useState<number | null>(null);

  const openReceipt = async (saleId: number) => {
    try {
      const res = await api.get(`/pos/sales/${saleId}/receipt`);
      setReceiptData(res.data);
    } catch {}
  };

  const voidSale = async (saleId: number) => {
    if (!confirm('Void this sale? Stock will be restored.')) return;
    setVoiding(saleId);
    try {
      await api.patch(`/pos/sales/${saleId}/void`);
      toast.success('Sale voided — stock restored');
      setSales(prev => prev.map(s => s.id === saleId ? { ...s, status: 'voided' } : s));
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to void sale');
    } finally { setVoiding(null); }
  };

  if (loading) return <div className="py-20 text-center text-ink-400 text-sm">Loading…</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold w-fit"
        style={{ background: '#E0F2F1', color: '#00796B' }}>
        ✓ Basic Report — included free on all plans
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Sales"   value={+data?.total_sales  || 0}          icon={<ShoppingCart size={18} />} color="teal" />
        <StatCard label="Revenue"       value={LKR(+data?.revenue  || 0)}          icon={<TrendingUp   size={18} />} color="amber" />
        <StatCard label="Total Products" value={+data?.total_products || 0}        icon={<Package      size={18} />} color="blue" />
        <StatCard label="Low / Out of Stock" value={`${+data?.low_stock || 0} / ${+data?.out_of_stock || 0}`}
          icon={<AlertTriangle size={18} />} color="coral" />
      </div>
      {(+data?.total_discount > 0) && (
        <div className="kh-card p-4 flex items-center gap-3">
          <span className="text-sm text-ink-500">Total Discounts Given:</span>
          <span className="font-bold" style={{ color: '#FF6B6B' }}>{LKR(+data.total_discount)}</span>
        </div>
      )}

      {/* Sales table */}
      {sales.length > 0 && (
        <div className="kh-card" style={{ padding: 0 }}>
          <div className="px-5 py-4 border-b border-ink-100">
            <h3 className="font-semibold text-ink-800">All Sales</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="mob-cards w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100">
                  {['#', 'Date & Time', 'Cashier', 'Customer', 'Payment', 'Total', 'Actions'].map((h) => (
                    <th key={h} className={`px-4 py-3 text-xs font-semibold text-ink-400 uppercase tracking-wide ${
                      h === 'Total' || h === 'Actions' ? 'text-right' : 'text-left'
                    }`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={s.id} className="border-b border-ink-50 hover:bg-ink-50 last:border-0">
                    <td data-label="#" className="px-4 py-2.5 text-ink-400 text-xs">#{s.id}</td>
                    <td data-label="Date" className="px-4 py-2.5 text-ink-600 text-xs">
                      {new Date(s.created_at).toLocaleString('en-LK', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td data-label="Cashier" className="px-4 py-2.5 text-ink-700">{s.cashier || '—'}</td>
                    <td data-label="Customer" className="px-4 py-2.5 text-ink-500">{s.customer || <span className="text-ink-300">Walk-in</span>}</td>
                    <td data-label="Payment" className="px-4 py-2.5">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{
                          background: s.payment_method === 'CASH' ? '#E0F2F1' : s.payment_method === 'CARD' ? '#EFF6FF' : '#FFF8E1',
                          color: s.payment_method === 'CASH' ? '#00796B' : s.payment_method === 'CARD' ? '#1D4ED8' : '#F59E0B',
                        }}>
                        {s.payment_method}
                      </span>
                    </td>
                    <td data-label="Total" className="px-4 py-2.5 text-right font-bold" style={{ color: '#FF7A00' }}>{LKR(+s.total_amount)}</td>
                    <td data-label="Actions" className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openReceipt(s.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                          style={{ background: '#E0F2F1', color: '#00796B' }}
                          title="Generate Bills & Receipts">
                          <FileText size={13} />
                          Bills
                        </button>
                        {s.status !== 'voided' && (
                          <button
                            onClick={() => voidSale(s.id)}
                            disabled={voiding === s.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40"
                            style={{ background: '#FFF0F0', color: '#E53E3E' }}
                            title="Void Sale">
                            <Ban size={13} />
                            Void
                          </button>
                        )}
                        {s.status === 'voided' && (
                          <span className="text-xs font-semibold px-2 py-1 rounded-lg" style={{ background: '#F1F5F9', color: '#94A3B8' }}>Voided</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="kh-card p-5 text-center space-y-2">
        <p className="text-sm font-semibold text-ink-600">Want deeper insights?</p>
        <p className="text-xs text-ink-400">Upgrade to Pro or Enterprise for full POS reports, revenue charts, customer analytics and more.</p>
        <a href="/settings?tab=billing" className="inline-block mt-2 px-4 py-2 rounded-xl text-sm font-bold text-white"
          style={{ background: '#00A884' }}>View Plans →</a>
      </div>

      {receiptData && <ReceiptModal data={receiptData} onClose={() => setReceiptData(null)} />}
    </div>
  );
}
