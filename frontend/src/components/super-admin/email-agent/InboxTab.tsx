'use client';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../../lib/api';
import Modal from '../../ui/Modal';
import Badge from '../../ui/Badge';
import { BASE, EmailStatus, Empty, Loading, errorMessage, secondaryButton, when } from './shared';

const TRIAGE: Record<string, string> = {
  own_mail: 'Our own mail', bounce: 'Bounce', auto_generated: 'Automated', unsubscribe: 'Opt-out', suppressed_sender: 'Suppressed sender',
};
const CLASS: Record<string, string> = {
  enquiry: 'Enquiry', quotation_request: 'Quotation request', order_or_status: 'Account or order', complaint: 'Complaint',
  interested: 'Interested', not_interested: 'Not interested', wrong_contact: 'Wrong contact', opt_out: 'Opt-out',
  out_of_office: 'Out of office', spam: 'Spam', other: 'Other',
};

export default function InboxTab({ escalated }: { escalated: boolean }) {
  const [rows, setRows] = useState<any[] | null>(null);
  const [open, setOpen] = useState<any>(null);

  const load = useCallback(() => {
    setRows(null);
    api.get(`${BASE}/${escalated ? 'escalations' : 'inbox'}`)
      .then(r => setRows(r.data))
      .catch(err => { setRows([]); toast.error(errorMessage(err, 'Could not load mail')); });
  }, [escalated]);
  useEffect(load, [load]);

  const show = (id: number) => api.get(`${BASE}/messages/${id}`).then(r => setOpen(r.data)).catch(err => toast.error(errorMessage(err, 'Could not open it')));

  async function resolve() {
    try {
      await api.post(`${BASE}/messages/${open.id}/resolve`, {});
      toast.success('Marked as dealt with');
      setOpen(null);
      load();
    } catch (err) {
      toast.error(errorMessage(err, 'That did not work'));
    }
  }

  if (rows === null) return <Loading />;
  return (
    <>
      {rows.length === 0 ? <Empty>{escalated ? 'Nothing is waiting for a person.' : 'No mail yet.'}</Empty> : (
        <div className="kh-card divide-y divide-ink-100">
          {rows.map(m => (
            <button key={m.id} onClick={() => show(m.id)} className="w-full text-left p-4 hover:bg-ink-50 transition-colors">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                {TRIAGE[m.triage] && <Badge variant="gray">{TRIAGE[m.triage]}</Badge>}
                {m.classification && <Badge variant={m.classification === 'complaint' ? 'coral' : 'blue'}>{CLASS[m.classification] ?? m.classification}</Badge>}
                {m.triage === 'pass' && !m.classification && <Badge variant="gray">Waiting to be sorted</Badge>}
                {!!m.injection_suspected && <Badge variant="coral">Injection attempt</Badge>}
                {!!m.needs_human && !m.resolved_at && <Badge variant="amber">Needs a person</Badge>}
                <span className="ml-auto text-xs text-ink-400">{when(m.received_at)}</span>
              </div>
              <p className="text-sm font-semibold text-ink-800 truncate">{m.subject || '(no subject)'}</p>
              <p className="text-xs text-ink-500 truncate">{m.from_name ? `${m.from_name} · ` : ''}{m.from_addr}{m.human_reason && !m.resolved_at ? ` · ${m.human_reason}` : ''}</p>
            </button>
          ))}
        </div>
      )}

      {open && (
        <Modal open onClose={() => setOpen(null)} title={open.subject || '(no subject)'} width="max-w-2xl">
          <div className="space-y-3">
            <p className="text-sm text-ink-600 break-all">From {open.from_name ? `${open.from_name} ` : ''}{open.from_addr} · {when(open.received_at)}</p>
            <p className="text-xs text-ink-500">{open.auth_verified ? 'Sender verified by the mail provider' : 'Sender not verified'}</p>
            {open.human_reason && <p className="text-sm rounded-xl p-3" style={{ background: '#FFF8E1', color: '#B45309' }}>{open.human_reason}</p>}
            {/* Rendered as plain text on purpose: this is untrusted content */}
            <div className="text-sm text-ink-800 whitespace-pre-wrap break-words max-h-96 overflow-y-auto border border-ink-200 rounded-xl p-3">{open.body_text}</div>
            {open.emails?.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-ink-500">Drafts from this message</p>
                {open.emails.map((e: any) => <div key={e.id} className="flex items-center gap-2 text-sm"><EmailStatus status={e.status} /> <span className="truncate">{e.subject}</span></div>)}
              </div>
            )}
            {!!open.needs_human && !open.resolved_at && <button onClick={resolve} className={secondaryButton}>Mark as dealt with</button>}
          </div>
        </Modal>
      )}
    </>
  );
}
