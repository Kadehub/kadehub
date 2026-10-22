'use client';

import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowRight, Camera, Check, LogIn, LogOut, X } from 'lucide-react';
import api from '../../../../lib/api';
import { apiError, postForm } from '../../../../lib/hr/api';
import { useHrT, type HrKey } from '../../../../lib/hr/i18n';
import { formatDate, formatDayShort, formatShift, formatTime, localTime, today } from '../../../../lib/hr/format';
import type { KioskSession, RosterEntry, ShiftSwap } from '../../../../lib/hr/types';
import { useHr } from '../../HrContext';
import { Avatar, Button, Dot, Field, NativeSelect, Pill, Stars, Tabs, TextInput, Toggle, cn } from '../../ui';
import { SWAP_STATUS } from '../shared';
import CameraCapture from './CameraCapture';

export interface PunchResult { action: 'in' | 'out'; at: string; late_minutes: number; worked_minutes: number; name: string }

type Section = 'home' | 'shifts' | 'leave' | 'swaps' | 'notices';

/** One employee's own screen on the kiosk, after their PIN. */
export default function KioskSessionView({ session, pin, branchId, onRefresh, onPunched, onDone }: {
  session: KioskSession; pin: string; branchId: number; onRefresh: () => Promise<void>; onPunched: (r: PunchResult) => void; onDone: () => void;
}) {
  const { t } = useHrT();
  const { me, branchName } = useHr();
  const [section, setSection] = useState<Section>('home');
  const e = session.employee;
  const notices = session.acknowledgements.reviews.length + session.acknowledgements.warnings.length;
  const incoming = session.swaps.filter(s => s.target_id === e.id && s.status === 'pending_colleague').length;

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-4 flex items-center gap-4">
        <Avatar name={e.full_name} src={e.photo_url} size={64} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-2xl font-extrabold text-ink-900">{t('ksk.hello', { name: e.full_name.split(' ')[0] })}</p>
          <p className="text-sm text-ink-500">{[e.job_title, e.emp_code].filter(Boolean).join(' · ')}</p>
        </div>
        <Button size="md" onClick={onDone} className="h-12 px-6 text-base">{t('ksk.done')}</Button>
      </div>

      <Tabs<Section> value={section} onChange={setSection} className="mb-4" items={[
        { value: 'home', label: t('ksk.tab.clock') },
        { value: 'shifts', label: t('ksk.tab.shifts') },
        { value: 'leave', label: t('ksk.tab.leave') },
        { value: 'swaps', label: t('ksk.tab.swaps'), badge: incoming },
        { value: 'notices', label: t('ksk.tab.notices'), badge: notices },
      ]} />

      <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-ink-100 sm:p-6">
        {section === 'home' && <ClockSection session={session} pin={pin} branchId={branchId} requirePhoto={me.settings.require_photo} onPunched={onPunched} />}
        {section === 'shifts' && <ShiftList shifts={session.shifts} branchName={branchName} />}
        {section === 'leave' && <LeaveSection session={session} pin={pin} onRefresh={onRefresh} />}
        {section === 'swaps' && <SwapSection session={session} pin={pin} onRefresh={onRefresh} />}
        {section === 'notices' && <NoticeSection session={session} pin={pin} onRefresh={onRefresh} />}
      </div>
    </div>
  );
}

function ClockSection({ session, pin, branchId, requirePhoto, onPunched }: {
  session: KioskSession; pin: string; branchId: number; requirePhoto: boolean; onPunched: (r: PunchResult) => void;
}) {
  const { t } = useHrT();
  const [camera, setCamera] = useState(false);
  const [withPhoto, setWithPhoto] = useState(requirePhoto);
  const [busy, setBusy] = useState(false);
  const now = today();
  const next = session.shifts.find(s => s.work_date >= now);

  async function punch(photo: Blob | null) {
    setCamera(false);
    if (requirePhoto && !photo) { toast.error(t('err.PHOTO_REQUIRED')); return; }
    setBusy(true);
    try {
      const { data } = await postForm<PunchResult>('/hr/kiosk/punch', { employee_id: session.employee.id, pin, branch_id: branchId }, photo, 'punch.jpg');
      onPunched(data);
    } catch (err) {
      toast.error(apiError(err, t));
    } finally {
      setBusy(false);
    }
  }

  if (camera) return <CameraCapture onCapture={punch} onCancel={() => setCamera(false)} />;

  const inNow = session.clocked_in;
  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <p className="text-base text-ink-600">
        {inNow && session.open_since
          ? t('ksk.inSince', { time: formatTime(localTime(session.open_since)) })
          : t('ksk.notIn')}
      </p>
      <button type="button" disabled={busy} onClick={() => (withPhoto ? setCamera(true) : punch(null))}
        className={cn('flex h-40 w-40 flex-col items-center justify-center gap-2 rounded-full text-xl font-extrabold text-white shadow-lg transition-transform active:scale-95 disabled:opacity-60 sm:h-48 sm:w-48',
          inNow ? 'bg-red-600' : 'bg-emerald-600')}>
        {inNow ? <LogOut size={40} /> : <LogIn size={40} />}
        {busy ? t('common.saving') : inNow ? t('ksk.clockOut') : t('ksk.clockIn')}
      </button>
      {!requirePhoto && (
        <label className="flex items-center gap-3 text-sm text-ink-600">
          <Camera size={16} /> {t('ksk.withPhoto')}
          <Toggle checked={withPhoto} onChange={setWithPhoto} label={t('ksk.withPhoto')} />
        </label>
      )}
      {requirePhoto && <p className="text-xs text-ink-400">{t('ksk.photoRequired')}</p>}
      {next && (
        <p className="rounded-xl bg-ink-50 px-4 py-2 text-sm text-ink-600">
          {next.work_date === now ? t('ksk.todayShift') : t('ksk.nextShift')}: <span className="font-semibold text-ink-800">
            {next.work_date === now ? '' : `${formatDayShort(next.work_date)} · `}{formatShift(next.start_time, next.end_time)}</span>
        </p>
      )}
    </div>
  );
}

