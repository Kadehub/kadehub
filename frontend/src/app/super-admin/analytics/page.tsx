'use client';
import { useEffect, useState } from 'react';
import api from '../../../lib/api';
import { TrendingUp, Store, CreditCard, Users } from 'lucide-react';

export default function AnalyticsPage() {
  const [stats, setStats] = useState<any>(null);
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/super-admin/stats'),
      api.get('/super-admin/shops', { params: { page: 1, limit: 100 } }),
    ]).then(([s, sh]) => {
      setStats(s.data);
      setShops(sh.data.data);
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <div className="space-y-4">
      {[...Array(4)].map((_, i) => <div key={i} className="kh-card h-24 animate-pulse bg-ink-100" />)}
    </div>
  );

  // Plan distribution
  const planDist = shops.reduce((acc: any, s) => {
    acc[s.currentPlan] = (acc[s.currentPlan] || 0) + 1;
    return acc;
  }, {});

  // Status distribution
  const statusDist = shops.reduce((acc: any, s) => {
    acc[s.status] = (acc[s.status] || 0) + 1;
    return acc;
  }, {});

  // Monthly signups (last 6 months)
  const now = new Date();
  const monthlySignups = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const label = d.toLocaleDateString('en-LK', { month: 'short', year: '2-digit' });
    const count = shops.filter(s => {
      const c = new Date(s.created_at);
      return c.getFullYear() === d.getFullYear() && c.getMonth() === d.getMonth();
    }).length;
    return { label, count };
  });
  const maxSignups = Math.max(...monthlySignups.map(m => m.count), 1);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-ink-900">Platform Analytics</h2>
        <p className="text-sm text-ink-400 mt-0.5">Growth and distribution metrics</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Total Shops',   value: stats.totalShops,                             icon: Store,      color: '#2563EB', bg: '#EFF6FF' },
          { label: 'Active Shops',  value: stats.activeShops,                            icon: TrendingUp, color: '#00796B', bg: '#E0F2F1' },
          { label: 'Total Revenue', value: `LKR ${stats.totalRevenue.toLocaleString()}`, icon: CreditCard, color: '#F59E0B', bg: '#FFF8E1' },
          { label: 'Total Staff',   value: shops.reduce((s: number, sh: any) => s + sh.userCount, 0), icon: Users, color: '#8B5CF6', bg: '#F5F3FF' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="kh-card p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
              <Icon size={20} style={{ color }} />
            </div>
            <div>
              <p className="text-xs text-ink-400">{label}</p>
              <p className="text-xl font-bold text-ink-900">{value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Monthly signups bar chart */}
        <div className="kh-card p-5">
          <h3 className="font-semibold text-ink-800 mb-4">New Shops — Last 6 Months</h3>
          <div className="flex items-end gap-3 h-36">
            {monthlySignups.map(({ label, count }) => (
              <div key={label} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-semibold text-ink-600">{count}</span>
                <div className="w-full rounded-t-lg transition-all" style={{
                  height: `${(count / maxSignups) * 100}%`,
                  minHeight: count > 0 ? '8px' : '2px',
                  background: 'linear-gradient(180deg,#00A884,#00796B)',
                }} />
                <span className="text-2xs text-ink-400">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Plan distribution */}
        <div className="kh-card p-5">
          <h3 className="font-semibold text-ink-800 mb-4">Plan Distribution</h3>
          <div className="space-y-3">
            {Object.entries(planDist).map(([plan, count]: any) => (
              <div key={plan}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-ink-700">{plan}</span>
                  <span className="text-xs font-semibold text-ink-500">{count} shops</span>
                </div>
                <div className="h-2 bg-ink-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{
                    width: `${(count / stats.totalShops) * 100}%`,
                    background: 'linear-gradient(90deg,#00796B,#00A884)',
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Status distribution */}
        <div className="kh-card p-5">
          <h3 className="font-semibold text-ink-800 mb-4">Shop Status Breakdown</h3>
          <div className="space-y-3">
            {Object.entries(statusDist).map(([status, count]: any) => {
              const colors: any = { active: '#00796B', blocked: '#E53E3E', suspended: '#F59E0B' };
              return (
                <div key={status} className="flex items-center justify-between p-3 rounded-xl border border-ink-100">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: colors[status] || '#94A3B8' }} />
                    <span className="text-sm font-medium text-ink-700 capitalize">{status}</span>
                  </div>
                  <span className="text-lg font-bold text-ink-900">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top shops by staff */}
        <div className="kh-card p-5">
          <h3 className="font-semibold text-ink-800 mb-4">Top Shops by Staff Count</h3>
          <div className="space-y-2">
            {[...shops].sort((a, b) => b.userCount - a.userCount).slice(0, 5).map((shop, i) => (
              <div key={shop.id} className="flex items-center gap-3">
                <span className="w-5 text-xs font-bold text-ink-400">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink-800 truncate">{shop.name}</p>
                  <p className="text-xs text-ink-400">{shop.currentPlan}</p>
                </div>
                <span className="text-sm font-bold text-ink-700">{shop.userCount} staff</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
