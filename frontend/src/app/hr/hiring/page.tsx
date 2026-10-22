'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Briefcase, Copy, MoreVertical, Pencil, Plus, Share2, Trash2, Lock, Unlock, Users } from 'lucide-react';
import api from '../../../lib/api';
import { apiError } from '../../../lib/hr/api';
import { useHrT } from '../../../lib/hr/i18n';
import { formatDate } from '../../../lib/hr/format';
import type { JobPost } from '../../../lib/hr/types';
import { hrHref, useHr } from '../../../components/hr/HrContext';
import {
  Button, ConfirmDialog, EmptyState, LoadError, Loading, Menu, MenuItem, PageHeader, Pill, btnClass,
} from '../../../components/hr/ui';
import JobDialog from '../../../components/hr/talent/JobDialog';
import { STAGES, STAGE_TONE, jobLink, salaryText, typeLabel } from '../../../components/hr/talent/shared';

// staff.kadehub.com/hiring — job posts with their applicant counts, sharing and open/close
export default function HiringPage() {
  const { t } = useHrT();
  const { branch, branchName, me } = useHr();
  const [jobs, setJobs] = useState<JobPost[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [editing, setEditing] = useState<JobPost | null>(null);
  const [dialog, setDialog] = useState(false);
  const [deleting, setDeleting] = useState<JobPost | null>(null);

  const load = useCallback(() => {
    setFailed(false);
    api.get<JobPost[]>('/hr/jobs').then(r => setJobs(r.data)).catch(() => setFailed(true));
  }, []);
  useEffect(load, [load]);

  const visible = (jobs ?? []).filter(j => branch === null || j.branch_id === branch);

  async function setStatus(job: JobPost, status: 'open' | 'closed') {
    try {
      const { data } = await api.patch<JobPost>(`/hr/jobs/${job.id}`, {
        title: job.title, branch_id: job.branch_id, employment_type: job.employment_type, salary_min: job.salary_min,
        salary_max: job.salary_max, description: job.description ?? '', closes_at: job.closes_at, status,
      });
      setJobs(list => list?.map(j => (j.id === job.id ? { ...j, ...data } : j)) ?? null);
    } catch (err) {
      toast.error(apiError(err, t));
    }
  }

  async function copy(job: JobPost) {
    try {
      await navigator.clipboard.writeText(jobLink(job.token));
      toast.success(t('hire.linkCopied'));
    } catch {
      window.prompt(t('hire.copyLink'), jobLink(job.token));
    }
  }

  const whatsapp = (job: JobPost) => {
    const text = t('hire.shareText', { title: job.title, business: me.settings.business_name, link: jobLink(job.token) });
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  };

  return (
    <div className="space-y-5">
      <PageHeader title={t('hire.title')} subtitle={t('hire.subtitle')}
        actions={<Button onClick={() => { setEditing(null); setDialog(true); }}><Plus /> {t('hire.newJob')}</Button>} />

      {failed ? <LoadError onRetry={load} />
        : !jobs ? <Loading />
        : !visible.length ? (
          <div className="kh-card">
            <EmptyState scene="grow" title={t('hire.noJobs')} description={t('hire.noJobsBody')}
              action={<Button onClick={() => { setEditing(null); setDialog(true); }}><Plus /> {t('hire.newJob')}</Button>} />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map(job => {
              const salary = salaryText(t, job.salary_min, job.salary_max);
              const fresh = job.by_stage?.new ?? 0;
              return (
                <article key={job.id} className="kh-card flex flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link href={hrHref(`/hiring/${job.id}`)} className="block truncate text-base font-bold text-ink-900 hover:underline">{job.title}</Link>
                      <p className="mt-0.5 text-xs text-ink-500">
                        {[branchName(job.branch_id), typeLabel(t, job.employment_type)].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Pill tone={job.status === 'open' ? 'green' : 'gray'}>{t(job.status === 'open' ? 'hire.status.open' : 'hire.status.closed')}</Pill>
                      <Menu trigger={<MoreVertical />} label={t('common.actions')}>
                        {close => (
                          <>
                            <MenuItem onClick={() => { close(); setEditing(job); setDialog(true); }}><Pencil /> {t('common.edit')}</MenuItem>
                            <MenuItem onClick={() => { close(); copy(job); }}><Copy /> {t('hire.copyLink')}</MenuItem>
                            <MenuItem onClick={() => { close(); whatsapp(job); }}><Share2 /> {t('hire.shareWhatsapp')}</MenuItem>
                            {job.status === 'open'
                              ? <MenuItem onClick={() => { close(); setStatus(job, 'closed'); }}><Lock /> {t('hire.closeJob')}</MenuItem>
                              : <MenuItem onClick={() => { close(); setStatus(job, 'open'); }}><Unlock /> {t('hire.reopenJob')}</MenuItem>}
                            <MenuItem danger onClick={() => { close(); setDeleting(job); }}><Trash2 /> {t('hire.deleteJob')}</MenuItem>
                          </>
                        )}
                      </Menu>
                    </div>
                  </div>

                  <p className="mt-3 text-sm font-semibold text-ink-700">{salary ?? <span className="font-normal text-ink-400">{t('hire.noSalary')}</span>}</p>
                  {job.closes_at && <p className="text-xs text-ink-500">{t('hire.closes', { date: formatDate(job.closes_at) })}</p>}

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {STAGES.filter(s => job.by_stage?.[s]).map(s => (
                      <Pill key={s} tone={STAGE_TONE[s]}>{t(`hire.stage.${s}`)} · {job.by_stage![s]}</Pill>
                    ))}
                  </div>

                  <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                    <span className="inline-flex items-center gap-1.5 text-sm text-ink-600">
                      <Users size={15} /> {t('hire.applicantCount', { n: job.applicant_count ?? 0 })}
                      {fresh > 0 && <Pill tone="blue">{t('hire.newCount', { n: fresh })}</Pill>}
                    </span>
                    <Link href={hrHref(`/hiring/${job.id}`)} className={btnClass('outline', 'sm')}><Briefcase /> {t('hire.openBoard')}</Link>
                  </div>
                  {job.status === 'open' && (
                    <div className="mt-3 flex gap-2 border-t border-ink-100 pt-3">
                      <Button variant="ghost" size="sm" onClick={() => copy(job)}><Copy /> {t('hire.copyLink')}</Button>
                      <Button variant="ghost" size="sm" onClick={() => whatsapp(job)}><Share2 /> {t('common.whatsapp')}</Button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

      <JobDialog open={dialog} job={editing} onClose={() => setDialog(false)}
        onSaved={saved => setJobs(list => {
          if (!list) return list;
          return list.some(j => j.id === saved.id)
            ? list.map(j => (j.id === saved.id ? { ...j, ...saved } : j))
            : [{ ...saved, applicant_count: 0, by_stage: {} }, ...list];
        })} />

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} title={t('hire.deleteJob')}
        message={<><p className="font-semibold text-ink-800">{deleting?.title}</p><p className="mt-1">{t('hire.deleteJobBody')} {t('common.cannotUndo')}</p></>}
        confirmLabel={t('common.delete')}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await api.delete(`/hr/jobs/${deleting.id}`);
            setJobs(list => list?.filter(j => j.id !== deleting.id) ?? null);
          } catch (err) {
            toast.error(apiError(err, t));
          }
        }} />
    </div>
  );
}
