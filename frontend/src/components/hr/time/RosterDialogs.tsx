'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Printer, Send, Trash2 } from 'lucide-react';
import api from '../../../lib/api';
import { apiError } from '../../../lib/hr/api';
import { useHrT } from '../../../lib/hr/i18n';
import { formatDate, formatDayShort, formatShift, formatTime, shiftMinutes, today, whatsappLink } from '../../../lib/hr/format';
import type { RosterEntry, RosterWeek, ShiftTemplate } from '../../../lib/hr/types';
import { useHr } from '../HrContext';
import { Button, Dialog, EmployeeSelect, Field, NativeSelect, TextInput, Toggle, cn } from '../ui';

type Emp = RosterWeek['employees'][number];

/** Add, change or remove one employee's shift on one day. */
export function EntryDialog({ open, onClose, branchId, week, employees, templates, employeeId, date, entry, onSaved }: {
  open: boolean; onClose: () => void; branchId: number; week: RosterWeek; employees: Emp[]; templates: ShiftTemplate[];
  employeeId: number | null; date: string | null; entry: RosterEntry | null; onSaved: () => void;
}) {
  const { t } = useHrT();
  const [emp, setEmp] = useState<number | ''>('');
  const [day, setDay] = useState('');
  const [tpl, setTpl] = useState<string>('');
  const [start, setStart] = useState('08:00');
  const [end, setEnd] = useState('17:00');
  const [brk, setBrk] = useState(60);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEmp(entry?.employee_id ?? employeeId ?? '');
    setDay(entry?.work_date ?? date ?? week.from);
    const first = templates[0];
    if (entry) {
      setTpl(entry.shift_template_id ? String(entry.shift_template_id) : 'custom');
      setStart(entry.start_time); setEnd(entry.end_time); setBrk(entry.break_minutes); setNote(entry.note);
    } else if (first) {
      setTpl(String(first.id)); setStart(first.start_time); setEnd(first.end_time); setBrk(first.break_minutes); setNote('');
    } else {
      setTpl('custom'); setStart('08:00'); setEnd('17:00'); setBrk(60); setNote('');
    }
  }, [open, entry, employeeId, date, templates, week.from]);

  const pickTemplate = (v: string) => {
    setTpl(v);
    const x = templates.find(s => String(s.id) === v);
    if (x) { setStart(x.start_time); setEnd(x.end_time); setBrk(x.break_minutes); }
  };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!emp || !day) return;
    setBusy(true);
    try {
      await api.put('/hr/roster/entry', {
        branch_id: branchId, employee_id: emp, work_date: day, start_time: start, end_time: end, break_minutes: brk,
        shift_template_id: tpl && tpl !== 'custom' ? Number(tpl) : null, note,
      });
      toast.success(t('common.saved'));
      onSaved();
      onClose();
    } catch (err) {
      toast.error(apiError(err, t));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!entry) return;
    setBusy(true);
    try {
      await api.delete(`/hr/roster/entry/${entry.id}`);
      toast.success(t('ros.entry.removed'));
      onSaved();
      onClose();
    } catch (err) {
      toast.error(apiError(err, t));
    } finally {
      setBusy(false);
    }
  }

  const fixed = !!entry || employeeId !== null;
  const name = employees.find(x => x.id === emp)?.full_name ?? '';
  return (
    <Dialog open={open} onClose={onClose} title={entry ? t('ros.entry.editTitle') : t('ros.entry.addTitle')}>
      <form onSubmit={save} className="space-y-4">
        {fixed
          ? <p className="text-sm text-ink-600"><span className="font-semibold text-ink-900">{name}</span> · {formatDayShort(day)} {formatDate(day, true)}</p>
          : (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t('common.employee')} htmlFor="ros-emp">
                <EmployeeSelect id="ros-emp" required employees={employees} value={emp} onChange={setEmp} />
              </Field>
              <Field label={t('common.date')} htmlFor="ros-day">
                <NativeSelect id="ros-day" value={day} onChange={e => setDay(e.target.value)}>
                  {week.days.map(d => <option key={d} value={d}>{formatDayShort(d)} {formatDate(d, true)}</option>)}
                </NativeSelect>
              </Field>
            </div>
          )}
        <Field label={t('ros.entry.shift')} htmlFor="ros-tpl">
          <NativeSelect id="ros-tpl" value={tpl} onChange={e => pickTemplate(e.target.value)}>
            {templates.map(s => <option key={s.id} value={s.id}>{s.name} · {formatShift(s.start_time, s.end_time)}</option>)}
            <option value="custom">{t('ros.entry.custom')}</option>
          </NativeSelect>
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label={t('ros.entry.start')} htmlFor="ros-start">
            <TextInput id="ros-start" type="time" required value={start} onChange={e => { setStart(e.target.value); setTpl('custom'); }} />
          </Field>
          <Field label={t('ros.entry.end')} htmlFor="ros-end">
            <TextInput id="ros-end" type="time" required value={end} onChange={e => { setEnd(e.target.value); setTpl('custom'); }} />
          </Field>
          <Field label={t('ros.entry.break')} htmlFor="ros-brk">
            <TextInput id="ros-brk" type="number" min={0} max={480} value={brk} onChange={e => { setBrk(Number(e.target.value) || 0); setTpl('custom'); }} />
          </Field>
        </div>
        <p className="text-xs text-ink-400">
          {t('ros.entry.paidHours', { h: Math.round(shiftMinutes(start, end, brk) / 6) / 10 })}
          {end <= start && ` · ${t('ros.entry.overnight')}`}
        </p>
        <Field label={t('common.note')} htmlFor="ros-note">
          <TextInput id="ros-note" maxLength={200} value={note} onChange={e => setNote(e.target.value)} placeholder={t('common.optional')} />
        </Field>
        <div className="flex items-center justify-between gap-2">
          {entry
            ? <Button variant="ghost" className="text-red-600" onClick={remove} disabled={busy}><Trash2 /> {t('common.delete')}</Button>
            : <span />}
          <Button type="submit" disabled={busy || !emp}>{busy ? t('common.saving') : t('common.save')}</Button>
        </div>
      </form>
    </Dialog>
  );
}

