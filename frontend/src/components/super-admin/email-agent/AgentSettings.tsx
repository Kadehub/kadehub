'use client';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { CheckCircle2, AlertCircle, PauseCircle, PlayCircle } from 'lucide-react';
import api from '../../../lib/api';
import { BASE, Label, Loading, errorMessage, inputClass } from './shared';

const READINESS: Array<[string, string]> = [
  ['gmail_read_configured', 'Gmail read access'],
  ['gmail_send_configured', 'Gmail send access'],
  ['claude_configured', 'Claude API key'],
  ['worker_token_configured', 'Worker token (24+ characters)'],
  ['unsubscribe_configured', 'Unsubscribe link secret'],
  ['alerts_configured', 'Admin alerts'],
];

const toForm = (s: any) => ({
  mode: s.mode,
  daily_send_limit: String(s.daily_send_limit),
  monthly_budget_usd: String(s.monthly_budget_usd),
  model_classify: s.model_classify,
  model_draft: s.model_draft,
  model_research: s.model_research,
  allowed_domains: s.allowed_domains.join('\n'),
  approved_claims: s.approved_claims.join('\n'),
  follow_up_gaps_days: s.follow_up_gaps_days.join(', '),
  max_follow_ups: String(s.max_follow_ups),
  timezone: s.timezone,
});
const lines = (v: string) => v.split('\n').map(x => x.trim()).filter(Boolean);

export default function AgentSettings({ onChanged }: { onChanged: () => void }) {
  const [settings, setSettings] = useState<any>(null);
  const [readiness, setReadiness] = useState<any>(null);
  const [form, setForm] = useState<ReturnType<typeof toForm> | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get(`${BASE}/settings`).then(r => {
      setSettings(r.data.settings); setReadiness(r.data.readiness); setForm(toForm(r.data.settings));
    }).catch(err => toast.error(errorMessage(err, 'Could not load settings')));
  }, []);

  async function patch(body: Record<string, unknown>, done: string) {
    setBusy(true);
    try {
      const { data } = await api.patch(`${BASE}/settings`, body);
      setSettings(data); setForm(toForm(data));
      toast.success(done);
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not save'));
    } finally {
      setBusy(false);
    }
  }

  if (!settings || !form) return <Loading />;
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm({ ...form, [key]: e.target.value });

  function togglePause() {
    if (settings.paused) {
      if (!confirm(settings.activated_at
        ? 'Resume the agent? AI work and sending of approved emails start again.'
        : 'Turn the agent on? It starts reading the mailbox and sending mail to Claude for sorting. Nothing is sent to anyone without your approval.')) return;
    }
    patch({ paused: !settings.paused }, settings.paused ? 'The agent is on' : 'The agent is paused');
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    patch({
      mode: form.mode,
      daily_send_limit: parseInt(form.daily_send_limit, 10),
      monthly_budget_usd: parseFloat(form.monthly_budget_usd),
      model_classify: form.model_classify.trim(),
      model_draft: form.model_draft.trim(),
      model_research: form.model_research.trim(),
      allowed_domains: lines(form.allowed_domains),
      approved_claims: lines(form.approved_claims),
      follow_up_gaps_days: form.follow_up_gaps_days.split(',').map(x => parseInt(x.trim(), 10)).filter(n => n > 0),
      max_follow_ups: parseInt(form.max_follow_ups, 10),
      timezone: form.timezone.trim(),
    }, 'Settings saved');
  }

  return (
    <div className="space-y-5">
      <div className="kh-card p-5 flex flex-wrap items-center gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-ink-800">Emergency pause</h3>
          <p className="text-sm text-ink-500">{settings.paused
            ? (settings.activated_at ? 'Paused: no AI work and no sending.' : 'Off: it has never been turned on.')
            : 'On: the worker is sorting mail and sending what you approve.'}</p>
        </div>
        <button onClick={togglePause} disabled={busy} className={settings.paused ? 'kh-btn-primary flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm' : 'kh-btn-amber flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm'}>
          {settings.paused ? <PlayCircle size={16} /> : <PauseCircle size={16} />}
          {settings.paused ? (settings.activated_at ? 'Resume' : 'Turn on') : 'Pause now'}
        </button>
      </div>

      <div className="kh-card p-5">
        <h3 className="font-semibold text-ink-800 mb-1">Setup</h3>
        <p className="text-sm text-ink-500 mb-3">Mailbox: {readiness.mailbox || 'not set'}</p>
        <ul className="grid sm:grid-cols-2 gap-2">
          {READINESS.map(([key, label]) => (
            <li key={key} className="flex items-center gap-2 text-sm text-ink-700">
              {readiness[key] ? <CheckCircle2 size={15} style={{ color: '#00796B' }} /> : <AlertCircle size={15} style={{ color: '#C92A2A' }} />}
              {label}: {readiness[key] ? 'ready' : 'missing'}
            </li>
          ))}
        </ul>
      </div>

      <form onSubmit={save} className="kh-card p-5 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>Stage</Label>
            <select value={form.mode} onChange={set('mode')} className={inputClass}>
              <option value="triage_only">Triage only: sort mail, write nothing</option>
              <option value="drafting">Drafting: write drafts for approval</option>
            </select>
          </div>
          <div><Label>Daily send limit</Label><input type="number" min="0" max="500" required value={form.daily_send_limit} onChange={set('daily_send_limit')} className={inputClass} /></div>
          <div><Label>Monthly AI budget (USD)</Label><input type="number" min="0" step="0.01" required value={form.monthly_budget_usd} onChange={set('monthly_budget_usd')} className={inputClass} /></div>
          <div><Label>Timezone for daily and monthly limits</Label><input required value={form.timezone} onChange={set('timezone')} className={inputClass} /></div>
          <div><Label>Days between follow-ups (comma-separated)</Label><input value={form.follow_up_gaps_days} onChange={set('follow_up_gaps_days')} className={inputClass} /></div>
          <div><Label>Most follow-ups per prospect</Label><input type="number" min="0" max="5" required value={form.max_follow_ups} onChange={set('max_follow_ups')} className={inputClass} /></div>
          <div><Label>Model for sorting mail</Label><input required value={form.model_classify} onChange={set('model_classify')} className={inputClass} /></div>
          <div><Label>Model for drafts</Label><input required value={form.model_draft} onChange={set('model_draft')} className={inputClass} /></div>
          <div><Label>Model for research</Label><input required value={form.model_research} onChange={set('model_research')} className={inputClass} /></div>
        </div>
        <div>
          <Label>Domains drafts may link to (one per line; subdomains included)</Label>
          <textarea rows={3} value={form.allowed_domains} onChange={set('allowed_domains')} className={inputClass} />
        </div>
        <div>
          <Label>Approved claims (one per line). The exact wording of any guarantee, delivery promise or certification you allow.</Label>
          <textarea rows={4} value={form.approved_claims} onChange={set('approved_claims')} className={inputClass} placeholder="14-day free trial" />
        </div>
        <button disabled={busy} className="kh-btn-primary px-5 py-2.5 rounded-xl text-sm">Save settings</button>
      </form>
    </div>
  );
}
