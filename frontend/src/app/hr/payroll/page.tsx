'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Plus, MoreVertical, Pencil, Trash2, Coins } from 'lucide-react';
import { hrHref, useHr } from '../../../components/hr/HrContext';
import {
  BranchSelect, Button, ConfirmDialog, Dialog, EmployeeSelect, EmptyState, Field, Loading, LoadError, Menu, MenuItem, MonthPicker,
  PageHeader, Pill, PersonCell, Tabs, TextInput, tbl, cn,
} from '../../../components/hr/ui';
import { RUN_TONE } from '../../../components/hr/payroll/lines';
import api from '../../../lib/api';
import { apiCode, apiError } from '../../../lib/hr/api';
import { useHrT, type HrKey } from '../../../lib/hr/i18n';
import { addMonths, formatDate, formatLKR, formatPeriod, thisPeriod, today } from '../../../lib/hr/format';
import type { Advance, Employee, PayrollRun } from '../../../lib/hr/types';

type Tab = 'runs' | 'advances';

// staff.kadehub.com/payroll — payroll runs and salary advances (owner only)
export default function PayrollPage() {
  const { t } = useHrT();
  const { owner } = useHr();
  const [tab, setTab] = useState<Tab>('runs');

  if (!owner) return <EmptyState title={t('pay.ownerOnlyTitle')} description={t('pay.ownerOnlyBody')} />;

  return (
    <div className="space-y-5">
      <PageHeader title={t('pay.title')} subtitle={t('pay.subtitle')} />
      <Tabs<Tab> value={tab} onChange={setTab} items={[{ value: 'runs', label: t('pay.tabRuns') }, { value: 'advances', label: t('pay.tabAdvances') }]} />
      {tab === 'runs' ? <Runs /> : <Advances />}
    </div>
  );
}

