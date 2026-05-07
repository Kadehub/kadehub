'use client';
import { useEffect, useState } from 'react';
import api from '../../../lib/api';
import { Plus, Trash2, ToggleLeft, ToggleRight, Megaphone } from 'lucide-react';

interface Ann { id: number; title: string; message: string; type: string; is_active: boolean; expires_at: string | null; created_at: string; }

const typeColors: Record<string, string> = {
  info: 'kh-badge-blue', warning: 'kh-badge-amber', success: 'kh-badge-teal', error: 'kh-badge-coral',
};
const empty = { title: '', message: '', type: 'info', expires_at: '' };

export default function AnnouncementsPage() {
  const [items, setItems] = useState<Ann[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await api.get('/super-admin/announcements');
    setItems(data); setLoading(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    await api.post('/super-admin/announcements', { ...form, expires_at: form.expires_at || undefined });
    setForm(empty); setShowForm(false); load(); setSaving(false);
  }

  async function toggle(id: number, is_active: boolean) {
    await api.patch(`/super-admin/announcements/${id}`, { is_active: !is_active }); load();
  }

  async function remove(id: number) {
    if (!confirm('Delete this announcement?')) return;
    await api.delete(`/super-admin/announcements/${id}`); load();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-ink-900">Announcements</h2>
          <p className="text-sm text-ink-400 mt-0.5">Broadcast messages shown to all shops in their dashboard</p>
        </div>
        <button onClick={() => setShowForm(v => !v)} className="kh-btn-primary flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm">
          <Plus size={16} /> New Announcement
        </button>
      </div>

      {showForm && (
        <div className="kh-card p-5">
          <h3 className="font-semibold text-ink-800 mb-4">Create Announcement</h3>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-ink-500 mb-1.5 block">Title *</label>
                <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Scheduled Maintenance" className="border border-ink-200 rounded-xl px-4 py-2 text-sm w-full focus:outline-none" />
              </div>
              <div>
                <label className="text-xs font-semibold text-ink-500 mb-1.5 block">Type</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  className="border border-ink-200 rounded-xl px-4 py-2 text-sm w-full focus:outline-none">
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="success">Success</option>
                  <option value="error">Error</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-500 mb-1.5 block">Message *</label>
              <textarea required rows={3} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                placeholder="Write your announcement here..." className="border border-ink-200 rounded-xl px-4 py-2 text-sm w-full focus:outline-none resize-none" />
            </div>
            <div className="w-64">
              <label className="text-xs font-semibold text-ink-500 mb-1.5 block">Expires At (optional)</label>
              <input type="datetime-local" value={form.expires_at} onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
                className="border border-ink-200 rounded-xl px-4 py-2 text-sm w-full focus:outline-none" />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-ink-200 rounded-xl text-sm font-semibold hover:bg-ink-50">Cancel</button>
              <button type="submit" disabled={saving} className="kh-btn-primary px-5 py-2 rounded-xl text-sm disabled:opacity-50">
                {saving ? 'Publishing...' : 'Publish'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {loading ? (
          [...Array(3)].map((_, i) => <div key={i} className="kh-card h-20 animate-pulse bg-ink-100" />)
        ) : items.length === 0 ? (
          <div className="kh-card p-12 text-center text-ink-400">
            <Megaphone size={36} className="mx-auto mb-2 opacity-30" />
            <p>No announcements yet</p>
          </div>
        ) : items.map(ann => (
          <div key={ann.id} className={`kh-card p-5 flex items-start gap-4 ${!ann.is_active ? 'opacity-60' : ''}`}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${typeColors[ann.type] || 'kh-badge-gray'}`}>{ann.type}</span>
                {!ann.is_active && <span className="kh-badge-gray px-2.5 py-0.5 rounded-full text-xs font-semibold">Inactive</span>}
                {ann.expires_at && <span className="text-xs text-ink-400">Expires {new Date(ann.expires_at).toLocaleDateString()}</span>}
              </div>
              <p className="font-semibold text-ink-900">{ann.title}</p>
              <p className="text-sm text-ink-500 mt-0.5">{ann.message}</p>
              <p className="text-xs text-ink-400 mt-1">{new Date(ann.created_at).toLocaleString()}</p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button onClick={() => toggle(ann.id, ann.is_active)} className="p-2 rounded-lg text-ink-400 hover:bg-ink-100 transition-colors">
                {ann.is_active ? <ToggleRight size={18} style={{ color: '#00796B' }} /> : <ToggleLeft size={18} />}
              </button>
              <button onClick={() => remove(ann.id)} className="p-2 rounded-lg text-ink-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
