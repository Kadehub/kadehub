'use client';

import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Check, Plus, X } from 'lucide-react';
import api from '../../../lib/api';
import { apiError } from '../../../lib/hr/api';
import { useHrT, type HrKey } from '../../../lib/hr/i18n';
import { addDays, formatDate, formatNumber, thisPeriod, today, weekday } from '../../../lib/hr/format';
import type { Employee, Holiday, LeaveRequest, LeaveType, ReportData } from '../../../lib/hr/types';
import { useHr } from '../../../components/hr/HrContext';
import {
  Button, Card, Dialog, Dot, EmptyState, ExportButton, Field, LoadError, Loading, MonthPicker, NativeSelect, PageHeader, PersonCell, Pill,
  StatusPill, Tabs, TextInput, cn, tbl,
} from '../../../components/hr/ui';
import LeaveDialog from '../../../components/hr/time/LeaveDialog';
import { WEEK_ORDER, periodRangeOf, useApi } from '../../../components/hr/time/shared';

type Tab = 'requests' | 'calendar' | 'balances';
type Decision = { req: LeaveRequest; action: 'approve' | 'reject' | 'cancel' };

// staff.kadehub.com/leave — requests to decide, the month's leave calendar and yearly balances
export default function LeavePage() {
  const { t } = useHrT();
  const { branch } = useHr();
  const [tab, setTab] = useState<Tab>('requests');
  const [newOpen, setNewOpen] = useState(false);
  const [version, setVersion] = useState(0);
  const employees = useApi<Employee[]>('/hr/employees', { branch_id: branch });
  const types = useApi<LeaveType[]>('/hr/leave-types');

  return (
    <div className="space-y-5">
      <PageHeader title={t('nav.leave')} subtitle={t('lv.subtitle')}
        actions={<Button onClick={() => setNewOpen(true)} disabled={!employees.data || !types.data}><Plus /> {t('lv.new.button')}</Button>} />
      <Tabs<Tab> value={tab} onChange={setTab} items={[
        { value: 'requests', label: t('lv.tab.requests') },
        { value: 'calendar', label: t('lv.tab.calendar') },
        { value: 'balances', label: t('lv.tab.balances') },
      ]} />
      {tab === 'requests' && <RequestsTab key={version} />}
      {tab === 'calendar' && <CalendarTab key={version} />}
      {tab === 'balances' && <BalancesTab key={version} />}
      <LeaveDialog open={newOpen} onClose={() => setNewOpen(false)} employees={employees.data ?? []} types={types.data ?? []}
        onSaved={() => setVersion(v => v + 1)} />
    </div>
  );
}

