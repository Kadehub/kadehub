'use client';
import { useEffect, useState } from 'react';
import api from '../../../lib/api';
import { FileText, Filter, Mail } from 'lucide-react';
import { printInvoice } from '../../../lib/invoice-print';
import toast from 'react-hot-toast';

export default function InvoicesPage() {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');

  useEffect(() => { load(1); }, [status]);

  async function load(p: number) {
    setLoading(true);
    const { data: res } = await api.get('/super-admin/invoices', {
      params: { page: p, limit: 20, ...(status ? { status } : {}) },
    });
    setData(res.data); setTotal(res.total); setPage(p); setLoading(false);
  }

  async function downloadInvoice(id: number) {
    const { data } = await api.get(`/super-admin/invoices/${id}`);
    printInvoice(data);
  }

  async function emailInvoice(id: number) {
    try {
      const { data } = await api.post(`/super-admin/invoices/${id}/email`);
      toast.success(`Invoice emailed to ${data.sent_to}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to send email');
    }
  }

  const pendingTotal = data.filter(i => i.status === 'pending').reduce((s, i) => s + Number(i.amount), 0);
  const paidTotal = data.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.amount), 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-ink-900">Invoices</h2>
          <p className="text-sm text-ink-400 mt-0.5">Auto-generated when clients register and pay</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter size={15} className="text-ink-400" />
          <select value={status} onChange={e => setStatus(e.target.value)}
            className="border border-ink-200 rounded-xl px-3 py-2 text-sm">
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="cancelled">Cancelled</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="kh-card px-4 py-3">
          <p className="text-xs text-ink-400">Total Invoices</p>
          <p className="text-lg font-bold text-ink-900">{total}</p>
        </div>
        <div className="kh-card px-4 py-3">
          <p className="text-xs text-ink-400">Pending (this page)</p>
          <p className="text-lg font-bold text-amber-600">LKR {pendingTotal.toLocaleString()}</p>
        </div>
        <div className="kh-card px-4 py-3">
          <p className="text-xs text-ink-400">Paid (this page)</p>
          <p className="text-lg font-bold" style={{ color: '#00796B' }}>LKR {paidTotal.toLocaleString()}</p>
        </div>
      </div>

      <div className="kh-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100">
                {['Invoice #', 'Shop', 'Type', 'Amount', 'Status', 'Issued', 'Due', 'Actions'].map(h => (
                  <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-ink-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              {loading ? (
                [...Array(6)].map((_, i) => <tr key={i}><td colSpan={8} className="px-5 py-3"><div className="h-6 bg-ink-100 rounded-lg animate-pulse" /></td></tr>)
              ) : data.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-ink-400">No invoices yet</td></tr>
              ) : data.map((inv: any) => (
                <tr key={inv.id} className="hover:bg-ink-50 transition-colors">
                  <td className="px-5 py-3.5 font-mono text-xs font-semibold text-ink-700">{inv.invoice_number}</td>
                  <td className="px-5 py-3.5 font-semibold text-ink-800">{inv.tenant?.name}</td>
                  <td className="px-5 py-3.5 capitalize text-ink-500">{String(inv.type).replace(/_/g, ' ')}</td>
                  <td className="px-5 py-3.5 font-semibold">{inv.currency} {Number(inv.amount).toLocaleString()}</td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      inv.status === 'paid' ? 'kh-badge-teal' :
                      inv.status === 'pending' ? 'kh-badge-amber' : 'kh-badge-coral'
                    }`}>{inv.status}</span>
                  </td>
                  <td className="px-5 py-3.5 text-ink-400 text-xs">{inv.issued_at ? new Date(inv.issued_at).toLocaleDateString() : '—'}</td>
                  <td className="px-5 py-3.5 text-ink-400 text-xs">{inv.due_at ? new Date(inv.due_at).toLocaleDateString() : '—'}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-1">
                      <button onClick={() => downloadInvoice(inv.id)}
                        className="p-2 rounded-lg text-ink-400 hover:bg-blue-50 hover:text-blue-600 transition-colors" title="Print">
                        <FileText size={15} />
                      </button>
                      <button onClick={() => emailInvoice(inv.id)}
                        className="p-2 rounded-lg text-ink-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors" title="Email to customer">
                        <Mail size={15} />
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
              <button disabled={page === 1} onClick={() => load(page - 1)}
                className="px-3 py-1.5 border border-ink-200 rounded-lg disabled:opacity-40 hover:bg-ink-50 text-xs font-semibold">← Prev</button>
              <button disabled={page * 20 >= total} onClick={() => load(page + 1)}
                className="px-3 py-1.5 border border-ink-200 rounded-lg disabled:opacity-40 hover:bg-ink-50 text-xs font-semibold">Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
