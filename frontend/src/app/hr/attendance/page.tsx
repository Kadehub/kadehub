'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Camera, MoreVertical, Pencil, Plus, Trash2 } from 'lucide-react';
import api from '../../../lib/api';
import { apiError } from '../../../lib/hr/api';
import { useHrT, type HrKey } from '../../../lib/hr/i18n';
import { formatDate, formatMinutes, formatShift, formatTime, thisPeriod, today, weekday } from '../../../lib/hr/format';
import type { Attendance, DaySheet, MonthCode, MonthSheet } from '../../../lib/hr/types';
import { useHr } from '../../../components/hr/HrContext';
import {
  Button, Card, ConfirmDialog, DayPicker, Dialog, EmptyState, ExportButton, Kpi, LoadError, Loading, Menu, MenuItem, MonthPicker,
  PageHeader, PersonCell, Pill, Tabs, cn, tbl,
} from '../../../components/hr/ui';
import PunchDialog from '../../../components/hr/time/PunchDialog';
import { DAY_STATUS, MONTH_CODE, useApi } from '../../../components/hr/time/shared';

// staff.kadehub.com/attendance — who came in today (or any day), and the month at a glance
export default function AttendancePage() {
  const { t } = useHrT();
  const [tab, setTab] = useState<'day' | 'month'>('day');
  return (
    <div className="space-y-5">
      <PageHeader title={t('nav.attendance')} subtitle={t('att.subtitle')} />
      <Tabs<'day' | 'month'> value={tab} onChange={setTab} items={[{ value: 'day', label: t('att.tab.day') }, { value: 'month', label: t('att.tab.month') }]} />
      {tab === 'day' ? <DayTab /> : <MonthTab />}
    </div>
  );
}

