'use client';
import { useEffect, useState } from 'react';
import { StatCard } from '../../../components/ui/Card';
import { Card } from '../../../components/ui/Card';
import { LKR } from '../../../lib/format';
import api from '../../../lib/api';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { ShoppingCart, TrendingUp, CreditCard, Tag, Banknote, QrCode, Clock } from 'lucide-react';

interface Props { from: string; to: string; }

const ChartTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="kh-card px-3 py-2 text-xs shadow-lg">
      <p className="text-ink-400 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="font-bold" style={{ color: p.color }}>
          {p.name === 'revenue' ? LKR(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

export default function PosSalesReport({ from, to }: Props) {
  const [summary, setSummary] = useState<any>(null);
  const [revenue, setRevenue] = useState<any[]>([]);
  const [hourly, setHourly] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/analytics/summary?from=${from}&to=${to}`),
      api.get(`/analytics/revenue?from=${from}&to=${to}&groupBy=day`),
      api.get(`/analytics/hourly?from=${from}&to=${to}`),
      api.get(`/analytics/recent-sales?from=${from}&to=${to}&limit=20`),
    ]).then(([s, r, h, sl]) => {
      setSummary(s.data && !s.data.statusCode ? s.data : null);
      setRevenue(Array.isArray(r.data) ? r.data : []);
      setHourly(Array.isArray(h.data) ? h.data : []);
      setSales(Array.isArray(sl.data) ? sl.data : []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [from, to]);

  // Build full 24h array
  const hourlyFull = Array.from({ length: 24 }, (_, h) => {
    const found = hourly.find((x) => +x.hour === h);
    return { hour: `${h}:00`, sales: found ? +found.sales : 0, revenue: found ? +found.revenue : 0 };
  });

  if (loading) return <div className="py-20 text-center text-ink-400 text-sm">Loading…</div>;

  return (
    <div className="space-y-5">
      {/* KPI cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Sales" value={+summary.total_sales || 0} icon={<ShoppingCart size={18} />} color="teal" />
          <StatCard label="Revenue" value={LKR(+summary.revenue || 0)} icon={<TrendingUp size={18} />} color="amber" />
          <StatCard label="Avg. Sale" value={LKR(+summary.avg_sale || 0)} icon={<CreditCard size={18} />} color="blue" />
          <StatCard label="Discounts Given" value={LKR(+summary.total_discount || 0)} icon={<Tag size={18} />} color="coral" />
        </div>
      )}

      {/* Payment split */}
      {summary && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Cash', icon: Banknote, count: +summary.cash_count || 0, rev: +summary.cash_revenue || 0, color: '#00A884' },
            { label: 'Card', icon: CreditCard, count: +summary.card_count || 0, rev: +summary.card_revenue || 0, color: '#2563EB' },
            { label: 'LankaQR', icon: QrCode, count: +summary.qr_count || 0, rev: +summary.qr_revenue || 0, color: '#FF7A00' },
          ].map(({ label, icon: Icon, count, rev, color }) => (
            <div key={label} className="kh-card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: color + '18' }}>
                <Icon size={18} style={{ color }} />
              </div>
              <div>
                <p className="text-xs text-ink-400">{label}</p>
                <p className="font-bold text-ink-800">{count} sales</p>
                <p className="text-xs font-semibold" style={{ color }}>{LKR(rev)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Revenue trend */}
      <Card>
        <h3 className="font-semibold text-ink-800 mb-4">Revenue Trend</h3>
        {revenue.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={revenue} barSize={24}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                tickFormatter={(v) => { try { return new Date(v).toLocaleDateString('en', { month: 'short', day: 'numeric' }); } catch { return v; } }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<ChartTip />} cursor={{ fill: '#E0F2F1' }} />
              <Bar dataKey="revenue" name="revenue" fill="#00A884" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <p className="text-center text-ink-300 text-sm py-12">No data for this period</p>}
      </Card>

      {/* Hourly heatmap */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Clock size={16} style={{ color: '#00A884' }} />
          <h3 className="font-semibold text-ink-800">Sales by Hour</h3>
          <span className="text-xs text-ink-400 ml-1">Peak selling times</span>
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={hourlyFull} barSize={14}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false}
              interval={2} />
            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTip />} cursor={{ fill: '#E0F2F1' }} />
            <Bar dataKey="sales" name="sales" fill="#FF7A00" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Recent sales table */}
      <Card padding={false}>
        <div className="px-5 py-4 border-b border-ink-100">
          <h3 className="font-semibold text-ink-800">Recent Sales</h3>
        </div>
        {sales.length === 0 ? (
          <p className="text-center text-ink-300 text-sm py-10">No sales in this period</p>
        ) : (
          <div className="overflow-x-auto">
          <table className="mob-cards w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100">
                {['#', 'Date & Time', 'Cashier', 'Customer', 'Payment', 'Total'].map((h) => (
                  <th key={h} className={`px-4 py-3 text-xs font-semibold text-ink-400 uppercase tracking-wide ${h === 'Total' ? 'text-right' : 'text-left'}`}>{h}</th>
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
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </Card>
    </div>
  );
}
