'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import api from '../../../lib/api';
import { apiCode, apiError } from '../../../lib/hr/api';
import { useHrT, type HrKey } from '../../../lib/hr/i18n';
import { today } from '../../../lib/hr/format';
import type { Employee, EmploymentType, PayType } from '../../../lib/hr/types';
import { useHr, hrHref } from '../HrContext';
import { Button, Dialog, Field, NativeSelect, TextArea, TextInput, Toggle } from '../ui';

const EMPLOYMENT_TYPES: EmploymentType[] = ['full_time', 'part_time', 'daily', 'contract'];
const PAY_TYPES: PayType[] = ['monthly', 'daily', 'hourly'];

type Values = {
  full_name: string; emp_code: string; phone: string; email: string; nic: string; dob: string; gender: string; address: string;
  branch_id: string; job_title: string; department: string; employment_type: EmploymentType; join_date: string;
  emergency_name: string; emergency_phone: string; pin: string; notes: string;
  pay_type: PayType; base_salary: string; fixed_allowance: string; epf_enabled: boolean; epf_number: string; bank_name: string; bank_account: string;
};

function initial(e: Employee | null, defaultBranch: number | null): Values {
  return {
    full_name: e?.full_name ?? '', emp_code: e?.emp_code ?? '', phone: e?.phone ?? '', email: e?.email ?? '', nic: e?.nic ?? '',
    dob: e?.dob ?? '', gender: e?.gender ?? '', address: e?.address ?? '',
    branch_id: String(e ? e.branch_id ?? '' : defaultBranch ?? ''), job_title: e?.job_title ?? '', department: e?.department ?? '',
    employment_type: e?.employment_type ?? 'full_time', join_date: e?.join_date ?? today(),
    emergency_name: e?.emergency_name ?? '', emergency_phone: e?.emergency_phone ?? '', pin: '', notes: e?.notes ?? '',
    pay_type: e?.pay_type ?? 'monthly', base_salary: e?.base_salary ? String(e.base_salary) : '', fixed_allowance: e?.fixed_allowance ? String(e.fixed_allowance) : '',
    epf_enabled: e?.epf_enabled ?? true, epf_number: e?.epf_number ?? '', bank_name: e?.bank_name ?? '', bank_account: e?.bank_account ?? '',
  };
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-3">
      <legend className="mb-1 text-xs font-bold uppercase tracking-wide text-ink-400">{title}</legend>
      {children}
    </fieldset>
  );
}