function ShiftList({ shifts, branchName }: { shifts: RosterEntry[]; branchName: (id: number | null | undefined) => string }) {
  const { t } = useHrT();
  const now = today();
  if (!shifts.length) return <p className="py-8 text-center text-ink-500">{t('ksk.noShifts')}</p>;
  return (
    <ul className="divide-y divide-ink-100">
      {shifts.map(s => (
        <li key={s.id} className="flex items-center justify-between gap-3 py-3">
          <span>
            <span className={cn('block font-semibold', s.work_date === now ? 'text-[color:var(--cod-primary)]' : 'text-ink-800')}>
              {s.work_date === now ? t('common.today') : formatDayShort(s.work_date)} · {formatDate(s.work_date, true)}
            </span>
            <span className="text-xs text-ink-400">{branchName(s.branch_id)}{s.note ? ` · ${s.note}` : ''}</span>
          </span>
          <span className="text-base font-bold text-ink-800">{formatShift(s.start_time, s.end_time)}</span>
        </li>
      ))}
    </ul>
  );
}

function LeaveSection({ session, pin, onRefresh }: { session: KioskSession; pin: string; onRefresh: () => Promise<void> }) {
  const { t } = useHrT();
  const [type, setType] = useState<number | ''>(session.leave_types[0]?.id ?? '');
  const [start, setStart] = useState(today());
  const [end, setEnd] = useState(today());
  const [half, setHalf] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setBusy(true);
    try {
      await api.post('/hr/kiosk/leave', {
        employee_id: session.employee.id, pin, leave_type_id: type, start_date: start, end_date: end, half_day: start === end && half, reason,
      });
      toast.success(t('ksk.leaveSent'));
      setReason(''); setHalf(false);
      await onRefresh();
    } catch (err) {
      toast.error(apiError(err, t));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {session.balances.map(b => (
          <div key={b.leave_type_id} className="rounded-2xl bg-ink-50 p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-ink-500"><Dot color={b.color} /> {b.name}</p>
            <p className="mt-1 text-2xl font-extrabold text-ink-900">{b.remaining ?? b.used}</p>
            <p className="text-2xs text-ink-400">
              {b.remaining === null ? t('ksk.daysTaken') : t('ksk.daysLeft', { of: b.entitled ?? 0 })}
              {b.pending > 0 && ` · ${t('ksk.pendingDays', { n: b.pending })}`}
            </p>
          </div>
        ))}
      </div>
      <form onSubmit={submit} className="space-y-4 border-t border-ink-100 pt-4">
        <p className="font-semibold text-ink-800">{t('ksk.askLeave')}</p>
        <Field label={t('lv.type')} htmlFor="kl-type">
          <NativeSelect id="kl-type" required value={type} onChange={ev => setType(ev.target.value ? Number(ev.target.value) : '')} className="h-12 text-base">
            {session.leave_types.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
          </NativeSelect>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('common.from')} htmlFor="kl-start">
            <TextInput id="kl-start" type="date" required min={today()} value={start} className="h-12 text-base"
              onChange={ev => { setStart(ev.target.value); if (ev.target.value > end) setEnd(ev.target.value); }} />
          </Field>
          <Field label={t('common.to')} htmlFor="kl-end">
            <TextInput id="kl-end" type="date" required min={start} value={end} className="h-12 text-base" onChange={ev => setEnd(ev.target.value)} />
          </Field>
        </div>
        {start === end && (
          <label className="flex items-center justify-between gap-3 text-sm text-ink-700">
            {t('lv.halfDay')} <Toggle checked={half} onChange={setHalf} label={t('lv.halfDay')} />
          </label>
        )}
        <Field label={t('common.reason')} htmlFor="kl-reason">
          <TextInput id="kl-reason" maxLength={300} value={reason} onChange={ev => setReason(ev.target.value)} className="h-12 text-base" />
        </Field>
        <Button type="submit" disabled={busy || !type} className="h-12 w-full justify-center text-base">{busy ? t('common.saving') : t('ksk.sendRequest')}</Button>
      </form>
    </div>
  );
}

