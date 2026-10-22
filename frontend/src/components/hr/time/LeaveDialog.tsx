'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../../lib/api';
import { apiError } from '../../../lib/hr/api';
import { useHrT } from '../../../lib/hr/i18n';
import { today } from '../../../lib/hr/format';
import type { Employee, LeaveBalance, LeaveType } from '../../../lib/hr/types';
import { Button, Dialog, Dot, EmployeeSelect, Field, NativeSelect, TextInput, Toggle } from '../ui';

/** Record leave for an employee: a request to decide later, or already approved. */
export default function LeaveDialog({ open, onClose, employees, types, onSaved }: {
  open: boolean; onClose: () => void; employees: Employee[]; types: LeaveType[]; onSaved: () => void;
}) {
  const { t } = useHrT();
  const [emp, setEmp] = useState<number | ''>('');
  const [type, setType] = useState<number | ''>('');
  const [start, setStart] = useState(today());
  const [end, setEnd] = useState(today());
  const [half, setHalf] = useState(false);
  const [reason, setReason] = useState('');
  const [approve, setApprove] = useState(true);
  const [balances, setBalances] = useState<LeaveBalance[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEmp(''); setType(types[0]?.id ?? ''); setStart(today()); setEnd(today()); setHalf(false); setReason(''); setApprove(true); setBalances(null);
  }, [open, types]);

  useEffect(() => {
    setBalances(null);
    if (!emp) return;
    api.get<LeaveBalance[]>(`/hr/leave/balances/${emp}`, { params: { year: start.slice(0, 4) } }).then(r => setBalances(r.data)).catch(() => {});
  }, [emp, start]);

  const oneDay = start === end;
  const bal = balances?.find(b => b.leave_type_id === type);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post<{ status: string; removed_shifts?: number }>('/hr/leave', {
        employee_id: emp, leave_type_id: type, start_date: start, end_date: end, half_day: oneDay && half, reason, approve,
      });
      if (data.status === 'approved') {
        toast.success(data.removed_shifts ? t('lv.approvedShifts', { n: data.removed_shifts }) : t('lv.approvedToast'));
      } else {
        toast.success(t('lv.requestedToast'));
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(apiError(err, t));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={t('lv.new.title')}>
      <form onSubmit={save} className="space-y-4">
        <Field label={t('common.employee')} htmlFor="lv-emp">
          <EmployeeSelect id="lv-emp" required employees={employees} value={emp} onChange={setEmp} />
        </Field>
        <Field label={t('lv.type')} htmlFor="lv-type"
          hint={bal ? (bal.remaining === null ? t('lv.noLimit') : t('lv.remainingHint', { n: bal.remaining, of: bal.entitled ?? 0 })) : undefined}>
          <NativeSelect id="lv-type" required value={type} onChange={e => setType(e.target.value ? Number(e.target.value) : '')}>
            {types.map(x => <option key={x.id} value={x.id}>{x.name}{x.paid ? '' : ` (${t('lv.unpaid')})`}</option>)}
          </NativeSelect>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('common.from')} htmlFor="lv-start">
            <TextInput id="lv-start" type="date" required value={start} onChange={e => { setStart(e.target.value); if (e.target.value > end) setEnd(e.target.value); }} />
          </Field>
          <Field label={t('common.to')} htmlFor="lv-end">
            <TextInput id="lv-end" type="date" required min={start} value={end} onChange={e => setEnd(e.target.value)} />
          </Field>
        </div>
        {oneDay && (
          <label className="flex items-center justify-between gap-3 text-sm text-ink-700">
            <span>{t('lv.halfDay')}</span>
            <Toggle checked={half} onChange={setHalf} label={t('lv.halfDay')} />
          </label>
        )}
        <Field label={t('common.reason')} htmlFor="lv-reason">
          <TextInput id="lv-reason" maxLength={300} value={reason} onChange={e => setReason(e.target.value)} placeholder={t('common.optional')} />
        </Field>
        <label className="flex items-center justify-between gap-3 rounded-xl bg-ink-50 px-3 py-2.5 text-sm text-ink-700">
          <span>
            <span className="block font-medium">{t('lv.approveNow')}</span>
            <span className="block text-xs text-ink-400">{t('lv.approveNowHint')}</span>
          </span>
          <Toggle checked={approve} onChange={setApprove} label={t('lv.approveNow')} />
        </label>
        {balances && balances.length > 0 && (
          <div className="flex flex-wrap gap-2 text-xs text-ink-500">
            {balances.map(b => (
              <span key={b.leave_type_id} className="inline-flex items-center gap-1.5 rounded-full bg-ink-50 px-2 py-1">
                <Dot color={b.color} /> {b.name}: {b.remaining === null ? t('lv.usedOnly', { n: b.used }) : t('lv.leftOf', { n: b.remaining, of: b.entitled ?? 0 })}
              </span>
            ))}
          </div>
        )}
        <div className="flex justify-end">
          <Button type="submit" disabled={busy || !emp || !type}>{busy ? t('common.saving') : approve ? t('lv.saveApproved') : t('lv.saveRequest')}</Button>
        </div>
      </form>
    </Dialog>
  );
}
