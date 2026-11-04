'use client';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Search } from 'lucide-react';
import api from '../../../lib/api';
import Badge from '../../ui/Badge';
import Modal from '../../ui/Modal';
import { BASE, Empty, Label, Loading, errorMessage, inputClass, secondaryButton, when } from './shared';

const STATUS: Record<string, { label: string; variant: 'teal' | 'amber' | 'coral' | 'blue' | 'gray' }> = {
  new: { label: 'New', variant: 'blue' },
  active: { label: 'In sequence', variant: 'teal' },
  replied: { label: 'Replied', variant: 'teal' },
  completed: { label: 'Finished', variant: 'gray' },
  stopped: { label: 'Stopped', variant: 'gray' },
  dismissed: { label: 'Dismissed', variant: 'gray' },
  bounced: { label: 'Bounced', variant: 'coral' },
  opted_out: { label: 'Opted out', variant: 'coral' },
};

const blankCampaign = { name: '', brief: '', research_query: '', product_slug: 'pos', language: 'en' };
const blankProspect = { business_name: '', email: '', source_url: '', location: '', notes: '' };

function summaryText(raw: string | null) {
  if (!raw) return null;
  try {
    const s = JSON.parse(raw);
    const skipped = s.reported - s.added;
    return `Last run: ${s.added} added${skipped > 0 ? `, ${skipped} skipped (${s.not_on_page} not found on the cited page)` : ''}`;
  } catch {
    return null;
  }
}

