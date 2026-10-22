'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../../lib/api';
import { apiError } from '../../../lib/hr/api';
import { useHrT } from '../../../lib/hr/i18n';
import type { EmploymentType, JobPost } from '../../../lib/hr/types';
import { useHr } from '../HrContext';
import { Button, Dialog, Field, NativeSelect, TextArea, TextInput } from '../ui';
import { EMPLOYMENT_TYPES, typeLabel } from './shared';

/** New or edit job; calls onSaved with the saved job. */
export default function JobDialog({ open, job, onClose, onSaved }: {
  open: boolean; job: JobPost | null; onClose: () => void; onSaved: (job: JobPost) => void;
}) {
  const { t } = useHrT();
  const { branches, branch, owner } = useHr();
  const blank = () => ({
    title: '', branch_id: (branch ?? (branches.length === 1 ? branches[0].id : '')) as number | '',
    employment_type: 'full_time' as EmploymentType, salary_min: '', salary_max: '', description: '', closes_at: '',
  });
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(job ? {
      title: job.title, branch_id: job.branch_id ?? '', employment_type: job.employment_type,
      salary_min: job.salary_min ? String(job.salary_min) : '', salary_max: job.salary_max ? String(job.salary_max) : '',
      description: job.description ?? '', closes_at: job.closes_at ?? '',
    } : blank());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, job]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm(f => ({ ...f, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        title: form.title.trim(), branch_id: form.branch_id === '' ? null : form.branch_id, employment_type: form.employment_type,
        salary_min: Number(form.salary_min) || 0, salary_max: Number(form.salary_max) || 0,
        description: form.description, closes_at: form.closes_at || null,
      };
      const { data } = job ? await api.patch<JobPost>(`/hr/jobs/${job.id}`, body) : await api.post<JobPost>('/hr/jobs', body);
      toast.success(t('common.saved'));
      onSaved(data);
      onClose();
    } catch (err) {
      toast.error(apiError(err, t));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={job ? t('hire.editJob') : t('hire.newJob')} width="max-w-xl">
      <form onSubmit={save} className="space-y-4">
        <Field label={t('hire.jobTitle')} htmlFor="job_title">
          <TextInput id="job_title" required maxLength={150} value={form.title} placeholder={t('hire.jobTitlePlaceholder')} onChange={e => set('title', e.target.value)} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('hire.branch')} htmlFor="job_branch">
            <NativeSelect id="job_branch" value={form.branch_id} required={!owner}
              onChange={e => set('branch_id', e.target.value ? Number(e.target.value) : '')}>
              {owner && <option value="">{t('common.unassigned')}</option>}
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </NativeSelect>
          </Field>
          <Field label={t('hire.type')} htmlFor="job_type">
            <NativeSelect id="job_type" value={form.employment_type} onChange={e => set('employment_type', e.target.value as EmploymentType)}>
              {EMPLOYMENT_TYPES.map(x => <option key={x} value={x}>{typeLabel(t, x)}</option>)}
            </NativeSelect>
          </Field>
          <Field label={t('hire.salaryMin')} htmlFor="job_min">
            <TextInput id="job_min" type="number" min={0} step="any" inputMode="decimal" value={form.salary_min} onChange={e => set('salary_min', e.target.value)} />
          </Field>
          <Field label={t('hire.salaryMax')} htmlFor="job_max" hint={t('hire.salaryHint')}>
            <TextInput id="job_max" type="number" min={0} step="any" inputMode="decimal" value={form.salary_max} onChange={e => set('salary_max', e.target.value)} />
          </Field>
        </div>
        <Field label={t('hire.description')} htmlFor="job_desc">
          <TextArea id="job_desc" rows={5} maxLength={5000} value={form.description} placeholder={t('hire.descriptionPlaceholder')} onChange={e => set('description', e.target.value)} />
        </Field>
        <Field label={`${t('hire.closesAt')} (${t('common.optional')})`} htmlFor="job_closes">
          <TextInput id="job_closes" type="date" value={form.closes_at} onChange={e => set('closes_at', e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>{t('common.cancel')}</Button>
          <Button type="submit" disabled={saving}>{saving ? t('common.saving') : t('common.save')}</Button>
        </div>
      </form>
    </Dialog>
  );
}
