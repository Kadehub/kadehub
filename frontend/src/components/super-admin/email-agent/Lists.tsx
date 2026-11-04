'use client';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, RotateCcw, Trash2 } from 'lucide-react';
import api from '../../../lib/api';
import Badge from '../../ui/Badge';
import Modal from '../../ui/Modal';
import { BASE, Empty, Label, Loading, errorMessage, inputClass, secondaryButton, when } from './shared';

function useList(path: string) {
  const [rows, setRows] = useState<any[] | null>(null);
  const load = useCallback(() => {
    api.get(`${BASE}/${path}`).then(r => setRows(r.data)).catch(err => { setRows([]); toast.error(errorMessage(err, 'Could not load this list')); });
  }, [path]);
  useEffect(load, [load]);
  return { rows, load };
}

const REASON: Record<string, string> = { bounce: 'Bounced', unsubscribe: 'Unsubscribed', opt_out: 'Asked to stop', manual: 'Added by hand' };

export function Suppressions() {
  const { rows, load } = useList('suppressions');
  const [address, setAddress] = useState('');

  async function add(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post(`${BASE}/suppressions`, { address });
      setAddress('');
      load();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not add this address'));
    }
  }
  async function remove(row: any) {
    if (!confirm(`Allow email to ${row.address} again? They were suppressed for a reason: ${REASON[row.reason] ?? row.reason}.`)) return;
    try {
      await api.delete(`${BASE}/suppressions/${row.id}`);
      load();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not remove this address'));
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={add} className="kh-card p-4 flex flex-wrap gap-2">
        <input required type="email" value={address} onChange={e => setAddress(e.target.value)} placeholder="name@business.com" className={`${inputClass} flex-1 min-w-[200px]`} />
        <button className="kh-btn-primary px-4 py-2 rounded-xl text-sm">Never email this address</button>
      </form>
      {rows === null ? <Loading /> : rows.length === 0 ? <Empty>No suppressed addresses.</Empty> : (
        <div className="kh-card divide-y divide-ink-100">
          {rows.map(r => (
            <div key={r.id} className="p-3 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink-800 break-all">{r.address}</p>
                <p className="text-xs text-ink-500">{REASON[r.reason] ?? r.reason} · {when(r.created_at)}</p>
              </div>
              <button aria-label={`Remove ${r.address}`} onClick={() => remove(r)} className="p-2 text-ink-400 hover:text-red-600"><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const JOB: Record<string, string> = { classify: 'Sort an email', draft_reply: 'Draft a reply', draft_outreach: 'Draft outreach', research: 'Research', send: 'Send' };

export function FailedJobs() {
  const { rows, load } = useList('jobs/failed');

  async function retry(id: number) {
    try {
      await api.post(`${BASE}/jobs/${id}/retry`, {});
      toast.success('Queued again');
      load();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not retry this job'));
    }
  }

  if (rows === null) return <Loading />;
  if (!rows.length) return <Empty>No failed jobs.</Empty>;
  return (
    <div className="kh-card divide-y divide-ink-100">
      {rows.map(j => (
        <div key={j.id} className="p-4 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-ink-800">{JOB[j.kind] ?? j.kind}</p>
              <Badge variant="coral">Failed {j.attempts} times</Badge>
              <span className="text-xs text-ink-400">{when(j.finished_at)}</span>
            </div>
            <p className="text-xs text-ink-600 mt-1 break-words">{j.last_error}</p>
          </div>
          <button onClick={() => retry(j.id)} className={`${secondaryButton} flex items-center gap-1.5 flex-shrink-0`}><RotateCcw size={14} /> Retry</button>
        </div>
      ))}
    </div>
  );
}

export function Knowledge() {
  const { rows, load } = useList('knowledge');
  const [form, setForm] = useState<{ id?: number; title: string; body: string; active: boolean } | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    const payload = { title: form.title, body: form.body, active: form.active };
    try {
      if (form.id) await api.put(`${BASE}/knowledge/${form.id}`, payload);
      else await api.post(`${BASE}/knowledge`, payload);
      setForm(null);
      load();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not save this article'));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-ink-500">The agent can only state what is here or in your product and plan data. Anything else, it says the team will check.</p>
        <button onClick={() => setForm({ title: '', body: '', active: true })} className="kh-btn-primary flex items-center gap-2 px-4 py-2 rounded-xl text-sm flex-shrink-0"><Plus size={15} /> New article</button>
      </div>
      {rows === null ? <Loading /> : rows.length === 0 ? <Empty>No articles yet.</Empty> : (
        <div className="kh-card divide-y divide-ink-100">
          {rows.map(a => (
            <button key={a.id} onClick={() => setForm({ id: a.id, title: a.title, body: a.body, active: !!a.active })} className="w-full text-left p-4 hover:bg-ink-50 transition-colors">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-ink-800 truncate">{a.title}</p>
                {!a.active && <Badge variant="gray">Off</Badge>}
              </div>
              <p className="text-xs text-ink-500 truncate">{a.body}</p>
            </button>
          ))}
        </div>
      )}
      {form && (
        <Modal open onClose={() => setForm(null)} title={form.id ? 'Edit article' : 'New article'} width="max-w-2xl">
          <form onSubmit={save} className="space-y-3">
            <div><Label>Title</Label><input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className={inputClass} /></div>
            <div><Label>Text</Label><textarea required rows={10} value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} className={inputClass} /></div>
            <label className="flex items-center gap-2 text-sm text-ink-700"><input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} /> The agent can use this</label>
            <button className="kh-btn-primary px-5 py-2.5 rounded-xl text-sm">Save</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
