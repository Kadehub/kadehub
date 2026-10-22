'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ChevronLeft, ChevronRight, MoreVertical, Pencil, Plus, Repeat, ShieldCheck, Trash2, UserMinus } from 'lucide-react';
import api from '../../../lib/api';
import { apiCode, apiError } from '../../../lib/hr/api';
import { useHrT } from '../../../lib/hr/i18n';
import { formatDate, formatMinutes, formatNumber, formatShift, shiftMinutes, today } from '../../../lib/hr/format';
import type { Branch, Holiday, LeaveType, Manager, ShiftTemplate } from '../../../lib/hr/types';
import { hrHref, useHr } from '../HrContext';
import {
  Button, Card, ConfirmDialog, Dialog, Dot, EmptyState, Field, LoadError, Loading, Menu, MenuItem, NativeSelect, Pill, TextInput, Toggle, cn,
} from '../ui';

/** Load-once list with retry. */
function useList<T>(url: string) {
  const [rows, setRows] = useState<T[] | null>(null);
  const [failed, setFailed] = useState(false);
  const load = useCallback(async () => {
    setFailed(false);
    try { setRows((await api.get<T[]>(url)).data); } catch { setFailed(true); }
  }, [url]);
  useEffect(() => { load(); }, [load]);
  return { rows, failed, load };
}

function ListShell<T>({ rows, failed, load, empty, children }: {
  rows: T[] | null; failed: boolean; load: () => void; empty: string; children: (rows: T[]) => ReactNode;
}) {
  if (failed) return <LoadError onRetry={load} />;
  if (rows === null) return <Loading />;
  if (!rows.length) return <EmptyState title={empty} scene="grow" />;
  return <>{children(rows)}</>;
}

/** Dialog form with the shared error line and save/cancel row. */
function FormDialog({ title, onClose, onSubmit, busy, error, children, extra }: {
  title: string; onClose: () => void; onSubmit: () => void; busy: boolean; error?: ReactNode; children: ReactNode; extra?: ReactNode;
}) {
  const { t } = useHrT();
  return (
    <Dialog open onClose={() => !busy && onClose()} title={title} width="max-w-md">
      <form onSubmit={e => { e.preventDefault(); onSubmit(); }} className="space-y-3">
        {children}
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <div className="flex items-center justify-end gap-2">
          {extra}
          <Button variant="outline" onClick={onClose} disabled={busy}>{t('common.cancel')}</Button>
          <Button type="submit" disabled={busy}>{busy ? t('common.saving') : t('common.save')}</Button>
        </div>
      </form>
    </Dialog>
  );
}

/** busy/error state around one async save. */
function useSubmit() {
  const { t } = useHrT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ReactNode>();
  async function run(fn: () => Promise<unknown>, onError?: (err: unknown) => ReactNode | undefined) {
    setBusy(true);
    setError(undefined);
    try { await fn(); return true; } catch (err) { setError(onError?.(err) ?? apiError(err, t)); return false; } finally { setBusy(false); }
  }
  return { busy, error, setError, run };
}

// ───────── Branches ─────────

export function BranchesTab() {
  const { t } = useHrT();
  const { me, refresh } = useHr();
  const list = useList<Branch>('/hr/branches?all=1');
  const [editing, setEditing] = useState<Branch | 'new' | null>(null);
  const max = me.plan?.max_branches ?? null;
  const activeCount = list.rows?.filter(b => b.is_active).length ?? 0;
  const done = () => { setEditing(null); list.load(); refresh(); };

  return (
    <Card title={max !== null ? t('set.br.usage', { used: activeCount, max }) : t('set.tab.branches')}
      action={<Button size="sm" onClick={() => setEditing('new')}><Plus /> {t('set.br.add')}</Button>}>
      <ListShell {...list} empty={t('set.br.empty')}>
        {rows => (
          <ul className="divide-y divide-ink-100">
            {rows.map(b => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-medium text-ink-800">
                    {b.name} {!b.is_active && <Pill tone="gray">{t('set.br.inactive')}</Pill>}
                  </p>
                  <p className="text-xs text-ink-400">{[t('set.br.staff', { n: b.employee_count ?? 0 }), b.phone, b.address].filter(Boolean).join(' · ')}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setEditing(b)}><Pencil /> {t('common.edit')}</Button>
              </li>
            ))}
          </ul>
        )}
      </ListShell>
      {editing && <BranchDialog branch={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={done} />}
    </Card>
  );
}

