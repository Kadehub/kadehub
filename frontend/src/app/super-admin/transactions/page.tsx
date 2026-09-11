'use client';
import { useEffect, useState } from 'react';
import api from '../../../lib/api';
import { CreditCard, Download, FileText, Eye } from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import { printInvoice } from '../../../lib/invoice-print';

export default function TransactionsPage() {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [slip, setSlip] = useState<any>(null);

  useEffect(() => { load(1); }, []);

  async function load(p: number) {
    setLoading(true);
    const { data: res } = await api.get('/super-admin/transactions', { params: { page: p, limit: 20 } });
    setData(res.data); setTotal(res.total); setLoading(false);
  }

  async function exportCsv() {
    setExporting(true);
    const res = await api.get('/super-admin/transactions/export/csv', { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url; a.download = `transactions-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url); setExporting(false);
  }

  async function downloadInvoice(tx: any) {
    const { data } = await api.get(`/super-admin/transactions/${tx.id}/invoice`);
    printInvoice(data);
  }

  const totalRevenue = data.filter(t => t.status === 'completed').reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-ink-900">Transactions</h2>
          <p className="text-sm text-ink-400 mt-0.5">{total} total transactions across all shops</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="kh-card px-4 py-2.5 flex items-center gap-2.5">
            <CreditCard size={16} style={{ color: '#00796B' }} />
            <div>
              <p className="text-xs text-ink-400">Total Revenue</p>
              <p className="text-sm font-bold text-ink-900">LKR {totalRevenue.toLocaleString()}</p>
            </div>
          </div>
          <button onClick={exportCsv} disabled={exporting}
            className="kh-btn-primary flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm disabled:opacity-50">
            <Download size={15} /> {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>
      </div>

      <div className="kh-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100">
                {['#', 'Shop', 'Package', 'Amount', 'Cycle', 'Gateway', 'Reference', 'Status', 'Date', 'Slip', 'Invoice'].map(h => (
                  <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-ink-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              {loading ? (
                [...Array(8)].map((_, i) => <tr key={i}><td colSpan={11} className="px-5 py-3"><div className="h-6 bg-ink-100 rounded-lg animate-pulse" /></td></tr>)
              ) : data.map((tx: any) => (
                <tr key={tx.id} className="hover:bg-ink-50 transition-colors">
                  <td className="px-5 py-3.5 text-ink-400 text-xs">#{tx.id}</td>
                  <td className="px-5 py-3.5 font-semibold text-ink-800">{tx.tenant?.name}</td>
                  <td className="px-5 py-3.5 text-ink-600">{tx.package?.name}</td>
                  <td className="px-5 py-3.5 font-semibold text-ink-900">LKR {tx.amount?.toLocaleString()}</td>
                  <td className="px-5 py-3.5 capitalize text-ink-500">{tx.billing_cycle}</td>
                  <td className="px-5 py-3.5 capitalize text-ink-500">{tx.gateway}</td>
                  <td className="px-5 py-3.5 font-mono text-xs text-ink-400">{tx.gateway_ref}</td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      tx.status === 'completed' ? 'kh-badge-teal' :
                      tx.status === 'pending' || tx.status === 'refunded' ? 'kh-badge-amber' : 'kh-badge-coral'
                    }`}>{tx.status === 'pending' ? 'pending review' : tx.status}</span>
                  </td>
                  <td className="px-5 py-3.5 text-ink-400 text-xs">{new Date(tx.created_at).toLocaleDateString()}</td>
                  <td className="px-5 py-3.5">
                    {tx.metadata?.slip_url ? (
                      <button onClick={() => setSlip(tx)}
                        className="p-2 rounded-lg text-ink-400 hover:bg-teal-50 hover:text-teal-700 transition-colors" title="View slip">
                        <Eye size={15} />
                      </button>
                    ) : <span className="text-ink-300 text-xs">—</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    <button onClick={() => downloadInvoice(tx)}
                      className="p-2 rounded-lg text-ink-400 hover:bg-blue-50 hover:text-blue-600 transition-colors" title="Print Invoice">
                      <FileText size={15} />
                    </button>
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
              <button disabled={page === 1} onClick={() => { setPage(p => p - 1); load(page - 1); }}
                className="px-3 py-1.5 border border-ink-200 rounded-lg disabled:opacity-40 hover:bg-ink-50 text-xs font-semibold">← Prev</button>
              <button disabled={page * 20 >= total} onClick={() => { setPage(p => p + 1); load(page + 1); }}
                className="px-3 py-1.5 border border-ink-200 rounded-lg disabled:opacity-40 hover:bg-ink-50 text-xs font-semibold">Next →</button>
            </div>
          </div>
        )}
      </div>

      <Modal open={!!slip} onClose={() => setSlip(null)} title="Payment slip" width="max-w-3xl">
        {slip?.metadata?.slip_url && (
          String(slip.metadata.slip_url).toLowerCase().endsWith('.pdf')
            ? <iframe src={slip.metadata.slip_url} className="w-full h-[70vh] rounded-lg border border-ink-100" />
            : <img src={slip.metadata.slip_url} alt="Slip" className="w-full max-h-[70vh] object-contain rounded-lg" />
        )}
      </Modal>
    </div>
  );
}
