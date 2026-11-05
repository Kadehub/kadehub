'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { PencilLine, Plus, Trash2 } from 'lucide-react';
import api from '../../lib/api';
import { useT } from '../../lib/cod/i18n/client';
import type { Translator } from '../../lib/cod/i18n/translator';
import { orderError } from '../../lib/cod/order-messages';
import type { Courier } from '../../lib/cod/types';
import { ConfirmDialog } from './orders';
import { Button, Field, NativeSelect, TextInput } from './ui';

const OTHER = 'other';

/** The picker's value: a courier id as a string, '' for none, or 'other' with a typed name. */
export interface CourierChoice { selected: string; otherName: string }

export const courierChoice = (id: number | null | undefined): CourierChoice => ({ selected: id != null ? String(id) : '', otherName: '' });

export const fetchCouriers = () => api.get<Courier[]>('/cod/couriers').then(r => r.data);

/** Why the choice can't be saved yet, if anything. */
export const courierChoiceError = (choice: CourierChoice, t: Translator) =>
  (choice.selected === OTHER && !choice.otherName.trim() ? t('err.courierName') : undefined);

/** The courier id to save, adding a typed "Other" courier first (repeating this for the same name is safe). */
export async function resolveCourierChoice(choice: CourierChoice): Promise<number | null> {
  if (choice.selected === OTHER) return (await api.post<Courier>('/cod/couriers', { name: choice.otherName })).data.id;
  return choice.selected ? Number(choice.selected) : null;
}