function BranchDialog({ branch, onClose, onSaved }: { branch: Branch | null; onClose: () => void; onSaved: () => void }) {
  const { t } = useHrT();
  const [v, setV] = useState({ name: branch?.name ?? '', phone: branch?.phone ?? '', address: branch?.address ?? '' });
  const s = useSubmit();
  const limitError = (err: unknown) => apiCode(err) === 'PLAN_LIMIT_BRANCHES'
    ? <>{apiError(err, t)} <Link href={hrHref('/billing')} className="font-semibold underline">{t('app.viewPlans')}</Link></> : undefined;

  const save = (body: Record<string, unknown>) => s.run(async () => {
    if (branch) await api.patch(`/hr/branches/${branch.id}`, body);
    else await api.post('/hr/branches', body);
    toast.success(t('set.br.saved'));
    onSaved();
  }, limitError);

  return (
    <FormDialog title={t(branch ? 'set.br.edit' : 'set.br.add')} onClose={onClose} busy={s.busy} error={s.error}
      onSubmit={() => save(v)}
      extra={branch && (
        <Button variant="ghost" className="mr-auto" disabled={s.busy} onClick={() => save({ ...v, is_active: !branch.is_active })}>
          {branch.is_active ? t('set.br.deactivate') : t('set.br.activate')}
        </Button>
      )}>
      <Field label={t('set.br.name')} htmlFor="br-name"><TextInput id="br-name" required maxLength={120} value={v.name} onChange={e => setV({ ...v, name: e.target.value })} /></Field>
      <Field label={t('common.phone')} htmlFor="br-phone"><TextInput id="br-phone" type="tel" maxLength={40} value={v.phone} onChange={e => setV({ ...v, phone: e.target.value })} /></Field>
      <Field label={t('common.address')} htmlFor="br-address"><TextInput id="br-address" maxLength={300} value={v.address} onChange={e => setV({ ...v, address: e.target.value })} /></Field>
    </FormDialog>
  );
}

// ───────── Managers ─────────

function BranchChecks({ value, onChange }: { value: number[]; onChange: (ids: number[]) => void }) {
  const { branches } = useHr();
  return (
    <div className="space-y-1.5">
      {branches.map(b => (
        <label key={b.id} className="flex items-center gap-2 text-sm text-ink-700">
          <input type="checkbox" className="h-4 w-4 accent-[color:var(--cod-primary)]" checked={value.includes(b.id)}
            onChange={e => onChange(e.target.checked ? [...value, b.id] : value.filter(x => x !== b.id))} />
          {b.name}
        </label>
      ))}
    </div>
  );
}

