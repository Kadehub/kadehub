'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ArrowLeft, FileText, MessageCircle, Phone, Trash2, UserCheck, Mail } from 'lucide-react';
import api from '../../../../../lib/api';
import { apiCode, apiError } from '../../../../../lib/hr/api';
import { useHrT } from '../../../../../lib/hr/i18n';
import { formatDate, today, whatsappLink } from '../../../../../lib/hr/format';
import type { Applicant, ApplicantStage, Employee, InterviewNote, PayType } from '../../../../../lib/hr/types';
import { hrHref, useHr } from '../../../../../components/hr/HrContext';
import {
  Button, Card, ConfirmDialog, Dialog, EmptyState, Field, LoadError, Loading, NativeSelect, PageHeader, Pill, Stars, TextArea,
  TextInput, btnClass,
} from '../../../../../components/hr/ui';
import { MOVABLE, STAGE_TONE, formatDateTime, toLocalInput } from '../../../../../components/hr/talent/shared';

type Detail = Applicant & { notes: InterviewNote[] };

// staff.kadehub.com/hiring/applicants/<id> — one applicant: contact, CV, rating, interview, notes and hiring
export default function ApplicantPage() {
  const { t } = useHrT();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [a, setA] = useState<Detail | null | undefined>(undefined);
  const [failed, setFailed] = useState(false);
  const [interview, setInterview] = useState('');
  const [note, setNote] = useState({ text: '', rating: 0 });
  const [savingNote, setSavingNote] = useState(false);
  const [hiring, setHiring] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    api.get<Detail>(`/hr/applicants/${id}`)
      .then(r => { setA(r.data); setInterview(toLocalInput(r.data.interview_at)); })
      .catch(err => ((err as { response?: { status?: number } })?.response?.status === 404 ? setA(null) : setFailed(true)));
  }, [id]);
  useEffect(load, [load]);

  async function patch(body: Record<string, unknown>) {
    if (!a) return;
    try {
      const { data } = await api.patch<Applicant>(`/hr/applicants/${a.id}`, body);
      setA(cur => (cur ? { ...cur, ...data } : cur));
      setInterview(toLocalInput(data.interview_at));
    } catch (err) {
      toast.error(apiError(err, t));
    }
  }

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    if (!a || !note.text.trim()) return;
    setSavingNote(true);
    try {
      const { data } = await api.post<InterviewNote>(`/hr/applicants/${a.id}/notes`, { note: note.text.trim(), rating: note.rating });
      setA(cur => (cur ? { ...cur, notes: [data, ...cur.notes] } : cur));
      setNote({ text: '', rating: 0 });
    } catch (err) {
      toast.error(apiError(err, t));
    } finally {
      setSavingNote(false);
    }
  }

  if (failed) return <LoadError onRetry={load} />;
  if (a === undefined) return <Loading />;
  if (a === null) {
    return <div className="kh-card"><EmptyState title={t('hire.notFound')} action={<Link href={hrHref('/hiring')} className="text-sm font-semibold underline">{t('hire.backToJobs')}</Link>} /></div>;
  }

  const hired = a.stage === 'hired';

  return (
    <div className="space-y-5">
      <Link href={hrHref(`/hiring/${a.job_id}`)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-ink-800">
        <ArrowLeft size={15} /> {a.job_title}
      </Link>
      <PageHeader
        title={<span className="flex flex-wrap items-center gap-2">{a.name} <Pill tone={STAGE_TONE[a.stage]}>{t(`hire.stage.${a.stage}`)}</Pill></span>}
        subtitle={`${t('hire.appliedOn', { date: formatDate(a.created_at.slice(0, 10)) })} · ${t(a.source === 'public' ? 'hire.source.public' : 'hire.source.manual')}`}
        actions={<>
          {hired && a.employee_id
            ? <Link href={hrHref(`/employees/${a.employee_id}`)} className={btnClass('primary', 'sm')}><UserCheck /> {t('hire.viewEmployee')}</Link>
            : <Button size="sm" onClick={() => setHiring(true)}><UserCheck /> {t('hire.hire')}</Button>}
          <Button variant="outline" size="sm" onClick={() => setDeleting(true)}><Trash2 /> {t('common.delete')}</Button>
        </>} />

      <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-5">
          <Card title={t('hire.contact')}>
            <div className="space-y-2 text-sm">
              {a.phone && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-ink-800">{a.phone}</span>
                  <a href={`tel:${a.phone}`} className={btnClass('outline', 'sm')}><Phone /> {t('hire.call')}</a>
                  <a href={whatsappLink(a.phone, '')} target="_blank" rel="noreferrer" className={btnClass('outline', 'sm')}><MessageCircle /> {t('common.whatsapp')}</a>
                </div>
              )}
              {a.email && <a href={`mailto:${a.email}`} className="flex items-center gap-1.5 text-ink-700 hover:underline"><Mail size={14} /> {a.email}</a>}
              <div className="pt-1">
                {a.cv_url
                  ? <a href={a.cv_url} target="_blank" rel="noreferrer" className={btnClass('outline', 'sm')}><FileText /> {t('hire.openCv')}</a>
                  : <p className="text-ink-400">{t('hire.noCv')}</p>}
              </div>
              {a.cover_note && <p className="whitespace-pre-line rounded-xl bg-ink-50 p-3 text-ink-700">{a.cover_note}</p>}
            </div>
          </Card>

          <Card>
            <div className="space-y-4">
              <Field label={t('hire.rating')}>
                <Stars value={a.rating} onChange={v => patch({ rating: v })} size={22} />
              </Field>
              {!hired && (
                <Field label={t('common.status')} htmlFor="ap_stage">
                  <NativeSelect id="ap_stage" value={a.stage} onChange={e => patch({ stage: e.target.value as ApplicantStage })}>
                    {MOVABLE.map(s => <option key={s} value={s}>{t(`hire.stage.${s}`)}</option>)}
                  </NativeSelect>
                </Field>
              )}
              <Field label={t('hire.interviewAt')} htmlFor="ap_interview" hint={a.interview_at ? formatDateTime(a.interview_at) : undefined}>
                <div className="flex flex-wrap gap-2">
                  <TextInput id="ap_interview" type="datetime-local" value={interview} onChange={e => setInterview(e.target.value)} className="min-w-0 flex-1" />
                  <Button variant="outline" disabled={!interview || interview === toLocalInput(a.interview_at)}
                    onClick={() => patch({ interview_at: new Date(interview).toISOString() })}>{t('hire.saveInterview')}</Button>
                  {a.interview_at && <Button variant="ghost" onClick={() => patch({ interview_at: null })}>{t('hire.clearInterview')}</Button>}
                </div>
              </Field>
            </div>
          </Card>
        </div>

        <Card title={t('hire.notes')}>
          <form onSubmit={addNote} className="space-y-2">
            <TextArea rows={3} maxLength={3000} placeholder={t('hire.notePlaceholder')} value={note.text} aria-label={t('hire.addNote')}
              onChange={e => setNote(n => ({ ...n, text: e.target.value }))} />
            <div className="flex items-center justify-between gap-2">
              <Stars value={note.rating} onChange={v => setNote(n => ({ ...n, rating: v }))} label={t('hire.rating')} />
              <Button type="submit" size="sm" disabled={savingNote || !note.text.trim()}>{savingNote ? t('common.saving') : t('hire.addNote')}</Button>
            </div>
          </form>
          <ul className="mt-4 space-y-3">
            {a.notes.map(n => (
              <li key={n.id} className="rounded-xl border border-ink-100 p-3">
                <div className="flex items-center justify-between gap-2 text-xs text-ink-500">
                  <span className="font-semibold text-ink-700">{n.author_name}</span>
                  <span>{formatDateTime(n.created_at)}</span>
                </div>
                {n.rating > 0 && <div className="mt-1"><Stars value={n.rating} size={12} /></div>}
                <p className="mt-1 whitespace-pre-line text-sm text-ink-700">{n.note}</p>
              </li>
            ))}
            {!a.notes.length && <li className="text-sm text-ink-400">{t('hire.noNotes')}</li>}
          </ul>
        </Card>
      </div>

      <HireDialog open={hiring} applicant={a} onClose={() => setHiring(false)}
        onHired={emp => { setA(cur => (cur ? { ...cur, stage: 'hired', employee_id: emp.id } : cur)); }} />

      <ConfirmDialog open={deleting} onClose={() => setDeleting(false)} title={t('hire.deleteApplicant')}
        message={<p>{t('hire.deleteApplicantBody')} {t('common.cannotUndo')}</p>} confirmLabel={t('common.delete')}
        onConfirm={async () => {
          try {
            await api.delete(`/hr/applicants/${a.id}`);
            router.replace(hrHref(`/hiring/${a.job_id}`));
          } catch (err) {
            toast.error(apiError(err, t));
          }
        }} />
    </div>
  );
}

