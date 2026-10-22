'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ExternalLink, FileText, Plus, Trash2 } from 'lucide-react';
import api from '../../../lib/api';
import { apiError, postForm } from '../../../lib/hr/api';
import { useHrT, type HrKey } from '../../../lib/hr/i18n';
import { formatDate, formatLKR, formatMinutes, formatNumber, formatPeriod, today } from '../../../lib/hr/format';
import type { Advance, EmployeeDocument, EmployeeProfile, LeaveRequest } from '../../../lib/hr/types';
import { hrHref, useHr } from '../HrContext';
import {
  Button, Card, ConfirmDialog, Dialog, Dot, EmptyState, Field, InfoRow, Loading, Pill, StatusPill, Stars, TextInput, tbl, cn,
} from '../ui';

type P = { profile: EmployeeProfile; reload: () => void };

export function OverviewTab({ profile }: P) {
  const { t } = useHrT();
  const { owner, branchName } = useHr();
  const e = profile.employee;
  const rateKey = `emp.f.rate.${e.pay_type ?? 'monthly'}` as HrKey;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title={t('emp.sec.personal')}>
        <div className="divide-y divide-ink-100">
          <InfoRow label={t('common.phone')} value={e.phone} />
          <InfoRow label={t('common.email')} value={e.email} />
          <InfoRow label={t('emp.f.nic')} value={e.nic} />
          <InfoRow label={t('emp.f.dob')} value={e.dob ? formatDate(e.dob) : ''} />
          <InfoRow label={t('emp.f.gender')} value={e.gender ? t(`emp.gender.${e.gender}` as HrKey) : ''} />
          <InfoRow label={t('common.address')} value={e.address} />
        </div>
      </Card>
      <Card title={t('emp.sec.job')}>
        <div className="divide-y divide-ink-100">
          <InfoRow label={t('emp.f.code')} value={e.emp_code} />
          <InfoRow label={t('emp.f.jobTitle')} value={e.job_title} />
          <InfoRow label={t('emp.f.department')} value={e.department} />
          <InfoRow label={t('app.branch')} value={branchName(e.branch_id)} />
          <InfoRow label={t('emp.f.employmentType')} value={t(`emp.type.${e.employment_type}` as HrKey)} />
          <InfoRow label={t('emp.f.joinDate')} value={formatDate(e.join_date)} />
          {e.leave_date && <InfoRow label={t('emp.endDate')} value={`${formatDate(e.leave_date)}${e.leave_reason ? ` · ${e.leave_reason}` : ''}`} />}
        </div>
      </Card>
      {owner && (
        <Card title={t('emp.sec.pay')}>
          <div className="divide-y divide-ink-100">
            <InfoRow label={t('emp.f.payType')} value={t(`emp.pay.${e.pay_type ?? 'monthly'}` as HrKey)} />
            <InfoRow label={t(rateKey)} value={e.base_salary ? formatLKR(e.base_salary) : <span className="text-amber-700">{t('emp.noSalary')}</span>} />
            <InfoRow label={t('emp.f.allowance')} value={e.fixed_allowance ? formatLKR(e.fixed_allowance) : ''} />
            <InfoRow label={t('emp.f.epf')} value={e.epf_enabled ? `${t('emp.epfOn')}${e.epf_number ? ` · ${e.epf_number}` : ''}` : t('emp.epfOff')} />
            <InfoRow label={t('emp.f.bankName')} value={e.bank_name} />
            <InfoRow label={t('emp.f.bankAccount')} value={e.bank_account} />
          </div>
        </Card>
      )}
      <Card title={t('emp.sec.emergency')}>
        <div className="divide-y divide-ink-100">
          <InfoRow label={t('emp.f.emergencyName')} value={e.emergency_name} />
          <InfoRow label={t('emp.f.emergencyPhone')} value={e.emergency_phone} />
        </div>
        {e.notes && <p className="mt-3 whitespace-pre-line rounded-lg bg-ink-50 p-3 text-sm text-ink-600">{e.notes}</p>}
      </Card>
    </div>
  );
}