export function ManagersTab() {
  const { t } = useHrT();
  const { branchName } = useHr();
  const list = useList<Manager>('/hr/managers');
  const [editing, setEditing] = useState<Manager | 'new' | null>(null);
  const [replacing, setReplacing] = useState<Manager | null>(null);
  const [removing, setRemoving] = useState<Manager | null>(null);

  async function unblock(m: Manager) {
    try {
      await api.post(`/hr/managers/${m.id}/unblock`);
      toast.success(t('set.mgr.unblocked', { name: m.name }));
      list.load();
    } catch (err) {
      toast.error(apiError(err, t));
    }
  }

  return (
    <Card title={t('set.tab.managers')} action={<Button size="sm" onClick={() => setEditing('new')}><Plus /> {t('set.mgr.add')}</Button>}>
      <p className="mb-3 text-sm text-ink-500">{t('set.mgr.intro')}</p>
      <ListShell {...list} empty={t('set.mgr.empty')}>
        {rows => (
          <ul className="divide-y divide-ink-100">
            {rows.map(m => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-medium text-ink-800">{m.name} {m.disabled && <Pill tone="red">{t('set.mgr.disabled')}</Pill>}</p>
                  <p className="text-xs text-ink-400">{m.email}</p>
                  <p className="mt-0.5 text-xs text-ink-500">
                    {m.branch_ids.length ? m.branch_ids.map(id => branchName(id)).filter(Boolean).join(', ') : <span className="text-amber-700">{t('set.mgr.none')}</span>}
                  </p>
                </div>
                <Menu trigger={<MoreVertical />} label={t('common.actions')}>
                  {close => (
                    <>
                      <MenuItem onClick={() => { close(); setEditing(m); }}><Pencil /> {t('set.mgr.branches')}</MenuItem>
                      {m.branch_ids.length > 0 && <MenuItem onClick={() => { close(); setReplacing(m); }}><Repeat /> {t('set.mgr.replace')}</MenuItem>}
                      {m.disabled && <MenuItem onClick={() => { close(); unblock(m); }}><ShieldCheck /> {t('set.mgr.unblock')}</MenuItem>}
                      <MenuItem danger onClick={() => { close(); setRemoving(m); }}><UserMinus /> {t('set.mgr.remove')}</MenuItem>
                    </>
                  )}
                </Menu>
              </li>
            ))}
          </ul>
        )}
      </ListShell>
      {replacing && list.rows && (
        <ReplaceManagerDialog manager={replacing} others={list.rows.filter(o => o.id !== replacing.id && !o.disabled)}
          onClose={() => setReplacing(null)} onSaved={() => { setReplacing(null); list.load(); }} />
      )}
      {removing && <RemoveManagerDialog manager={removing} onClose={() => setRemoving(null)} onSaved={() => { setRemoving(null); list.load(); }} />}
      {editing === 'new' && <NewManagerDialog onClose={() => setEditing(null)} onSaved={() => { setEditing(null); list.load(); }} />}
      {editing && editing !== 'new' && <ManagerBranchesDialog manager={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); list.load(); }} />}
    </Card>
  );
}

function NewManagerDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { t } = useHrT();
  const { branches } = useHr();
  const [v, setV] = useState({ name: '', email: '', phone: '', password: '' });
  const [ids, setIds] = useState<number[]>(branches.length === 1 ? [branches[0].id] : []);
  const s = useSubmit();
  return (
    <FormDialog title={t('set.mgr.add')} onClose={onClose} busy={s.busy} error={s.error}
      onSubmit={() => {
        if (!ids.length) { s.setError(t('set.mgr.pickBranch')); return; }
        s.run(async () => {
          await api.post('/hr/managers', { ...v, branch_ids: ids });
          toast.success(t('set.mgr.created'));
          onSaved();
        });
      }}>
      <Field label={t('common.name')} htmlFor="mgr-name"><TextInput id="mgr-name" required minLength={2} maxLength={100} value={v.name} onChange={e => setV({ ...v, name: e.target.value })} /></Field>
      <Field label={t('common.email')} htmlFor="mgr-email"><TextInput id="mgr-email" type="email" required value={v.email} onChange={e => setV({ ...v, email: e.target.value })} /></Field>
      <Field label={t('common.phone')} htmlFor="mgr-phone"><TextInput id="mgr-phone" type="tel" maxLength={40} value={v.phone} onChange={e => setV({ ...v, phone: e.target.value })} /></Field>
      <Field label={t('set.mgr.password')} htmlFor="mgr-pass" hint={t('set.mgr.passwordHint')}>
        <TextInput id="mgr-pass" type="password" required minLength={8} autoComplete="new-password" value={v.password} onChange={e => setV({ ...v, password: e.target.value })} />
      </Field>
      <Field label={t('set.mgr.branches')}><BranchChecks value={ids} onChange={setIds} /></Field>
    </FormDialog>
  );
}

/** Checkbox to block the old manager's KadeHub sign-in as well (for someone who has left). */
function BlockLogin({ name, value, onChange }: { name: string; value: boolean; onChange: (v: boolean) => void }) {
  const { t } = useHrT();
  return (
    <label className="flex items-start gap-2 rounded-xl border border-ink-200 p-3 text-sm text-ink-700">
      <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[color:var(--cod-primary)]" checked={value} onChange={e => onChange(e.target.checked)} />
      <span>
        <span className="block font-medium">{t('set.mgr.block', { name })}</span>
        <span className="block text-xs text-ink-500">{t('set.mgr.blockHint')}</span>
      </span>
    </label>
  );
}

