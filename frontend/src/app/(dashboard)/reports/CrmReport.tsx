'use client';
import { useEffect, useState } from 'react';
import { Card, StatCard } from '../../../components/ui/Card';
import { LKR } from '../../../lib/format';
import api from '../../../lib/api';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Users, Star, TrendingUp, UserPlus } from 'lucide-react';

interface Props { from: string; to: string; }

export default function CrmReport({ from, to }: Props) {
  const [summary, setSummary] = useState<any>(null);
  const [topCustomers, setTopCustomers] = useState<any[]>([]);
  const [growth, setGrowth] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/analytics/customer-summary?from=${from}&to=${to}`),
      api.get(`/analytics/top-customers?from=${from}&to=${to}`),
      api.get(`/analytics/customer-growth?from=${from}&to=${to}`),
    ]).then(([s, tc, g]) => {
      setSummary(s.data && !s.data.statusCode ? s.data : null);
      setTopCustomers(Array.isArray(tc.data) ? tc.data : []);
      setGrowth(Array.isArray(g.data) ? g.data : []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [from, to]);

  if (loading) return <div className="py-20 text-center text-ink-400 text-sm">Loading…</div>;

  return (
    <div className="space-y-5">
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Customers" value={+summary.total_customers || 0} icon={<Users size={18} />} color="teal" />
          <StatCard label="New This Period" value={+summary.new_customers || 0} icon={<UserPlus size={18} />} color="blue" />
          <StatCard label="Total Loyalty Points" value={(+summary.total_points || 0).toLocaleString()} icon={<Star size={18} />} color="amber" />
          <StatCard label="Avg Points / Customer" value={Math.round(+summary.avg_points || 0)} icon={<TrendingUp size={18} />} color="teal" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Customer growth chart */}
        <Card>
          <h3 className="font-semibold text-ink-800 mb-4">New Customer Registrations</h3>
          {growth.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={growth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => { try { return new Date(v).toLocaleDateString('en', { month: 'short', day: 'numeric' }); } catch { return v; } }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip formatter={(v: any) => [v, 'New customers']} />
                <Line type="monotone" dataKey="new_customers" stroke="#00A884" strokeWidth={2.5}
                  dot={{ fill: '#00A884', r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <p className="text-center text-ink-300 text-sm py-12">No new customers in this period</p>}
        </Card>

        {/* Loyalty points leaderboard */}
        <Card>
          <h3 className="font-semibold text-ink-800 mb-4">Loyalty Points Leaderboard</h3>
          {topCustomers.length === 0 ? (
            <p className="text-center text-ink-300 text-sm py-12">No customer purchase data</p>
          ) : (
            <div className="space-y-2.5">
              {topCustomers.slice(0, 6).map((c, i) => (
                <div key={c.id} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-ink-300 w-4 flex-shrink-0">{i + 1}</span>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                    style={{ background: i === 0 ? '#FF7A00' : i === 1 ? '#94A3B8' : i === 2 ? '#CD7F32' : '#00A884' }}>
                    {c.name?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-ink-800 truncate">{c.name}</p>
                    <p className="text-xs text-ink-400">{c.visit_count} visits</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold" style={{ color: '#FF7A00' }}>{LKR(+c.total_spend)}</p>
                    <p className="text-xs text-ink-400">{c.loyalty_points} pts</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Top customers full table */}
      <Card padding={false}>
        <div className="px-5 py-4 border-b border-ink-100">
          <h3 className="font-semibold text-ink-800">Top Customers by Spend</h3>
        </div>
        {topCustomers.length === 0 ? (
          <p className="text-center text-ink-300 text-sm py-10">No data for this period</p>
        ) : (
          <div className="overflow-x-auto">
          <table className="mob-cards w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100">
                {['#', 'Customer', 'Phone', 'Visits', 'Avg Spend', 'Total Spend', 'Loyalty Pts'].map((h) => (
                  <th key={h} className={`px-4 py-3 text-xs font-semibold text-ink-400 uppercase tracking-wide ${['Avg Spend', 'Total Spend', 'Loyalty Pts'].includes(h) ? 'text-right' : ['Visits'].includes(h) ? 'text-center' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topCustomers.map((c, i) => (
                <tr key={c.id} className="border-b border-ink-50 hover:bg-ink-50 last:border-0">
                  <td data-label="#" className="px-4 py-3 text-ink-400 text-xs font-bold">{i + 1}</td>
                  <td data-label="Customer" className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg,#00796B,#00A884)' }}>
                        {c.name?.[0]?.toUpperCase()}
                      </div>
                      <span className="font-semibold text-ink-800">{c.name}</span>
                    </div>
                  </td>
                  <td data-label="Phone" className="px-4 py-3 text-ink-500">{c.phone || '—'}</td>
                  <td data-label="Visits" className="px-4 py-3 text-center font-bold text-ink-700">{c.visit_count}</td>
                  <td data-label="Avg Spend" className="px-4 py-3 text-right text-ink-500">{LKR(+c.avg_spend)}</td>
                  <td data-label="Total Spend" className="px-4 py-3 text-right font-bold" style={{ color: '#FF7A00' }}>{LKR(+c.total_spend)}</td>
                  <td data-label="Points" className="px-4 py-3 text-right">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
                      style={{ background: '#FFF8E1', color: '#F59E0B' }}>
                      ★ {c.loyalty_points}
                    </span>
                  </td>
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
