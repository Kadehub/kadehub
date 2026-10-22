'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../../lib/api';
import { apiError } from '../../../lib/hr/api';
import { useHrT } from '../../../lib/hr/i18n';
import { today } from '../../../lib/hr/format';
import type { Attendance, Employee } from '../../../lib/hr/types';
import { Button, Dialog, EmployeeSelect, Field, TextInput } from '../ui';

/** Add a missed punch (no `attendance`) or fix an existing one. Times are wall-clock on the work date. */
export default function PunchDialog({ open, onClose, attendance, employees, defaultDate, defaultEmployee, onSaved }: {
  open: boolean; onClose: () => void; attendance: Attendance | null;
  employees: Pick<Employee, 'id' | 'full_name' | 'emp_code'>[]; defaultDate: string; defaultEmployee?: number | null; onSaved: () => void;
}) {
  const { t } = useHrT();
  const [emp, setEmp] = useState<number | ''>('');
  const [date, setDate] = useState(defaultDate);
  const [inTime, setIn] = useState('08:00');
  const [outTime, setOut] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEmp(attendance?.employee_id ?? defaultEmployee ?? '');
    setDate(attendance?.work_date ?? defaultDate);
    setIn(attendance?.in_time ?? '08:00');
    setOut(attendance?.out_time ?? '');
    setNote(attendance?.note ?? '');
  }, [open, attendance, defaultDate, defaultEmployee]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (attendance) await api.patch(`/hr/attendance/${attendance.id}`, { clock_in: inTime, clock_out: outTime || null, note });
      else await api.post('/hr/attendance', { employee_id: emp, work_date: date, clock_in: inTime, clock_out: outTime || null, note });
      toast.success(t('common.saved'));
      onSaved();
      onClose();
    } catch (err) {
      toast.error(apiError(err, t));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={attendance ? t('att.punch.editTitle') : t('att.punch.addTitle')}>
      <form onSubmit={save} className="space-y-4">
        {!attendance && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('common.employee')} htmlFor="pd-emp">
              <EmployeeSelect id="pd-emp" required employees={employees} value={emp} onChange={setEmp} />
            </Field>
            <Field label={t('common.date')} htmlFor="pd-date">
              <TextInput id="pd-date" type="date" required max={today()} value={date} onChange={e => setDate(e.target.value)} />
            </Field>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('att.in')} htmlFor="pd-in">
            <TextInput id="pd-in" type="time" required value={inTime} onChange={e => setIn(e.target.value)} />
          </Field>
          <Field label={t('att.out')} htmlFor="pd-out" hint={t('att.punch.outHint')}>
            <TextInput id="pd-out" type="time" value={outTime} onChange={e => setOut(e.target.value)} />
          </Field>
        </div>
        <Field label={t('common.note')} htmlFor="pd-note">
          <TextInput id="pd-note" maxLength={300} value={note} onChange={e => setNote(e.target.value)} placeholder={t('att.punch.notePh')} />
        </Field>
        <div className="flex justify-end">
          <Button type="submit" disabled={busy || (!attendance && !emp)}>{busy ? t('common.saving') : t('common.save')}</Button>
        </div>
      </form>
    </Dialog>
  );
}