/** Hand all of a manager's branches to someone on the list or to a new manager login. */
function ReplaceManagerDialog({ manager, others, onClose, onSaved }: { manager: Manager; others: Manager[]; onClose: () => void; onSaved: () => void }) {
  const { t } = useHrT();
  const { branchName } = useHr();
  const [mode, setMode] = useState<'existing' | 'new'>(others.length ? 'existing' : 'new');
  const [userId, setUserId] = useState<number | ''>('');
  const [v, setV] = useState({ name: '', email: '', phone: '', password: '' });
  const [block, setBlock] = useState(false);
  const s = useSubmit();
  const branches = manager.branch_ids.map(id => branchName(id)).filter(Boolean).join(', ');

  return (
    <FormDialog title={t('set.mgr.replaceTitle', { name: manager.name })} onClose={onClose} busy={s.busy} error={s.error}
      onSubmit={() => {
        if (mode === 'existing' && !userId) { s.setError(t('err.PICK_NEW_MANAGER')); return; }
        s.run(async () => {
          await api.post(`/hr/managers/${manager.id}/replace`, mode === 'existing'
            ? { user_id: userId, block_login: block }
            : { new_manager: v, block_login: block });
          const newName = mode === 'existing' ? others.find(o => o.id === userId)?.name ?? '' : v.name;
          toast.success(t('set.mgr.replaced', { name: newName, branches }));
          onSaved();
        });
      }}>
      <p className="rounded-xl bg-ink-50 px-3 py-2 text-sm text-ink-600">{t('set.mgr.handover', { branches })}</p>
      <Field label={t('set.mgr.takeOver')}>
        <div className="flex flex-wrap gap-4 text-sm text-ink-700">
          {(['existing', 'new'] as const).map(m => (
            <label key={m} className="flex items-center gap-2">
              <input type="radio" name="mgr-mode" className="h-4 w-4 accent-[color:var(--cod-primary)]" checked={mode === m} onChange={() => setMode(m)} />
              {m === 'existing' ? t('set.mgr.existing') : t('set.mgr.newOne')}
            </label>
          ))}
        </div>
      </Field>
      {mode === 'existing' ? (
        others.length ? (
          <NativeSelect aria-label={t('set.mgr.choose')} value={userId} onChange={e => setUserId(e.target.value ? Number(e.target.value) : '')}>
            <option value="">{t('set.mgr.choose')}</option>
            {others.map(o => <option key={o.id} value={o.id}>{o.name} · {o.email}</option>)}
          </NativeSelect>
        ) : <p className="text-sm text-amber-700">{t('set.mgr.noOthers')}</p>
      ) : (
        <>
          <Field label={t('common.name')} htmlFor="rep-name"><TextInput id="rep-name" required minLength={2} maxLength={100} value={v.name} onChange={e => setV({ ...v, name: e.target.value })} /></Field>
          <Field label={t('common.email')} htmlFor="rep-email"><TextInput id="rep-email" type="email" required value={v.email} onChange={e => setV({ ...v, email: e.target.value })} /></Field>
          <Field label={t('common.phone')} htmlFor="rep-phone"><TextInput id="rep-phone" type="tel" maxLength={40} value={v.phone} onChange={e => setV({ ...v, phone: e.target.value })} /></Field>
          <Field label={t('set.mgr.password')} htmlFor="rep-pass" hint={t('set.mgr.passwordHint')}>
            <TextInput id="rep-pass" type="password" required minLength={8} autoComplete="new-password" value={v.password} onChange={e => setV({ ...v, password: e.target.value })} />
          </Field>
        </>
      )}
      <BlockLogin name={manager.name} value={block} onChange={setBlock} />
    </FormDialog>
  );
}

function RemoveManagerDialog({ manager, onClose, onSaved }: { manager: Manager; onClose: () => void; onSaved: () => void }) {
  const { t } = useHrT();
  const [block, setBlock] = useState(false);
  const s = useSubmit();
  return (
    <Dialog open onClose={() => !s.busy && onClose()} title={t('set.mgr.removeTitle', { name: manager.name })} width="max-w-md">
      <div className="space-y-3">
        <p className="text-sm text-ink-600">{t('set.mgr.removeBody', { name: manager.name })}</p>
        <BlockLogin name={manager.name} value={block} onChange={setBlock} />
        {s.error && <p role="alert" className="text-sm text-red-600">{s.error}</p>}
        <div className="kh-modal-actions flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={s.busy}>{t('common.cancel')}</Button>
          <Button variant="danger" disabled={s.busy} onClick={() => s.run(async () => {
            await api.post(`/hr/managers/${manager.id}/remove`, { block_login: block });
            toast.success(t('set.mgr.removed', { name: manager.name }));
            onSaved();
          })}>{s.busy ? t('common.saving') : t('set.mgr.remove')}</Button>
        </div>
      </div>
    </Dialog>
  );
}