/** Courier dropdown with an "Other" option. `current` keeps a removed courier selectable on the order that has it. */
export function CourierPicker({ id, couriers, current, value, onChange, disabled }: {
  id: string; couriers: Courier[]; current?: { id: number; name: string } | null;
  value: CourierChoice; onChange: (v: CourierChoice) => void; disabled?: boolean;
}) {
  const t = useT();
  const listed = current && !couriers.some(c => c.id === current.id) ? [...couriers, current] : couriers;
  return (
    <div className="space-y-2">
      <NativeSelect id={id} value={value.selected} disabled={disabled} onChange={e => onChange({ ...value, selected: e.target.value })}>
        <option value="">{t('orders.courierNone')}</option>
        {listed.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
        <option value={OTHER}>{t('orders.courierOther')}</option>
      </NativeSelect>
      {value.selected === OTHER && (
        <TextInput aria-label={t('orders.courierOtherName')} placeholder={t('orders.courierOtherName')} maxLength={100} autoFocus
          value={value.otherName} onChange={e => onChange({ ...value, otherName: e.target.value })} />
      )}
    </div>
  );
}

interface CourierConnection { courier_id: number; name: string; connected: boolean; last_ok_at: string | null; last_error: string | null }

/** Settings: automatic tracking. Each business connects with its own API key, which is never shown again. */
export function CourierConnections({ premium }: { premium: boolean }) {
  const t = useT();
  const [rows, setRows] = useState<CourierConnection[] | null>(null);
  const [connecting, setConnecting] = useState<number | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const load = () => api.get<CourierConnection[]>('/cod/couriers/connections').then(r => setRows(r.data)).catch(() => setRows([]));
  useEffect(() => { load(); }, []);

  async function connect(e: React.FormEvent) {
    e.preventDefault();
    if (connecting === null) return;
    setBusy(true);
    setError(undefined);
    try {
      await api.put(`/cod/couriers/${connecting}/connection`, { api_key: apiKey });
      toast.success(t('set.courierConnected'));
      setConnecting(null);
      setApiKey('');
      await load();
    } catch (err) {
      setError(orderError(err, t));
    } finally {
      setBusy(false);
    }
  }

  async function disconnect(id: number) {
    setBusy(true);
    try {
      await api.delete(`/cod/couriers/${id}/connection`);
      await load();
    } catch (err) {
      toast.error(orderError(err, t));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-500">{t('set.courierAutoHelp')}</p>
      {!premium && <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{t('err.courierPremium')}</p>}
      {rows?.map(c => (
        <div key={c.courier_id} className="rounded-xl border border-ink-200 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="min-w-0">
              <span className="block text-sm font-medium text-ink-900">{c.name}</span>
              <span className={`block text-xs ${c.last_error ? 'text-red-600' : 'text-ink-500'}`}>
                {!c.connected ? t('set.courierNotConnected') : c.last_error ? t('set.courierProblem', { error: c.last_error }) : t('set.courierWorking')}
              </span>
            </span>
            {c.connected
              ? <Button variant="ghost" disabled={busy} onClick={() => disconnect(c.courier_id)}>{t('set.courierDisconnect')}</Button>
              : <Button variant="outline" disabled={!premium || busy} onClick={() => { setError(undefined); setConnecting(c.courier_id); }}>{t('set.courierConnect')}</Button>}
          </div>
          {connecting === c.courier_id && (
            <form onSubmit={connect} className="mt-3 space-y-2">
              <Field label={t('set.courierApiKey')} htmlFor={`courier_key_${c.courier_id}`}>
                <TextInput id={`courier_key_${c.courier_id}`} type="password" autoComplete="off" required maxLength={500} value={apiKey} onChange={e => setApiKey(e.target.value)} />
              </Field>
              {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-2">
                <Button type="submit" disabled={busy}>{busy ? t('common.saving') : t('set.courierConnect')}</Button>
                <Button variant="ghost" disabled={busy} onClick={() => { setConnecting(null); setApiKey(''); }}>{t('common.cancel')}</Button>
              </div>
            </form>
          )}
        </div>
      ))}
    </div>
  );
}

const EMPTY_FORM = { name: '', tracking_url: '' };

/** Settings: the business's own couriers. The shared list is managed by KadeHub, so it isn't shown here. */
export function CourierSettings() {
  const t = useT();
  const [couriers, setCouriers] = useState<Courier[] | null>(null);
  const [editing, setEditing] = useState<number | 'new' | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [removing, setRemoving] = useState<Courier | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const load = () => fetchCouriers().then(list => setCouriers(list.filter(c => c.is_custom))).catch(() => setCouriers([]));
  useEffect(() => { load(); }, []);

  function start(target: Courier | 'new') {
    setError(undefined);
    setEditing(target === 'new' ? 'new' : target.id);
    setForm(target === 'new' ? EMPTY_FORM : { name: target.name, tracking_url: target.tracking_url ?? '' });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError(t('err.courierName')); return; }
    setBusy(true);
    setError(undefined);
    const body = { name: form.name, tracking_url: form.tracking_url.trim() || null };
    try {
      if (editing === 'new') await api.post('/cod/couriers', body);
      else await api.patch(`/cod/couriers/${editing}`, body);
      toast.success(t('set.courierSaved'));
      setEditing(null);
      await load();
    } catch (err) {
      setError(orderError(err, t));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!removing) return;
    setBusy(true);
    try {
      await api.delete(`/cod/couriers/${removing.id}`);
      toast.success(t('set.courierRemoved'));
      setRemoving(null);
      await load();
    } catch (err) {
      toast.error(orderError(err, t));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-500">{t('set.couriersHelp')}</p>
      {couriers?.length === 0 && editing === null && <p className="text-sm text-ink-400">{t('set.courierNoneYet')}</p>}
      {!!couriers?.length && (
        <ul className="divide-y divide-ink-100 rounded-xl border border-ink-200">
          {couriers.map(c => (
            <li key={c.id} className="flex items-center gap-2 px-3 py-2">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink-900">{c.name}</span>
                {c.tracking_url && <span className="block truncate text-xs text-ink-500">{c.tracking_url}</span>}
              </span>
              <Button variant="ghost" size="icon" aria-label={t('set.courierEdit', { name: c.name })} onClick={() => start(c)}><PencilLine /></Button>
              <Button variant="ghost" size="icon" aria-label={t('set.courierRemove')} className="text-red-600" onClick={() => setRemoving(c)}><Trash2 /></Button>
            </li>
          ))}
        </ul>
      )}
      {editing === null ? (
        <Button variant="outline" onClick={() => start('new')}><Plus /> {t('set.courierAdd')}</Button>
      ) : (
        <form onSubmit={save} className="space-y-3 rounded-xl border border-ink-200 bg-ink-50 p-3">
          <Field label={t('orders.courierOtherName')} htmlFor="courier_name">
            <TextInput id="courier_name" required maxLength={100} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </Field>
          <Field label={t('set.courierUrl')} htmlFor="courier_url" hint={t('set.courierUrlHelp')}>
            <TextInput id="courier_url" type="url" maxLength={500} placeholder="https://" value={form.tracking_url} onChange={e => setForm(f => ({ ...f, tracking_url: e.target.value }))} />
          </Field>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>{busy ? t('common.saving') : t('common.saveChanges')}</Button>
            <Button variant="ghost" disabled={busy} onClick={() => setEditing(null)}>{t('common.cancel')}</Button>
          </div>
        </form>
      )}
      <ConfirmDialog open={!!removing} busy={busy} danger title={t('set.courierRemove')}
        message={removing ? t('set.courierRemoveConfirm', { name: removing.name }) : ''}
        confirmLabel={t('set.courierRemove')} onCancel={() => setRemoving(null)} onConfirm={remove} />
    </div>
  );
}
