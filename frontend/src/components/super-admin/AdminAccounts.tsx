'use client';
import { useEffect, useState } from 'react';
import { UserPlus, Power, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { errMsg, fmtDate, inputCls } from './bits';

type Admin = { id: number; name: string; email: string; created_at: string; disabled_at: string | null };

/** Super admin's own password, replacing the old "edit the hash in the database" instructions. */
export function ChangeOwnPassword() {
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (form.new_password !== form.confirm) { toast.error('The new passwords don’t match'); return; }
    setBusy(true);
    try {
      await api.patch('/super-admin/me/password', { current_password: form.current_password, new_password: form.new_password });
      toast.success('Password changed');
      setForm({ current_password: '', new_password: '', confirm: '' });
    } catch (err) {
      toast.error(errMsg(err, 'Could not change the password'));
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="pt-4 border-t border-ink-100 space-y-3">
      <p className="flex items-center gap-2 text-sm font-semibold text-ink-800"><KeyRound size={15} /> Change my password</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <input type="password" required placeholder="Current password" autoComplete="current-password" value={form.current_password}
          onChange={e => setForm({ ...form, current_password: e.target.value })} className={inputCls} aria-label="Current password" />
        <input type="password" required minLength={8} placeholder="New password (8+)" autoComplete="new-password" value={form.new_password}
          onChange={e => setForm({ ...form, new_password: e.target.value })} className={inputCls} aria-label="New password" />
        <input type="password" required minLength={8} placeholder="Repeat new password" autoComplete="new-password" value={form.confirm}
          onChange={e => setForm({ ...form, confirm: e.target.value })} className={inputCls} aria-label="Repeat new password" />
      </div>
      <button type="submit" disabled={busy} className="kh-btn-primary px-4 py-2 rounded-xl text-sm disabled:opacity-50">{busy ? 'Saving…' : 'Change password'}</button>
    </form>
  );
}

/** Everyone who can open this dashboard. */
export function AdminAccounts({ myId, onMe }: { myId?: number; onMe?: (me: Admin) => void }) {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/super-admin/admins').then(r => {
      setAdmins(r.data);
      const me = r.data.find((a: Admin) => a.id === myId);
      if (me) onMe?.(me);
    }).catch(() => {});
  }, [myId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post('/super-admin/admins', form);
      setAdmins(a => [...a, data]);
      setForm({ name: '', email: '', password: '' }); setAdding(false);
      toast.success(`${data.name} can now sign in to this dashboard`);
    } catch (err) {
      toast.error(errMsg(err, 'Could not add the admin'));
    } finally { setBusy(false); }
  }

  async function toggle(a: Admin) {
    try {
      const { data } = await api.patch(`/super-admin/admins/${a.id}/disabled`, { disabled: !a.disabled_at });
      setAdmins(list => list.map(x => (x.id === a.id ? { ...x, disabled_at: data.disabled_at } : x)));
      toast.success(data.disabled_at ? `${a.name} can no longer sign in` : `${a.name} can sign in again`);
    } catch (err) {
      toast.error(errMsg(err, 'Could not update the admin'));
    }
  }

  return (
    <div className="kh-card p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-ink-800">Super admins</h3>
          <p className="text-xs text-ink-400">People with full access to this dashboard</p>
        </div>
        <button onClick={() => setAdding(a => !a)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-ink-200 text-sm font-semibold text-ink-700 hover:bg-ink-50">
          <UserPlus size={15} /> Add admin
        </button>
      </div>

      {adding && (
        <form onSubmit={add} className="grid gap-3 sm:grid-cols-3 rounded-xl bg-ink-50 p-3">
          <input required placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputCls} aria-label="Name" />
          <input required type="email" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={inputCls} aria-label="Email" />
          <input required type="password" minLength={8} placeholder="Password (8+)" autoComplete="new-password" value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })} className={inputCls} aria-label="Password" />
          <div className="sm:col-span-3 flex justify-end gap-2">
            <button type="button" onClick={() => setAdding(false)} className="px-3 py-2 text-sm font-semibold text-ink-500">Cancel</button>
            <button type="submit" disabled={busy} className="kh-btn-primary px-4 py-2 rounded-xl text-sm disabled:opacity-50">{busy ? 'Adding…' : 'Add admin'}</button>
          </div>
        </form>
      )}

      <ul className="divide-y divide-ink-100">
        {admins.map(a => (
          <li key={a.id} className="flex items-center gap-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink-900">{a.name}{a.id === myId && <span className="ml-1.5 text-xs font-medium text-ink-400">(you)</span>}</p>
              <p className="text-xs text-ink-500 [overflow-wrap:anywhere]">{a.email} · added {fmtDate(a.created_at)}</p>
            </div>
            {a.disabled_at && <span className="kh-badge-coral px-2 py-0.5 rounded-full text-xs font-semibold">Switched off</span>}
            {a.id !== myId && (
              <button onClick={() => toggle(a)} title={a.disabled_at ? 'Switch on' : 'Switch off'} aria-label={a.disabled_at ? `Switch ${a.name} on` : `Switch ${a.name} off`}
                className="p-2 rounded-lg text-ink-400 hover:bg-red-50 hover:text-red-600"><Power size={15} /></button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
