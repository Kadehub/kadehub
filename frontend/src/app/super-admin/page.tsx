'use client';
import { useEffect, useState } from 'react';
import api from '../../lib/api';
import { Store, ShieldBan, TrendingUp, CreditCard, ArrowUpRight, Clock } from 'lucide-react';
import Link from 'next/link';

interface Stats {
  totalShops: number;
  activeShops: number;
  blockedShops: number;
  totalRevenue: number;
  recentTransactions: any[];
  pendingSlips?: number;
}

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/super-admin/stats').then(({ data }) => { setStats(data); setLoading(false); });
  }, []);

  const statCards = stats ? [
    { label: 'Total Shops',    value: stats.totalShops,                          icon: Store,      color: '#2563EB', bg: '#EFF6FF' },
    { label: 'Active Shops',   value: stats.activeShops,                         icon: TrendingUp, color: '#00796B', bg: '#E0F2F1' },
    { label: 'Blocked Shops',  value: stats.blockedShops,                        icon: ShieldBan,  color: '#E53E3E', bg: '#FFF0F0' },
    { label: 'Total Revenue',  value: `LKR ${stats.totalRevenue.toLocaleString()}`, icon: CreditCard, color: '#F59E0B', bg: '#FFF8E1' },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h2 className="text-xl font-bold text-ink-900">Dashboard</h2>
        <p className="text-sm text-ink-400 mt-0.5">Platform-wide overview of all shops and revenue</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {loading
          ? [...Array(4)].map((_, i) => <div key={i} className="kh-card p-5 h-24 animate-pulse bg-ink-100" />)
          : statCards.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="kh-card p-5 flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
                <Icon size={20} style={{ color }} />
              </div>
              <div>
                <p className="text-xs text-ink-400">{label}</p>
                <p className="text-xl font-bold text-ink-900 mt-0.5">{value}</p>
              </div>
            </div>
          ))
        }
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { href: '/super-admin/payments',      label: 'Payment Slips',      desc: stats?.pendingSlips ? `${stats.pendingSlips} awaiting approval` : 'Review bank transfer slips', color: '#00796B', bg: '#E0F2F1' },
          { href: '/super-admin/shops',        label: 'Manage Shops',       desc: 'View, block or change plans',    color: '#00796B', bg: '#E0F2F1' },
          { href: '/super-admin/transactions',  label: 'All Transactions',   desc: 'Platform payment history',       color: '#2563EB', bg: '#EFF6FF' },
        ].map(({ href, label, desc, color, bg }) => (
          <Link key={href} href={href}
            className="kh-card p-5 flex items-center justify-between hover:shadow-md transition-shadow group">
            <div>
              <p className="text-sm font-semibold text-ink-800">{label}</p>
              <p className="text-xs text-ink-400 mt-0.5">{desc}</p>
            </div>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform" style={{ background: bg }}>
              <ArrowUpRight size={17} style={{ color }} />
            </div>
          </Link>
        ))}
      </div>

      {/* Recent transactions */}
      <div className="kh-card">
        <div className="px-5 py-4 border-b border-ink-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-ink-400" />
            <h3 className="font-semibold text-ink-800">Recent Transactions</h3>
          </div>
          <Link href="/super-admin/transactions" className="text-xs font-semibold hover:underline" style={{ color: '#00796B' }}>
            View all →
          </Link>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-8 rounded-lg bg-ink-100 animate-pulse" />)}
          </div>
        ) : !stats?.recentTransactions?.length ? (
          <p className="p-5 text-sm text-ink-400">No transactions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100">
                  {['Shop', 'Package', 'Amount', 'Cycle', 'Gateway', 'Status', 'Date'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-ink-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-50">
                {stats.recentTransactions.map((tx: any) => (
                  <tr key={tx.id} className="hover:bg-ink-50 transition-colors">
                    <td className="px-5 py-3 font-semibold text-ink-800">{tx.tenant?.name}</td>
                    <td className="px-5 py-3 text-ink-600">{tx.package?.name}</td>
                    <td className="px-5 py-3 font-semibold text-ink-900">LKR {tx.amount?.toLocaleString()}</td>
                    <td className="px-5 py-3 capitalize text-ink-500">{tx.billing_cycle}</td>
                    <td className="px-5 py-3 capitalize text-ink-500">{tx.gateway}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        tx.status === 'completed' ? 'kh-badge-teal' : 'kh-badge-coral'
                      }`}>{tx.status}</span>
                    </td>
                    <td className="px-5 py-3 text-ink-400 text-xs">{new Date(tx.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
