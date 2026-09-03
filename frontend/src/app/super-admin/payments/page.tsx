'use client';
import { useEffect, useState } from 'react';
import api from '../../../lib/api';
import Modal from '../../../components/ui/Modal';
import toast from 'react-hot-toast';
import { Banknote, Check, X, Eye } from 'lucide-react';

type Filter = 'pending' | 'completed' | 'failed' | '';

export default function PaymentSlipsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [filter, setFilter] = useState<Filter>('pending');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [reason, setReason] = useState('');

  useEffect(() => { load(); }, [filter]);

  async function load() {
    setLoading(true);
    const { data } = await api.get('/super-admin/bank-transfers', { params: filter ? { status: filter } : {} });
    setRows(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function approve(id: number) {
    setBusyId(id);
    try {
      await api.patch(`/super-admin/bank-transfers/${id}/approve`);
      toast.success('Slip approved — shop activated');
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Approve failed');
    } finally { setBusyId(null); }
  }

  async function reject() {
    if (!rejectId) return;
    setBusyId(rejectId);
    try {
      await api.patch(`/super-admin/bank-transfers/${rejectId}/reject`, { reason: reason || undefined });
      toast.success('Slip rejected');
      setRejectId(null); setReason('');
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Reject failed');
    } finally { setBusyId(null); }
  }

  const slipUrl = (tx: any) => tx.metadata?.slip_url as string | undefined;
  const isPdf = (url?: string) => !!url && url.toLowerCase().endsWith('.pdf');

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-ink-900">Payment Slips</h2>
          <p className="text-sm text-ink-400 mt-0.5">Review bank transfers and activate shops</p>
        </div>
        <div className="flex gap-1 p-1 rounded-xl bg-white border border-ink-200">
          {([
            ['pending', 'Pending'],
            ['completed', 'Approved'],
            ['failed', 'Rejected'],
            ['', 'All'],
          ] as [Filter, string][]).map(([key, label]) => (
            <button key={label} onClick={() => setFilter(key)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: filter === key ? '#00A884' : 'transparent', color: filter === key ? 'white' : '#64748B' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="kh-card h-28 animate-pulse bg-ink-100" />)}</div>
      ) : rows.length === 0 ? (
        <div className="kh-card p-10 text-center">
          <Banknote size={28} className="mx-auto mb-2 text-ink-300" />
          <p className="text-sm text-ink-400">No {filter || ''} slips</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map(tx => (
            <div key={tx.id} className="kh-card p-5 flex flex-col md:flex-row gap-4">
              <button type="button" onClick={() => slipUrl(tx) && setPreview(tx)}
                className="w-full md:w-36 h-28 rounded-xl overflow-hidden bg-ink-50 border border-ink-100 flex items-center justify-center flex-shrink-0">
                {slipUrl(tx) && !isPdf(slipUrl(tx)) ? (
                  <img src={slipUrl(tx)} alt="Slip" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center text-ink-400 text-xs px-2">
                    <Eye size={16} className="mx-auto mb-1" />
                    {slipUrl(tx) ? 'View PDF' : 'No slip'}
                  </div>
                )}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-ink-900">{tx.tenant?.name || `Tenant #${tx.tenant_id}`}</p>
                    <p className="text-xs text-ink-400 font-mono">{tx.gateway_ref}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold"
                    style={{
                      background: tx.status === 'completed' ? '#E0F2F1' : tx.status === 'pending' ? '#FFF8E1' : '#FFF0F0',
                      color: tx.status === 'completed' ? '#00796B' : tx.status === 'pending' ? '#B45309' : '#E53E3E',
                    }}>
                    {tx.status === 'pending' ? 'pending review' : tx.status}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-ink-600">
                  <p>Type: <span className="font-semibold capitalize">{tx.metadata?.type?.replace('_', ' ') || 'subscription'}</span></p>
                  <p>Amount: <span className="font-semibold">LKR {Number(tx.amount).toLocaleString()}</span></p>
                  <p>Plan: <span className="font-semibold">{tx.package?.name || 'Registration'}</span></p>
                  <p>Depositor: <span className="font-semibold">{tx.metadata?.depositor_name || '—'}</span></p>
                  {tx.metadata?.notes && <p className="col-span-2">Notes: {tx.metadata.notes}</p>}
                  {tx.metadata?.reject_reason && <p className="col-span-2 text-red-600">Reason: {tx.metadata.reject_reason}</p>}
                  <p className="col-span-2 text-ink-400">{new Date(tx.created_at).toLocaleString('en-LK')}</p>
                </div>
              </div>
              {tx.status === 'pending' && (
                <div className="flex md:flex-col gap-2 justify-end">
                  <button disabled={busyId === tx.id} onClick={() => approve(tx.id)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-50"
                    style={{ background: '#00A884' }}>
                    <Check size={14} /> Approve
                  </button>
                  <button disabled={busyId === tx.id} onClick={() => { setRejectId(tx.id); setReason(''); }}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-ink-200 text-ink-600 hover:bg-red-50 hover:text-red-600">
                    <X size={14} /> Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={!!preview} onClose={() => setPreview(null)} title="Payment slip" width="max-w-3xl">
        {preview && slipUrl(preview) && (
          isPdf(slipUrl(preview))
            ? <iframe src={slipUrl(preview)} className="w-full h-[70vh] rounded-lg border border-ink-100" />
            : <img src={slipUrl(preview)} alt="Slip" className="w-full max-h-[70vh] object-contain rounded-lg" />
        )}
      </Modal>

      <Modal open={rejectId !== null} onClose={() => setRejectId(null)} title="Reject slip">
        <p className="text-sm text-ink-500 mb-3">The shop will stay inactive until they submit a new slip.</p>
        <textarea value={reason} onChange={e => setReason(e.target.value)}
          placeholder="Optional reason (shown to you in the record)"
          className="w-full border border-ink-200 rounded-lg text-sm px-3 py-2.5 min-h-[88px]" />
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={() => setRejectId(null)} className="px-4 py-2 text-sm font-semibold text-ink-500">Cancel</button>
          <button onClick={reject} disabled={busyId === rejectId}
            className="px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-50" style={{ background: '#E53E3E' }}>
            Reject slip
          </button>
        </div>
      </Modal>
    </div>
  );
}