function DayTab() {
  const { t } = useHrT();
  const { branch } = useHr();
  const [date, setDate] = useState(today());
  const { data, error, reload } = useApi<DaySheet>('/hr/attendance/day', { date, branch_id: branch });
  const [edit, setEdit] = useState<Attendance | null>(null);
  const [adding, setAdding] = useState<{ employee: number | null } | null>(null);
  const [removing, setRemoving] = useState<Attendance | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);

  async function remove() {
    if (!removing) return;
    try {
      await api.delete(`/hr/attendance/${removing.id}`);
      toast.success(t('att.punch.deleted'));
      reload();
    } catch (err) {
      toast.error(apiError(err, t));
    }
  }

  const employees = data?.rows.map(r => r.employee) ?? [];
  const s = data?.summary;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <DayPicker value={date} onChange={setDate} max={today()} />
          {date !== today() && <Button variant="ghost" size="sm" onClick={() => setDate(today())}>{t('common.today')}</Button>}
        </div>
        <Button size="sm" onClick={() => setAdding({ employee: null })} disabled={!data}><Plus /> {t('att.punch.addButton')}</Button>
      </div>

      {s && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Kpi label={t('att.kpi.present')} value={String(s.present)} />
          <Kpi label={t('att.kpi.late')} value={String(s.late)} />
          <Kpi label={date === today() ? t('att.kpi.notIn') : t('att.kpi.absent')} value={String(s.absent)} tone={s.absent ? 'danger' : undefined} />
          <Kpi label={t('att.kpi.leave')} value={String(s.leave)} hint={t('att.kpi.offHint', { n: s.off })} />
        </div>
      )}

      {error ? <LoadError onRetry={reload} /> : !data ? <Loading /> : !data.rows.length ? (
        <Card><EmptyState title={t('att.empty')} description={t('att.emptyBody')} /></Card>
      ) : (
        <div className={tbl.wrap}>
          <table className={tbl.table}>
            <thead>
              <tr>
                <th className={tbl.th}>{t('common.employee')}</th>
                <th className={tbl.th}>{t('common.status')}</th>
                <th className={cn(tbl.th, 'hidden sm:table-cell')}>{t('att.shift')}</th>
                <th className={tbl.th}>{t('att.punches')}</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map(r => {
                const st = DAY_STATUS[r.status];
                return (
                  <tr key={r.employee.id} className="align-top">
                    <td className={tbl.td}><PersonCell name={r.employee.full_name} sub={r.employee.job_title || r.employee.emp_code} src={r.employee.photo_url} /></td>
                    <td className={tbl.td}>
                      <Pill tone={st.tone}>{t(st.key)}</Pill>
                      {r.leave && <p className="mt-1 text-2xs text-ink-500">{r.leave.type}{r.leave.half ? ' · ½' : ''}</p>}
                      {r.holiday && <p className="mt-1 text-2xs text-ink-500">{r.holiday}</p>}
                    </td>
                    <td className={cn(tbl.td, 'hidden whitespace-nowrap text-ink-600 sm:table-cell')}>{r.shift ? formatShift(r.shift.start_time, r.shift.end_time) : '—'}</td>
                    <td className={tbl.td}>
                      {!r.attendance.length && (
                        <button type="button" onClick={() => setAdding({ employee: r.employee.id })} className="text-xs font-semibold text-[color:var(--cod-primary)] hover:underline">
                          + {t('att.punch.addShort')}
                        </button>
                      )}
                      <ul className="space-y-1.5">
                        {r.attendance.map(a => (
                          <li key={a.id} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="whitespace-nowrap font-semibold text-ink-800">
                              {formatTime(a.in_time)} – {a.out_time ? formatTime(a.out_time) : <span className="text-emerald-700">{t('att.stillIn')}</span>}
                            </span>
                            {a.worked_minutes > 0 && <span className="text-xs text-ink-500">{formatMinutes(a.worked_minutes)}</span>}
                            {a.late_minutes > 0 && <Pill tone="amber">{t('att.lateBy', { m: a.late_minutes })}</Pill>}
                            {a.early_leave_minutes > 0 && <Pill tone="amber">{t('att.earlyBy', { m: a.early_leave_minutes })}</Pill>}
                            {a.overtime_minutes > 0 && <Pill tone="blue">{t('att.otBy', { d: formatMinutes(a.overtime_minutes) })}</Pill>}
                            {a.source === 'manual' && <Pill tone="gray">{t('att.manual')}</Pill>}
                            {[a.photo_in_url, a.photo_out_url].filter(Boolean).map((p, i) => (
                              <button key={i} type="button" onClick={() => setPhoto(p!)} aria-label={t('att.viewPhoto')} className="rounded-md ring-1 ring-ink-200">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={p!} alt="" className="h-7 w-7 rounded-md object-cover" />
                              </button>
                            ))}
                            {a.note && <span className="text-2xs italic text-ink-400">“{a.note}”</span>}
                            <Menu trigger={<MoreVertical />} label={t('common.actions')}>
                              {close => (
                                <>
                                  <MenuItem onClick={() => { close(); setEdit(a); }}><Pencil /> {t('att.punch.fix')}</MenuItem>
                                  <MenuItem danger onClick={() => { close(); setRemoving(a); }}><Trash2 /> {t('common.delete')}</MenuItem>
                                </>
                              )}
                            </Menu>
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <PunchDialog open={!!edit || !!adding} onClose={() => { setEdit(null); setAdding(null); }} attendance={edit} employees={employees}
        defaultDate={date} defaultEmployee={adding?.employee ?? null} onSaved={reload} />
      <ConfirmDialog open={!!removing} onClose={() => setRemoving(null)} onConfirm={remove} title={t('att.punch.deleteTitle')} message={t('common.cannotUndo')} confirmLabel={t('common.delete')} />
      <Dialog open={!!photo} onClose={() => setPhoto(null)} title={t('att.photoTitle')}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {photo && <img src={photo} alt="" className="mx-auto max-h-[70vh] rounded-xl" />}
        {photo && <a href={photo} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[color:var(--cod-primary)]"><Camera size={14} /> {t('common.open')}</a>}
      </Dialog>
    </div>
  );
}

function MonthTab() {
  const { t } = useHrT();
  const { branch } = useHr();
  const [period, setPeriod] = useState(thisPeriod());
  const { data, error, reload } = useApi<MonthSheet>('/hr/attendance/month', { period, branch_id: branch });
  const codes = Object.keys(MONTH_CODE) as MonthCode[];
  const now = today();

  const header = [t('att.col.code'), t('common.name'), ...(data?.days.map(d => d.slice(8)) ?? []),
    t('att.kpi.present'), t('att.kpi.late'), t('att.kpi.absent'), t('att.kpi.leave'), t('att.col.worked'), t('att.col.ot')];
  const rows = data?.rows.map(r => [r.employee.emp_code, r.employee.full_name, ...r.days.map(d => d.code),
    r.totals.present, r.totals.late, r.totals.absent, r.totals.leave, r.totals.worked_hours, r.totals.overtime_hours]) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <MonthPicker value={period} onChange={setPeriod} max={thisPeriod()} />
        <ExportButton filename={`attendance-${period}`} header={header} rows={rows} disabled={!data} />
      </div>
      <div className="flex flex-wrap gap-2 text-xs text-ink-600">
        {codes.map(c => (
          <span key={c} className="inline-flex items-center gap-1.5">
            <span className={cn('flex h-5 w-5 items-center justify-center rounded text-2xs font-bold', MONTH_CODE[c].cls)}>{c}</span>{t(MONTH_CODE[c].key)}
          </span>
        ))}
      </div>
      {error ? <LoadError onRetry={reload} /> : !data ? <Loading /> : !data.rows.length ? (
        <Card><EmptyState title={t('att.empty')} description={t('att.emptyBody')} /></Card>
      ) : (
        <div className={tbl.wrap}>
          <table className="w-max min-w-full text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 border-b border-ink-100 bg-ink-50 px-3 py-2 text-left font-semibold text-ink-500">{t('common.employee')}</th>
                {data.days.map(d => (
                  <th key={d} className={cn('border-b border-ink-100 px-0.5 py-1 text-center font-semibold', d === now ? 'text-ink-900' : 'text-ink-400', [0, 6].includes(weekday(d)) && 'bg-ink-50/60')}>
                    <span className="block text-2xs">{t(`att.wd.${weekday(d)}` as HrKey)}</span>{Number(d.slice(8))}
                  </th>
                ))}
                {[t('att.kpi.present'), t('att.kpi.late'), t('att.kpi.absent'), t('att.kpi.leave'), t('att.col.worked'), t('att.col.ot')].map(h => (
                  <th key={h} className="border-b border-l border-ink-100 bg-ink-50/60 px-2 py-2 text-right font-semibold text-ink-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map(r => (
                <tr key={r.employee.id}>
                  <td className="sticky left-0 z-10 max-w-[10rem] truncate border-b border-ink-100 bg-white px-3 py-1.5 font-medium text-ink-800">{r.employee.full_name}</td>
                  {r.days.map(d => (
                    <td key={d.date} className="border-b border-ink-100 px-0.5 py-1 text-center">
                      <span title={`${formatDate(d.date)} · ${t(MONTH_CODE[d.code].key)}${d.worked ? ` · ${formatMinutes(d.worked)}` : ''}`}
                        className={cn('mx-auto flex h-6 w-6 items-center justify-center rounded text-2xs font-bold', MONTH_CODE[d.code].cls)}>{d.code}</span>
                    </td>
                  ))}
                  {[r.totals.present, r.totals.late, r.totals.absent, r.totals.leave, r.totals.worked_hours, r.totals.overtime_hours].map((v, i) => (
                    <td key={i} className={cn('border-b border-l border-ink-100 px-2 py-1.5 text-right font-semibold', i === 2 && v ? 'text-red-600' : 'text-ink-700')}>{v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
