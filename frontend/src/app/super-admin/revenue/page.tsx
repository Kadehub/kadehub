'use client';
import { useEffect, useState } from 'react';
import api from '../../../lib/api';
import { Download, TrendingUp, CreditCard, Users } from 'lucide-react';

export default function RevenuePage() {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    api.get('/super-admin/revenue').then(r => setReport(r.data)).finally(() => setLoading(false));
  }, []);

  async function exportCsv() {
    setExporting(true);
    const res = await api.get('/super-admin/revenue/export/csv', { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url; a.download = `revenue-report-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    setExporting(false);
  }

  if (loading) return <div className="py-20 text-center text-ink-400">Loading revenue report…</div>;
  if (!report) return null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-ink-900">Revenue Reports</h2>
          <p className="text-sm text-ink-400 mt-0.5">Platform earnings from registration fees and subscriptions</p>
        </div>
        <button onClick={exportCsv} disabled={exporting}
          className="kh-btn-primary flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm disabled:opacity-50">
          <Download size={15} /> {exporting ? 'Exporting…' : 'Export CSV'}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: report.totalRevenue, icon: TrendingUp, color: '#00796B' },
          { label: 'Registration Fees', value: report.registrationRevenue, icon: Users, color: '#00A884' },
          { label: 'Subscriptions', value: report.subscriptionRevenue, icon: CreditCard, color: '#0284C7' },
          { label: 'Transactions', value: report.transactionCount, icon: CreditCard, color: '#64748B', isCount: true },
        ].map(({ label, value, icon: Icon, color, isCount }) => (
          <div key={label} className="kh-card px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}18` }}>
                <Icon size={18} style={{ color }} />
              </div>
              <div>
                <p className="text-xs text-ink-400">{label}</p>
                <p className="text-lg font-bold text-ink-900">
                  {isCount ? value : `LKR ${Number(value).toLocaleString()}`}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="kh-card p-5">
          <h3 className="font-semibold text-ink-800 mb-4">Revenue by Month</h3>
          {report.byMonth?.length === 0 ? (
            <p className="text-sm text-ink-400">No data yet</p>
          ) : (
            <div className="space-y-2">
              {report.byMonth.map((m: any) => (
                <div key={m.month} className="flex items-center justify-between text-sm py-2 border-b border-ink-50 last:border-0">
                  <span className="text-ink-600">{m.month}</span>
                  <span className="font-semibold text-ink-900">LKR {Number(m.amount).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="kh-card p-5">
          <h3 className="font-semibold text-ink-800 mb-4">Revenue by Gateway</h3>
          {report.byGateway?.length === 0 ? (
            <p className="text-sm text-ink-400">No data yet</p>
          ) : (
            <div className="space-y-2">
              {report.byGateway.map((g: any) => (
                <div key={g.gateway} className="flex items-center justify-between text-sm py-2 border-b border-ink-50 last:border-0">
                  <span className="text-ink-600 capitalize">{String(g.gateway).replace(/_/g, ' ')}</span>
                  <span className="font-semibold text-ink-900">LKR {Number(g.amount).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="kh-card overflow-hidden">
        <div className="px-5 py-4 border-b border-ink-100">
          <h3 className="font-semibold text-ink-800">Recent Completed Payments</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100">
                {['Date', 'Shop', 'Package', 'Amount', 'Gateway'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-ink-400 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(report.recent || []).map((tx: any) => (
                <tr key={tx.id} className="border-b border-ink-50 hover:bg-ink-50">
                  <td className="px-5 py-3 text-ink-500 text-xs">{new Date(tx.created_at).toLocaleDateString()}</td>
                  <td className="px-5 py-3 font-semibold">{tx.tenant?.name}</td>
                  <td className="px-5 py-3 text-ink-600">{tx.package?.name || tx.metadata?.type || '—'}</td>
                  <td className="px-5 py-3 font-bold">LKR {Number(tx.amount).toLocaleString()}</td>
                  <td className="px-5 py-3 capitalize text-ink-500">{tx.gateway}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