function Runs() {
  const { t } = useHrT();
  const router = useRouter();
  const { branchName } = useHr();
  const [runs, setRuns] = useState<PayrollRun[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    api.get<PayrollRun[]>('/hr/payroll/runs').then(r => setRuns(r.data)).catch(() => setFailed(true));
  }, []);
  useEffect(() => { load(); }, [load]);

  const action = <Button onClick={() => setCreating(true)}><Plus /> {t('pay.runPayroll')}</Button>;

  return (
    <>
      <div className="flex justify-end">{action}</div>
      {failed ? <LoadError onRetry={load} /> : !runs ? <Loading /> : !runs.length ? (
        <EmptyState scene="grow" title={t('pay.noRuns')} description={t('pay.noRunsBody')} action={action} />
      ) : (
        <div className={tbl.wrap}>
          <table className={tbl.table}>
            <thead>
              <tr>
                <th className={tbl.th}>{t('pay.colPeriod')}</th>
                <th className={tbl.th}>{t('pay.colBranch')}</th>
                <th className={tbl.th}>{t('common.status')}</th>
                <th className={cn(tbl.th, tbl.right)}>{t('pay.colStaff')}</th>
                <th className={cn(tbl.th, tbl.right, 'hidden sm:table-cell')}>{t('pay.colPaid')}</th>
                <th className={cn(tbl.th, tbl.right, 'hidden md:table-cell')}>{t('pay.colGross')}</th>
                <th className={cn(tbl.th, tbl.right)}>{t('pay.colNet')}</th>
              </tr>
            </thead>
            <tbody>
              {runs.map(r => (
                <tr key={r.id} className="cursor-pointer hover:bg-ink-50" onClick={() => router.push(hrHref(`/payroll/${r.id}`))}>
                  <td className={cn(tbl.td, 'font-semibold text-ink-800')}>{formatPeriod(r.period)}</td>
                  <td className={cn(tbl.td, 'text-ink-600')}>{r.branch_id ? branchName(r.branch_id) : t('app.allBranches')}</td>
                  <td className={tbl.td}><Pill tone={RUN_TONE[r.status]}>{t(`pay.status.${r.status}` as HrKey)}</Pill></td>
                  <td className={cn(tbl.td, tbl.right)}>{r.payslip_count ?? 0}</td>
                  <td className={cn(tbl.td, tbl.right, 'hidden sm:table-cell')}>{r.paid_count ?? 0}</td>
                  <td className={cn(tbl.td, tbl.right, 'hidden md:table-cell tabular-nums')}>{formatLKR(r.total_gross)}</td>
                  <td className={cn(tbl.td, tbl.right, 'font-semibold tabular-nums')}>{formatLKR(r.total_net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <NewRunDialog open={creating} onClose={() => setCreating(false)} onCreated={id => router.push(hrHref(`/payroll/${id}`))} />
    </>
  );
}

function NewRunDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: number) => void }) {
  const { t } = useHrT();
  const { branches } = useHr();
  // Payroll is usually run for the month that just ended
  const [period, setPeriod] = useState(addMonths(thisPeriod(), -1));
  const [branchId, setBranchId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { if (open) { setError(''); setBusy(false); } }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post<{ id: number }>('/hr/payroll/runs', { period, branch_id: branchId }, { timeout: 60000 });
      onCreated(data.id);
    } catch (err) {
      if (apiCode(err) === 'RUN_EXISTS') {
        const runId = (err as { response?: { data?: { run_id?: number } } }).response?.data?.run_id;
        if (runId) { toast(t('pay.existingRun')); onCreated(runId); return; }
      }
      setError(apiError(err, t));
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={t('pay.runTitle')} width="max-w-md">
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-ink-500">{t('pay.runHint')}</p>
        <Field label={t('pay.month')}><div><MonthPicker value={period} onChange={setPeriod} max={thisPeriod()} /></div></Field>
        {branches.length > 1 && (
          <Field label={t('app.branch')}>
            <BranchSelect branches={branches} value={branchId} onChange={setBranchId} hideSingle={false} className="w-full" />
          </Field>
        )}
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>{t('common.cancel')}</Button>
          <Button type="submit" disabled={busy}>{busy ? t('pay.creating') : t('pay.runPayroll')}</Button>
        </div>
      </form>
    </Dialog>
  );
}

function Advances() {
  const { t } = useHrT();
  const [rows, setRows] = useState<Advance[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [editing, setEditing] = useState<Advance | 'new' | null>(null);
  const [repaying, setRepaying] = useState<Advance | null>(null);
  const [deleting, setDeleting] = useState<Advance | null>(null);

  const load = useCallback(() => {
    setFailed(false);
    api.get<Advance[]>('/hr/advances').then(r => setRows(r.data)).catch(() => setFailed(true));
  }, []);
  useEffect(() => {
    load();
    api.get<Employee[]>('/hr/employees').then(r => setEmployees(r.data)).catch(() => {});
  }, [load]);

  const action = <Button onClick={() => setEditing('new')}><Plus /> {t('pay.addAdvance')}</Button>;

  return (
    <>
      <div className="flex justify-end">{action}</div>
      {failed ? <LoadError onRetry={load} /> : !rows ? <Loading /> : !rows.length ? (
        <EmptyState scene="relax" title={t('pay.noAdvances')} description={t('pay.noAdvancesBody')} action={action} />
      ) : (
        <div className={tbl.wrap}>
          <table className={tbl.table}>
            <thead>
              <tr>
                <th className={tbl.th}>{t('common.employee')}</th>
                <th className={cn(tbl.th, 'hidden sm:table-cell')}>{t('pay.advGiven')}</th>
                <th className={cn(tbl.th, tbl.right)}>{t('pay.advAmount')}</th>
                <th className={cn(tbl.th, tbl.right, 'hidden md:table-cell')}>{t('pay.advMonthly')}</th>
                <th className={cn(tbl.th, tbl.right, 'hidden md:table-cell')}>{t('pay.advRepaid')}</th>
                <th className={cn(tbl.th, tbl.right)}>{t('pay.advBalance')}</th>
                <th className={tbl.th}>{t('common.status')}</th>
                <th className={tbl.th}><span className="sr-only">{t('common.actions')}</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(a => (
                <tr key={a.id}>
                  <td className={tbl.td}><PersonCell name={a.employee_name} sub={a.emp_code} /></td>
                  <td className={cn(tbl.td, 'hidden sm:table-cell text-ink-600')}>{formatDate(a.given_date)}</td>
                  <td className={cn(tbl.td, tbl.right, 'tabular-nums')}>{formatLKR(a.amount)}</td>
                  <td className={cn(tbl.td, tbl.right, 'hidden md:table-cell tabular-nums')}>{formatLKR(a.monthly_deduction)}</td>
                  <td className={cn(tbl.td, tbl.right, 'hidden md:table-cell tabular-nums')}>{formatLKR(a.repaid)}</td>
                  <td className={cn(tbl.td, tbl.right, 'font-semibold tabular-nums')}>{formatLKR(a.balance)}</td>
                  <td className={tbl.td}><Pill tone={a.status === 'open' ? 'amber' : 'green'}>{t(`pay.advStatus.${a.status}` as HrKey)}</Pill></td>
                  <td className={cn(tbl.td, tbl.right)}>
                    <Menu trigger={<MoreVertical />} label={t('common.actions')}>
                      {close => (
                        <>
                          {a.balance > 0 && <MenuItem onClick={() => { close(); setRepaying(a); }}><Coins /> {t('pay.repay')}</MenuItem>}
                          <MenuItem onClick={() => { close(); setEditing(a); }}><Pencil /> {t('common.edit')}</MenuItem>
                          <MenuItem danger onClick={() => { close(); setDeleting(a); }}><Trash2 /> {t('common.delete')}</MenuItem>
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

      <AdvanceDialog value={editing} employees={employees} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
      <RepayDialog advance={repaying} onClose={() => setRepaying(null)} onSaved={() => { setRepaying(null); load(); }} />
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} title={t('pay.deleteAdvanceTitle')} message={t('common.cannotUndo')}
        confirmLabel={t('common.delete')}
        onConfirm={async () => {
          try { await api.delete(`/hr/advances/${deleting!.id}`); load(); } catch (err) { toast.error(apiError(err, t)); }
        }} />
    </>
  );
}

function AdvanceDialog({ value, employees, onClose, onSaved }: {
  value: Advance | 'new' | null; employees: Employee[]; onClose: () => void; onSaved: () => void;
}) {
  const { t } = useHrT();
  const editing = value && value !== 'new' ? value : null;
  const [form, setForm] = useState({ employee_id: '' as number | '', amount: '', given_date: today(), monthly_deduction: '', note: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!value) return;
    setError('');
    setBusy(false);
    setForm(editing
      ? { employee_id: editing.employee_id, amount: String(editing.amount), given_date: editing.given_date, monthly_deduction: String(editing.monthly_deduction), note: editing.note }
      : { employee_id: '', amount: '', given_date: today(), monthly_deduction: '', note: '' });
  }, [value, editing]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const body = {
      employee_id: Number(form.employee_id), amount: Number(form.amount), given_date: form.given_date,
      monthly_deduction: Number(form.monthly_deduction || form.amount), note: form.note,
    };
    try {
      if (editing) await api.patch(`/hr/advances/${editing.id}`, body);
      else await api.post('/hr/advances', body);
      toast.success(t('pay.advanceSaved'));
      onSaved();
    } catch (err) {
      setError(apiError(err, t));
      setBusy(false);
    }
  }

  return (
    <Dialog open={!!value} onClose={onClose} title={editing ? t('pay.editAdvance') : t('pay.addAdvance')} width="max-w-md">
      <form onSubmit={submit} className="space-y-4">
        <Field label={t('common.employee')} htmlFor="adv-emp">
          {editing
            ? <p className="text-sm font-semibold text-ink-800">{editing.employee_name}</p>
            : <EmployeeSelect id="adv-emp" required employees={employees} value={form.employee_id} onChange={v => setForm(f => ({ ...f, employee_id: v }))} />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('pay.advAmount')} htmlFor="adv-amount">
            <TextInput id="adv-amount" type="number" inputMode="decimal" min={1} step="0.01" required value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
          </Field>
          <Field label={t('pay.advGiven')} htmlFor="adv-date">
            <TextInput id="adv-date" type="date" required value={form.given_date} onChange={e => setForm(f => ({ ...f, given_date: e.target.value }))} />
          </Field>
        </div>
        <Field label={t('pay.advMonthly')} htmlFor="adv-monthly" hint={t('pay.advMonthlyHint')}>
          <TextInput id="adv-monthly" type="number" inputMode="decimal" min={0} step="0.01" value={form.monthly_deduction} placeholder={form.amount}
            onChange={e => setForm(f => ({ ...f, monthly_deduction: e.target.value }))} />
        </Field>
        <Field label={t('common.note')} htmlFor="adv-note">
          <TextInput id="adv-note" maxLength={300} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
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

function RepayDialog({ advance, onClose, onSaved }: { advance: Advance | null; onClose: () => void; onSaved: () => void }) {
  const { t } = useHrT();
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!advance) return;
    setAmount(String(advance.balance));
    setDate(today());
    setError('');
    setBusy(false);
  }, [advance]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post(`/hr/advances/${advance!.id}/repay`, { amount: Number(amount), paid_date: date });
      toast.success(t('pay.repaySaved'));
      onSaved();
    } catch (err) {
      setError(apiError(err, t));
      setBusy(false);
    }
  }

  return (
    <Dialog open={!!advance} onClose={onClose} title={t('pay.repayTitle')} width="max-w-sm">
      {advance && (
        <form onSubmit={submit} className="space-y-4">
          <p className="text-sm text-ink-600">{t('pay.repayHint', { name: advance.employee_name, amount: formatLKR(advance.balance) })}</p>
          <Field label={t('common.amount')} htmlFor="rp-amount">
            <TextInput id="rp-amount" type="number" inputMode="decimal" min={1} max={advance.balance} step="0.01" required value={amount} onChange={e => setAmount(e.target.value)} />
          </Field>
          <Field label={t('pay.repayDate')} htmlFor="rp-date">
            <TextInput id="rp-date" type="date" required max={today()} value={date} onChange={e => setDate(e.target.value)} />
          </Field>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={busy}>{t('common.cancel')}</Button>
            <Button type="submit" disabled={busy}>{busy ? t('common.saving') : t('common.save')}</Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
