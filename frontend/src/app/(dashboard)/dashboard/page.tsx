'use client';
import { useEffect, useState } from 'react';
import { LKR } from '../../../lib/format';
import api from '../../../lib/api';
import { ShoppingCart, TrendingUp, AlertTriangle, CreditCard, Package, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '../../../hooks/useAuth';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [data, setData] = useState<any>(null);
  const [creditSummary, setCreditSummary] = useState<any>(null);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    Promise.all([
      api.get(`/analytics/basic-report?from=${today}&to=${today}`),
      api.get('/credit/summary').catch(() => ({ data: null })),
      api.get('/inventory/low-stock').catch(() => ({ data: [] })),
    ]).then(([report, credit, stock]) => {
      setData(report.data);
      setCreditSummary(credit.data);
      setLowStock(Array.isArray(stock.data) ? stock.data.slice(0, 5) : []);
    }).catch(() => {});
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Greeting */}
      <div>
        <h2 className="text-xl font-bold text-ink-800">{greeting()}, {user?.name?.split(' ')[0]} 👋</h2>
        <p className="text-sm text-ink-400 mt-0.5">
          {new Date().toLocaleDateString('en-LK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Today's KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Today's Sales",       value: +data?.total_sales || 0,                    icon: ShoppingCart, color: '#009688', bg: '#E0F2F1', href: '/pos' },
          { label: "Today's Revenue",     value: LKR(+data?.revenue || 0),                   icon: TrendingUp,   color: '#F59E0B', bg: '#FFF8E1', href: '/reports' },
          { label: 'Outstanding Credit',  value: LKR(+creditSummary?.total_outstanding || 0), icon: CreditCard,   color: '#6366F1', bg: '#EEF2FF', href: '/credit' },
          { label: 'Low / Out of Stock',  value: `${+data?.low_stock || 0} / ${+data?.out_of_stock || 0}`, icon: AlertTriangle, color: '#FF6B6B', bg: '#FFF0F0', href: '/inventory' },
        ].map(({ label, value, icon: Icon, color, bg, href }) => (
          <Link key={label} href={href} className="kh-card p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-ink-500 font-medium">{label}</p>
                <p className="text-2xl font-bold mt-1" style={{ color }}>{value}</p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
                <Icon size={18} style={{ color }} />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <h3 className="text-sm font-semibold text-ink-600 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'New Sale',      href: '/pos',      color: '#00A884', border: '#00A884' },
            { label: 'Add Product',   href: '/products', color: '#2563EB', border: '#2563EB' },
            { label: 'View Reports',  href: '/reports',  color: '#F59E0B', border: '#F59E0B' },
            { label: 'Manage Staff',  href: '/staff',    color: '#6366F1', border: '#6366F1' },
          ].map(({ label, href, color, border }) => (
            <Link key={label} href={href}
              className="kh-card p-4 flex items-center justify-between hover:shadow-md transition-shadow"
              style={{ borderLeft: `3px solid ${border}` }}>
              <span className="text-sm font-semibold text-ink-700">{label}</span>
              <ArrowRight size={14} style={{ color }} />
            </Link>
          ))}
        </div>
      </div>

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <div className="kh-card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Package size={16} style={{ color: '#F59E0B' }} />
              <h3 className="text-sm font-semibold text-ink-800">Low Stock Alert</h3>
            </div>
            <Link href="/inventory" className="text-xs font-semibold" style={{ color: '#00A884' }}>View all →</Link>
          </div>
          <div className="space-y-2">
            {lowStock.map((p: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-ink-700">{p.p_name || p.name}</span>
                <span className="font-bold px-2 py-0.5 rounded-full text-xs"
                  style={{
                    background: +(p.i_quantity ?? p.quantity) <= 0 ? '#FFF0F0' : '#FFF8E1',
                    color:      +(p.i_quantity ?? p.quantity) <= 0 ? '#E53E3E' : '#D97706',
                  }}>
                  {+(p.i_quantity ?? p.quantity) <= 0 ? 'Out of stock' : `${p.i_quantity ?? p.quantity} left`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