function RequestsTab() {
  const { t } = useHrT();
  const { branch, branchName, branches } = useHr();
  const [status, setStatus] = useState('pending');
  const { data, error, reload } = useApi<LeaveRequest[]>('/hr/leave', { status, branch_id: branch });
  const [decision, setDecision] = useState<Decision | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const rows = useMemo(() => [...(data ?? [])].sort((a, b) =>
    Number(b.status === 'pending') - Number(a.status === 'pending') || b.start_date.localeCompare(a.start_date)), [data]);

  async function decide() {
    if (!decision) return;
    setBusy(true);
    try {
      const { data: res } = await api.post<{ removed_shifts?: number }>(`/hr/leave/${decision.req.id}/${decision.action}`, { note });
      if (decision.action === 'approve') toast.success(res.removed_shifts ? t('lv.approvedShifts', { n: res.removed_shifts }) : t('lv.approvedToast'));
      else toast.success(decision.action === 'reject' ? t('lv.rejectedToast') : t('lv.cancelledToast'));
      setDecision(null);
      reload();
    } catch (err) {
      toast.error(apiError(err, t));
    } finally {
      setBusy(false);
    }
  }

  const open = (req: LeaveRequest, action: Decision['action']) => { setNote(''); setDecision({ req, action }); };
  const dates = (r: LeaveRequest) => r.start_date === r.end_date ? formatDate(r.start_date) : `${formatDate(r.start_date, true)} – ${formatDate(r.end_date)}`;

  return (
    <div className="space-y-4">
      <NativeSelect value={status} onChange={e => setStatus(e.target.value)} className="w-auto" aria-label={t('common.status')}>
        <option value="pending">{t('common.pending')}</option>
        <option value="approved">{t('common.approved')}</option>
        <option value="rejected">{t('common.rejected')}</option>
        <option value="cancelled">{t('common.cancelled')}</option>
        <option value="">{t('common.all')}</option>
      </NativeSelect>
      {error ? <LoadError onRetry={reload} /> : !data ? <Loading /> : !rows.length ? (
        <Card><EmptyState scene="relax" title={status === 'pending' ? t('lv.noPending') : t('lv.none')} description={status === 'pending' ? t('lv.noPendingBody') : undefined} /></Card>
      ) : (
        <ul className="space-y-2">
          {rows.map(r => (
            <li key={r.id} className="kh-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                <div className="sm:w-56"><PersonCell name={r.employee_name} sub={branches.length > 1 ? branchName(r.branch_id) : r.emp_code} src={r.photo_url} /></div>
                <div className="min-w-0 flex-1 text-sm">
                  <p className="flex flex-wrap items-center gap-2 font-semibold text-ink-800">
                    <Dot color={r.type_color} /> {r.type_name}
                    {!r.paid && <Pill tone="gray">{t('lv.unpaid')}</Pill>}
                    <StatusPill status={r.status} />
                  </p>
                  <p className="text-xs text-ink-500">
                    {dates(r)} · {r.half_day ? t('lv.halfDayShort') : t('lv.daysCount', { n: formatNumber(r.days, 1) })}
                  </p>
                  {r.reason && <p className="mt-0.5 text-xs italic text-ink-400">“{r.reason}”</p>}
                  {r.decision_note && <p className="mt-0.5 text-xs text-ink-500">{t('lv.decisionNote', { note: r.decision_note })}</p>}
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                {r.status === 'pending' && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => open(r, 'reject')}><X /> {t('common.reject')}</Button>
                    <Button size="sm" onClick={() => open(r, 'approve')}><Check /> {t('common.approve')}</Button>
                  </>
                )}
                {r.status === 'approved' && r.end_date >= today() && (
                  <Button size="sm" variant="ghost" onClick={() => open(r, 'cancel')}>{t('lv.cancelLeave')}</Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!decision} onClose={() => setDecision(null)} title={decision ? t(`lv.decide.${decision.action}` as HrKey) : ''} width="max-w-sm">
        {decision && (
          <div className="space-y-4">
            <p className="text-sm text-ink-600">{decision.req.employee_name} · {decision.req.type_name} · {dates(decision.req)}</p>
            {decision.action === 'approve' && <p className="text-xs text-ink-500">{t('lv.decide.approveHint')}</p>}
            <Field label={t('common.note')} htmlFor="lv-note">
              <TextInput id="lv-note" maxLength={300} value={note} onChange={e => setNote(e.target.value)} placeholder={t('common.optional')} />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDecision(null)} disabled={busy}>{t('common.close')}</Button>
              <Button variant={decision.action === 'approve' ? 'primary' : 'danger'} onClick={decide} disabled={busy}>
                {busy ? t('common.saving') : t(`lv.decide.${decision.action}Button` as HrKey)}
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}

function CalendarTab() {
  const { t } = useHrT();
  const { branch } = useHr();
  const [period, setPeriod] = useState(thisPeriod());
  const { from, to } = periodRangeOf(period);
  const leave = useApi<LeaveRequest[]>('/hr/leave', { from, to, branch_id: branch });
  const holidays = useApi<Holiday[]>('/hr/holidays', { year: period.slice(0, 4) });
  const now = today();

  // Monday-first grid: blank cells before the 1st, then every day of the month
  const lead = (weekday(from) + 6) % 7;
  const days: Array<string | null> = [...Array(lead).fill(null)];
  for (let d = from; d <= to; d = addDays(d, 1)) days.push(d);
  while (days.length % 7) days.push(null);

  const list = (leave.data ?? []).filter(l => l.status === 'approved' || l.status === 'pending');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <MonthPicker value={period} onChange={setPeriod} />
        <div className="flex gap-3 text-xs text-ink-500">
          <span className="inline-flex items-center gap-1.5"><span className="h-3 w-5 rounded bg-violet-200" /> {t('common.approved')}</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-3 w-5 rounded border border-dashed border-violet-400" /> {t('common.pending')}</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-3 w-5 rounded bg-sky-100" /> {t('att.status.holiday')}</span>
        </div>
      </div>
      {leave.error ? <LoadError onRetry={leave.reload} /> : !leave.data ? <Loading /> : (
        <div className="overflow-hidden rounded-xl border border-ink-200 bg-white">
          <div className="grid grid-cols-7 border-b border-ink-100 bg-ink-50/60">
            {WEEK_ORDER.map(w => <div key={w} className="px-2 py-2 text-center text-2xs font-semibold text-ink-500">{t(`att.wd.${w}` as HrKey)}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {days.map((d, i) => {
              const h = d ? holidays.data?.find(x => x.holiday_date === d) : undefined;
              const onDay = d ? list.filter(l => l.start_date <= d && l.end_date >= d) : [];
              return (
                <div key={i} className={cn('min-h-[5.5rem] border-b border-r border-ink-100 p-1 sm:p-1.5', !d && 'bg-ink-50/40', h && 'bg-sky-50')}>
                  {d && (
                    <>
                      <p className={cn('text-xs font-semibold', d === now ? 'text-[color:var(--cod-primary)]' : 'text-ink-500')}>{Number(d.slice(8))}</p>
                      {h && <p className="truncate text-2xs font-semibold text-sky-700" title={h.name}>{h.name}</p>}
                      <ul className="mt-0.5 space-y-0.5">
                        {onDay.slice(0, 4).map(l => (
                          <li key={l.id} title={`${l.employee_name} · ${l.type_name}`}
                            className={cn('truncate rounded px-1 text-2xs font-semibold', l.status === 'pending' && 'border border-dashed')}
                            style={l.status === 'pending'
                              ? { borderColor: l.type_color, color: l.type_color }
                              : { background: `color-mix(in srgb, ${l.type_color} 18%, white)`, color: l.type_color }}>
                            {l.employee_name.split(' ')[0]}
                          </li>
                        ))}
                        {onDay.length > 4 && <li className="text-2xs text-ink-400">+{onDay.length - 4}</li>}
                      </ul>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function BalancesTab() {
  const { t } = useHrT();
  const { branch } = useHr();
  const thisYear = Number(today().slice(0, 4));
  const [year, setYear] = useState(thisYear);
  const { data, error, reload } = useApi<ReportData>('/hr/reports/leave', { period: `${year}-01`, branch_id: branch });
  const cols = (data?.columns ?? []).filter(c => c.startsWith('type_'));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <NativeSelect value={year} onChange={e => setYear(Number(e.target.value))} className="w-auto" aria-label={t('lv.year')}>
          {[thisYear + 1, thisYear, thisYear - 1, thisYear - 2].map(y => <option key={y} value={y}>{y}</option>)}
        </NativeSelect>
        <ExportButton filename={`leave-balances-${year}`} disabled={!data}
          header={[t('att.col.code'), t('common.name'), ...cols.map(c => data?.labels?.[c] ?? c)]}
          rows={(data?.rows ?? []).map(r => [r.emp_code, r.name, ...cols.map(c => r[c])])} />
      </div>
      <p className="text-xs text-ink-400">{t('lv.balancesHint')}</p>
      {error ? <LoadError onRetry={reload} /> : !data ? <Loading /> : !data.rows.length ? (
        <Card><EmptyState title={t('att.empty')} /></Card>
      ) : (
        <div className={tbl.wrap}>
          <table className={tbl.table}>
            <thead>
              <tr>
                <th className={tbl.th}>{t('common.employee')}</th>
                {cols.map(c => <th key={c} className={cn(tbl.th, tbl.right)}>{data.labels?.[c] ?? c}</th>)}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r, i) => (
                <tr key={i}>
                  <td className={tbl.td}><span className="font-medium text-ink-800">{r.name}</span> <span className="text-xs text-ink-400">{r.emp_code}</span></td>
                  {cols.map(c => {
                    const [used, of] = String(r[c] ?? '').split(' / ').map(Number);
                    const over = of !== undefined && !Number.isNaN(of) && used >= of && of > 0;
                    return <td key={c} className={cn(tbl.td, tbl.right, 'whitespace-nowrap', over ? 'font-semibold text-red-600' : 'text-ink-700')}>{r[c]}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
