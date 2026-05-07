'use client';
import { useEffect, useState } from 'react';
import api from '../../../lib/api';
import { Activity, Zap, AlertTriangle, RefreshCw } from 'lucide-react';

export default function ApiMonitorPage() {
  const [data, setData] = useState<any>(null);
  const [hours, setHours] = useState(24);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [hours]);

  async function load() {
    setLoading(true);
    const { data: res } = await api.get('/super-admin/api-monitor', { params: { hours } });
    setData(res); setLoading(false);
  }

  const maxReqs = data?.byTenant?.length ? Math.max(...data.byTenant.map((t: any) => t.total_requests), 1) : 1;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-ink-900">API Rate Monitor</h2>
          <p className="text-sm text-ink-400 mt-0.5">Request volume and performance per shop</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={hours} onChange={e => setHours(+e.target.value)}
            className="border border-ink-200 rounded-xl px-4 py-2 text-sm focus:outline-none">
            <option value={1}>Last 1 hour</option>
            <option value={6}>Last 6 hours</option>
            <option value={24}>Last 24 hours</option>
            <option value={168}>Last 7 days</option>
          </select>
          <button onClick={load} className="p-2.5 border border-ink-200 rounded-xl hover:bg-ink-50 transition-colors">
            <RefreshCw size={16} className={loading ? 'animate-spin text-ink-400' : 'text-ink-400'} />
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Requests', value: data?.totalRequests ?? '—', icon: Activity, color: '#2563EB', bg: '#EFF6FF' },
          { label: 'Active Shops', value: data?.byTenant?.length ?? '—', icon: Zap, color: '#00796B', bg: '#E0F2F1' },
          { label: 'Total Errors', value: data?.byTenant?.reduce((s: number, t: any) => s + t.errors, 0) ?? '—', icon: AlertTriangle, color: '#E53E3E', bg: '#FFF0F0' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="kh-card p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
              <Icon size={20} style={{ color }} />
            </div>
            <div>
              <p className="text-xs text-ink-400">{label}</p>
              <p className="text-xl font-bold text-ink-900">{loading ? '...' : value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Per-tenant usage */}
        <div className="kh-card">
          <div className="px-5 py-4 border-b border-ink-100">
            <h3 className="font-semibold text-ink-800">Requests by Shop</h3>
          </div>
          {loading ? (
            <div className="p-5 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-ink-100 rounded-lg animate-pulse" />)}</div>
          ) : !data?.byTenant?.length ? (
            <p className="p-5 text-sm text-ink-400">No API activity in this period.</p>
          ) : (
            <div className="p-5 space-y-4">
              {data.byTenant.map((t: any) => (
                <div key={t.tenant_id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-semibold text-ink-800 truncate max-w-40">{t.tenant_name}</span>
                    <div className="flex items-center gap-3 text-xs text-ink-500">
                      <span>{t.total_requests} reqs</span>
                      <span>{t.avg_ms}ms avg</span>
                      {t.errors > 0 && <span className="kh-badge-coral px-2 py-0.5 rounded-full font-semibold">{t.errors} err</span>}
                    </div>
                  </div>
                  <div className="h-2 bg-ink-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{
                      width: `${(t.total_requests / maxReqs) * 100}%`,
                      background: t.errors > 0 ? 'linear-gradient(90deg,#00796B,#E53E3E)' : 'linear-gradient(90deg,#00796B,#00A884)',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top endpoints */}
        <div className="kh-card">
          <div className="px-5 py-4 border-b border-ink-100">
            <h3 className="font-semibold text-ink-800">Top Endpoints</h3>
          </div>
          {loading ? (
            <div className="p-5 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-8 bg-ink-100 rounded-lg animate-pulse" />)}</div>
          ) : !data?.topEndpoints?.length ? (
            <p className="p-5 text-sm text-ink-400">No data yet.</p>
          ) : (
            <div className="divide-y divide-ink-50">
              {data.topEndpoints.map((ep: any, i: number) => (
                <div key={i} className="px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold flex-shrink-0 ${
                      ep.method === 'GET' ? 'kh-badge-blue' : ep.method === 'POST' ? 'kh-badge-teal' :
                      ep.method === 'PATCH' ? 'kh-badge-amber' : 'kh-badge-coral'
                    }`}>{ep.method}</span>
                    <span className="font-mono text-xs text-ink-600 truncate">{ep.path}</span>
                  </div>
                  <span className="text-sm font-bold text-ink-700 flex-shrink-0 ml-3">{parseInt(ep.count).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