function SwapSection({ session, pin, onRefresh }: { session: KioskSession; pin: string; onRefresh: () => Promise<void> }) {
  const { t } = useHrT();
  const me = session.employee.id;
  const now = today();
  const [entry, setEntry] = useState<number | ''>('');
  const [colleague, setColleague] = useState<number | ''>('');
  const [theirs, setTheirs] = useState<number | ''>('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const mine = session.shifts.filter(s => s.work_date >= now);
  const theirShifts = useMemo(() => session.colleague_shifts.filter(s => s.employee_id === colleague && s.work_date >= now), [session.colleague_shifts, colleague, now]);
  const incoming = session.swaps.filter(s => s.target_id === me && s.status === 'pending_colleague');
  const others = session.swaps.filter(s => !incoming.includes(s));
  const label = (s: RosterEntry) => `${formatDayShort(s.work_date)} ${formatDate(s.work_date, true)} · ${formatShift(s.start_time, s.end_time)}`;

  async function call(key: string, fn: () => Promise<unknown>, done: HrKey) {
    setBusy(key);
    try {
      await fn();
      toast.success(t(done));
      await onRefresh();
      return true;
    } catch (err) {
      toast.error(apiError(err, t));
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function request(ev: React.FormEvent) {
    ev.preventDefault();
    const ok = await call('new', () => api.post('/hr/kiosk/swap', { employee_id: me, pin, entry_id: entry, target_id: colleague, target_entry_id: theirs || null, reason }), 'ksk.swap.sent');
    if (ok) { setEntry(''); setColleague(''); setTheirs(''); setReason(''); }
  }

  const swapLine = (s: ShiftSwap) => (
    <span className="text-xs text-ink-500">
      {s.entry && label(s.entry)}{s.target_entry ? <> ⇄ {label(s.target_entry)}</> : ` · ${t('ros.swap.giveAwayShort')}`}
    </span>
  );

  return (
    <div className="space-y-6">
      {incoming.length > 0 && (
        <div className="space-y-2">
          <p className="font-semibold text-ink-800">{t('ksk.swap.forYou')}</p>
          {incoming.map(s => (
            <div key={s.id} className="flex flex-col gap-3 rounded-2xl bg-amber-50 p-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink-800">{t('ksk.swap.asks', { name: s.requester_name })}</p>
                {swapLine(s)}
                {s.reason && <p className="text-xs italic text-ink-500">“{s.reason}”</p>}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" disabled={!!busy} className="h-11"
                  onClick={() => call(`r${s.id}`, () => api.post(`/hr/kiosk/swap/${s.id}/respond`, { employee_id: me, pin, accept: false }), 'ksk.swap.declined')}>
                  <X /> {t('ksk.swap.decline')}
                </Button>
                <Button disabled={!!busy} className="h-11"
                  onClick={() => call(`a${s.id}`, () => api.post(`/hr/kiosk/swap/${s.id}/respond`, { employee_id: me, pin, accept: true }), 'ksk.swap.accepted')}>
                  <Check /> {t('ksk.swap.accept')}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={request} className="space-y-4">
        <p className="font-semibold text-ink-800">{t('ksk.swap.new')}</p>
        {!mine.length ? <p className="text-sm text-ink-500">{t('ksk.noShifts')}</p> : (
          <>
            <Field label={t('ksk.swap.myShift')} htmlFor="ks-mine">
              <NativeSelect id="ks-mine" required value={entry} className="h-12 text-base" onChange={ev => setEntry(ev.target.value ? Number(ev.target.value) : '')}>
                <option value="">{t('ros.swap.pickShift')}</option>
                {mine.map(s => <option key={s.id} value={s.id}>{label(s)}</option>)}
              </NativeSelect>
            </Field>
            <Field label={t('ros.swap.colleague')} htmlFor="ks-col">
              <NativeSelect id="ks-col" required value={colleague} className="h-12 text-base" onChange={ev => { setColleague(ev.target.value ? Number(ev.target.value) : ''); setTheirs(''); }}>
                <option value="">{t('ksk.swap.pickColleague')}</option>
                {session.colleagues.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </NativeSelect>
            </Field>
            <Field label={t('ros.swap.trade')} htmlFor="ks-theirs" hint={t('ros.swap.tradeHint')}>
              <NativeSelect id="ks-theirs" value={theirs} disabled={!colleague} className="h-12 text-base" onChange={ev => setTheirs(ev.target.value ? Number(ev.target.value) : '')}>
                <option value="">{t('ros.swap.giveAway')}</option>
                {theirShifts.map(s => <option key={s.id} value={s.id}>{label(s)}</option>)}
              </NativeSelect>
            </Field>
            <Field label={t('common.reason')} htmlFor="ks-reason">
              <TextInput id="ks-reason" maxLength={300} value={reason} className="h-12 text-base" onChange={ev => setReason(ev.target.value)} />
            </Field>
            <Button type="submit" disabled={!!busy || !entry || !colleague} className="h-12 w-full justify-center text-base">
              {busy === 'new' ? t('common.saving') : t('ksk.swap.send')}
            </Button>
          </>
        )}
      </form>

      {others.length > 0 && (
        <div className="space-y-2 border-t border-ink-100 pt-4">
          <p className="font-semibold text-ink-800">{t('ksk.swap.yours')}</p>
          <ul className="divide-y divide-ink-100">
            {others.map(s => {
              const st = SWAP_STATUS[s.status];
              const canCancel = s.requester_id === me && (s.status === 'pending_colleague' || s.status === 'pending_manager');
              return (
                <li key={s.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-ink-800">
                      {s.requester_name} <ArrowRight size={13} className="text-ink-400" /> {s.target_name} <Pill tone={st.tone}>{t(st.key)}</Pill>
                    </p>
                    {swapLine(s)}
                  </div>
                  {canCancel && (
                    <Button variant="ghost" size="sm" disabled={!!busy}
                      onClick={() => call(`c${s.id}`, () => api.post(`/hr/kiosk/swap/${s.id}/cancel`, { employee_id: me, pin }), 'ksk.swap.cancelled')}>
                      {t('common.cancel')}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function NoticeSection({ session, pin, onRefresh }: { session: KioskSession; pin: string; onRefresh: () => Promise<void> }) {
  const { t } = useHrT();
  const [busy, setBusy] = useState<string | null>(null);
  const { reviews, warnings } = session.acknowledgements;

  async function ack(kind: 'review' | 'warning', id: number) {
    setBusy(`${kind}${id}`);
    try {
      await api.post('/hr/kiosk/acknowledge', { employee_id: session.employee.id, pin, kind, id });
      toast.success(t('ksk.ack.done'));
      await onRefresh();
    } catch (err) {
      toast.error(apiError(err, t));
    } finally {
      setBusy(null);
    }
  }

  if (!reviews.length && !warnings.length) return <p className="py-8 text-center text-ink-500">{t('ksk.ack.none')}</p>;
  const block = (label: string, text: string | null) => text ? <p className="text-sm text-ink-700"><span className="font-semibold">{label}:</span> {text}</p> : null;

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-500">{t('ksk.ack.intro')}</p>
      {warnings.map(w => (
        <div key={`w${w.id}`} className="space-y-2 rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="flex flex-wrap items-center gap-2 font-semibold text-red-800">
            {t('ksk.ack.warning')} <Pill tone="red">{t(`ksk.level.${w.level}` as HrKey)}</Pill>
            <span className="text-xs font-normal text-red-700">{formatDate(w.warning_date)} · {w.issued_by_name}</span>
          </p>
          <p className="text-sm font-semibold text-ink-800">{w.reason}</p>
          {w.details && <p className="whitespace-pre-line text-sm text-ink-700">{w.details}</p>}
          <Button disabled={!!busy} onClick={() => ack('warning', w.id)} className="h-11"><Check /> {t('ksk.ack.button')}</Button>
        </div>
      ))}
      {reviews.map(r => (
        <div key={`r${r.id}`} className="space-y-2 rounded-2xl border border-ink-200 bg-ink-50 p-4">
          <p className="flex flex-wrap items-center gap-2 font-semibold text-ink-800">
            {t('ksk.ack.review')}{r.period ? ` · ${r.period}` : ''} <Stars value={r.overall} />
            <span className="text-xs font-normal text-ink-500">{formatDate(r.review_date)} · {r.reviewer_name}</span>
          </p>
          {block(t('ksk.ack.strengths'), r.strengths)}
          {block(t('ksk.ack.improve'), r.improvements)}
          {block(t('ksk.ack.goals'), r.goals)}
          <Button disabled={!!busy} onClick={() => ack('review', r.id)} className="h-11"><Check /> {t('ksk.ack.button')}</Button>
        </div>
      ))}
    </div>
  );
}