function HireDialog({ open, applicant, onClose, onHired }: { open: boolean; applicant: Detail; onClose: () => void; onHired: (e: Employee) => void }) {
  const { t } = useHrT();
  const { owner, branches, branch } = useHr();
  const [form, setForm] = useState({ branch_id: '' as number | '', join_date: today(), job_title: '', pay_type: 'monthly' as PayType, base_salary: '' });
  const [saving, setSaving] = useState(false);
  const [limit, setLimit] = useState<string | null>(null);
  const [hired, setHired] = useState<Employee | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm({ branch_id: branch ?? branches[0]?.id ?? '', join_date: today(), job_title: applicant.job_title, pay_type: 'monthly', base_salary: '' });
    setLimit(null);
    setHired(null);
  }, [open, applicant.job_title, branch, branches]);

  async function hire(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setLimit(null);
    try {
      const body: Record<string, unknown> = { branch_id: form.branch_id === '' ? null : form.branch_id, join_date: form.join_date, job_title: form.job_title.trim() };
      if (owner) Object.assign(body, { pay_type: form.pay_type, base_salary: Number(form.base_salary) || 0 });
      const { data } = await api.post<{ employee: Employee }>(`/hr/applicants/${applicant.id}/hire`, body);
      toast.success(t('hire.hiredToast', { name: applicant.name }));
      setHired(data.employee);
      onHired(data.employee);
    } catch (err) {
      if (apiCode(err) === 'PLAN_LIMIT_EMPLOYEES') setLimit(apiError(err, t));
      else toast.error(apiError(err, t));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={t('hire.hireTitle', { name: applicant.name })}>
      {hired ? (
        <div className="space-y-4 text-center">
          <p className="text-sm text-ink-600">{t('hire.hiredToast', { name: applicant.name })}</p>
          <Link href={hrHref(`/employees/${hired.id}`)} className={btnClass('primary')}><UserCheck /> {t('hire.viewEmployee')}</Link>
        </div>
      ) : (
        <form onSubmit={hire} className="space-y-4">
          <p className="text-sm text-ink-600">{t('hire.hireBody', { name: applicant.name })}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('hire.branch')} htmlFor="hire_branch">
              <NativeSelect id="hire_branch" value={form.branch_id} required={!owner} onChange={e => setForm(f => ({ ...f, branch_id: e.target.value ? Number(e.target.value) : '' }))}>
                {owner && <option value="">{t('common.unassigned')}</option>}
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </NativeSelect>
            </Field>
            <Field label={t('hire.joinDate')} htmlFor="hire_join">
              <TextInput id="hire_join" type="date" required value={form.join_date} onChange={e => setForm(f => ({ ...f, join_date: e.target.value }))} />
            </Field>
          </div>
          <Field label={t('hire.jobTitle')} htmlFor="hire_title">
            <TextInput id="hire_title" maxLength={100} value={form.job_title} onChange={e => setForm(f => ({ ...f, job_title: e.target.value }))} />
          </Field>
          {owner && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t('hire.payType')} htmlFor="hire_pay">
                <NativeSelect id="hire_pay" value={form.pay_type} onChange={e => setForm(f => ({ ...f, pay_type: e.target.value as PayType }))}>
                  {(['monthly', 'daily', 'hourly'] as const).map(p => <option key={p} value={p}>{t(`hire.pay.${p}`)}</option>)}
                </NativeSelect>
              </Field>
              <Field label={t('hire.salary')} htmlFor="hire_salary">
                <TextInput id="hire_salary" type="number" min={0} step="any" inputMode="decimal" value={form.base_salary} onChange={e => setForm(f => ({ ...f, base_salary: e.target.value }))} />
              </Field>
            </div>
          )}
          {limit && (
            <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
              {limit}{' '}<Link href={hrHref('/billing')} className="font-semibold underline underline-offset-4">{t('hire.upgradeToHire')}</Link>
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>{t('common.cancel')}</Button>
            <Button type="submit" disabled={saving}>{saving ? t('common.saving') : t('hire.hire')}</Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
