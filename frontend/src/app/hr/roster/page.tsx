'use client';

import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, CalendarPlus, Copy, Plus, Repeat, Share2 } from 'lucide-react';
import api from '../../../lib/api';
import { apiError } from '../../../lib/hr/api';
import { useHrT } from '../../../lib/hr/i18n';
import { addDays, formatDate, formatDayShort, formatTime, shiftMinutes, today, weekStart } from '../../../lib/hr/format';
import type { RosterEntry, RosterWeek } from '../../../lib/hr/types';
import { useHr } from '../../../components/hr/HrContext';
import {
  Avatar, BranchSelect, Button, Card, ConfirmDialog, EmptyState, LoadError, Loading, PageHeader, Pill, Tabs, WeekPicker, cn,
} from '../../../components/hr/ui';
import { BulkDialog, EntryDialog, ShareDialog, SwapDialog, entryColor } from '../../../components/hr/time/RosterDialogs';
import SwapsPanel from '../../../components/hr/time/SwapsPanel';
import { useApi } from '../../../components/hr/time/shared';

type Target = { employeeId: number | null; date: string | null; entry: RosterEntry | null };

/** Hide the app chrome when printing the roster. */
const PRINT_CSS = '@media print{aside,header.sticky,nav.fixed,.hr-no-print{display:none!important}main{padding:0!important}.hr-print-only{display:block!important}body{background:#fff}}';

// staff.kadehub.com/roster — weekly roster for one branch, with bulk fill, copy, WhatsApp sharing and swap approvals
export default function RosterPage() {
  const { t } = useHrT();
  const { branches, branch, branchName } = useHr();
  const [picked, setPicked] = useState<number | null>(null);
  const branchId = branch ?? picked;
  const [week, setWeek] = useState(() => weekStart(today()));
  const [tab, setTab] = useState<'week' | 'swaps'>('week');
  const { data, error, reload } = useApi<RosterWeek>(branchId ? '/hr/roster' : null, { branch_id: branchId, week });

  const [target, setTarget] = useState<Target | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [swapOpen, setSwapOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);

  if (!branchId) {
    return (
      <div className="space-y-5">
        <PageHeader title={t('nav.roster')} subtitle={t('ros.subtitle')} />
        <Card>
          {branches.length
            ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <p className="text-sm text-ink-600">{t('ros.pickBranch')}</p>
                <BranchSelect branches={branches} value={null} onChange={setPicked} allowAll={false} hideSingle={false} />
              </div>
            )
            : <EmptyState title={t('ros.noBranches')} />}
        </Card>
      </div>
    );
  }

  async function copyLastWeek() {
    try {
      const { data: res } = await api.post<{ created: number; skipped: number }>('/hr/roster/copy-week', {
        branch_id: branchId, from_week: addDays(week, -7), to_week: week, overwrite: false,
      });
      toast.success(t('ros.copy.done', { created: res.created, skipped: res.skipped }));
      reload();
    } catch (err) {
      toast.error(apiError(err, t));
    }
  }

  return (
    <div className="space-y-5">
      <style>{PRINT_CSS}</style>
      <PageHeader title={`${t('nav.roster')} · ${branchName(branchId)}`} subtitle={t('ros.subtitle')}
        actions={tab === 'week' && data ? (
          <div className="hr-no-print flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setBulkOpen(true)}><CalendarPlus /> {t('ros.bulk.button')}</Button>
            <Button variant="outline" size="sm" onClick={() => setCopyOpen(true)}><Copy /> {t('ros.copy.button')}</Button>
            <Button variant="outline" size="sm" onClick={() => setSwapOpen(true)}><Repeat /> {t('ros.swap.recordButton')}</Button>
            <Button size="sm" onClick={() => setShareOpen(true)}><Share2 /> {t('ros.share.button')}</Button>
          </div>
        ) : undefined} />

      <div className="hr-no-print flex flex-wrap items-center justify-between gap-3">
        <Tabs<'week' | 'swaps'> value={tab} onChange={setTab} items={[{ value: 'week', label: t('ros.tab.week') }, { value: 'swaps', label: t('ros.tab.swaps') }]} />
        {tab === 'week' && (
          <div className="flex flex-wrap items-center gap-2">
            {branch === null && <BranchSelect branches={branches} value={branchId} onChange={setPicked} allowAll={false} />}
            <WeekPicker value={week} onChange={setWeek} />
            {week !== weekStart(today()) && <Button variant="ghost" size="sm" onClick={() => setWeek(weekStart(today()))}>{t('common.thisWeek')}</Button>}
          </div>
        )}
      </div>

      {tab === 'swaps'
        ? <SwapsPanel branchId={branchId} onChanged={reload} />
        : error ? <LoadError onRetry={reload} />
        : !data || data.from !== week ? <Loading />
        : <WeekView week={data} onCell={setTarget} />}

      {data && (
        <>
          <EntryDialog open={!!target} onClose={() => setTarget(null)} branchId={branchId} week={data} employees={data.employees}
            templates={data.templates} employeeId={target?.employeeId ?? null} date={target?.date ?? null} entry={target?.entry ?? null} onSaved={reload} />
          <BulkDialog open={bulkOpen} onClose={() => setBulkOpen(false)} branchId={branchId} week={data} employees={data.employees} templates={data.templates} onSaved={reload} />
          <ShareDialog open={shareOpen} onClose={() => setShareOpen(false)} week={data} branchLabel={branchName(branchId)} />
          <SwapDialog open={swapOpen} onClose={() => setSwapOpen(false)} week={data} onSaved={reload} />
        </>
      )}
      <ConfirmDialog open={copyOpen} onClose={() => setCopyOpen(false)} onConfirm={copyLastWeek} danger={false}
        title={t('ros.copy.title')} message={t('ros.copy.body', { from: formatDate(addDays(week, -7), true), to: formatDate(week, true) })}
        confirmLabel={t('ros.copy.confirm')} />
    </div>
  );
}

