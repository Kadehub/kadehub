'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../lib/api';
import { Search, Eye, Lock, Unlock, Store } from 'lucide-react';

interface Shop {
  id: number; name: string; slug: string; status: string;
  created_at: string; userCount: number; currentPlan: string; planExpiry: string | null;
}

export default function ShopsPage() {
  const router = useRouter();
  const [shops, setShops] = useState<Shop[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  useEffect(() => { load(1, ''); }, []);

  async function load(p: number, s: string) {
    setLoading(true);
    const { data } = await api.get('/super-admin/shops', { params: { page: p, limit: 20, search: s || undefined } });
    setShops(data.data); setTotal(data.total); setLoading(false);
  }

  async function toggleStatus(shop: Shop) {
    setTogglingId(shop.id);
    const newStatus = shop.status === 'active' ? 'blocked' : 'active';
    await api.patch(`/super-admin/shops/${shop.id}/status`, { status: newStatus });
    await load(page, search);
    setTogglingId(null);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault(); setPage(1); load(1, search);
  }

  const statusBadge = (s: string) => ({
    active:    'kh-badge-teal',
    blocked:   'kh-badge-coral',
    suspended: 'kh-badge-amber',
  }[s] || 'kh-badge-gray');

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-ink-900">All Shops</h2>
          <p className="text-sm text-ink-400 mt-0.5">{total} registered shops on the platform</p>
        </div>
        <form onSubmit={handleSearch} className="flex gap-2">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or slug..."
            className="border border-ink-200 rounded-xl px-4 py-2 text-sm w-64 focus:outline-none focus:ring-2"
            style={{ '--tw-ring-color': '#00796B' } as any} />
          <button type="submit" className="kh-btn-primary px-4 py-2 rounded-xl flex items-center gap-2 text-sm">
            <Search size={15} /> Search
          </button>
        </form>
      </div>

      <div className="kh-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100">
                {['Shop Name', 'Slug', 'Plan', 'Staff', 'Plan Expiry', 'Status', 'Joined', 'Actions'].map(h => (
                  <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-ink-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i}><td colSpan={8} className="px-5 py-3"><div className="h-6 bg-ink-100 rounded-lg animate-pulse" /></td></tr>
                ))
              ) : shops.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-12 text-center text-ink-400">
                  <Store size={32} className="mx-auto mb-2 opacity-30" />
                  No shops found
                </td></tr>
              ) : shops.map(shop => (
                <tr key={shop.id} className="hover:bg-ink-50 transition-colors">
                  <td className="px-5 py-3.5 font-semibold text-ink-900">{shop.name}</td>
                  <td className="px-5 py-3.5 font-mono text-xs text-ink-400">{shop.slug}</td>
                  <td className="px-5 py-3.5">
                    <span className="kh-badge-blue px-2.5 py-1 rounded-full text-xs font-semibold">{shop.currentPlan}</span>
                  </td>
                  <td className="px-5 py-3.5 text-ink-600">{shop.userCount}</td>
                  <td className="px-5 py-3.5 text-ink-400 text-xs">
                    {shop.planExpiry ? new Date(shop.planExpiry).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadge(shop.status)}`}>
                      {shop.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-ink-400 text-xs">{new Date(shop.created_at).toLocaleDateString()}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => router.push(`/super-admin/shops/${shop.id}`)}
                        className="p-2 rounded-lg text-ink-400 hover:bg-blue-50 hover:text-blue-600 transition-colors" title="View Details">
                        <Eye size={15} />
                      </button>
                      <button onClick={() => toggleStatus(shop)} disabled={togglingId === shop.id}
                        className={`p-2 rounded-lg transition-colors disabled:opacity-40 ${
                          shop.status === 'active'
                            ? 'text-ink-400 hover:bg-red-50 hover:text-red-600'
                            : 'text-ink-400 hover:bg-green-50 hover:text-green-600'
                        }`} title={shop.status === 'active' ? 'Block' : 'Unblock'}>
                        {shop.status === 'active' ? <Lock size={15} /> : <Unlock size={15} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {total > 20 && (
          <div className="px-5 py-3.5 border-t border-ink-100 flex items-center justify-between text-sm text-ink-500">
            <span>Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => { setPage(p => p - 1); load(page - 1, search); }}
                className="px-3 py-1.5 border border-ink-200 rounded-lg disabled:opacity-40 hover:bg-ink-50 text-xs font-semibold">← Prev</button>
              <button disabled={page * 20 >= total} onClick={() => { setPage(p => p + 1); load(page + 1, search); }}
                className="px-3 py-1.5 border border-ink-200 rounded-lg disabled:opacity-40 hover:bg-ink-50 text-xs font-semibold">Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
