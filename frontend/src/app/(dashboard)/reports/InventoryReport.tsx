'use client';
import { useEffect, useState } from 'react';
import { Card, StatCard } from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import { LKR } from '../../../lib/format';
import api from '../../../lib/api';
import { ProductImage } from '../../../components/ui/ProductImage';
import { Boxes, TrendingUp, AlertTriangle, XCircle } from 'lucide-react';

export default function InventoryReport() {
  const [stockValue, setStockValue] = useState<any>(null);
  const [stockReport, setStockReport] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/analytics/stock-value'),
      api.get('/analytics/stock-report'),
    ]).then(([sv, sr]) => {
      setStockValue(sv.data && !sv.data.statusCode ? sv.data : null);
      setStockReport(Array.isArray(sr.data) ? sr.data : []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="py-20 text-center text-ink-400 text-sm">Loading…</div>;

  const filtered = stockReport.filter((p) => {
    if (filter === 'out') return +p.quantity <= 0;
    if (filter === 'low') return +p.quantity > 0 && +p.quantity <= +p.reorder_level;
    return true;
  });

  const statusOf = (qty: number, reorder: number) =>
    qty <= 0 ? { v: 'coral' as const, l: 'Out of stock' } :
    qty <= reorder ? { v: 'amber' as const, l: 'Low stock' } :
    { v: 'teal' as const, l: 'In stock' };

  return (
    <div className="space-y-5">
      {stockValue && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total SKUs" value={+stockValue.total_products || 0} icon={<Boxes size={18} />} color="teal" />
          <StatCard label="Retail Stock Value" value={LKR(+stockValue.total_retail_value || 0)} icon={<TrendingUp size={18} />} color="amber" />
          <StatCard label="Low Stock Items" value={+stockValue.low_stock || 0} icon={<AlertTriangle size={18} />} color="coral" />
          <StatCard label="Out of Stock" value={+stockValue.out_of_stock || 0} icon={<XCircle size={18} />} color="coral" />
        </div>
      )}

      {/* Profit margin summary */}
      {stockValue && (
        <div className="grid grid-cols-2 gap-4">
          <div className="kh-card p-5">
            <p className="text-sm text-ink-500 font-medium">Total Cost Value</p>
            <p className="text-2xl font-bold mt-1" style={{ color: '#2563EB' }}>{LKR(+stockValue.total_cost_value || 0)}</p>
            <p className="text-xs text-ink-400 mt-1">What you paid for current stock</p>
          </div>
          <div className="kh-card p-5">
            <p className="text-sm text-ink-500 font-medium">Potential Gross Profit</p>
            <p className="text-2xl font-bold mt-1" style={{ color: '#00A884' }}>
              {LKR((+stockValue.total_retail_value || 0) - (+stockValue.total_cost_value || 0))}
            </p>
            <p className="text-xs text-ink-400 mt-1">If all current stock is sold</p>
          </div>
        </div>
      )}

      {/* Stock table */}
      <Card padding={false}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink-100">
          <h3 className="font-semibold text-ink-800">Stock Report</h3>
          <div className="flex gap-1">
            {(['all', 'low', 'out'] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all"
                style={{ background: filter === f ? '#00A884' : '#F1F5F9', color: filter === f ? 'white' : '#475569' }}>
                {f === 'all' ? `All (${stockReport.length})` :
                 f === 'low' ? `Low (${stockReport.filter(p => +p.quantity > 0 && +p.quantity <= +p.reorder_level).length})` :
                 `Out (${stockReport.filter(p => +p.quantity <= 0).length})`}
              </button>
            ))}
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-100">
              {['Product', 'Category', 'Stock', 'Reorder At', 'Status', 'Cost Value', 'Retail Value'].map((h) => (
                <th key={h} className={`px-4 py-3 text-xs font-semibold text-ink-400 uppercase tracking-wide ${['Cost Value', 'Retail Value'].includes(h) ? 'text-right' : ['Stock', 'Reorder At', 'Status'].includes(h) ? 'text-center' : 'text-left'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => {
              const { v, l } = statusOf(+p.quantity, +p.reorder_level);
              return (
                <tr key={i} className="border-b border-ink-50 hover:bg-ink-50 last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <ProductImage category={p.category} name={p.name} size={32} />
                      <span className="font-semibold text-ink-800">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">{p.category ? <Badge variant="gray">{p.category}</Badge> : '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-base font-extrabold"
                      style={{ color: +p.quantity <= 0 ? '#FF6B6B' : +p.quantity <= +p.reorder_level ? '#F59E0B' : '#00A884' }}>
                      {p.quantity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-ink-400">{p.reorder_level}</td>
                  <td className="px-4 py-3 text-center"><Badge variant={v} dot>{l}</Badge></td>
                  <td className="px-4 py-3 text-right text-ink-500">{LKR(+p.cost_value || 0)}</td>
                  <td className="px-4 py-3 text-right font-bold" style={{ color: '#FF7A00' }}>{LKR(+p.stock_value || 0)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
