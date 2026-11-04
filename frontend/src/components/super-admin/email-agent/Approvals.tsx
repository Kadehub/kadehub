'use client';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, Paperclip, Trash2 } from 'lucide-react';
import api from '../../../lib/api';
import Modal from '../../ui/Modal';
import Badge from '../../ui/Badge';
import { BASE, EmailStatus, Empty, Label, Loading, errorMessage, inputClass, secondaryButton, when } from './shared';

const FILTERS = [
  { id: '', label: 'To review' },
  { id: 'approved,sending', label: 'Approved' },
  { id: 'sent', label: 'Sent' },
  { id: 'failed', label: 'Failed' },
  { id: 'rejected,cancelled', label: 'Rejected' },
];

const KIND: Record<string, string> = { reply: 'Reply', outreach: 'Outreach', follow_up: 'Follow-up' };

export default function Approvals() {
  const [filter, setFilter] = useState('');
  const [rows, setRows] = useState<any[] | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);

  const load = useCallback(() => {
    setRows(null);
    api.get(`${BASE}/emails`, { params: filter ? { status: filter } : {} })
      .then(r => setRows(r.data))
      .catch(err => { setRows([]); toast.error(errorMessage(err, 'Could not load emails')); });
  }, [filter]);
  useEffect(load, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${filter === f.id ? 'text-white' : 'border-ink-200 text-ink-600 hover:bg-ink-50'}`}
            style={filter === f.id ? { background: '#00796B', borderColor: '#00796B' } : {}}>{f.label}</button>
        ))}
      </div>

      {rows === null ? <Loading /> : rows.length === 0 ? <Empty>Nothing here.</Empty> : (
        <div className="kh-card divide-y divide-ink-100">
          {rows.map(e => (
            <button key={e.id} onClick={() => setOpenId(e.id)} className="w-full text-left p-4 hover:bg-ink-50 transition-colors">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <EmailStatus status={e.status} />
                <Badge variant="gray">{KIND[e.kind] ?? e.kind}</Badge>
                {!!e.needs_human && <Badge variant="coral">Flagged</Badge>}
                {e.validator_warnings?.length > 0 && <Badge variant="amber">{e.validator_warnings.length} warning{e.validator_warnings.length > 1 ? 's' : ''}</Badge>}
                <span className="ml-auto text-xs text-ink-400">{when(e.updated_at)}</span>
              </div>
              <p className="text-sm font-semibold text-ink-800 truncate">{e.subject}</p>
              <p className="text-xs text-ink-500 truncate">To {e.recipient}{e.failure_reason ? ` · ${e.failure_reason}` : ''}</p>
            </button>
          ))}
        </div>
      )}

      {openId !== null && <Review id={openId} onClose={() => setOpenId(null)} onChanged={load} />}
    </div>
  );
}

function Review({ id, onClose, onChanged }: { id: number; onClose: () => void; onChanged: () => void }) {
  const [email, setEmail] = useState<any>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [recipient, setRecipient] = useState('');
  const [note, setNote] = useState('');
  const [redraft, setRedraft] = useState(true);
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await api.get(`${BASE}/emails/${id}`);
    setEmail(data); setSubject(data.subject); setBody(data.body); setRecipient(data.recipient); setAcknowledged(false);
  }, [id]);
  useEffect(() => { load().catch(err => toast.error(errorMessage(err, 'Could not load this email'))); }, [load]);

  async function act(work: () => Promise<any>, done: string, close = true) {
    setBusy(true);
    try {
      await work();
      toast.success(done);
      onChanged();
      if (close) onClose(); else await load();
    } catch (err) {
      toast.error(errorMessage(err, 'That did not work'));
      await load().catch(() => {});
    } finally {
      setBusy(false);
    }
  }

  if (!email) return <Modal open onClose={onClose} title="Review email" width="max-w-3xl"><Loading /></Modal>;

  const dirty = subject !== email.subject || body !== email.body || recipient !== email.recipient;
  const reviewable = ['draft', 'pending_approval'].includes(email.status);
  const editable = ['draft', 'pending_approval', 'approved', 'failed'].includes(email.status);
  const warnings: Array<{ code: string; message: string }> = email.validator_warnings ?? [];
  const facts: string[] = email.sources?.facts_used ?? [];
  const calls: Array<{ tool: string; result: string }> = email.sources?.calls ?? [];

  const save = () => act(() => api.patch(`${BASE}/emails/${id}`, { subject, body, recipient }), email.status === 'approved' ? 'Saved. It needs approving again.' : 'Saved', false);
  const approve = () => act(() => api.post(`${BASE}/emails/${id}/approve`, { content_hash: email.content_hash, acknowledge_warnings: acknowledged }), 'Approved. It goes out on the next worker run.');
  const reject = () => act(() => api.post(`${BASE}/emails/${id}/reject`, { note, redraft }), redraft ? 'Rejected. A new draft is on its way.' : 'Rejected');

  async function upload(file: File) {
    const form = new FormData();
    form.append('file', file);
    await act(() => api.post(`${BASE}/emails/${id}/attachments`, form, { timeout: 60000 }), 'Attached. Any approval has to be given again.', false);
  }

  return (
    <Modal open onClose={onClose} title="Review email" width="max-w-3xl">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <EmailStatus status={email.status} />
          {!!email.is_promotional && <Badge variant="blue">Promotional</Badge>}
          {email.language && email.language !== 'en' && <Badge variant="gray">{email.language === 'si' ? 'Sinhala' : 'Tamil'}</Badge>}
          {email.approved_at && <span className="text-xs text-ink-500">Approved {when(email.approved_at)}</span>}
          {email.sent_at && <span className="text-xs text-ink-500">Sent {when(email.sent_at)}</span>}
        </div>

        {email.human_reason && (
          <div className="rounded-xl p-3 text-sm flex gap-2" style={{ background: '#FFF0F0', color: '#C92A2A' }}>
            <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" /> <span>{email.human_reason}</span>
          </div>
        )}
        {email.failure_reason && <div className="rounded-xl p-3 text-sm" style={{ background: '#FFF0F0', color: '#C92A2A' }}>{email.failure_reason}</div>}

        {warnings.length > 0 && (
          <div className="rounded-xl p-3 text-sm" style={{ background: '#FFF8E1' }}>
            <p className="font-semibold mb-1" style={{ color: '#B45309' }}>The checks found problems</p>
            <ul className="list-disc pl-5 space-y-0.5 text-ink-700">{warnings.map((w, i) => <li key={i}>{w.message}</li>)}</ul>
            {reviewable && (
              <label className="flex items-center gap-2 mt-2 font-medium text-ink-700">
                <input type="checkbox" checked={acknowledged} onChange={e => setAcknowledged(e.target.checked)} />
                I have read these and want to approve anyway
              </label>
            )}
          </div>
        )}

        {email.source && (
          <details className="rounded-xl border border-ink-200 p-3" open>
            <summary className="text-sm font-semibold text-ink-700 cursor-pointer">Replying to {email.source.from_addr}</summary>
            {!!email.source.injection_suspected && <p className="text-xs font-semibold mt-2" style={{ color: '#C92A2A' }}>This email looks like it tries to instruct the AI.</p>}
            <p className="text-xs text-ink-500 mt-2">{email.source.subject}</p>
            <p className="text-sm text-ink-700 whitespace-pre-wrap mt-1 max-h-40 overflow-y-auto">{email.source.body_clean}</p>
          </details>
        )}
        {email.prospect && (
          <div className="rounded-xl border border-ink-200 p-3 text-sm">
            <p className="font-semibold text-ink-700">{email.prospect.business_name}{email.prospect.location ? ` · ${email.prospect.location}` : ''}</p>
            <p className="text-xs text-ink-500 break-all">Address published at <a className="underline" href={email.prospect.source_url} target="_blank" rel="noopener noreferrer nofollow">{email.prospect.source_url}</a></p>
            {email.prospect.notes && <p className="text-ink-600 mt-1 whitespace-pre-wrap">{email.prospect.notes}</p>}
          </div>
        )}

        <div><Label>To</Label><input value={recipient} disabled={!editable} onChange={e => setRecipient(e.target.value)} className={inputClass} /></div>
        <div><Label>Subject</Label><input value={subject} disabled={!editable} onChange={e => setSubject(e.target.value)} className={inputClass} /></div>
        <div><Label>Message</Label><textarea value={body} disabled={!editable} onChange={e => setBody(e.target.value)} rows={12} className={`${inputClass} font-mono`} /></div>
        {dirty && (
          <div className="flex items-center gap-3">
            <button onClick={save} disabled={busy} className="kh-btn-primary px-4 py-2 rounded-xl text-sm">Save changes</button>
            <span className="text-xs text-ink-500">Save before approving.{email.status === 'approved' ? ' Saving cancels the approval.' : ''}</span>
          </div>
        )}

        <div>
          <Label>Attachments</Label>
          {email.suggested_attachments?.length > 0 && <p className="text-xs text-ink-500 mb-2">The AI suggests: {email.suggested_attachments.join(', ')}</p>}
          <div className="space-y-1.5">
            {email.attachments.map((a: any) => (
              <div key={a.id} className="flex items-center gap-2 text-sm text-ink-700">
                <Paperclip size={14} className="text-ink-400" /> <span className="truncate">{a.filename}</span>
                <span className="text-xs text-ink-400">{Math.ceil(a.size_bytes / 1024)} KB</span>
                {editable && (
                  <button aria-label={`Remove ${a.filename}`} disabled={busy} className="ml-auto p-1 text-ink-400 hover:text-red-600"
                    onClick={() => act(() => api.delete(`${BASE}/emails/${id}/attachments/${a.id}`), 'Removed. Any approval has to be given again.', false)}><Trash2 size={14} /></button>
                )}
              </div>
            ))}
          </div>
          {editable && (
            <input type="file" disabled={busy} className="text-sm mt-2 block" accept=".pdf,.png,.jpg,.jpeg,.txt,.csv,.docx,.xlsx"
              onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }} />
          )}
        </div>

        {(facts.length > 0 || calls.length > 0) && (
          <details className="rounded-xl border border-ink-200 p-3">
            <summary className="text-sm font-semibold text-ink-700 cursor-pointer">Sources</summary>
            {facts.length > 0 && <ul className="list-disc pl-5 text-sm text-ink-600 mt-2 space-y-0.5">{facts.map((f, i) => <li key={i}>{f}</li>)}</ul>}
            {calls.map((c, i) => (
              <div key={i} className="mt-2">
                <p className="text-xs font-semibold text-ink-500">{c.tool}</p>
                <pre className="text-xs text-ink-600 whitespace-pre-wrap break-all max-h-32 overflow-y-auto bg-ink-50 rounded-lg p-2">{c.result}</pre>
              </div>
            ))}
          </details>
        )}

        {reviewable && (
          <div className="border-t border-ink-100 pt-4 space-y-3">
            <button onClick={approve} disabled={busy || dirty || (warnings.length > 0 && !acknowledged)} className="kh-btn-primary px-5 py-2.5 rounded-xl text-sm w-full sm:w-auto">Approve and send</button>
            <div>
              <Label>Reject with a note. The AI reads this before it writes again.</Label>
              <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} className={inputClass} placeholder="What should be different?" />
            </div>
            <label className="flex items-center gap-2 text-sm text-ink-700">
              <input type="checkbox" checked={redraft} onChange={e => setRedraft(e.target.checked)} /> Write a new draft using this note
            </label>
            <div className="flex flex-wrap gap-2">
              <button onClick={reject} disabled={busy || note.trim().length < 3} className={secondaryButton}>Reject</button>
              <button onClick={() => act(() => api.post(`${BASE}/emails/${id}/cancel`, {}), 'Cancelled')} disabled={busy} className={secondaryButton}>Cancel this email</button>
            </div>
          </div>
        )}
        {email.status === 'approved' && (
          <div className="border-t border-ink-100 pt-4">
            <button onClick={() => act(() => api.post(`${BASE}/emails/${id}/cancel`, {}), 'Cancelled')} disabled={busy} className={secondaryButton}>Stop this email</button>
          </div>
        )}
        {email.status === 'failed' && (
          <div className="border-t border-ink-100 pt-4 space-y-2">
            {/^Outcome unknown/.test(email.failure_reason || '') && <p className="text-sm text-ink-600">Check the mailbox&apos;s Sent folder first. This email may already have gone out.</p>}
            <button onClick={() => act(() => api.post(`${BASE}/emails/${id}/reopen`, {}), 'Back in the approval queue', false)} disabled={busy} className={secondaryButton}>Back to approval</button>
          </div>
        )}
      </div>
    </Modal>
  );
}