/** Add or edit an employee. Pay and bank fields are shown to the owner only. */
export default function EmployeeForm({ employee, open, onClose, onSaved }: {
  employee: Employee | null; open: boolean; onClose: () => void; onSaved: (e: Employee) => void;
}) {
  const { t } = useHrT();
  const { owner, branches, branch } = useHr();
  const [v, setV] = useState<Values>(() => initial(employee, branch ?? (branches.length === 1 ? branches[0].id : null)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ text: string; upgrade?: boolean }>();
  const set = <K extends keyof Values>(k: K, val: Values[K]) => setV(prev => ({ ...prev, [k]: val }));
  const editing = !!employee;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (v.pin && !/^\d{4}$/.test(v.pin)) { setError({ text: t('emp.pinInvalid') }); return; }
    setBusy(true);
    setError(undefined);
    const body: Record<string, unknown> = {
      full_name: v.full_name, phone: v.phone, email: v.email, nic: v.nic, dob: v.dob || null, gender: v.gender, address: v.address,
      branch_id: v.branch_id ? Number(v.branch_id) : null, job_title: v.job_title, department: v.department,
      employment_type: v.employment_type, join_date: v.join_date || null, emergency_name: v.emergency_name, emergency_phone: v.emergency_phone,
      notes: v.notes,
    };
    if (v.emp_code.trim()) body.emp_code = v.emp_code.trim();
    if (!editing && v.pin) body.pin = v.pin;
    if (owner) {
      Object.assign(body, {
        pay_type: v.pay_type, base_salary: Number(v.base_salary || 0), fixed_allowance: Number(v.fixed_allowance || 0),
        epf_enabled: v.epf_enabled, epf_number: v.epf_number, bank_name: v.bank_name, bank_account: v.bank_account,
      });
    }
    try {
      const { data } = editing
        ? await api.patch<Employee>(`/hr/employees/${employee!.id}`, body)
        : await api.post<Employee>('/hr/employees', body);
      toast.success(t(editing ? 'emp.updated' : 'emp.created'));
      onSaved(data);
    } catch (err) {
      setError({ text: apiError(err, t), upgrade: apiCode(err) === 'PLAN_LIMIT_EMPLOYEES' });
    } finally {
      setBusy(false);
    }
  }

  const rateKey = `emp.f.rate.${v.pay_type}` as HrKey;

  return (
    <Dialog open={open} onClose={() => !busy && onClose()} title={t(editing ? 'emp.edit' : 'emp.add')} width="max-w-2xl">
      <form onSubmit={submit} className="space-y-6">
        <Section title={t('emp.sec.personal')}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('emp.f.fullName')} htmlFor="emp-name" className="sm:col-span-2">
              <TextInput id="emp-name" required maxLength={150} value={v.full_name} onChange={e => set('full_name', e.target.value)} />
            </Field>
            <Field label={t('common.phone')} htmlFor="emp-phone"><TextInput id="emp-phone" type="tel" maxLength={40} value={v.phone} onChange={e => set('phone', e.target.value)} /></Field>
            <Field label={t('common.email')} htmlFor="emp-email"><TextInput id="emp-email" type="email" maxLength={150} value={v.email} onChange={e => set('email', e.target.value)} /></Field>
            <Field label={t('emp.f.nic')} htmlFor="emp-nic"><TextInput id="emp-nic" maxLength={20} value={v.nic} onChange={e => set('nic', e.target.value)} /></Field>
            <Field label={t('emp.f.dob')} htmlFor="emp-dob"><TextInput id="emp-dob" type="date" max={today()} value={v.dob} onChange={e => set('dob', e.target.value)} /></Field>
            <Field label={t('emp.f.gender')} htmlFor="emp-gender">
              <NativeSelect id="emp-gender" value={v.gender} onChange={e => set('gender', e.target.value)}>
                {(['', 'male', 'female', 'other'] as const).map(g => <option key={g} value={g}>{t(`emp.gender.${g || 'none'}` as HrKey)}</option>)}
              </NativeSelect>
            </Field>
            <Field label={t('common.address')} htmlFor="emp-address" className="sm:col-span-2">
              <TextInput id="emp-address" maxLength={300} value={v.address} onChange={e => set('address', e.target.value)} />
            </Field>
          </div>
        </Section>

        <Section title={t('emp.sec.job')}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('emp.f.jobTitle')} htmlFor="emp-title">
              <TextInput id="emp-title" maxLength={100} placeholder={t('emp.f.jobTitlePh')} value={v.job_title} onChange={e => set('job_title', e.target.value)} />
            </Field>
            <Field label={t('emp.f.department')} htmlFor="emp-dept"><TextInput id="emp-dept" maxLength={100} value={v.department} onChange={e => set('department', e.target.value)} /></Field>
            <Field label={t('app.branch')} htmlFor="emp-branch">
              <NativeSelect id="emp-branch" value={v.branch_id} required={!owner} onChange={e => set('branch_id', e.target.value)}>
                {owner && <option value="">{t('common.unassigned')}</option>}
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </NativeSelect>
            </Field>
            <Field label={t('emp.f.employmentType')} htmlFor="emp-type">
              <NativeSelect id="emp-type" value={v.employment_type} onChange={e => set('employment_type', e.target.value as EmploymentType)}>
                {EMPLOYMENT_TYPES.map(k => <option key={k} value={k}>{t(`emp.type.${k}` as HrKey)}</option>)}
              </NativeSelect>
            </Field>
            <Field label={t('emp.f.joinDate')} htmlFor="emp-join" hint={t('emp.f.joinHint')}>
              <TextInput id="emp-join" type="date" required value={v.join_date} onChange={e => set('join_date', e.target.value)} />
            </Field>
            <Field label={t('emp.f.code')} htmlFor="emp-code" hint={editing ? undefined : t('emp.f.codeHint')}>
              <TextInput id="emp-code" maxLength={20} value={v.emp_code} onChange={e => set('emp_code', e.target.value)} />
            </Field>
          </div>
        </Section>

        {owner && (
          <Section title={t('emp.sec.pay')}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t('emp.f.payType')} htmlFor="emp-paytype">
                <NativeSelect id="emp-paytype" value={v.pay_type} onChange={e => set('pay_type', e.target.value as PayType)}>
                  {PAY_TYPES.map(k => <option key={k} value={k}>{t(`emp.pay.${k}` as HrKey)}</option>)}
                </NativeSelect>
              </Field>
              <Field label={t(rateKey)} htmlFor="emp-rate">
                <TextInput id="emp-rate" type="number" min={0} step="0.01" inputMode="decimal" value={v.base_salary} onChange={e => set('base_salary', e.target.value)} />
              </Field>
              <Field label={t('emp.f.allowance')} htmlFor="emp-allow">
                <TextInput id="emp-allow" type="number" min={0} step="0.01" inputMode="decimal" value={v.fixed_allowance} onChange={e => set('fixed_allowance', e.target.value)} />
              </Field>
              <Field label={t('emp.f.epfNumber')} htmlFor="emp-epfno">
                <TextInput id="emp-epfno" maxLength={40} disabled={!v.epf_enabled} value={v.epf_number} onChange={e => set('epf_number', e.target.value)} />
              </Field>
              <div className="flex items-start justify-between gap-3 rounded-xl border border-ink-200 p-3 sm:col-span-2">
                <div>
                  <p className="text-sm font-medium text-ink-800">{t('emp.f.epf')}</p>
                  <p className="text-xs text-ink-400">{t('emp.f.epfHint')}</p>
                </div>
                <Toggle checked={v.epf_enabled} onChange={c => set('epf_enabled', c)} label={t('emp.f.epf')} />
              </div>
              <Field label={t('emp.f.bankName')} htmlFor="emp-bank"><TextInput id="emp-bank" maxLength={100} value={v.bank_name} onChange={e => set('bank_name', e.target.value)} /></Field>
              <Field label={t('emp.f.bankAccount')} htmlFor="emp-acc"><TextInput id="emp-acc" maxLength={60} value={v.bank_account} onChange={e => set('bank_account', e.target.value)} /></Field>
            </div>
          </Section>
        )}

        <Section title={t('emp.sec.emergency')}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('emp.f.emergencyName')} htmlFor="emp-ename"><TextInput id="emp-ename" maxLength={150} value={v.emergency_name} onChange={e => set('emergency_name', e.target.value)} /></Field>
            <Field label={t('emp.f.emergencyPhone')} htmlFor="emp-ephone"><TextInput id="emp-ephone" type="tel" maxLength={40} value={v.emergency_phone} onChange={e => set('emergency_phone', e.target.value)} /></Field>
          </div>
        </Section>

        {!editing && (
          <Section title={t('emp.sec.kiosk')}>
            <Field label={t('emp.f.pin')} htmlFor="emp-pin" hint={t('emp.f.pinHint')}>
              <TextInput id="emp-pin" inputMode="numeric" autoComplete="off" pattern="\d{4}" maxLength={4} className="max-w-[8rem] tracking-[0.4em]"
                value={v.pin} onChange={e => set('pin', e.target.value.replace(/\D/g, '').slice(0, 4))} />
            </Field>
          </Section>
        )}

        <Field label={t('emp.f.notes')} htmlFor="emp-notes">
          <TextArea id="emp-notes" rows={2} maxLength={2000} value={v.notes} onChange={e => set('notes', e.target.value)} />
        </Field>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error.text}{' '}
            {error.upgrade && <Link href={hrHref('/billing')} className="font-semibold underline">{t('app.viewPlans')}</Link>}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>{t('common.cancel')}</Button>
          <Button type="submit" disabled={busy}>{busy ? t('common.saving') : t('common.save')}</Button>
        </div>
      </form>
    </Dialog>
  );
}
