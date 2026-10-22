'use client';
import { useEffect, useState } from 'react';
import api from '../../../lib/api';
import { Search, KeyRound, Mail, Power, Ban, Copy } from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import toast from 'react-hot-toast';
import { Pager, errMsg, fmtDate, inputCls } from '../../../components/super-admin/bits';

const LIMIT = 25;
const FILTERS = [
  { value: '', label: 'Everyone' },
  { value: 'admins', label: 'Shop owners' },
  { value: 'staff', label: 'Staff' },
  { value: 'disabled', label: 'Switched off' },
  { value: 'tasks_banned', label: 'Banned from Tasks' },
];

type Person = {
  id: number; name: string; email: string; phone: string | null; role: string; created_at: string;
  disabled_at: string | null; tasks_banned_at: string | null; tasks_ban_reason: string | null;
  shop: { id: number; name: string; status: string };
};
type Action = { kind: 'password' | 'email' | 'disable' | 'ban'; person: Person };

export default function UsersPage() {
  const [rows, setRows] = useState<Person[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<Action | null>(null);

  async function load(p: number, f = filter) {
    setLoading(true);
    try {
      const { data } = await api.get('/super-admin/users', { params: { q: q.trim() || undefined, filter: f || undefined, page: p } });
      setRows(data.data); setTotal(data.total); setPage(p);
    } catch (err) {
      toast.error(errMsg(err, 'Could not load people'));
    } finally { setLoading(false); }
  }
  useEffect(() => { load(1); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const patchRow = (id: number, patch: Partial<Person>) => setRows(list => list.map(r => (r.id === id ? { ...r, ...patch } : r)));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-ink-900">People</h2>
          <p className="text-sm text-ink-400 mt-0.5">{total.toLocaleString()} accounts across POS, COD, Tasks and Staff</p>
        </div>
        <form onSubmit={e => { e.preventDefault(); load(1); }} className="flex gap-2 w-full sm:w-auto">
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Name, email, phone or shop…" className={`${inputCls} sm:w-72`} aria-label="Search people" />
          <button type="submit" className="kh-btn-primary px-4 py-2 rounded-xl flex items-center gap-2 text-sm"><Search size={15} /> Search</button>
        </form>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map(f => (
          <button key={f.value} onClick={() => { setFilter(f.value); load(1, f.value); }} aria-pressed={filter === f.value}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${filter === f.value ? 'bg-teal-700 border-teal-700 text-white' : 'bg-white border-ink-200 text-ink-600 hover:bg-ink-50'}`}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="kh-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100">
                {['Person', 'Shop', 'Role', 'Status', 'Joined', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-ink-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              {loading ? (
                [...Array(8)].map((_, i) => <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-6 bg-ink-100 rounded-lg animate-pulse" /></td></tr>)
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-ink-400">No one matches</td></tr>
              ) : rows.map(p => (
                <tr key={p.id} className="hover:bg-ink-50">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-ink-900">{p.name}</p>
                    <p className="text-xs text-ink-500">{p.email}{p.phone ? ` · ${p.phone}` : ''}</p>
                  </td>
                  <td className="px-4 py-3">
                    <a href={`/super-admin/shops/${p.shop.id}`} className="text-ink-700 hover:underline">{p.shop.name || '—'}</a>
                    {p.shop.status && p.shop.status !== 'active' && <span className="ml-1.5 kh-badge-coral px-2 py-0.5 rounded-full text-2xs font-semibold">{p.shop.status}</span>}
                  </td>
                  <td className="px-4 py-3 text-ink-600">{p.role === 'ADMIN' ? 'Owner' : 'Staff'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {p.disabled_at
                        ? <span className="kh-badge-coral px-2 py-0.5 rounded-full text-xs font-semibold">Switched off</span>
                        : <span className="kh-badge-teal px-2 py-0.5 rounded-full text-xs font-semibold">Active</span>}
                      {p.tasks_banned_at && <span title={p.tasks_ban_reason || ''} className="kh-badge-amber px-2 py-0.5 rounded-full text-xs font-semibold">Tasks ban</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-400 whitespace-nowrap">{fmtDate(p.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <IconBtn title="Reset password" onClick={() => setAction({ kind: 'password', person: p })}><KeyRound size={15} /></IconBtn>
                      <IconBtn title="Change email" onClick={() => setAction({ kind: 'email', person: p })}><Mail size={15} /></IconBtn>
                      <IconBtn title={p.disabled_at ? 'Switch on' : 'Switch off'} danger={!p.disabled_at} onClick={() => setAction({ kind: 'disable', person: p })}><Power size={15} /></IconBtn>
                      <IconBtn title={p.tasks_banned_at ? 'Lift Tasks ban' : 'Ban from Tasks'} danger={!p.tasks_banned_at} onClick={() => setAction({ kind: 'ban', person: p })}><Ban size={15} /></IconBtn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pager page={page} total={total} limit={LIMIT} onPage={p => load(p)} />
      </div>

      <ActionDialog action={action} onClose={() => setAction(null)} onDone={patchRow} />
    </div>
  );
}

function IconBtn({ title, onClick, danger, children }: { title: string; onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick} title={title} aria-label={title}
      className={`p-2 rounded-lg text-ink-400 transition-colors ${danger ? 'hover:bg-red-50 hover:text-red-600' : 'hover:bg-teal-50 hover:text-teal-700'}`}>
      {children}
    </button>
  );
}

function ActionDialog({ action, onClose, onDone }: { action: Action | null; onClose: () => void; onDone: (id: number, patch: Partial<Person>) => void }) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [newPassword, setNewPassword] = useState<string | null>(null);

  useEffect(() => { setValue(action?.kind === 'email' ? action.person.email : ''); setNewPassword(null); }, [action]);
  if (!action) return null;
  const { kind, person } = action;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (kind === 'password') {
        const { data } = await api.patch(`/super-admin/users/${person.id}/password`, { password: value || undefined });
        setNewPassword(data.password);
        return;
      }
      if (kind === 'email') {
        const { data } = await api.patch(`/super-admin/users/${person.id}/email`, { email: value });
        onDone(person.id, { email: data.email });
        toast.success('Email changed');
      }
      if (kind === 'disable') {
        const { data } = await api.patch(`/super-admin/users/${person.id}/disabled`, { disabled: !person.disabled_at });
        onDone(person.id, { disabled_at: data.disabled_at });
        toast.success(data.disabled_at ? `${person.name} can no longer sign in` : `${person.name} can sign in again`);
      }
      if (kind === 'ban') {
        const { data } = await api.patch(`/super-admin/users/${person.id}/tasks-ban`, { banned: !person.tasks_banned_at, reason: value || undefined });
        onDone(person.id, { tasks_banned_at: data.tasks_banned_at, tasks_ban_reason: data.tasks_ban_reason });
        toast.success(data.tasks_banned_at ? `${person.name} is banned from Tasks` : 'Tasks ban lifted');
      }
      onClose();
    } catch (err) {
      toast.error(errMsg(err, 'That didn’t work'));
    } finally { setBusy(false); }
  }

  const title = {
    password: 'Reset password',
    email: 'Change email',
    disable: person.disabled_at ? 'Switch account on' : 'Switch account off',
    ban: person.tasks_banned_at ? 'Lift Tasks ban' : 'Ban from KadeHub Tasks',
  }[kind];

  return (
    <Modal open onClose={() => !busy && onClose()} title={title}>
      {newPassword ? (
        <div className="space-y-4">
          <p className="text-sm text-ink-600">New password for <b>{person.name}</b>. Copy it now and send it to them — it won&apos;t be shown again.</p>
          <div className="flex items-center gap-2 rounded-xl border border-ink-200 bg-ink-50 px-3 py-2.5">
            <code className="flex-1 font-mono text-sm text-ink-900 [overflow-wrap:anywhere]">{newPassword}</code>
            <button type="button" onClick={() => { navigator.clipboard?.writeText(newPassword); toast.success('Copied'); }}
              className="p-1.5 rounded-lg text-ink-500 hover:bg-white" aria-label="Copy password"><Copy size={15} /></button>
          </div>
          <div className="kh-modal-actions flex justify-end">
            <button type="button" onClick={onClose} className="kh-btn-primary px-4 py-2 rounded-xl text-sm">Done</button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <p className="text-sm text-ink-600"><b>{person.name}</b> · {person.email}{person.shop.name ? ` · ${person.shop.name}` : ''}</p>
          {kind === 'password' && (
            <label className="block text-sm">
              <span className="font-semibold text-ink-700">New password</span>
              <input type="text" value={value} onChange={e => setValue(e.target.value)} minLength={8} className={`${inputCls} mt-1`}
                placeholder="Leave empty to generate one" autoComplete="off" />
            </label>
          )}
          {kind === 'email' && (
            <label className="block text-sm">
              <span className="font-semibold text-ink-700">Email</span>
              <input type="email" required value={value} onChange={e => setValue(e.target.value)} className={`${inputCls} mt-1`} />
            </label>
          )}
          {kind === 'disable' && (
            <p className="text-sm text-ink-600">
              {person.disabled_at
                ? 'They will be able to sign in again.'
                : 'They are signed out everywhere within a minute and can’t sign in until you switch them back on. The rest of their shop keeps working.'}
            </p>
          )}
          {kind === 'ban' && (person.tasks_banned_at ? (
            <p className="text-sm text-ink-600">They’ll be able to post, make offers and message on Tasks again.{person.tasks_ban_reason ? ` Ban reason was: “${person.tasks_ban_reason}”.` : ''}</p>
          ) : (
            <>
              <p className="text-sm text-ink-600">They can still browse, but can’t post tasks, make offers, ask questions, message or review. Their open tasks disappear from the listings. POS and COD are not affected.</p>
              <label className="block text-sm">
                <span className="font-semibold text-ink-700">Reason (for your records)</span>
                <input value={value} onChange={e => setValue(e.target.value)} maxLength={255} className={`${inputCls} mt-1`} placeholder="e.g. Repeated no-shows, reported 3 times" />
              </label>
            </>
          ))}
          <div className="kh-modal-actions flex justify-end gap-2">
            <button type="button" disabled={busy} onClick={onClose} className="px-4 py-2 text-sm font-semibold text-ink-500">Cancel</button>
            <button type="submit" disabled={busy}
              className={`px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-50 ${(kind === 'disable' && !person.disabled_at) || (kind === 'ban' && !person.tasks_banned_at) ? 'bg-red-600' : 'bg-teal-700'}`}>
              {busy ? 'Saving…' : title}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