/** One shift template for many people and days of the week. */
export function BulkDialog({ open, onClose, branchId, week, employees, templates, onSaved }: {
  open: boolean; onClose: () => void; branchId: number; week: RosterWeek; employees: Emp[]; templates: ShiftTemplate[]; onSaved: () => void;
}) {
  const { t } = useHrT();
  const [tpl, setTpl] = useState('');
  const [people, setPeople] = useState<number[]>([]);
  const [days, setDays] = useState<string[]>([]);
  const [overwrite, setOverwrite] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTpl(templates[0] ? String(templates[0].id) : '');
    setPeople(employees.filter(e => !e.lent).map(e => e.id));
    setDays(week.days.filter(d => !week.holidays.some(h => h.holiday_date === d)).slice(0, 6));
    setOverwrite(false);
  }, [open, templates, employees, week]);

  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter(x => x !== v) : [...list, v]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post<{ created: number; skipped: number }>('/hr/roster/bulk', {
        branch_id: branchId, employee_ids: people, dates: days, shift_template_id: Number(tpl), overwrite,
      });
      toast.success(t('ros.bulk.done', { created: data.created, skipped: data.skipped }));
      onSaved();
      onClose();
    } catch (err) {
      toast.error(apiError(err, t));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={t('ros.bulk.title')} width="max-w-xl">
      {!templates.length ? <p className="text-sm text-ink-500">{t('ros.bulk.noTemplates')}</p> : (
        <form onSubmit={save} className="space-y-4">
          <Field label={t('ros.entry.shift')} htmlFor="bulk-tpl">
            <NativeSelect id="bulk-tpl" value={tpl} onChange={e => setTpl(e.target.value)}>
              {templates.map(s => <option key={s.id} value={s.id}>{s.name} · {formatShift(s.start_time, s.end_time)}</option>)}
            </NativeSelect>
          </Field>
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium text-ink-700">{t('ros.bulk.days')}</legend>
            <div className="flex flex-wrap gap-1.5">
              {week.days.map(d => (
                <button key={d} type="button" onClick={() => setDays(x => toggle(x, d))} aria-pressed={days.includes(d)}
                  className={cn('rounded-lg border px-3 py-1.5 text-xs font-semibold', days.includes(d)
                    ? 'border-[color:var(--cod-primary)] bg-[color:var(--cod-primary)] text-[color:var(--cod-primary-fg)]'
                    : 'border-ink-200 bg-white text-ink-600')}>
                  {formatDayShort(d)}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <div className="mb-1.5 flex items-center justify-between">
              <legend className="text-sm font-medium text-ink-700">{t('ros.bulk.people')}</legend>
              <button type="button" className="text-xs font-semibold text-[color:var(--cod-primary)]"
                onClick={() => setPeople(people.length === employees.length ? [] : employees.map(e => e.id))}>
                {people.length === employees.length ? t('ros.bulk.selectNone') : t('ros.bulk.selectAll')}
              </button>
            </div>
            <div className="grid max-h-56 gap-1 overflow-y-auto rounded-xl border border-ink-200 p-2 sm:grid-cols-2">
              {employees.map(e => (
                <label key={e.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-ink-50">
                  <input type="checkbox" checked={people.includes(e.id)} onChange={() => setPeople(x => toggle(x, e.id))} />
                  <span className="truncate">{e.full_name}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="flex items-center justify-between gap-3 text-sm text-ink-700">
            <span>{t('ros.bulk.overwrite')}</span>
            <Toggle checked={overwrite} onChange={setOverwrite} label={t('ros.bulk.overwrite')} />
          </label>
          <div className="flex justify-end">
            <Button type="submit" disabled={busy || !people.length || !days.length || !tpl}>
              {busy ? t('common.saving') : t('ros.bulk.submit', { n: people.length * days.length })}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

/** The week as WhatsApp text: whole roster for a group chat, or each person's own shifts. */
export function ShareDialog({ open, onClose, week, branchLabel }: { open: boolean; onClose: () => void; week: RosterWeek; branchLabel: string }) {
  const { t } = useHrT();
  const { me } = useHr();

  const whole = useMemo(() => {
    const lines = [`*${me.settings.business_name}${branchLabel ? ` · ${branchLabel}` : ''}*`, t('ros.share.header', { from: formatDate(week.from, true), to: formatDate(week.to) }), ''];
    for (const d of week.days) {
      const holiday = week.holidays.find(h => h.holiday_date === d);
      lines.push(`*${formatDayShort(d)} ${formatDate(d, true)}*${holiday ? ` (${holiday.name})` : ''}`);
      const onDay = week.entries.filter(e => e.work_date === d).sort((a, b) => a.start_time.localeCompare(b.start_time));
      if (!onDay.length) lines.push(`  ${t('ros.share.nobody')}`);
      for (const e of onDay) {
        const name = week.employees.find(x => x.id === e.employee_id)?.full_name ?? '';
        lines.push(`• ${name}: ${formatShift(e.start_time, e.end_time)}`);
      }
      lines.push('');
    }
    return lines.join('\n').trim();
  }, [week, me.settings.business_name, branchLabel, t]);

  const personal = (empId: number, name: string) => {
    const mine = week.entries.filter(e => e.employee_id === empId).sort((a, b) => a.work_date.localeCompare(b.work_date));
    const lines = [t('ros.share.hello', { name: name.split(' ')[0] }), t('ros.share.yours', { from: formatDate(week.from, true), to: formatDate(week.to) }), ''];
    for (const d of week.days) {
      const e = mine.find(x => x.work_date === d);
      lines.push(`${formatDayShort(d)}: ${e ? formatShift(e.start_time, e.end_time) : t('ros.share.off')}`);
    }
    lines.push('', `— ${me.settings.business_name}`);
    return lines.join('\n');
  };

  return (
    <Dialog open={open} onClose={onClose} title={t('ros.share.title')} width="max-w-xl">
      <div className="space-y-4">
        <pre className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded-xl bg-ink-50 p-3 font-sans text-xs text-ink-700">{whole}</pre>
        <div className="flex flex-wrap gap-2">
          <a href={`https://wa.me/?text=${encodeURIComponent(whole)}`} target="_blank" rel="noreferrer"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#25D366] px-4 text-sm font-semibold text-white hover:opacity-90">
            <Send size={16} /> {t('ros.share.whole')}
          </a>
          <Button variant="outline" onClick={() => { onClose(); setTimeout(() => window.print(), 200); }}><Printer /> {t('common.print')}</Button>
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold text-ink-800">{t('ros.share.eachPerson')}</p>
          <ul className="divide-y divide-ink-100 rounded-xl border border-ink-200">
            {week.employees.map(e => {
              const count = week.entries.filter(x => x.employee_id === e.id).length;
              return (
                <li key={e.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-ink-800">{e.full_name}</span>
                    <span className="text-xs text-ink-400">{t('ros.share.shiftCount', { n: count })}{e.phone ? ` · ${e.phone}` : ''}</span>
                  </span>
                  {e.phone
                    ? <a href={whatsappLink(e.phone, personal(e.id, e.full_name))} target="_blank" rel="noreferrer"
                        className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-ink-200 px-3 text-xs font-semibold text-ink-700 hover:bg-ink-50">
                        <Send size={13} /> {t('common.whatsapp')}
                      </a>
                    : <span className="text-xs text-ink-400">{t('ros.share.noPhone')}</span>}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </Dialog>
  );
}

/** A swap both people already agreed to: the manager records it and the roster changes at once. */
export function SwapDialog({ open, onClose, week, onSaved }: { open: boolean; onClose: () => void; week: RosterWeek; onSaved: () => void }) {
  const { t } = useHrT();
  const [entryId, setEntryId] = useState<number | ''>('');
  const [target, setTarget] = useState<number | ''>('');
  const [targetEntry, setTargetEntry] = useState<number | ''>('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const todayStr = today();

  useEffect(() => { if (open) { setEntryId(''); setTarget(''); setTargetEntry(''); setReason(''); } }, [open]);

  const nameOf = (id: number) => week.employees.find(e => e.id === id)?.full_name ?? '';
  const upcoming = week.entries.filter(e => e.work_date >= todayStr).sort((a, b) => a.work_date.localeCompare(b.work_date) || a.start_time.localeCompare(b.start_time));
  const entry = upcoming.find(e => e.id === entryId);
  const colleagues = week.employees.filter(e => e.id !== entry?.employee_id);
  const theirs = upcoming.filter(e => e.employee_id === target);
  const label = (e: RosterEntry) => `${formatDayShort(e.work_date)} · ${formatTime(e.start_time)}–${formatTime(e.end_time)}`;

  async function save(ev: React.FormEvent) {
    ev.preventDefault();
    if (!entryId || !target) return;
    setBusy(true);
    try {
      await api.post('/hr/swaps', { entry_id: entryId, target_id: target, target_entry_id: targetEntry || null, reason });
      toast.success(t('ros.swap.recorded'));
      onSaved();
      onClose();
    } catch (err) {
      toast.error(apiError(err, t));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={t('ros.swap.recordTitle')}>
      <form onSubmit={save} className="space-y-4">
        <p className="text-sm text-ink-500">{t('ros.swap.recordHelp')}</p>
        <Field label={t('ros.swap.shift')} htmlFor="sw-entry">
          <NativeSelect id="sw-entry" required value={entryId} onChange={e => { setEntryId(e.target.value ? Number(e.target.value) : ''); setTarget(''); setTargetEntry(''); }}>
            <option value="">{t('ros.swap.pickShift')}</option>
            {upcoming.map(e => <option key={e.id} value={e.id}>{nameOf(e.employee_id)} · {label(e)}</option>)}
          </NativeSelect>
        </Field>
        <Field label={t('ros.swap.colleague')} htmlFor="sw-target">
          <EmployeeSelect id="sw-target" required employees={colleagues} value={target} onChange={v => { setTarget(v); setTargetEntry(''); }} />
        </Field>
        <Field label={t('ros.swap.trade')} htmlFor="sw-te" hint={t('ros.swap.tradeHint')}>
          <NativeSelect id="sw-te" value={targetEntry} disabled={!target} onChange={e => setTargetEntry(e.target.value ? Number(e.target.value) : '')}>
            <option value="">{t('ros.swap.giveAway')}</option>
            {theirs.map(e => <option key={e.id} value={e.id}>{label(e)}</option>)}
          </NativeSelect>
        </Field>
        <Field label={t('common.reason')} htmlFor="sw-reason">
          <TextInput id="sw-reason" maxLength={300} value={reason} onChange={e => setReason(e.target.value)} placeholder={t('common.optional')} />
        </Field>
        <div className="flex justify-end">
          <Button type="submit" disabled={busy || !entryId || !target}>{busy ? t('common.saving') : t('ros.swap.recordSubmit')}</Button>
        </div>
      </form>
    </Dialog>
  );
}

/** Colour for a roster entry: its template's, or the brand colour. */
export function entryColor(e: RosterEntry, templates: ShiftTemplate[]) {
  return templates.find(s => s.id === e.shift_template_id)?.color ?? 'var(--cod-primary)';
}

