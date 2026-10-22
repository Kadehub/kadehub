'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  ArrowLeft, RefreshCw, Lock, Unlock, BadgeCheck, Trash2, Download, Landmark, Printer, MoreVertical, FileText, MessageCircle, AlertTriangle,
} from 'lucide-react';
import { hrHref, useHr } from '../../../../components/hr/HrContext';
import {
  Button, ConfirmDialog, Dialog, EmptyState, Field, Kpi, Loading, LoadError, Menu, MenuItem, NativeSelect, PageHeader, Pill, PersonCell,
  TextInput, cn, tbl,
} from '../../../../components/hr/ui';
import { PAY_METHODS, RUN_TONE, payslipLines, payslipMessage, type SlipLine } from '../../../../components/hr/payroll/lines';
import api from '../../../../lib/api';
import { apiError } from '../../../../lib/hr/api';
import { useHrT, type HrKey } from '../../../../lib/hr/i18n';
import { downloadCsv, formatLKR, formatNumber, formatPeriod, whatsappLink } from '../../../../lib/hr/format';
import type { PayrollRunDetail, RunPayslip } from '../../../../lib/hr/types';

type Confirm = 'finalize' | 'reopen' | 'delete' | null;

// staff.kadehub.com/payroll/:id — one month's payroll: check, adjust, finalize and pay
export default function PayrollRunPage() {
  const { t } = useHrT();
  const router = useRouter();
  const { owner, branchName, me } = useHr();
  const { id } = useParams<{ id: string }>();
  const [run, setRun] = useState<PayrollRunDetail | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [open, setOpen] = useState<RunPayslip | null>(null);
  const [paying, setPaying] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const load = useCallback(() => {
    setFailed(false);
    api.get<PayrollRunDetail>(`/hr/payroll/runs/${id}`).then(r => setRun(r.data)).catch(() => setFailed(true));
  }, [id]);
  useEffect(() => { if (owner) load(); }, [load, owner]);

  if (!owner) return <EmptyState title={t('pay.ownerOnlyTitle')} description={t('pay.ownerOnlyBody')} />;
  if (failed) return <LoadError onRetry={load} />;
  if (!run) return <Loading />;

  const draft = run.status === 'draft';
  const unpaid = run.payslips.filter(p => !p.paid_at);
  const rates = me.settings;

  /** Calls an action endpoint that answers with the updated run. */
  async function act(path: string, done: HrKey, body?: unknown) {
    setBusy(true);
    try {
      const { data } = await api.post<PayrollRunDetail>(`/hr/payroll/runs/${run!.id}/${path}`, body ?? {}, { timeout: 60000 });
      setRun(data);
      setSelected(new Set());
      toast.success(t(done));
    } catch (err) {
      toast.error(apiError(err, t));
    } finally {
      setBusy(false);
    }
  }

  function exportAll() {
    const header = [
      t('rep.col.emp_code'), t('rep.col.name'), t('pay.daysWorked'), t('pay.nopayDays'), t('pay.otHours'), t('rep.col.base_pay'),
      t('rep.col.nopay'), t('rep.col.overtime'), t('pay.allowances'), t('pay.bonus'), t('pay.otherEarnings'), t('pay.gross'),
      t('rep.col.epf_employee'), t('pay.colLate'), t('pay.advanceDeduction'), t('pay.assetDeduction'), t('pay.otherDeductions'),
      t('pay.totalDeductionsLine'), t('pay.netPay'), t('rep.col.epf_employer'), t('rep.col.etf_employer'), t('common.status'),
    ];
    downloadCsv(`payroll-${run!.period}`, header, run!.payslips.map(p => [
      p.emp_code, p.employee_name, p.days_worked, p.nopay_days, p.overtime_hours, p.base_pay, p.nopay_deduction, p.overtime_pay, p.allowances,
      p.bonus, p.other_earnings, p.gross, p.epf_employee, p.late_deduction, p.advance_deduction, p.asset_deduction, p.other_deductions,
      p.total_deductions, p.net_pay, p.epf_employer, p.etf_employer, p.paid_at ? t('pay.paid') : t('pay.unpaid'),
    ]));
  }

  function bankList() {
    downloadCsv(`bank-transfers-${run!.period}`, [t('rep.col.name'), t('pay.bank'), t('pay.account'), t('pay.netPay')],
      run!.payslips.filter(p => p.net_pay > 0).map(p => [p.employee_name, p.bank_name, p.bank_account, p.net_pay.toFixed(2)]));
  }

  function whatsapp(p: RunPayslip) {
    if (!p.phone) { toast.error(t('pay.noPhone')); return; }
    const text = payslipMessage(t, {
      period: run!.period, business: me.settings.business_name, name: p.employee_name, gross: p.gross, deductions: p.total_deductions, net: p.net_pay,
    });
    window.open(whatsappLink(p.phone, text), '_blank', 'noopener');
  }

  const toggle = (sid: number) => setSelected(s => { const n = new Set(s); if (n.has(sid)) n.delete(sid); else n.add(sid); return n; });

  return (
    <div className="space-y-5">
      <Link href={hrHref('/payroll')} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-ink-800">
        <ArrowLeft size={15} /> {t('pay.backToPayroll')}
      </Link>
      <PageHeader
        title={formatPeriod(run.period)}
        subtitle={run.branch_id ? branchName(run.branch_id) : t('app.allBranches')}
        leading={<Pill tone={RUN_TONE[run.status]}>{t(`pay.status.${run.status}` as HrKey)}</Pill>}
        actions={
          <>
            {draft && <Button variant="outline" disabled={busy} onClick={() => act('regenerate', 'pay.recalcDone')}><RefreshCw /> {t('pay.recalc')}</Button>}
            {draft && <Button disabled={busy || !run.payslips.length} onClick={() => setConfirm('finalize')}><Lock /> {t('pay.finalize')}</Button>}
            {run.status === 'finalized' && !run.payslips.some(p => p.paid_at) && (
              <Button variant="outline" disabled={busy} onClick={() => setConfirm('reopen')}><Unlock /> {t('pay.reopen')}</Button>
            )}
            {!draft && unpaid.length > 0 && <Button disabled={busy} onClick={() => setPaying(true)}><BadgeCheck /> {t('pay.markPaid')}</Button>}
            <Menu trigger={<MoreVertical />} label={t('common.actions')}>
              {close => (
                <>
                  <MenuItem onClick={() => { close(); exportAll(); }}><Download /> {t('pay.exportAll')}</MenuItem>
                  <MenuItem onClick={() => { close(); bankList(); }}><Landmark /> {t('pay.bankList')}</MenuItem>
                  <MenuItem onClick={() => { close(); router.push(hrHref(`/payroll/${run.id}/print`)); }}><Printer /> {t('pay.printAll')}</MenuItem>
                  {draft && <MenuItem danger onClick={() => { close(); setConfirm('delete'); }}><Trash2 /> {t('pay.deleteDraft')}</MenuItem>}
                </>
              )}
            </Menu>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label={t('pay.totalGross')} value={formatLKR(run.total_gross)} />
        <Kpi label={t('pay.totalDeductions')} value={formatLKR(run.total_deductions)} />
        <Kpi label={t('pay.totalNet')} value={formatLKR(run.total_net)} />
        <Kpi label={t('pay.totalEmployer')} value={formatLKR(run.total_employer)} />
      </div>

      {!!run.skipped?.length && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">{t('pay.skippedTitle')}</p>
          <p className="mt-0.5">{t('pay.skippedBody')} {run.skipped.map(s => s.full_name).join(', ')}</p>
        </div>
      )}
      {!draft && <p className="text-xs text-ink-500">{t('pay.lockedHint')}</p>}

      {!run.payslips.length ? <EmptyState title={t('pay.emptyRun')} /> : (
        <div className={tbl.wrap}>
          <table className={tbl.table}>
            <thead>
              <tr>
                {!draft && <th className={cn(tbl.th, 'w-8')}><span className="sr-only">{t('pay.selectRow')}</span></th>}
                <th className={tbl.th}>{t('common.employee')}</th>
                <th className={cn(tbl.th, tbl.right, 'hidden sm:table-cell')}>{t('pay.colDays')}</th>
                <th className={cn(tbl.th, tbl.right, 'hidden md:table-cell')}>{t('pay.colNopay')}</th>
                <th className={cn(tbl.th, tbl.right, 'hidden md:table-cell')}>{t('pay.colOt')}</th>
                <th className={cn(tbl.th, tbl.right, 'hidden lg:table-cell')}>{t('pay.colGross')}</th>
                <th className={cn(tbl.th, tbl.right, 'hidden lg:table-cell')}>{t('pay.colDeductions')}</th>
                <th className={cn(tbl.th, tbl.right)}>{t('pay.colNet')}</th>
                <th className={cn(tbl.th, 'hidden sm:table-cell')}>{t('common.status')}</th>
                <th className={tbl.th}><span className="sr-only">{t('common.actions')}</span></th>
              </tr>
            </thead>
            <tbody>
              {run.payslips.map(p => (
                <tr key={p.id} className="cursor-pointer hover:bg-ink-50" onClick={() => setOpen(p)}>
                  {!draft && (
                    <td className={tbl.td} onClick={e => e.stopPropagation()}>
                      {!p.paid_at && <input type="checkbox" aria-label={t('pay.selectRow')} checked={selected.has(p.id)} onChange={() => toggle(p.id)} className="h-4 w-4" />}
                    </td>
                  )}
                  <td className={tbl.td}>
                    <PersonCell name={p.employee_name} sub={p.rate === 0
                      ? <Link href={hrHref(`/employees/${p.employee_id}`)} onClick={e => e.stopPropagation()} className="inline-flex items-center gap-1 font-semibold text-red-600 hover:underline"><AlertTriangle size={12} /> {t('pay.noSalary')}</Link>
                      : [p.emp_code, p.job_title].filter(Boolean).join(' · ')} />
                  </td>
                  <td className={cn(tbl.td, tbl.right, 'hidden sm:table-cell tabular-nums')}>{formatNumber(p.days_worked)}</td>
                  <td className={cn(tbl.td, tbl.right, 'hidden md:table-cell tabular-nums', p.nopay_days > 0 && 'text-red-600')}>{formatNumber(p.nopay_days)}</td>
                  <td className={cn(tbl.td, tbl.right, 'hidden md:table-cell tabular-nums')}>{formatNumber(p.overtime_hours)}</td>
                  <td className={cn(tbl.td, tbl.right, 'hidden lg:table-cell tabular-nums')}>{formatLKR(p.gross)}</td>
                  <td className={cn(tbl.td, tbl.right, 'hidden lg:table-cell tabular-nums')}>{formatLKR(p.total_deductions)}</td>
                  <td className={cn(tbl.td, tbl.right, 'font-semibold tabular-nums')}>{formatLKR(p.net_pay)}</td>
                  <td className={cn(tbl.td, 'hidden sm:table-cell')}>
                    {p.paid_at ? <Pill tone="green">{t('pay.paid')}</Pill> : <Pill tone="gray">{t('pay.unpaid')}</Pill>}
                  </td>
                  <td className={cn(tbl.td, tbl.right)} onClick={e => e.stopPropagation()}>
                    <Menu trigger={<MoreVertical />} label={t('common.actions')}>
                      {close => (
                        <>
                          <MenuItem onClick={() => { close(); router.push(hrHref(`/payroll/payslips/${p.id}`)); }}><FileText /> {t('pay.openSlip')}</MenuItem>
                          <MenuItem onClick={() => { close(); whatsapp(p); }}><MessageCircle /> {t('pay.sendWhatsapp')}</MenuItem>
                        </>
                      )}
                    </Menu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PayslipDialog slip={open} draft={draft} rates={rates} onClose={() => setOpen(null)}
        onChanged={() => { setOpen(null); load(); }} />
      <PayDialog open={paying} onClose={() => setPaying(false)} unpaid={unpaid.length} selected={selected.size}
        onPay={async (method, onlySelected) => {
          await act('pay', 'pay.markedPaid', { payment_method: method, ...(onlySelected ? { payslip_ids: Array.from(selected) } : {}) });
          setPaying(false);
        }} />
      <ConfirmDialog open={confirm === 'finalize'} onClose={() => setConfirm(null)} danger={false}
        title={t('pay.finalizeTitle')} message={t('pay.finalizeBody')} confirmLabel={t('pay.finalize')}
        onConfirm={() => act('finalize', 'pay.finalized')} />
      <ConfirmDialog open={confirm === 'reopen'} onClose={() => setConfirm(null)} danger={false}
        title={t('pay.reopenTitle')} message={t('pay.reopenBody')} confirmLabel={t('pay.reopen')}
        onConfirm={() => act('reopen', 'pay.reopened')} />
      <ConfirmDialog open={confirm === 'delete'} onClose={() => setConfirm(null)}
        title={t('pay.deleteDraftTitle')} message={t('common.cannotUndo')} confirmLabel={t('common.delete')}
        onConfirm={async () => {
          try {
            await api.delete(`/hr/payroll/runs/${run.id}`);
            toast.success(t('pay.deleted'));
            router.replace(hrHref('/payroll'));
          } catch (err) { toast.error(apiError(err, t)); }
        }} />
    </div>
  );
}

function BreakdownTable({ title, lines, total }: { title: string; lines: SlipLine[]; total?: { label: string; amount: number } }) {
  return (
    <div>
      <p className="mb-1 text-xs font-bold uppercase tracking-wide text-ink-500">{title}</p>
      <dl className="text-sm">
        {lines.map(l => (
          <div key={l.label} className="flex justify-between gap-3 border-b border-ink-100 py-1.5">
            <dt className="text-ink-600">{l.label}</dt>
            <dd className="tabular-nums text-ink-800">{l.negative ? '− ' : ''}{formatLKR(l.amount)}</dd>
          </div>
        ))}
        {total && (
          <div className="flex justify-between gap-3 py-1.5 font-semibold text-ink-900">
            <dt>{total.label}</dt><dd className="tabular-nums">{formatLKR(total.amount)}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}

/** Full breakdown of one payslip; while the run is a draft, the owner's amounts can be changed. */
function PayslipDialog({ slip, draft, rates, onClose, onChanged }: {
  slip: RunPayslip | null; draft: boolean; rates: { epf_employee_pct: number; epf_employer_pct: number; etf_employer_pct: number };
  onClose: () => void; onChanged: () => void;
}) {
  const { t } = useHrT();
  const [form, setForm] = useState({ bonus: '', other_earnings: '', other_deductions: '', advance_deduction: '', note: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (!slip) return;
    setForm({
      bonus: String(slip.bonus), other_earnings: String(slip.other_earnings), other_deductions: String(slip.other_deductions),
      advance_deduction: String(slip.advance_deduction), note: slip.note,
    });
    setError('');
    setBusy(false);
  }, [slip]);

  const lines = useMemo(() => (slip ? payslipLines(slip, rates, t) : null), [slip, rates, t]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.patch(`/hr/payslips/${slip!.id}`, {
        bonus: Number(form.bonus || 0), other_earnings: Number(form.other_earnings || 0), other_deductions: Number(form.other_deductions || 0),
        advance_deduction: Number(form.advance_deduction || 0), note: form.note,
      });
      toast.success(t('pay.slipSaved'));
      onChanged();
    } catch (err) {
      setError(apiError(err, t));
      setBusy(false);
    }
  }

  const money = (k: 'bonus' | 'other_earnings' | 'other_deductions' | 'advance_deduction', label: string) => (
    <Field label={label} htmlFor={`ps-${k}`}>
      <TextInput id={`ps-${k}`} type="number" inputMode="decimal" min={0} step="0.01" value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />
    </Field>
  );

  return (
    <>
      <Dialog open={!!slip && !removing} onClose={onClose} title={slip ? t('pay.slipTitle', { name: slip.employee_name }) : ''} width="max-w-2xl">
        {slip && lines && (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-500">
              <span>{t(`pay.payType.${slip.pay_type}` as HrKey)}: <b className="text-ink-800">{formatLKR(slip.rate)}</b></span>
              {lines.attendance.map(a => <span key={a.label}>{a.label}: <b className="text-ink-800">{a.value}</b></span>)}
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <BreakdownTable title={t('pay.earnings')} lines={lines.earnings} total={{ label: t('pay.gross'), amount: slip.gross }} />
              <BreakdownTable title={t('pay.deductions')} lines={lines.deductions} total={{ label: t('pay.totalDeductionsLine'), amount: slip.total_deductions }} />
            </div>
            <div className="flex items-center justify-between rounded-xl bg-ink-50 px-4 py-3">
              <span className="text-sm font-bold text-ink-800">{t('pay.netPay')}</span>
              <span className="text-xl font-extrabold tabular-nums text-ink-900">{formatLKR(slip.net_pay)}</span>
            </div>
            {lines.employer.length > 0 && <BreakdownTable title={t('pay.employerCost')} lines={lines.employer} />}

            {draft ? (
              <form onSubmit={save} className="space-y-4 border-t border-ink-100 pt-4">
                <div>
                  <p className="text-sm font-semibold text-ink-800">{t('pay.adjust')}</p>
                  <p className="text-xs text-ink-500">{t('pay.adjustHint')}</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {money('bonus', t('pay.bonus'))}
                  {money('other_earnings', t('pay.otherEarnings'))}
                  {money('advance_deduction', t('pay.advanceDeduction'))}
                  {money('other_deductions', t('pay.otherDeductions'))}
                </div>
                <Field label={t('pay.noteLabel')} htmlFor="ps-note">
                  <TextInput id="ps-note" maxLength={300} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
                </Field>
                {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
                <div className="flex flex-wrap justify-between gap-2">
                  <Button variant="ghost" className="text-red-600" disabled={busy} onClick={() => setRemoving(true)}><Trash2 /> {t('pay.removeSlip')}</Button>
                  <Button type="submit" disabled={busy}>{busy ? t('common.saving') : t('pay.saveSlip')}</Button>
                </div>
              </form>
            ) : (
              <div className="flex justify-end">
                <Link href={hrHref(`/payroll/payslips/${slip.id}`)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[color:var(--cod-primary)] hover:underline">
                  <FileText size={15} /> {t('pay.openSlip')}
                </Link>
              </div>
            )}
          </div>
        )}
      </Dialog>
      <ConfirmDialog open={removing} onClose={() => setRemoving(false)}
        title={slip ? t('pay.removeSlipTitle', { name: slip.employee_name }) : ''} confirmLabel={t('pay.removeSlip')}
        onConfirm={async () => {
          try {
            await api.delete(`/hr/payslips/${slip!.id}`);
            toast.success(t('pay.removed'));
            onChanged();
          } catch (err) { toast.error(apiError(err, t)); }
        }} />
    </>
  );
}

function PayDialog({ open, onClose, unpaid, selected, onPay }: {
  open: boolean; onClose: () => void; unpaid: number; selected: number; onPay: (method: string, onlySelected: boolean) => Promise<void>;
}) {
  const { t } = useHrT();
  const [method, setMethod] = useState<string>('bank');
  const [which, setWhich] = useState<'all' | 'selected'>('all');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (open) { setWhich(selected ? 'selected' : 'all'); setBusy(false); } }, [open, selected]);

  return (
    <Dialog open={open} onClose={onClose} title={t('pay.markPaidTitle')} width="max-w-sm">
      <form className="space-y-4" onSubmit={async e => { e.preventDefault(); setBusy(true); try { await onPay(method, which === 'selected'); } finally { setBusy(false); } }}>
        <Field label={t('pay.method')} htmlFor="pay-method">
          <NativeSelect id="pay-method" value={method} onChange={e => setMethod(e.target.value)}>
            {PAY_METHODS.map(m => <option key={m} value={m}>{t(`pay.method.${m}` as HrKey)}</option>)}
          </NativeSelect>
        </Field>
        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm font-medium text-ink-700">{t('pay.payWhich')}</legend>
          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input type="radio" name="which" checked={which === 'all'} onChange={() => setWhich('all')} /> {t('pay.payAll', { n: unpaid })}
          </label>
          <label className={cn('flex items-center gap-2 text-sm text-ink-700', !selected && 'opacity-50')}>
            <input type="radio" name="which" disabled={!selected} checked={which === 'selected'} onChange={() => setWhich('selected')} /> {t('pay.paySelected', { n: selected })}
          </label>
        </fieldset>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>{t('common.cancel')}</Button>
          <Button type="submit" disabled={busy}>{busy ? t('common.saving') : t('pay.markPaid')}</Button>
        </div>
      </form>
    </Dialog>
  );
}
