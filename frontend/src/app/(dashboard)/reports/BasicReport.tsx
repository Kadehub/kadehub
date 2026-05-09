'use client';
import { useEffect, useState } from 'react';
import { StatCard } from '../../../components/ui/Card';
import { LKR } from '../../../lib/format';
import api from '../../../lib/api';
import { ShoppingCart, TrendingUp, Package, AlertTriangle } from 'lucide-react';

interface Props { from: string; to: string; }

export default function BasicReport({ from, to }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/analytics/basic-report?from=${from}&to=${to}`)
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [from, to]);

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
      <div className="kh-card p-5 text-center space-y-2">
        <p className="text-sm font-semibold text-ink-600">Want deeper insights?</p>
        <p className="text-xs text-ink-400">Upgrade to Pro or Enterprise for full POS reports, revenue charts, customer analytics and more.</p>
        <a href="/settings?tab=billing" className="inline-block mt-2 px-4 py-2 rounded-xl text-sm font-bold text-white"
          style={{ background: '#00A884' }}>View Plans →</a>
      </div>
    </div>
  );
}