export default function Prospects() {
  const [campaigns, setCampaigns] = useState<any[] | null>(null);
  const [prospects, setProspects] = useState<any[] | null>(null);
  const [status, setStatus] = useState('new');
  const [selected, setSelected] = useState<number[]>([]);
  const [campaignForm, setCampaignForm] = useState<typeof blankCampaign | null>(null);
  const [prospectForm, setProspectForm] = useState<typeof blankProspect | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.get(`${BASE}/campaigns`).then(r => setCampaigns(r.data)).catch(err => { setCampaigns([]); toast.error(errorMessage(err, 'Could not load campaigns')); });
    api.get(`${BASE}/prospects`, { params: status ? { status } : {} }).then(r => setProspects(r.data)).catch(err => { setProspects([]); toast.error(errorMessage(err, 'Could not load prospects')); });
    setSelected([]);
  }, [status]);
  useEffect(load, [load]);

  async function run(work: () => Promise<any>, done: string, after?: () => void) {
    setBusy(true);
    try {
      await work();
      toast.success(done);
      after?.();
      load();
    } catch (err) {
      toast.error(errorMessage(err, 'That did not work'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-ink-800">Research</h3>
            <p className="text-xs text-ink-500">Each search looks for businesses that publish a contact address. An address only counts if the server finds it printed on the cited page.</p>
          </div>
          <button onClick={() => setCampaignForm({ ...blankCampaign })} className="kh-btn-primary flex items-center gap-2 px-4 py-2 rounded-xl text-sm flex-shrink-0"><Plus size={15} /> New search</button>
        </div>
        {campaigns === null ? <Loading /> : campaigns.length === 0 ? <Empty>No searches yet.</Empty> : (
          <div className="kh-card divide-y divide-ink-100">
            {campaigns.map(c => (
              <div key={c.id} className="p-4 flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink-800 truncate">{c.name}</p>
                  <p className="text-xs text-ink-500 truncate">{c.research_query}</p>
                  {summaryText(c.last_research_summary) && <p className="text-xs text-ink-500">{summaryText(c.last_research_summary)}</p>}
                </div>
                {c.status !== 'idle' && <Badge variant="amber">{c.status === 'queued' ? 'Queued' : 'Researching'}</Badge>}
                <button disabled={busy || c.status !== 'idle'} onClick={() => run(() => api.post(`${BASE}/campaigns/${c.id}/research`, {}), 'Research queued. It runs on the next worker run.')} className={`${secondaryButton} flex items-center gap-1.5`}><Search size={14} /> Research</button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-ink-800 mr-auto">Prospects</h3>
          <select value={status} onChange={e => setStatus(e.target.value)} className="border border-ink-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
            <option value="">All</option>
            {Object.entries(STATUS).map(([id, s]) => <option key={id} value={id}>{s.label}</option>)}
          </select>
          <button onClick={() => setProspectForm({ ...blankProspect })} className={secondaryButton}>Add by hand</button>
          <button disabled={busy || !selected.length} onClick={() => run(() => api.post(`${BASE}/prospects/start`, { ids: selected }), 'Started. Drafts will wait for your approval.')} className="kh-btn-primary px-4 py-2 rounded-xl text-sm">
            Start outreach{selected.length ? ` (${selected.length})` : ''}
          </button>
        </div>

        {prospects === null ? <Loading /> : prospects.length === 0 ? <Empty>No prospects here.</Empty> : (
          <div className="kh-card divide-y divide-ink-100">
            {prospects.map(p => {
              const s = STATUS[p.status] ?? { label: p.status, variant: 'gray' as const };
              return (
                <div key={p.id} className="p-4 flex items-start gap-3">
                  {p.status === 'new' && (
                    <input type="checkbox" aria-label={`Select ${p.business_name}`} className="mt-1" checked={selected.includes(p.id)}
                      onChange={e => setSelected(v => e.target.checked ? [...v, p.id] : v.filter(x => x !== p.id))} />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-ink-800">{p.business_name}</p>
                      <Badge variant={s.variant}>{s.label}</Badge>
                      {Number(p.step) > 0 && <span className="text-xs text-ink-400">{p.step} sent</span>}
                    </div>
                    <p className="text-xs text-ink-600 break-all">{p.email}{p.location ? ` · ${p.location}` : ''}</p>
                    <a className="text-xs underline text-ink-500 break-all" href={p.source_url} target="_blank" rel="noopener noreferrer nofollow">{p.source_url}</a>
                    {p.notes && <p className="text-xs text-ink-500 mt-1 whitespace-pre-wrap">{p.notes}</p>}
                    {p.next_touch_at && <p className="text-xs text-ink-400 mt-1">Next email due {when(p.next_touch_at)}</p>}
                  </div>
                  {['new', 'active'].includes(p.status) && (
                    <button disabled={busy} onClick={() => run(() => api.patch(`${BASE}/prospects/${p.id}`, { status: p.status === 'new' ? 'dismissed' : 'stopped' }), p.status === 'new' ? 'Dismissed' : 'Stopped')} className={`${secondaryButton} flex-shrink-0`}>
                      {p.status === 'new' ? 'Dismiss' : 'Stop'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {campaignForm && (
        <Modal open onClose={() => setCampaignForm(null)} title="New research search">
          <form className="space-y-3" onSubmit={e => { e.preventDefault(); run(() => api.post(`${BASE}/campaigns`, campaignForm), 'Saved. Press Research when you are ready.', () => setCampaignForm(null)); }}>
            <div><Label>Name</Label><input required value={campaignForm.name} onChange={e => setCampaignForm({ ...campaignForm, name: e.target.value })} className={inputClass} placeholder="Pharmacies, Kandy" /></div>
            <div><Label>What to search for</Label><input required minLength={3} value={campaignForm.research_query} onChange={e => setCampaignForm({ ...campaignForm, research_query: e.target.value })} className={inputClass} placeholder="Independent pharmacies in Kandy with a contact email" /></div>
            <div><Label>What you want to offer them</Label><textarea required rows={3} value={campaignForm.brief} onChange={e => setCampaignForm({ ...campaignForm, brief: e.target.value })} className={inputClass} placeholder="KadeHub POS for stock, batches and expiry dates" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Product</Label>
                <select value={campaignForm.product_slug} onChange={e => setCampaignForm({ ...campaignForm, product_slug: e.target.value })} className={inputClass}>
                  <option value="pos">KadeHub POS</option><option value="cod">KadeHub COD</option><option value="hr">KadeHub Staff</option>
                </select>
              </div>
              <div>
                <Label>Email language</Label>
                <select value={campaignForm.language} onChange={e => setCampaignForm({ ...campaignForm, language: e.target.value })} className={inputClass}>
                  <option value="en">English</option><option value="si">Sinhala</option><option value="ta">Tamil</option>
                </select>
              </div>
            </div>
            <button disabled={busy} className="kh-btn-primary px-5 py-2.5 rounded-xl text-sm">Save</button>
          </form>
        </Modal>
      )}

      {prospectForm && (
        <Modal open onClose={() => setProspectForm(null)} title="Add a prospect">
          <form className="space-y-3" onSubmit={e => { e.preventDefault(); run(() => api.post(`${BASE}/prospects`, { ...prospectForm, location: prospectForm.location || undefined, notes: prospectForm.notes || undefined }), 'Added', () => setProspectForm(null)); }}>
            <div><Label>Business name</Label><input required value={prospectForm.business_name} onChange={e => setProspectForm({ ...prospectForm, business_name: e.target.value })} className={inputClass} /></div>
            <div><Label>Published email address</Label><input required type="email" value={prospectForm.email} onChange={e => setProspectForm({ ...prospectForm, email: e.target.value })} className={inputClass} /></div>
            <div><Label>Page where it is published</Label><input required type="url" value={prospectForm.source_url} onChange={e => setProspectForm({ ...prospectForm, source_url: e.target.value })} className={inputClass} placeholder="https://" /></div>
            <div><Label>Location</Label><input value={prospectForm.location} onChange={e => setProspectForm({ ...prospectForm, location: e.target.value })} className={inputClass} /></div>
            <div><Label>Notes for the draft</Label><textarea rows={2} value={prospectForm.notes} onChange={e => setProspectForm({ ...prospectForm, notes: e.target.value })} className={inputClass} /></div>
            <button disabled={busy} className="kh-btn-primary px-5 py-2.5 rounded-xl text-sm">Check and add</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
