'use client';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { MapPin, Pencil, Plus, ToggleLeft, ToggleRight } from 'lucide-react';
import api from '../../../lib/api';

interface Courier { id: number; name: string; tracking_url: string | null; adapter: string | null; is_active: boolean; sort_order: number; }

const empty = { name: '', tracking_url: '' };
const inputClass = 'border border-ink-200 rounded-xl px-4 py-2 text-sm w-full focus:outline-none';

const MESSAGES: Record<string, string> = {
  COURIER_NAME: 'Enter the courier\'s name.',
  COURIER_DUPLICATE: 'A courier with that name is already on the list.',
  COURIER_URL_INVALID: 'Enter a full tracking link starting with http:// or https://.',
};
const errorMessage = (err: any) => MESSAGES[err?.response?.data?.code] ?? 'That didn\'t save. Please try again.';

/** The shared courier list every COD business can choose from. Hiding one keeps it on past orders. */
export default function CouriersPage() {
  const [items, setItems] = useState<Courier[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [editing, setEditing] = useState<number | 'new' | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setFailed(false);
    try {
      const { data } = await api.get<Courier[]>('/super-admin/cod-couriers');
      setItems(data);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  function start(target: Courier | 'new') {
    setEditing(target === 'new' ? 'new' : target.id);
    setForm(target === 'new' ? empty : { name: target.name, tracking_url: target.tracking_url ?? '' });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const body = { name: form.name, tracking_url: form.tracking_url.trim() || null };
    try {
      if (editing === 'new') await api.post('/super-admin/cod-couriers', body);
      else await api.patch(`/super-admin/cod-couriers/${editing}`, body);
      setEditing(null);
      await load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggle(c: Courier) {
    try {
      await api.patch(`/super-admin/cod-couriers/${c.id}`, { is_active: !c.is_active });
      await load();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-ink-900">Couriers</h2>
          <p className="text-sm text-ink-400 mt-0.5">The list every COD business can choose from. A tracking link adds a Track parcel button to their orders.</p>
        </div>
        <button onClick={() => start('new')} className="kh-btn-primary flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm shrink-0">
          <Plus size={16} /> Add courier
        </button>
      </div>

      {editing !== null && (
        <div className="kh-card p-5">
          <h3 className="font-semibold text-ink-800 mb-4">{editing === 'new' ? 'Add courier' : 'Edit courier'}</h3>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label htmlFor="courier-name" className="text-xs font-semibold text-ink-500 mb-1.5 block">Name *</label>
              <input id="courier-name" required maxLength={100} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label htmlFor="courier-url" className="text-xs font-semibold text-ink-500 mb-1.5 block">Tracking link</label>
              <input id="courier-url" type="url" maxLength={500} value={form.tracking_url} onChange={e => setForm(f => ({ ...f, tracking_url: e.target.value }))}
                placeholder="https://example.com/track?id={tracking}" className={inputClass} />
              <p className="text-xs text-ink-400 mt-1.5">{'Put {tracking} where the tracking number goes. Test it with a real parcel before saving.'}</p>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 border border-ink-200 rounded-xl text-sm font-semibold hover:bg-ink-50">Cancel</button>
              <button type="submit" disabled={saving} className="kh-btn-primary px-5 py-2 rounded-xl text-sm disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {loading ? (
          [...Array(3)].map((_, i) => <div key={i} className="kh-card h-16 animate-pulse bg-ink-100" />)
        ) : failed ? (
          <div className="kh-card p-12 text-center text-ink-400">
            <p>Could not load the couriers.</p>
            <button onClick={load} className="mt-3 px-4 py-2 border border-ink-200 rounded-xl text-sm font-semibold hover:bg-ink-50">Try again</button>
          </div>
        ) : items.length === 0 ? (
          <div className="kh-card p-12 text-center text-ink-400">
            <MapPin size={36} className="mx-auto mb-2 opacity-30" />
            <p>No couriers yet</p>
          </div>
        ) : items.map(c => (
          <div key={c.id} className={`kh-card p-4 flex items-center gap-4 ${!c.is_active ? 'opacity-60' : ''}`}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-ink-900 truncate">{c.name}</span>
                {!c.is_active && <span className="kh-badge-gray px-2.5 py-0.5 rounded-full text-xs font-semibold">Hidden</span>}
                {c.adapter && <span className="kh-badge-teal px-2.5 py-0.5 rounded-full text-xs font-semibold">Automatic tracking</span>}
              </div>
              <p className="text-xs text-ink-400 mt-0.5 truncate">{c.tracking_url || 'No tracking link'}</p>
            </div>
            <button onClick={() => start(c)} aria-label={`Edit ${c.name}`} className="p-2 rounded-lg text-ink-500 hover:bg-ink-50"><Pencil size={16} /></button>
            <button onClick={() => toggle(c)} aria-label={`${c.is_active ? 'Hide' : 'Show'} ${c.name}`} className="p-2 rounded-lg text-ink-500 hover:bg-ink-50">
              {c.is_active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
