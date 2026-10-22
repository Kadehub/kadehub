'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { ArrowLeft, ChevronLeft, ChevronRight, Copy, FileText, Pencil, Phone, Plus, Share2, CalendarClock } from 'lucide-react';
import api from '../../../../lib/api';
import { apiError, postForm } from '../../../../lib/hr/api';
import { useHrT } from '../../../../lib/hr/i18n';
import { formatDate } from '../../../../lib/hr/format';
import type { Applicant, ApplicantStage, JobPost } from '../../../../lib/hr/types';
import { hrHref, useHr } from '../../../../components/hr/HrContext';
import {
  Button, Dialog, EmptyState, Field, FilePick, LoadError, Loading, NativeSelect, PageHeader, Pill, Stars, TextArea, TextInput, cn,
} from '../../../../components/hr/ui';
import JobDialog from '../../../../components/hr/talent/JobDialog';
import { MOVABLE, STAGES, STAGE_TONE, formatDateTime, jobLink, salaryText, typeLabel } from '../../../../components/hr/talent/shared';

// staff.kadehub.com/hiring/<jobId> — the applicant pipeline for one job
export default function JobBoardPage() {
  const { t } = useHrT();
  const { branchName, me } = useHr();
  const { jobId } = useParams<{ jobId: string }>();
  const id = Number(jobId);
  const [job, setJob] = useState<JobPost | null | undefined>(undefined);
  const [applicants, setApplicants] = useState<Applicant[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [stage, setStage] = useState<ApplicantStage>('new');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    Promise.all([api.get<JobPost[]>('/hr/jobs'), api.get<Applicant[]>(`/hr/applicants?job_id=${id}`)])
      .then(([j, a]) => { setJob(j.data.find(x => x.id === id) ?? null); setApplicants(a.data); })
      .catch(() => setFailed(true));
  }, [id]);
  useEffect(load, [load]);

  async function move(a: Applicant, to: ApplicantStage) {
    const before = applicants;
    setApplicants(list => list?.map(x => (x.id === a.id ? { ...x, stage: to } : x)) ?? null);
    try {
      await api.patch(`/hr/applicants/${a.id}`, { stage: to });
    } catch (err) {
      setApplicants(before);
      toast.error(apiError(err, t));
    }
  }

  if (failed) return <LoadError onRetry={load} />;
  if (job === undefined || !applicants) return <Loading />;
  if (job === null) {
    return (
      <div className="kh-card">
        <EmptyState title={t('err.JOB_CLOSED')} action={<Link href={hrHref('/hiring')} className="text-sm font-semibold underline">{t('hire.backToJobs')}</Link>} />
      </div>
    );
  }

  const salary = salaryText(t, job.salary_min, job.salary_max);
  const byStage = (s: ApplicantStage) => applicants.filter(a => a.stage === s);
  const share = () => window.open(`https://wa.me/?text=${encodeURIComponent(t('hire.shareText', { title: job.title, business: me.settings.business_name, link: jobLink(job.token) }))}`, '_blank', 'noopener');
  const copy = async () => {
    try { await navigator.clipboard.writeText(jobLink(job.token)); toast.success(t('hire.linkCopied')); }
    catch { window.prompt(t('hire.copyLink'), jobLink(job.token)); }
  };

  return (
    <div className="space-y-5">
      <Link href={hrHref('/hiring')} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-ink-800">
        <ArrowLeft size={15} /> {t('hire.backToJobs')}
      </Link>
      <PageHeader
        title={<span className="flex flex-wrap items-center gap-2">{job.title} <Pill tone={job.status === 'open' ? 'green' : 'gray'}>{t(job.status === 'open' ? 'hire.status.open' : 'hire.status.closed')}</Pill></span>}
        subtitle={[branchName(job.branch_id), typeLabel(t, job.employment_type), salary, job.closes_at && t('hire.closes', { date: formatDate(job.closes_at) })].filter(Boolean).join(' · ')}
        actions={<>
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}><Pencil /> {t('common.edit')}</Button>
          <Button variant="outline" size="sm" onClick={copy}><Copy /> {t('hire.copyLink')}</Button>
          <Button variant="outline" size="sm" onClick={share}><Share2 /> {t('common.whatsapp')}</Button>
          <Button size="sm" onClick={() => setAdding(true)}><Plus /> {t('hire.addApplicant')}</Button>
        </>} />

      {!applicants.length ? (
        <div className="kh-card">
          <EmptyState scene="relax" title={t('hire.noApplicants')} description={t('hire.noApplicantsBody')}
            action={<Button onClick={() => setAdding(true)}><Plus /> {t('hire.addApplicant')}</Button>} />
        </div>
      ) : (
        <>
          {/* Phones: one stage at a time */}
          <div className="lg:hidden space-y-3">
            <NativeSelect aria-label={t('hire.allStages')} value={stage} onChange={e => setStage(e.target.value as ApplicantStage)}>
              {STAGES.map(s => <option key={s} value={s}>{t(`hire.stage.${s}`)} ({byStage(s).length})</option>)}
            </NativeSelect>
            {byStage(stage).length
              ? byStage(stage).map(a => <ApplicantCard key={a.id} a={a} onMove={move} />)
              : <p className="rounded-xl border border-dashed border-ink-200 p-6 text-center text-sm text-ink-400">{t('hire.emptyStage')}</p>}
          </div>

          <div className="hidden lg:block overflow-x-auto pb-2">
            <div className="grid min-w-[1100px] grid-cols-6 gap-3">
              {STAGES.map(s => (
                <section key={s} className="flex min-h-[12rem] flex-col rounded-2xl bg-ink-100/70 p-2">
                  <header className="flex items-center justify-between px-1.5 pb-2 pt-1">
                    <Pill tone={STAGE_TONE[s]}>{t(`hire.stage.${s}`)}</Pill>
                    <span className="text-xs font-semibold text-ink-500">{byStage(s).length}</span>
                  </header>
                  <div className="space-y-2">
                    {byStage(s).map(a => <ApplicantCard key={a.id} a={a} onMove={move} compact />)}
                    {!byStage(s).length && <p className="px-2 py-4 text-center text-xs text-ink-400">{t('hire.emptyStage')}</p>}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </>
      )}

      <AddApplicantDialog open={adding} jobId={job.id} onClose={() => setAdding(false)} onAdded={a => setApplicants(list => [{ ...a, job_title: job.title }, ...(list ?? [])])} />
      <JobDialog open={editing} job={job} onClose={() => setEditing(false)} onSaved={saved => setJob(j => (j ? { ...j, ...saved } : j))} />
    </div>
  );
}

function ApplicantCard({ a, onMove, compact }: { a: Applicant; onMove: (a: Applicant, to: ApplicantStage) => void; compact?: boolean }) {
  const { t } = useHrT();
  const i = MOVABLE.indexOf(a.stage);
  const movable = a.stage !== 'hired';
  // Arrows step through the pipeline; "rejected" is reached with the dropdown
  const forward = i >= 0 && i < MOVABLE.length - 2 ? MOVABLE[i + 1] : null;
  const back = i > 0 && a.stage !== 'rejected' ? MOVABLE[i - 1] : null;

  return (
    <div className={cn('rounded-xl border border-ink-200 bg-white p-3 shadow-sm', compact && 'p-2.5')}>
      <Link href={hrHref(`/hiring/applicants/${a.id}`)} className="block font-semibold text-ink-900 hover:underline [overflow-wrap:anywhere]">{a.name}</Link>
      {a.phone && <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-500"><Phone size={11} /> {a.phone}</p>}
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        {a.rating > 0 && <Stars value={a.rating} size={12} />}
        <Pill tone={a.source === 'public' ? 'blue' : 'gray'}>{t(a.source === 'public' ? 'hire.source.public' : 'hire.source.manual')}</Pill>
        {a.cv_url && <FileText size={13} className="text-ink-400" aria-label={t('hire.cv')} />}
      </div>
      {a.interview_at && (
        <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-amber-800"><CalendarClock size={12} /> {formatDateTime(a.interview_at)}</p>
      )}
      {movable && (
        <div className="mt-2 flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" aria-label={t('hire.moveBack')} disabled={!back} onClick={() => back && onMove(a, back)}><ChevronLeft /></Button>
          <NativeSelect aria-label={t('hire.moveTo')} value={a.stage} className="h-7 flex-1 px-1.5 text-xs" onChange={e => onMove(a, e.target.value as ApplicantStage)}>
            {MOVABLE.map(s => <option key={s} value={s}>{t(`hire.stage.${s}`)}</option>)}
          </NativeSelect>
          <Button variant="ghost" size="icon-sm" aria-label={t('hire.moveForward')} disabled={!forward} onClick={() => forward && onMove(a, forward)}><ChevronRight /></Button>
        </div>
      )}
    </div>
  );
}

function AddApplicantDialog({ open, jobId, onClose, onAdded }: { open: boolean; jobId: number; onClose: () => void; onAdded: (a: Applicant) => void }) {
  const { t } = useHrT();
  const [form, setForm] = useState({ name: '', phone: '', email: '', cover_note: '' });
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) { setForm({ name: '', phone: '', email: '', cover_note: '' }); setFile(null); } }, [open]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (file && file.size > 5 * 1024 * 1024) { toast.error(t('job.cvTooBig')); return; }
    setSaving(true);
    try {
      const { data } = await postForm<Applicant>('/hr/applicants', { job_id: jobId, ...form }, file);
      onAdded(data);
      onClose();
    } catch (err) {
      toast.error(apiError(err, t));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={t('hire.addApplicant')}>
      <form onSubmit={save} className="space-y-4">
        <Field label={t('common.name')} htmlFor="ap_name">
          <TextInput id="ap_name" required maxLength={150} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('common.phone')} htmlFor="ap_phone">
            <TextInput id="ap_phone" type="tel" inputMode="tel" maxLength={40} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          </Field>
          <Field label={t('common.email')} htmlFor="ap_email">
            <TextInput id="ap_email" type="email" maxLength={150} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </Field>
        </div>
        <Field label={t('hire.coverNote')} htmlFor="ap_note">
          <TextArea id="ap_note" rows={3} maxLength={3000} value={form.cover_note} onChange={e => setForm(f => ({ ...f, cover_note: e.target.value }))} />
        </Field>
        <Field label={t('hire.cvOptional')} hint={t('job.cvHelp')}>
          <div className="flex items-center gap-2">
            <FilePick accept="application/pdf,image/jpeg,image/png,image/webp" onPick={setFile}>
              <span className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-ink-200 bg-white px-3 text-sm font-semibold text-ink-700 hover:bg-ink-50"><FileText size={15} /> {t('job.cvPick')}</span>
            </FilePick>
            {file && <span className="truncate text-sm text-ink-600">{file.name}</span>}
          </div>
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>{t('common.cancel')}</Button>
          <Button type="submit" disabled={saving}>{saving ? t('common.saving') : t('common.add')}</Button>
        </div>
      </form>
    </Dialog>
  );
}