function ManagerBranchesDialog({ manager, onClose, onSaved }: { manager: Manager; onClose: () => void; onSaved: () => void }) {
  const { t } = useHrT();
  const [ids, setIds] = useState<number[]>(manager.branch_ids);
  const s = useSubmit();
  return (
    <FormDialog title={t('set.mgr.editBranches', { name: manager.name })} onClose={onClose} busy={s.busy} error={s.error}
      onSubmit={() => s.run(async () => {
        await api.patch(`/hr/managers/${manager.id}`, { branch_ids: ids });
        toast.success(t('common.saved'));
        onSaved();
      })}>
      <BranchChecks value={ids} onChange={setIds} />
      {!ids.length && <p className="text-xs text-amber-700">{t('set.mgr.none')}</p>}
    </FormDialog>
  );
}

// ───────── Leave types ─────────

export function LeaveTypesTab() {
  const { t } = useHrT();
  const list = useList<LeaveType>('/hr/leave-types?all=1');
  const [editing, setEditing] = useState<LeaveType | 'new' | null>(null);
  return (
    <Card title={t('set.tab.leave')} action={<Button size="sm" onClick={() => setEditing('new')}><Plus /> {t('set.lt.add')}</Button>}>
      <ListShell {...list} empty={t('common.none')}>
        {rows => (
          <ul className="divide-y divide-ink-100">
            {rows.map(l => (
              <li key={l.id} className={cn('flex flex-wrap items-center justify-between gap-2 py-3', !l.is_active && 'opacity-60')}>
                <div className="flex min-w-0 items-center gap-2">
                  <Dot color={l.color} />
                  <span className="font-medium text-ink-800">{l.name}</span>
                  <span className="text-xs text-ink-400">{l.days_per_year > 0 ? t('set.lt.perYear', { n: formatNumber(l.days_per_year) }) : t('set.lt.noLimit')}</span>
                  {!l.paid && <Pill tone="amber">{t('set.lt.unpaid')}</Pill>}
                  {!l.is_active && <Pill tone="gray">{t('set.lt.inactive')}</Pill>}
                </div>
                <Button variant="ghost" size="sm" onClick={() => setEditing(l)}><Pencil /> {t('common.edit')}</Button>
              </li>
            ))}
          </ul>
        )}
      </ListShell>
      {editing && <LeaveTypeDialog type={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); list.load(); }} />}
    </Card>
  );
}

function LeaveTypeDialog({ type, onClose, onSaved }: { type: LeaveType | null; onClose: () => void; onSaved: () => void }) {
  const { t } = useHrT();
  const [v, setV] = useState({
    name: type?.name ?? '', days_per_year: String(type?.days_per_year ?? 0), paid: type?.paid ?? true,
    color: type?.color ?? '#16a34a', is_active: type?.is_active ?? true,
  });
  const s = useSubmit();
  return (
    <FormDialog title={t(type ? 'set.lt.edit' : 'set.lt.add')} onClose={onClose} busy={s.busy} error={s.error}
      onSubmit={() => s.run(async () => {
        const body = { ...v, days_per_year: Number(v.days_per_year) };
        if (type) await api.patch(`/hr/leave-types/${type.id}`, body);
        else await api.post('/hr/leave-types', body);
        toast.success(t('common.saved'));
        onSaved();
      })}>
      <Field label={t('common.name')} htmlFor="lt-name"><TextInput id="lt-name" required maxLength={60} value={v.name} onChange={e => setV({ ...v, name: e.target.value })} /></Field>
      <Field label={t('set.lt.days')} htmlFor="lt-days" hint={t('set.lt.daysHint')}>
        <TextInput id="lt-days" type="number" required min={0} max={366} step="0.5" value={v.days_per_year} onChange={e => setV({ ...v, days_per_year: e.target.value })} />
      </Field>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-ink-700">{t('set.lt.paid')}</span>
        <Toggle checked={v.paid} onChange={c => setV({ ...v, paid: c })} label={t('set.lt.paid')} />
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-ink-700">{t('set.lt.active')}</span>
        <Toggle checked={v.is_active} onChange={c => setV({ ...v, is_active: c })} label={t('set.lt.active')} />
      </div>
      <Field label={t('set.lt.color')} htmlFor="lt-color">
        <input id="lt-color" type="color" value={v.color} onChange={e => setV({ ...v, color: e.target.value })} className="h-10 w-14 cursor-pointer rounded-lg border border-ink-200 bg-white p-1" />
      </Field>
    </FormDialog>
  );
}