export function DocumentsTab({ profile, reload }: P) {
  const { t } = useHrT();
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [removing, setRemoving] = useState<EmployeeDocument | null>(null);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { setError(t('err.FILE_REQUIRED')); return; }
    setBusy(true);
    setError(undefined);
    try {
      await postForm(`/hr/employees/${profile.employee.id}/documents`, { title: title.trim() }, file);
      toast.success(t('emp.doc.added'));
      setTitle('');
      setFile(null);
      reload();
    } catch (err) {
      setError(apiError(err, t));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
      <Card title={t('emp.tab.documents')}>
        {profile.documents.length === 0 ? <EmptyState title={t('emp.doc.empty')} scene="sleep" /> : (
          <ul className="divide-y divide-ink-100">
            {profile.documents.map(d => (
              <li key={d.id} className="flex items-center justify-between gap-3 py-2.5">
                <a href={d.url} target="_blank" rel="noreferrer" className="flex min-w-0 items-center gap-2 text-sm font-medium text-ink-800 hover:underline">
                  <FileText size={16} className="shrink-0 text-ink-400" /> <span className="truncate">{d.title}</span> <ExternalLink size={13} className="shrink-0 text-ink-400" />
                </a>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="hidden text-xs text-ink-400 sm:inline">{formatDate(d.created_at.slice(0, 10))}</span>
                  <Button variant="ghost" size="icon-sm" aria-label={t('common.delete')} onClick={() => setRemoving(d)}><Trash2 /></Button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card title={t('emp.doc.add')}>
        <form onSubmit={upload} className="space-y-3">
          <Field label={t('emp.doc.title')} htmlFor="doc-title">
            <TextInput id="doc-title" required maxLength={150} placeholder={t('emp.doc.titlePh')} value={title} onChange={e => setTitle(e.target.value)} />
          </Field>
          <Field label={t('emp.doc.file')} htmlFor="doc-file">
            <TextInput id="doc-file" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={e => setFile(e.target.files?.[0] ?? null)} />
          </Field>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={busy} className="w-full justify-center">{busy ? t('common.uploading') : t('common.upload')}</Button>
        </form>
      </Card>
      <ConfirmDialog open={!!removing} onClose={() => setRemoving(null)} title={t('emp.doc.deleteTitle')} message={removing?.title}
        confirmLabel={t('common.delete')}
        onConfirm={async () => {
          try { await api.delete(`/hr/documents/${removing!.id}`); reload(); } catch (err) { toast.error(apiError(err, t)); }
        }} />
    </div>
  );
}

export function LeaveTab({ profile }: P) {
  const { t } = useHrT();
  const [history, setHistory] = useState<LeaveRequest[] | null>(null);
  useEffect(() => {
    api.get<LeaveRequest[]>('/hr/leave', { params: { employee_id: profile.employee.id } })
      .then(r => setHistory(r.data)).catch(() => setHistory([]));
  }, [profile.employee.id]);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-2 text-sm font-semibold text-ink-800">{t('emp.leave.balances')}</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {profile.balances.map(b => (
            <div key={b.leave_type_id} className="kh-card p-4">
              <p className="flex items-center gap-1.5 text-xs text-ink-500"><Dot color={b.color} /> {b.name}</p>
              <p className="mt-1 text-xl font-bold text-ink-900">
                {b.remaining === null ? t('emp.leave.noLimit') : t('emp.leave.left', { n: formatNumber(b.remaining) })}
              </p>
              <p className="mt-0.5 text-2xs text-ink-400">{t('emp.leave.used', { used: formatNumber(b.used), pending: formatNumber(b.pending) })}</p>
            </div>
          ))}
        </div>
      </div>
      <Card title={t('emp.leave.history')}>
        {history === null ? <Loading /> : history.length === 0 ? <EmptyState title={t('emp.leave.empty')} scene="relax" /> : (
          <ul className="divide-y divide-ink-100">
            {history.map(l => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <Dot color={l.type_color} />
                  <span className="font-medium text-ink-800">{l.type_name}</span>
                  <span className="text-ink-500">
                    {formatDate(l.start_date)}{l.end_date !== l.start_date ? ` – ${formatDate(l.end_date)}` : ''} · {l.half_day ? t('emp.leave.halfDay') : `${formatNumber(l.days)} ${t('common.days')}`}
                  </span>
                </span>
                <StatusPill status={l.status} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

export function AttendanceTab({ profile }: P) {
  const { t } = useHrT();
  const rows = profile.attendance;
  return (
    <Card title={t('emp.att.title')}>
      {rows.length === 0 ? <EmptyState title={t('emp.att.empty')} scene="sleep" /> : (
        <div className={tbl.wrap}>
          <table className={tbl.table}>
            <thead>
              <tr>
                <th className={tbl.th}>{t('common.date')}</th>
                <th className={tbl.th}>{t('emp.att.in')}</th>
                <th className={tbl.th}>{t('emp.att.out')}</th>
                <th className={cn(tbl.th, tbl.right)}>{t('emp.att.worked')}</th>
                <th className={cn(tbl.th, tbl.right)}>{t('emp.att.late')}</th>
                <th className={cn(tbl.th, tbl.right)}>{t('emp.att.overtime')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(a => (
                <tr key={a.id}>
                  <td className={tbl.td}>
                    {formatDate(a.work_date, true)}
                    {a.source === 'manual' && <span className="ml-1.5 text-2xs text-ink-400">{t('emp.att.manual')}</span>}
                  </td>
                  <td className={tbl.td}>{a.in_time}</td>
                  <td className={tbl.td}>{a.out_time ?? <Pill tone="blue">{t('emp.att.open')}</Pill>}</td>
                  <td className={cn(tbl.td, tbl.right)}>{a.clock_out ? formatMinutes(a.worked_minutes) : '—'}</td>
                  <td className={cn(tbl.td, tbl.right, a.late_minutes > 0 && 'font-semibold text-amber-700')}>{a.late_minutes ? formatMinutes(a.late_minutes) : '—'}</td>
                  <td className={cn(tbl.td, tbl.right)}>{a.overtime_minutes ? formatMinutes(a.overtime_minutes) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export function AssetsTab({ profile }: P) {
  const { t } = useHrT();
  const holding = profile.assets.filter(a => a.outstanding);
  const past = profile.assets.filter(a => !a.outstanding);
  const row = (a: (typeof profile.assets)[number]) => (
    <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
      <span className="min-w-0">
        <span className="font-medium text-ink-800">{a.asset_name}</span>
        <span className="ml-1.5 text-xs text-ink-400">{a.asset_code}</span>
      </span>
      <span className="flex flex-wrap items-center gap-2 text-xs text-ink-500">
        {a.returned_date ? t('emp.ast.returned', { date: formatDate(a.returned_date) }) : t('emp.ast.issued', { date: formatDate(a.issued_date) })}
        {a.condition_in === 'lost' && <Pill tone="red">{t('emp.ast.lost')}</Pill>}
        {a.deduction_amount > 0 && <Pill tone="amber">{t('emp.ast.charged', { amount: formatLKR(a.deduction_amount) })}</Pill>}
      </span>
    </li>
  );
  if (!profile.assets.length) return <Card><EmptyState title={t('emp.ast.empty')} scene="relax" /></Card>;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title={t('emp.ast.holding')}>
        {holding.length ? <ul className="divide-y divide-ink-100">{holding.map(row)}</ul> : <p className="text-sm text-ink-400">{t('common.none')}</p>}
      </Card>
      <Card title={t('emp.ast.history')}>
        {past.length ? <ul className="divide-y divide-ink-100">{past.map(row)}</ul> : <p className="text-sm text-ink-400">{t('common.none')}</p>}
      </Card>
    </div>
  );
}

export function PerformanceTab({ profile }: P) {
  const { t } = useHrT();
  const ack = (at: string | null) => at
    ? <Pill tone="green">{t('emp.perf.acknowledged')}</Pill>
    : <Pill tone="gray">{t('emp.perf.notAcknowledged')}</Pill>;
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link href={hrHref('/performance')} className="text-sm font-semibold text-[color:var(--cod-primary)] hover:underline">{t('emp.perf.open')} →</Link>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={t('emp.perf.reviews')}>
          {profile.reviews.length === 0 ? <p className="text-sm text-ink-400">{t('emp.perf.noReviews')}</p> : (
            <ul className="divide-y divide-ink-100">
              {profile.reviews.map(r => (
                <li key={r.id} className="space-y-1 py-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-ink-800">{r.period || formatDate(r.review_date)}</span>
                    <span className="flex items-center gap-2"><Stars value={r.overall} size={14} /> {ack(r.acknowledged_at)}</span>
                  </div>
                  <p className="text-xs text-ink-400">{formatDate(r.review_date)} · {t('emp.perf.by', { name: r.reviewer_name })} · {t('emp.perf.overall', { n: formatNumber(r.overall, 1) })}</p>
                  {r.strengths && <p className="text-ink-600">{r.strengths}</p>}
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title={t('emp.perf.warnings')}>
          {profile.warnings.length === 0 ? <p className="text-sm text-ink-400">{t('emp.perf.noWarnings')}</p> : (
            <ul className="divide-y divide-ink-100">
              {profile.warnings.map(w => (
                <li key={w.id} className="space-y-1 py-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Pill tone={w.level === 'final' ? 'red' : w.level === 'written' ? 'amber' : 'gray'}>{t(`emp.warn.${w.level}` as HrKey)}</Pill>
                    {ack(w.acknowledged_at)}
                  </div>
                  <p className="font-medium text-ink-800">{w.reason}</p>
                  <p className="text-xs text-ink-400">{formatDate(w.warning_date)} · {t('emp.perf.by', { name: w.issued_by_name })}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

/** Owner only: advances and payslips. */
export function PayTab({ profile, reload }: P) {
  const { t } = useHrT();
  const [adding, setAdding] = useState(false);
  const advances = profile.advances ?? [];
  const payslips = profile.payslips ?? [];
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title={t('emp.adv.title')}
        action={profile.employee.status === 'active' && <Button size="sm" variant="outline" onClick={() => setAdding(true)}><Plus /> {t('emp.adv.add')}</Button>}>
        {advances.length === 0 ? <p className="text-sm text-ink-400">{t('emp.adv.empty')}</p> : (
          <ul className="divide-y divide-ink-100">
            {advances.map((a: Advance) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <span>
                  <span className="font-semibold text-ink-800">{formatLKR(a.amount)}</span>
                  <span className="ml-1.5 text-xs text-ink-400">{formatDate(a.given_date)} · {t('emp.adv.perMonth', { amount: formatLKR(a.monthly_deduction) })}</span>
                </span>
                {a.status === 'closed' || a.balance <= 0
                  ? <Pill tone="green">{t('emp.adv.closed')}</Pill>
                  : <Pill tone="amber">{t('emp.adv.balance', { amount: formatLKR(a.balance) })}</Pill>}
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card title={t('emp.slip.title')}>
        {payslips.length === 0 ? <p className="text-sm text-ink-400">{t('emp.slip.empty')}</p> : (
          <ul className="divide-y divide-ink-100">
            {payslips.map(p => (
              <li key={p.id}>
                <Link href={hrHref(`/payroll/payslips/${p.id}`)} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm hover:bg-ink-50/60">
                  <span className="font-medium text-ink-800">{p.period ? formatPeriod(p.period) : '—'}</span>
                  <span className="flex items-center gap-2">
                    <span className="font-semibold text-ink-900">{formatLKR(p.net_pay)}</span>
                    {p.paid_at ? <Pill tone="green">{t('emp.slip.paid')}</Pill>
                      : p.run_status === 'draft' ? <Pill tone="gray">{t('emp.slip.draft')}</Pill>
                        : <Pill tone="amber">{t('emp.slip.unpaid')}</Pill>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {adding && <AdvanceDialog employeeId={profile.employee.id} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); reload(); }} />}
    </div>
  );
}

function AdvanceDialog({ employeeId, onClose, onSaved }: { employeeId: number; onClose: () => void; onSaved: () => void }) {
  const { t } = useHrT();
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today());
  const [monthly, setMonthly] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      await api.post('/hr/advances', {
        employee_id: employeeId, amount: Number(amount), given_date: date, monthly_deduction: Number(monthly || amount), note,
      });
      toast.success(t('emp.adv.added'));
      onSaved();
    } catch (err) {
      setError(apiError(err, t));
      setBusy(false);
    }
  }

  return (
    <Dialog open onClose={() => !busy && onClose()} title={t('emp.adv.add')} width="max-w-md">
      <form onSubmit={submit} className="space-y-3">
        <Field label={t('emp.adv.amount')} htmlFor="adv-amount">
          <TextInput id="adv-amount" type="number" required min={1} step="0.01" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} />
        </Field>
        <Field label={t('emp.adv.date')} htmlFor="adv-date">
          <TextInput id="adv-date" type="date" required max={today()} value={date} onChange={e => setDate(e.target.value)} />
        </Field>
        <Field label={t('emp.adv.monthly')} htmlFor="adv-monthly" hint={t('emp.adv.monthlyHint')}>
          <TextInput id="adv-monthly" type="number" min={0} step="0.01" inputMode="decimal" placeholder={amount} value={monthly} onChange={e => setMonthly(e.target.value)} />
        </Field>
        <Field label={t('common.note')} htmlFor="adv-note">
          <TextInput id="adv-note" maxLength={300} value={note} onChange={e => setNote(e.target.value)} />
        </Field>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>{t('common.cancel')}</Button>
          <Button type="submit" disabled={busy}>{busy ? t('common.saving') : t('common.save')}</Button>
        </div>
      </form>
    </Dialog>
  );
}

