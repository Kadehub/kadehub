'use client';
import { useEffect, useState } from 'react';
import api from '../../../lib/api';
import { Send, FileText, Plus, Printer, Trash2 } from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import { printQuotation } from '../../../lib/quotation-print';
import toast from 'react-hot-toast';

const emptyCreate = {
  contact_name: '', email: '', business_type: '', country: '', description: '',
  package_id: '', billing_cycle: 'monthly' as 'monthly' | 'yearly',
  quoted_amount: '', valid_until: '', notes: '', include_registration_fee: true,
};

export default function QuotationsPage() {
  const [data, setData] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreate);
  const [editForm, setEditForm] = useState({ quoted_amount: '', valid_until: '', notes: '', status: 'new' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load(1);
    api.get('/super-admin/packages').then(r => setPackages(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, [status]);

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

  async function createQuotation(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/super-admin/quotations', {
        contact_name: createForm.contact_name,
        email: createForm.email,
        business_type: createForm.business_type || undefined,
        country: createForm.country || undefined,
        description: createForm.description || undefined,
        package_id: createForm.package_id ? parseInt(createForm.package_id) : undefined,
        billing_cycle: createForm.billing_cycle,
        quoted_amount: createForm.quoted_amount ? parseFloat(createForm.quoted_amount) : undefined,
        valid_until: createForm.valid_until || undefined,
        notes: createForm.notes || undefined,
        include_registration_fee: createForm.include_registration_fee,
      });
      toast.success('Quotation created');
      setShowCreate(false);
      setCreateForm(emptyCreate);
      load(1);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create quotation');
    } finally { setSaving(false); }
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
      toast.success('Quotation updated');
      setSelected(null); load(page);
    } catch {
      toast.error('Failed to update');
    } finally { setSaving(false); }
  }

  async function sendQuote(id: number) {
    try {
      await api.post(`/super-admin/quotations/${id}/send`);
      toast.success('Quotation emailed to client');
      load(page);
    } catch {
      toast.error('Failed to send email');
    }
  }

  async function printQuote(id: number) {
    const { data } = await api.get(`/super-admin/quotations/${id}/print`);
    printQuotation(data);
  }

  async function removeQuote(id: number) {
    if (!confirm('Delete this quotation?')) return;
    await api.delete(`/super-admin/quotations/${id}`);
    toast.success('Deleted');
    load(page);
  }

  const selectedPkg = packages.find(p => String(p.id) === createForm.package_id);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-ink-900">Quotations</h2>
          <p className="text-sm text-ink-400 mt-0.5">Create quotes for clients and manage landing page requests</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={status} onChange={e => setStatus(e.target.value)}
            className="border border-ink-200 rounded-xl px-3 py-2 text-sm">
            <option value="">All statuses</option>
            {['new', 'sent', 'accepted', 'rejected', 'converted'].map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
          <button onClick={() => setShowCreate(true)}
            className="kh-btn-primary flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm">
            <Plus size={16} /> New Quotation
          </button>
        </div>
      </div>

      <div className="kh-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100">
                {['Quote #', 'Contact', 'Business', 'Amount', 'Status', 'Valid Until', 'Actions'].map(h => (
                  <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-ink-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              {loading ? (
                [...Array(6)].map((_, i) => <tr key={i}><td colSpan={7} className="px-5 py-3"><div className="h-6 bg-ink-100 rounded-lg animate-pulse" /></td></tr>)
              ) : data.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-ink-400">
                  No quotations yet — click <strong>New Quotation</strong> to create one
                </td></tr>
              ) : data.map((q: any) => (
                <tr key={q.id} className="hover:bg-ink-50 transition-colors">
                  <td className="px-5 py-3.5 font-mono text-xs font-semibold">{q.quote_number}</td>
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-ink-800">{q.contact_name}</p>
                    <p className="text-xs text-ink-400">{q.email}</p>
                  </td>
                  <td className="px-5 py-3.5 text-ink-600">{q.business_type || q.package?.name || '—'}</td>
                  <td className="px-5 py-3.5 font-semibold">
                    {q.quoted_amount ? `LKR ${Number(q.quoted_amount).toLocaleString()}` : '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      q.status === 'new' ? 'kh-badge-amber' :
                      q.status === 'sent' || q.status === 'accepted' ? 'kh-badge-teal' : 'kh-badge-coral'
                    }`}>{q.status}</span>
                  </td>
                  <td className="px-5 py-3.5 text-ink-400 text-xs">
                    {q.valid_until ? new Date(q.valid_until).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(q)} title="Edit"
                        className="p-2 rounded-lg text-ink-400 hover:bg-teal-50 hover:text-teal-700 transition-colors">
                        <FileText size={15} />
                      </button>
                      <button onClick={() => printQuote(q.id)} title="Print"
                        className="p-2 rounded-lg text-ink-400 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                        <Printer size={15} />
                      </button>
                      <button onClick={() => sendQuote(q.id)} title="Email to client"
                        className="p-2 rounded-lg text-ink-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                        <Send size={15} />
                      </button>
                      <button onClick={() => removeQuote(q.id)} title="Delete"
                        className="p-2 rounded-lg text-ink-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                        <Trash2 size={15} />
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
            <span>Page {page} · {total} total</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => load(page - 1)}
                className="px-3 py-1.5 border border-ink-200 rounded-lg disabled:opacity-40 text-xs font-semibold">← Prev</button>
              <button disabled={page * 20 >= total} onClick={() => load(page + 1)}
                className="px-3 py-1.5 border border-ink-200 rounded-lg disabled:opacity-40 text-xs font-semibold">Next →</button>
            </div>
          </div>
        )}
      </div>

      {/* Create Quotation Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Quotation" width="max-w-2xl">
        <form onSubmit={createQuotation} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-ink-500 block mb-1">Client Name *</label>
              <input required value={createForm.contact_name}
                onChange={e => setCreateForm(f => ({ ...f, contact_name: e.target.value }))}
                className="border border-ink-200 rounded-xl px-3 py-2 text-sm w-full" placeholder="John Smith" />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-500 block mb-1">Email *</label>
              <input required type="email" value={createForm.email}
                onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))}
                className="border border-ink-200 rounded-xl px-3 py-2 text-sm w-full" placeholder="client@company.com" />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-500 block mb-1">Business Type</label>
              <input value={createForm.business_type}
                onChange={e => setCreateForm(f => ({ ...f, business_type: e.target.value }))}
                className="border border-ink-200 rounded-xl px-3 py-2 text-sm w-full" placeholder="Retail, Restaurant…" />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-500 block mb-1">Country</label>
              <input value={createForm.country}
                onChange={e => setCreateForm(f => ({ ...f, country: e.target.value }))}
                className="border border-ink-200 rounded-xl px-3 py-2 text-sm w-full" placeholder="Sri Lanka" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-ink-500 block mb-1">Description / Scope</label>
            <textarea value={createForm.description}
              onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))} rows={2}
              className="border border-ink-200 rounded-xl px-3 py-2 text-sm w-full resize-none"
              placeholder="What services are included in this quote?" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-ink-500 block mb-1">Package Plan</label>
              <select value={createForm.package_id}
                onChange={e => setCreateForm(f => ({ ...f, package_id: e.target.value }))}
                className="border border-ink-200 rounded-xl px-3 py-2 text-sm w-full">
                <option value="">— Custom amount —</option>
                {packages.map(p => (
                  <option key={p.id} value={p.id}>{p.name} — LKR {Number(p.price_monthly).toLocaleString()}/mo</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-500 block mb-1">Billing Cycle</label>
              <select value={createForm.billing_cycle}
                onChange={e => setCreateForm(f => ({ ...f, billing_cycle: e.target.value as any }))}
                className="border border-ink-200 rounded-xl px-3 py-2 text-sm w-full">
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>

          {selectedPkg && (
            <div className="rounded-xl p-3 text-sm" style={{ background: '#F0FDF9', border: '1px solid #B2DFDB' }}>
              <p className="font-semibold text-ink-700">Estimated total (auto-calculated):</p>
              <p className="text-ink-600 mt-1">
                Registration LKR 25,000
                + {selectedPkg.name} LKR {Number(createForm.billing_cycle === 'yearly' ? selectedPkg.price_yearly : selectedPkg.price_monthly).toLocaleString()}
                = <strong style={{ color: '#00796B' }}>
                  LKR {(25000 + Number(createForm.billing_cycle === 'yearly' ? selectedPkg.price_yearly : selectedPkg.price_monthly)).toLocaleString()}
                </strong>
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-ink-500 block mb-1">Custom Amount (LKR)</label>
              <input type="number" value={createForm.quoted_amount}
                onChange={e => setCreateForm(f => ({ ...f, quoted_amount: e.target.value }))}
                className="border border-ink-200 rounded-xl px-3 py-2 text-sm w-full" placeholder="Leave blank to auto-calculate" />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-500 block mb-1">Valid Until</label>
              <input type="date" value={createForm.valid_until}
                onChange={e => setCreateForm(f => ({ ...f, valid_until: e.target.value }))}
                className="border border-ink-200 rounded-xl px-3 py-2 text-sm w-full" />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-ink-600 cursor-pointer">
            <input type="checkbox" checked={createForm.include_registration_fee}
              onChange={e => setCreateForm(f => ({ ...f, include_registration_fee: e.target.checked }))}
              className="rounded" />
            Include registration fee (LKR 25,000)
          </label>

          <div>
            <label className="text-xs font-semibold text-ink-500 block mb-1">Internal Notes</label>
            <textarea value={createForm.notes}
              onChange={e => setCreateForm(f => ({ ...f, notes: e.target.value }))} rows={2}
              className="border border-ink-200 rounded-xl px-3 py-2 text-sm w-full resize-none" />
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setShowCreate(false)}
              className="px-4 py-2.5 rounded-xl border border-ink-200 text-sm font-semibold hover:bg-ink-50">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="kh-btn-primary flex-1 py-2.5 rounded-xl text-sm disabled:opacity-50">
              {saving ? 'Creating…' : 'Create Quotation'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Quotation ${selected?.quote_number || ''}`} width="max-w-lg">
        {selected && (
          <div className="space-y-4">
            <div className="text-sm space-y-1 rounded-xl p-3 bg-ink-50">
              <p><strong>{selected.contact_name}</strong> · {selected.email}</p>
              <p className="text-ink-500">{selected.description || 'No description'}</p>
              {selected.line_items?.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs text-ink-600">
                  {selected.line_items.map((i: any, idx: number) => (
                    <li key={idx}>• {i.description} — LKR {Number(i.total ?? i.unit_price).toLocaleString()}</li>
                  ))}
                </ul>
              )}
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
              <button onClick={() => printQuote(selected.id)}
                className="px-4 py-2.5 rounded-xl border border-ink-200 text-sm font-semibold hover:bg-ink-50 flex items-center gap-2">
                <Printer size={14} /> Print
              </button>
              <button onClick={saveEdit} disabled={saving}
                className="kh-btn-primary flex-1 py-2.5 rounded-xl text-sm disabled:opacity-50">
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => { sendQuote(selected.id); setSelected(null); }}
                className="px-4 py-2.5 rounded-xl border border-ink-200 text-sm font-semibold hover:bg-ink-50 flex items-center gap-2">
                <Send size={14} /> Email
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
