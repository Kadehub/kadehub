'use client';
import { useEffect, useState } from 'react';
import api from '../../../lib/api';
import { Plus, Trash2, ToggleLeft, ToggleRight, Tag } from 'lucide-react';

interface Coupon {
  id: number; code: string; type: string; value: number;
  duration_months: number | null; max_uses: number | null;
  used_count: number; is_active: boolean; expires_at: string | null; created_at: string;
}

const empty = { code: '', type: 'percentage', value: '', duration_months: '', max_uses: '', expires_at: '' };

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await api.get('/super-admin/coupons');
    setCoupons(data); setLoading(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setSaving(true);
    try {
      await api.post('/super-admin/coupons', {
        code: form.code,
        type: form.type,
        value: parseFloat(form.value),
        duration_months: form.duration_months ? parseInt(form.duration_months) : undefined,
        max_uses: form.max_uses ? parseInt(form.max_uses) : undefined,
        expires_at: form.expires_at || undefined,
      });
      setForm(empty); setShowForm(false); load();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create coupon');
    } finally { setSaving(false); }
  }

  async function toggle(id: number) {
    await api.patch(`/super-admin/coupons/${id}/toggle`); load();
  }

  async function remove(id: number) {
    if (!confirm('Delete this coupon?')) return;
    await api.delete(`/super-admin/coupons/${id}`); load();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-ink-900">Coupon / Promo Codes</h2>
          <p className="text-sm text-ink-400 mt-0.5">Create discount codes for subscription plans</p>
        </div>
        <button onClick={() => setShowForm(v => !v)} className="kh-btn-primary flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm">
          <Plus size={16} /> New Coupon
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="kh-card p-5">
          <h3 className="font-semibold text-ink-800 mb-4">Create Coupon</h3>
          <form onSubmit={submit} className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-ink-500 mb-1.5 block">Code *</label>
              <input required value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="e.g. LAUNCH20" className="border border-ink-200 rounded-xl px-4 py-2 text-sm w-full focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-500 mb-1.5 block">Type *</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="border border-ink-200 rounded-xl px-4 py-2 text-sm w-full focus:outline-none">
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed (LKR)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-500 mb-1.5 block">Value *</label>
              <input required type="number" min="0" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                placeholder={form.type === 'percentage' ? '20' : '500'} className="border border-ink-200 rounded-xl px-4 py-2 text-sm w-full focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-500 mb-1.5 block">Duration (months)</label>
              <input type="number" min="1" value={form.duration_months} onChange={e => setForm(f => ({ ...f, duration_months: e.target.value }))}
                placeholder="e.g. 3" className="border border-ink-200 rounded-xl px-4 py-2 text-sm w-full focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-500 mb-1.5 block">Max Uses</label>
              <input type="number" min="1" value={form.max_uses} onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))}
                placeholder="Unlimited" className="border border-ink-200 rounded-xl px-4 py-2 text-sm w-full focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-500 mb-1.5 block">Expires At</label>
              <input type="datetime-local" value={form.expires_at} onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
                className="border border-ink-200 rounded-xl px-4 py-2 text-sm w-full focus:outline-none" />
            </div>
            {error && <p className="col-span-full text-sm text-red-600">{error}</p>}
            <div className="col-span-full flex gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-ink-200 rounded-xl text-sm font-semibold hover:bg-ink-50">Cancel</button>
              <button type="submit" disabled={saving} className="kh-btn-primary px-5 py-2 rounded-xl text-sm disabled:opacity-50">
                {saving ? 'Creating...' : 'Create Coupon'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="kh-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-100">
              {['Code', 'Type', 'Value', 'Duration', 'Uses', 'Expires', 'Status', 'Actions'].map(h => (
                <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-ink-400 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-50">
            {loading ? (
              [...Array(4)].map((_, i) => <tr key={i}><td colSpan={8} className="px-5 py-3"><div className="h-6 bg-ink-100 rounded animate-pulse" /></td></tr>)
            ) : coupons.length === 0 ? (
              <tr><td colSpan={8} className="px-5 py-12 text-center text-ink-400">
                <Tag size={32} className="mx-auto mb-2 opacity-30" />No coupons yet
              </td></tr>
            ) : coupons.map(c => (
              <tr key={c.id} className="hover:bg-ink-50 transition-colors">
                <td className="px-5 py-3.5 font-mono font-bold text-ink-900">{c.code}</td>
                <td className="px-5 py-3.5 capitalize text-ink-600">{c.type}</td>
                <td className="px-5 py-3.5 font-semibold" style={{ color: '#00796B' }}>
                  {c.type === 'percentage' ? `${c.value}%` : `LKR ${c.value}`}
                </td>
                <td className="px-5 py-3.5 text-ink-500">{c.duration_months ? `${c.duration_months} mo` : '—'}</td>
                <td className="px-5 py-3.5 text-ink-500">{c.used_count}{c.max_uses ? ` / ${c.max_uses}` : ''}</td>
                <td className="px-5 py-3.5 text-ink-400 text-xs">{c.expires_at ? new Date(c.expires_at).toLocaleDateString() : '—'}</td>
                <td className="px-5 py-3.5">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${c.is_active ? 'kh-badge-teal' : 'kh-badge-gray'}`}>
                    {c.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => toggle(c.id)} className="p-2 rounded-lg text-ink-400 hover:bg-ink-100 transition-colors" title="Toggle">
                      {c.is_active ? <ToggleRight size={16} style={{ color: '#00796B' }} /> : <ToggleLeft size={16} />}
                    </button>
                    <button onClick={() => remove(c.id)} className="p-2 rounded-lg text-ink-400 hover:bg-red-50 hover:text-red-600 transition-colors" title="Delete">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
