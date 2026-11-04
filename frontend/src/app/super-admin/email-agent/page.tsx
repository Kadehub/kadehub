'use client';
import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, BarChart2, BookOpen, CheckSquare, Inbox, PauseCircle, ShieldOff, Settings as SettingsIcon, Target, Wrench, Flag } from 'lucide-react';
import api from '../../../lib/api';
import Approvals from '../../../components/super-admin/email-agent/Approvals';
import InboxTab from '../../../components/super-admin/email-agent/InboxTab';
import Prospects from '../../../components/super-admin/email-agent/Prospects';
import { FailedJobs, Knowledge, Suppressions } from '../../../components/super-admin/email-agent/Lists';
import AgentSettings from '../../../components/super-admin/email-agent/AgentSettings';
import Analytics from '../../../components/super-admin/email-agent/Analytics';

const TABS = [
  { id: 'approvals', label: 'Approvals', icon: CheckSquare },
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'escalations', label: 'Escalations', icon: Flag },
  { id: 'prospects', label: 'Prospects', icon: Target },
  { id: 'suppression', label: 'Suppression', icon: ShieldOff },
  { id: 'jobs', label: 'Failed jobs', icon: Wrench },
  { id: 'knowledge', label: 'Knowledge', icon: BookOpen },
  { id: 'analytics', label: 'Analytics', icon: BarChart2 },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
] as const;
type TabId = typeof TABS[number]['id'];

export default function EmailAgentPage() {
  const [tab, setTab] = useState<TabId>('approvals');
  const [state, setState] = useState<{ paused: boolean; mode: string; activated: boolean } | null>(null);

  const loadState = useCallback(() => {
    api.get('/super-admin/email-agent/settings')
      .then(r => setState({ paused: r.data.settings.paused, mode: r.data.settings.mode, activated: !!r.data.settings.activated_at }))
      .catch(() => {});
  }, []);
  useEffect(loadState, [loadState]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-ink-900">Email Agent</h2>
        <p className="text-sm text-ink-400 mt-0.5">Researches prospects, reads incoming mail and writes drafts. Nothing goes out until you approve it.</p>
      </div>

      {state?.paused && (
        <div className="kh-card p-4 flex items-start gap-3" style={{ background: '#FFF8E1', borderColor: '#FDE68A' }}>
          <PauseCircle size={18} className="flex-shrink-0 mt-0.5" style={{ color: '#B45309' }} />
          <div className="text-sm min-w-0">
            <p className="font-semibold text-ink-800">{state.activated ? 'The agent is paused' : 'The agent is off'}</p>
            <p className="text-ink-600">{state.activated
              ? 'No AI work and no sending. Mail is still read, so opt-outs and bounces are honoured.'
              : 'It reads no mail until you turn it on in Settings.'}</p>
          </div>
          <button onClick={() => setTab('settings')} className="ml-auto text-sm font-semibold flex-shrink-0" style={{ color: '#00796B' }}>Settings</button>
        </div>
      )}
      {state && !state.paused && state.mode === 'triage_only' && (
        <div className="kh-card p-3 flex items-center gap-2 text-sm text-ink-600">
          <AlertTriangle size={15} style={{ color: '#B45309' }} />
          Triage only: mail is being sorted, and no drafts are being written.
        </div>
      )}

      <div className="flex flex-wrap gap-x-1 border-b border-ink-200" role="tablist">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${tab === id ? 'border-teal-700 text-ink-900' : 'border-transparent text-ink-500 hover:text-ink-800'}`}
            style={tab === id ? { borderColor: '#00796B' } : {}}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {tab === 'approvals' && <Approvals />}
      {tab === 'inbox' && <InboxTab escalated={false} />}
      {tab === 'escalations' && <InboxTab escalated />}
      {tab === 'prospects' && <Prospects />}
      {tab === 'suppression' && <Suppressions />}
      {tab === 'jobs' && <FailedJobs />}
      {tab === 'knowledge' && <Knowledge />}
      {tab === 'analytics' && <Analytics />}
      {tab === 'settings' && <AgentSettings onChanged={loadState} />}
    </div>
  );
}