// ───────── Holidays ─────────

export function HolidaysTab() {
  const { t } = useHrT();
  const [year, setYear] = useState(Number(today().slice(0, 4)));
  const list = useList<Holiday>(`/hr/holidays?year=${year}`);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<Holiday | null>(null);
  return (
    <Card title={
      <span className="inline-flex items-center gap-1">
        <Button variant="ghost" size="icon-sm" aria-label={t('common.previous')} onClick={() => setYear(year - 1)}><ChevronLeft /></Button>
        {year}
        <Button variant="ghost" size="icon-sm" aria-label={t('common.following')} onClick={() => setYear(year + 1)}><ChevronRight /></Button>
      </span>
    } action={<Button size="sm" onClick={() => setAdding(true)}><Plus /> {t('set.hol.add')}</Button>}>
      <p className="mb-3 text-sm text-ink-500">{t('set.hol.intro')}</p>
      <ListShell {...list} empty={t('set.hol.empty', { year })}>
        {rows => (
          <ul className="divide-y divide-ink-100">
            {rows.map(h => (
              <li key={h.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                <span><span className="font-medium text-ink-800">{h.name}</span> <span className="ml-1.5 text-ink-400">{formatDate(h.holiday_date)}</span></span>
                <Button variant="ghost" size="icon-sm" aria-label={t('common.delete')} onClick={() => setRemoving(h)}><Trash2 /></Button>
              </li>
            ))}
          </ul>
        )}
      </ListShell>
      {adding && <HolidayDialog year={year} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); list.load(); }} />}
      <ConfirmDialog open={!!removing} onClose={() => setRemoving(null)} title={t('set.hol.deleteTitle')}
        message={removing && `${removing.name} · ${formatDate(removing.holiday_date)}`} confirmLabel={t('common.delete')}
        onConfirm={async () => {
          try { await api.delete(`/hr/holidays/${removing!.id}`); list.load(); } catch (err) { toast.error(apiError(err, t)); }
        }} />
    </Card>
  );
}

function HolidayDialog({ year, onClose, onSaved }: { year: number; onClose: () => void; onSaved: () => void }) {
  const { t } = useHrT();
  const [date, setDate] = useState(String(year) === today().slice(0, 4) ? today() : `${year}-01-01`);
  const [name, setName] = useState('');
  const s = useSubmit();
  return (
    <FormDialog title={t('set.hol.add')} onClose={onClose} busy={s.busy} error={s.error}
      onSubmit={() => s.run(async () => {
        await api.post('/hr/holidays', { holiday_date: date, name });
        toast.success(t('common.saved'));
        onSaved();
      })}>
      <Field label={t('common.date')} htmlFor="hol-date"><TextInput id="hol-date" type="date" required value={date} onChange={e => setDate(e.target.value)} /></Field>
      <Field label={t('set.hol.name')} htmlFor="hol-name"><TextInput id="hol-name" required maxLength={100} value={name} onChange={e => setName(e.target.value)} /></Field>
    </FormDialog>
  );
}

// ───────── Shift templates ─────────

