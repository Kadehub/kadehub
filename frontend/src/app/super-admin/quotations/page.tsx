'use client';
import { useEffect, useState } from 'react';
import api from '../../../lib/api';
import { Send, FileText } from 'lucide-react';
import Modal from '../../../components/ui/Modal';

export default function QuotationsPage() {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [editForm, setEditForm] = useState({ quoted_amount: '', valid_until: '', notes: '', status: 'new' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(1); }, [status]);

  async function load(p: number) {
    setLoading(true);
    const { data: res } = await api.get('/super-admin/quotations', {
      params: { page: p, limit: 20, ...(status ? { status } : {}) },
    });
    setData(res.data); setTotal(res.total); setPage(p); setLoading(false);
  }

  function openEdit(q: any) {
    setSelected(q);
    setEditForm({
      quoted_amount: q.quoted_amount ? String(q.quoted_amount) : '',
      valid_until: q.valid_until ? q.valid_until.slice(0, 10) : '',
      notes: q.notes || '',
      status: q.status,
    });
  }

  async function saveEdit() {
    if (!selected) return;
    setSaving(true);
    try {
      await api.patch(`/super-admin/quotations/${selected.id}`, {
        quoted_amount: editForm.quoted_amount ? parseFloat(editForm.quoted_amount) : undefined,
        valid_until: editForm.valid_until || undefined,
        notes: editForm.notes,
        status: editForm.status,
      });
      setSelected(null); load(page);
    } finally { setSaving(false); }
  }

  async function sendQuote(id: number) {
    await api.post(`/super-admin/quotations/${id}/send`);
    load(page);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-ink-900">Quotations</h2>
          <p className="text-sm text-ink-400 mt-0.5">Quote requests from the landing page</p>
        </div>
        <select value={status} onChange={e => setStatus(e.target.value)}
          className="border border-ink-200 rounded-xl px-3 py-2 text-sm">
          <option value="">All statuses</option>
          {['new', 'sent', 'accepted', 'rejected', 'converted'].map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      <div className="kh-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100">
                {['Quote #', 'Contact', 'Business', 'Country', 'Budget', 'Status', 'Date', 'Actions'].map(h => (
                  <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-ink-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              {loading ? (
                [...Array(6)].map((_, i) => <tr key={i}><td colSpan={8} className="px-5 py-3"><div className="h-6 bg-ink-100 rounded-lg animate-pulse" /></td></tr>)
              ) : data.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-ink-400">No quotations yet</td></tr>
              ) : data.map((q: any) => (
                <tr key={q.id} className="hover:bg-ink-50 transition-colors">
                  <td className="px-5 py-3.5 font-mono text-xs font-semibold">{q.quote_number}</td>
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-ink-800">{q.contact_name}</p>
                    <p className="text-xs text-ink-400">{q.email}</p>
                  </td>
                  <td className="px-5 py-3.5 text-ink-600">{q.business_type || '—'}</td>
                  <td className="px-5 py-3.5 text-ink-500">{q.country || '—'}</td>
                  <td className="px-5 py-3.5 text-ink-500">{q.budget_range || '—'}</td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      q.status === 'new' ? 'kh-badge-amber' :
                      q.status === 'sent' || q.status === 'accepted' ? 'kh-badge-teal' : 'kh-badge-coral'
                    }`}>{q.status}</span>
                  </td>
                  <td className="px-5 py-3.5 text-ink-400 text-xs">{new Date(q.created_at).toLocaleDateString()}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(q)} title="View / Edit"
                        className="p-2 rounded-lg text-ink-400 hover:bg-teal-50 hover:text-teal-700 transition-colors">
                        <FileText size={15} />
                      </button>
                      <button onClick={() => sendQuote(q.id)} title="Send quote email"
                        className="p-2 rounded-lg text-ink-400 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                        <Send size={15} />
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
            <span>Page {page}</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => load(page - 1)}
                className="px-3 py-1.5 border border-ink-200 rounded-lg disabled:opacity-40 text-xs font-semibold">← Prev</button>
              <button disabled={page * 20 >= total} onClick={() => load(page + 1)}
                className="px-3 py-1.5 border border-ink-200 rounded-lg disabled:opacity-40 text-xs font-semibold">Next →</button>
            </div>
          </div>
        )}
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Quotation ${selected?.quote_number || ''}`} width="max-w-lg">
        {selected && (
          <div className="space-y-4">
            <div className="text-sm space-y-2">
              <p><strong>Contact:</strong> {selected.contact_name} ({selected.email})</p>
              <p><strong>Description:</strong> {selected.description || '—'}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-ink-500 block mb-1">Quoted Amount (LKR)</label>
                <input type="number" value={editForm.quoted_amount} onChange={e => setEditForm(f => ({ ...f, quoted_amount: e.target.value }))}
                  className="border border-ink-200 rounded-xl px-3 py-2 text-sm w-full" />
              </div>
              <div>
                <label className="text-xs font-semibold text-ink-500 block mb-1">Valid Until</label>
                <input type="date" value={editForm.valid_until} onChange={e => setEditForm(f => ({ ...f, valid_until: e.target.value }))}
                  className="border border-ink-200 rounded-xl px-3 py-2 text-sm w-full" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-500 block mb-1">Status</label>
              <select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                className="border border-ink-200 rounded-xl px-3 py-2 text-sm w-full">
                {['new', 'sent', 'accepted', 'rejected', 'converted'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-500 block mb-1">Notes</label>
              <textarea value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} rows={3}
                className="border border-ink-200 rounded-xl px-3 py-2 text-sm w-full resize-none" />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={saveEdit} disabled={saving}
                className="kh-btn-primary flex-1 py-2.5 rounded-xl text-sm disabled:opacity-50">
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => { sendQuote(selected.id); setSelected(null); }}
                className="px-4 py-2.5 rounded-xl border border-ink-200 text-sm font-semibold hover:bg-ink-50">
                Send Email
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