function WeekView({ week, onCell }: { week: RosterWeek; onCell: (t: Target) => void }) {
  const { t } = useHrT();
  const { branchName } = useHr();
  const now = today();

  const cell = useMemo(() => {
    const at = (empId: number, date: string) => ({
      entry: week.entries.find(e => e.employee_id === empId && e.work_date === date) ?? null,
      elsewhere: week.elsewhere.find(e => e.employee_id === empId && e.work_date === date) ?? null,
      leave: week.leave.find(l => l.employee_id === empId && l.start_date <= date && l.end_date >= date && (l.status === 'approved' || l.status === 'pending')) ?? null,
    });
    return at;
  }, [week]);

  const hours = (empId: number) => {
    const mins = week.entries.filter(e => e.employee_id === empId).reduce((m, e) => m + shiftMinutes(e.start_time, e.end_time, e.break_minutes), 0)
      + week.elsewhere.filter(e => e.employee_id === empId).reduce((m, e) => m + shiftMinutes(e.start_time, e.end_time), 0);
    return Math.round(mins / 6) / 10;
  };
  const nameOf = (id: number) => week.employees.find(e => e.id === id)?.full_name ?? '';
  const holiday = (d: string) => week.holidays.find(h => h.holiday_date === d);

  if (!week.employees.length) return <Card><EmptyState title={t('ros.noStaff')} description={t('ros.noStaffBody')} /></Card>;

  const renderCell = (empId: number, date: string, compact = false) => {
    const { entry, elsewhere, leave } = cell(empId, date);
    if (entry) {
      const color = entryColor(entry, week.templates);
      return (
        <button type="button" onClick={() => onCell({ employeeId: empId, date, entry })}
          className="w-full rounded-lg border-l-4 bg-ink-50 px-2 py-1.5 text-left text-xs hover:bg-ink-100" style={{ borderLeftColor: color }}>
          <span className="block font-semibold text-ink-800">{formatTime(entry.start_time)}–{formatTime(entry.end_time)}</span>
          {!compact && <span className="block truncate text-2xs text-ink-500">{week.templates.find(s => s.id === entry.shift_template_id)?.name ?? t('ros.entry.custom')}{entry.note ? ` · ${entry.note}` : ''}</span>}
          {leave?.status === 'pending' && <span className="block text-2xs font-semibold text-amber-700">{t('ros.cell.leaveRequested')}</span>}
        </button>
      );
    }
    if (leave?.status === 'approved') {
      return (
        <span className="block rounded-lg px-2 py-1.5 text-xs font-semibold" style={{ background: `color-mix(in srgb, ${leave.color} 15%, white)`, color: leave.color }}>
          {leave.type_name || t('att.status.leave')}{leave.half_day ? ` · ½` : ''}
        </span>
      );
    }
    if (elsewhere) {
      return <span className="block rounded-lg bg-ink-100 px-2 py-1.5 text-2xs text-ink-500">{t('ros.cell.elsewhere', { branch: branchName(elsewhere.branch_id) })}<br />{formatTime(elsewhere.start_time)}–{formatTime(elsewhere.end_time)}</span>;
    }
    return (
      <button type="button" onClick={() => onCell({ employeeId: empId, date, entry: null })} aria-label={t('ros.entry.addTitle')}
        className={cn('flex w-full items-center justify-center rounded-lg border border-dashed border-ink-200 py-2 text-ink-300 hover:border-ink-400 hover:text-ink-500',
          leave?.status === 'pending' && 'border-amber-300 text-amber-600')}>
        {leave?.status === 'pending' ? <span className="text-2xs font-semibold">{t('ros.cell.leaveRequested')}</span> : <Plus size={14} />}
      </button>
    );
  };

  return (
    <div className="space-y-4">
      {week.warnings.length > 0 && (
        <div className="hr-no-print rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="flex items-center gap-2 font-semibold"><AlertTriangle size={16} /> {t('ros.warnings.title')}</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-6">
            {week.warnings.map((w, i) => (
              <li key={i}>
                {w.code === 'TOO_MANY_HOURS'
                  ? t('ros.warnings.hours', { name: nameOf(w.employee_id), h: w.value ?? 0 })
                  : t('ros.warnings.leave', { name: nameOf(w.employee_id), date: formatDate(w.date ?? '', true) })}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Desktop and print: the full week grid */}
      <div className="hidden overflow-x-auto rounded-xl border border-ink-200 bg-white md:block print:block">
        <table className="w-full min-w-[56rem] table-fixed text-sm">
          <thead>
            <tr>
              <th className="w-48 border-b border-ink-100 bg-ink-50/60 px-3 py-2.5 text-left text-xs font-semibold text-ink-500">{t('common.employee')}</th>
              {week.days.map(d => {
                const h = holiday(d);
                return (
                  <th key={d} className={cn('border-b border-l border-ink-100 px-2 py-2 text-left text-xs font-semibold', d === now ? 'text-ink-900' : 'bg-ink-50/60 text-ink-500')}
                    style={d === now ? { background: 'color-mix(in srgb, var(--cod-primary) 12%, white)' } : undefined}>
                    {formatDayShort(d)}
                    {h && <span className="mt-0.5 block truncate text-2xs font-semibold text-sky-700" title={h.name}>{h.name}</span>}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {week.employees.map(e => (
              <tr key={e.id} className="align-top">
                <td className="border-b border-ink-100 px-3 py-2">
                  <span className="flex items-center gap-2">
                    <Avatar name={e.full_name} src={e.photo_url} size={28} />
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-ink-800">{e.full_name}</span>
                      <span className="block text-2xs text-ink-400">{t('ros.hoursWeek', { h: hours(e.id) })}{e.lent && <> · <Pill tone="blue">{t('ros.lent')}</Pill></>}</span>
                    </span>
                  </span>
                </td>
                {week.days.map(d => <td key={d} className="border-b border-l border-ink-100 p-1.5">{renderCell(e.id, d)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Phones: one card per day */}
      <div className="space-y-3 md:hidden print:hidden">
        {week.days.map(d => {
          const h = holiday(d);
          const working = week.employees.filter(e => cell(e.id, d).entry);
          const away = week.employees.filter(e => !cell(e.id, d).entry && (cell(e.id, d).leave?.status === 'approved' || cell(e.id, d).elsewhere));
          return (
            <Card key={d} title={<span className={cn(d === now && 'text-[color:var(--cod-primary)]')}>{formatDayShort(d)} {formatDate(d, true)}{h ? ` · ${h.name}` : ''}</span>}
              action={<Button variant="ghost" size="sm" onClick={() => onCell({ employeeId: null, date: d, entry: null })}><Plus /> {t('common.add')}</Button>}>
              {!working.length && !away.length && <p className="text-sm text-ink-400">{t('ros.share.nobody')}</p>}
              <ul className="space-y-2">
                {[...working, ...away].map(e => (
                  <li key={e.id} className="flex items-center gap-3">
                    <Avatar name={e.full_name} src={e.photo_url} size={28} />
                    <span className="w-28 shrink-0 truncate text-sm font-medium text-ink-800">{e.full_name}</span>
                    <span className="min-w-0 flex-1">{renderCell(e.id, d, true)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