export function ShiftsTab() {
  const { t } = useHrT();
  const { branchName } = useHr();
  const list = useList<ShiftTemplate>('/hr/shift-templates');
  const [editing, setEditing] = useState<ShiftTemplate | 'new' | null>(null);
  return (
    <Card title={t('set.tab.shifts')} action={<Button size="sm" onClick={() => setEditing('new')}><Plus /> {t('set.sh.add')}</Button>}>
      <p className="mb-3 text-sm text-ink-500">{t('set.sh.intro')}</p>
      <ListShell {...list} empty={t('set.sh.empty')}>
        {rows => (
          <ul className="divide-y divide-ink-100">
            {rows.map(s => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-medium text-ink-800"><Dot color={s.color} /> {s.name}</p>
                  <p className="text-xs text-ink-400">
                    {formatShift(s.start_time, s.end_time)}{s.end_time <= s.start_time ? ` (${t('set.sh.overnight')})` : ''}
                    {' · '}{t('set.sh.paid', { h: formatMinutes(shiftMinutes(s.start_time, s.end_time, s.break_minutes)) })}
                    {' · '}{s.branch_id ? branchName(s.branch_id) : t('set.sh.allBranches')}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setEditing(s)}><Pencil /> {t('common.edit')}</Button>
              </li>
            ))}
          </ul>
        )}
      </ListShell>
      {editing && <ShiftDialog shift={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); list.load(); }} />}
    </Card>
  );
}

function ShiftDialog({ shift, onClose, onSaved }: { shift: ShiftTemplate | null; onClose: () => void; onSaved: () => void }) {
  const { t } = useHrT();
  const { branches } = useHr();
  const [v, setV] = useState({
    name: shift?.name ?? '', start_time: shift?.start_time ?? '08:00', end_time: shift?.end_time ?? '17:00',
    break_minutes: String(shift?.break_minutes ?? 60), color: shift?.color ?? '#7c3aed', branch_id: shift?.branch_id ? String(shift.branch_id) : '',
  });
  const [removing, setRemoving] = useState(false);
  const s = useSubmit();
  return (
    <>
      <FormDialog title={t(shift ? 'set.sh.edit' : 'set.sh.add')} onClose={onClose} busy={s.busy} error={s.error}
        onSubmit={() => s.run(async () => {
          const body = { ...v, break_minutes: Number(v.break_minutes || 0), branch_id: v.branch_id ? Number(v.branch_id) : null };
          if (shift) await api.patch(`/hr/shift-templates/${shift.id}`, body);
          else await api.post('/hr/shift-templates', body);
          toast.success(t('common.saved'));
          onSaved();
        })}
        extra={shift && <Button variant="ghost" className="mr-auto text-red-600" disabled={s.busy} onClick={() => setRemoving(true)}><Trash2 /> {t('common.delete')}</Button>}>
        <Field label={t('set.sh.name')} htmlFor="sh-name"><TextInput id="sh-name" required maxLength={60} value={v.name} onChange={e => setV({ ...v, name: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('set.sh.start')} htmlFor="sh-start"><TextInput id="sh-start" type="time" required value={v.start_time} onChange={e => setV({ ...v, start_time: e.target.value })} /></Field>
          <Field label={t('set.sh.end')} htmlFor="sh-end"><TextInput id="sh-end" type="time" required value={v.end_time} onChange={e => setV({ ...v, end_time: e.target.value })} /></Field>
          <Field label={t('set.sh.break')} htmlFor="sh-break"><TextInput id="sh-break" type="number" min={0} max={480} value={v.break_minutes} onChange={e => setV({ ...v, break_minutes: e.target.value })} /></Field>
          <Field label={t('set.sh.color')} htmlFor="sh-color">
            <input id="sh-color" type="color" value={v.color} onChange={e => setV({ ...v, color: e.target.value })} className="h-10 w-full cursor-pointer rounded-lg border border-ink-200 bg-white p-1" />
          </Field>
        </div>
        {branches.length > 1 && (
          <Field label={t('app.branch')} htmlFor="sh-branch">
            <NativeSelect id="sh-branch" value={v.branch_id} onChange={e => setV({ ...v, branch_id: e.target.value })}>
              <option value="">{t('set.sh.allBranches')}</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </NativeSelect>
          </Field>
        )}
      </FormDialog>
      {shift && (
        <ConfirmDialog open={removing} onClose={() => setRemoving(false)} title={t('set.sh.deleteTitle')} message={shift.name} confirmLabel={t('common.delete')}
          onConfirm={async () => {
            try { await api.delete(`/hr/shift-templates/${shift.id}`); onSaved(); } catch (err) { toast.error(apiError(err, t)); }
          }} />
      )}
    </>
  );
}
