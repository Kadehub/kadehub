'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Briefcase, CalendarDays, FileText, MapPin, Wallet } from 'lucide-react';
import { MascotState } from '../../../../components/brand/Mascot';
import { BrandStyle } from '../../../../components/hr/HrRoot';
import { hrHref } from '../../../../components/hr/HrContext';
import { Button, Field, FilePick, TextArea, TextInput } from '../../../../components/hr/ui';
import LanguageSwitcher from '../../../../components/ui/LanguageSwitcher';
import api from '../../../../lib/api';
import { apiCode, apiError, postForm } from '../../../../lib/hr/api';
import { useHrT } from '../../../../lib/hr/i18n';
import { formatDate } from '../../../../lib/hr/format';
import type { PublicJob } from '../../../../lib/hr/types';
import { salaryText, typeLabel } from '../../../../components/hr/talent/shared';

const MAX_CV = 5 * 1024 * 1024;

// staff.kadehub.com/jobs/<token> — a business's public job advert with an application form (no sign-in)
export default function PublicJobPage() {
  const { t } = useHrT();
  const { token } = useParams<{ token: string }>();
  const [job, setJob] = useState<PublicJob | null | undefined>(undefined);
  const [failed, setFailed] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', cover_note: '', website: '' });
  const [cv, setCv] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string>();
  const [sent, setSent] = useState(false);

  const load = () => {
    setFailed(false);
    api.get<PublicJob>(`/hr/public/jobs/${encodeURIComponent(token)}`)
      .then(r => setJob(r.data))
      .catch(err => ((err as { response?: { status?: number } })?.response?.status === 404 ? setJob(null) : setFailed(true)));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [token]);

  useEffect(() => { if (job) document.title = `${job.title} · ${job.business.name}`; }, [job]);

  async function apply(e: React.FormEvent) {
    e.preventDefault();
    if (cv && cv.size > MAX_CV) { setError(t('job.cvTooBig')); return; }
    setSending(true);
    setError(undefined);
    try {
      await postForm(`/hr/public/jobs/${encodeURIComponent(token)}/apply`, form, cv);
      setSent(true);
    } catch (err) {
      if (apiCode(err) === 'JOB_CLOSED') setJob(null);
      else setError(apiError(err, t));
    } finally {
      setSending(false);
    }
  }

  const brand = job?.business.brand_color ?? '#7c3aed';
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="min-h-screen bg-ink-50">
      <BrandStyle color={brand} />
      <div className="h-1.5" style={{ background: brand }} />
      <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {job?.business.logo_url
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={job.business.logo_url} alt="" className="h-10 w-10 shrink-0 rounded-lg object-contain" />
              : job && <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg font-extrabold text-[color:var(--cod-primary-fg)]" style={{ background: brand }}>{job.business.name.slice(0, 1).toUpperCase()}</span>}
            {job && <span className="truncate font-bold text-ink-900">{job.business.name}</span>}
          </div>
          <LanguageSwitcher />
        </div>

        {failed ? (
          <div className="kh-card"><MascotState variant="error" size="sm" title={t('err.generic')} action={<Button variant="outline" onClick={load}>{t('common.retry')}</Button>} /></div>
        ) : job === undefined ? (
          <MascotState variant="loading" size="sm" title={t('job.loading')} />
        ) : job === null ? (
          <div className="kh-card"><MascotState variant="empty" scene="sleep" title={t('job.closedTitle')} description={t('job.closedBody')} /></div>
        ) : (
          <div className="space-y-5">
            <section className="kh-card p-5 sm:p-6">
              <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">{job.title}</h1>
              <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-ink-600">
                <li className="flex items-center gap-1.5"><Briefcase size={15} style={{ color: brand }} /> {typeLabel(t, job.employment_type)}</li>
                {salaryText(t, job.salary_min, job.salary_max) && (
                  <li className="flex items-center gap-1.5"><Wallet size={15} style={{ color: brand }} /> {salaryText(t, job.salary_min, job.salary_max)} {t('job.perMonth')}</li>
                )}
                {job.business.address && <li className="flex items-center gap-1.5"><MapPin size={15} style={{ color: brand }} /> {job.business.address}</li>}
                {job.closes_at && <li className="flex items-center gap-1.5"><CalendarDays size={15} style={{ color: brand }} /> {t('job.closes', { date: formatDate(job.closes_at) })}</li>}
              </ul>
              <p className="mt-2 text-xs text-ink-400">{t('job.posted', { date: formatDate(job.posted_at.slice(0, 10)) })}</p>
              {job.description && (
                <>
                  <h2 className="mt-5 text-sm font-bold uppercase tracking-wide text-ink-500">{t('job.about')}</h2>
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-700">{job.description}</p>
                </>
              )}
            </section>

            <section className="kh-card p-5 sm:p-6">
              {sent ? (
                <MascotState variant="success" size="md" title={t('job.thanksTitle')} description={t('job.thanksBody', { business: job.business.name })} />
              ) : (
                <form onSubmit={apply} className="space-y-4">
                  <div>
                    <h2 className="text-lg font-bold text-ink-900">{t('job.applyTitle')}</h2>
                    <p className="text-sm text-ink-500">{t('job.applyHelp')}</p>
                  </div>
                  <Field label={t('job.name')} htmlFor="name">
                    <TextInput id="name" required maxLength={150} autoComplete="name" value={form.name} onChange={set('name')} />
                  </Field>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label={t('job.phone')} htmlFor="phone">
                      <TextInput id="phone" type="tel" inputMode="tel" required maxLength={40} autoComplete="tel" placeholder="077 123 4567" value={form.phone} onChange={set('phone')} />
                    </Field>
                    <Field label={t('job.email')} htmlFor="email">
                      <TextInput id="email" type="email" maxLength={150} autoComplete="email" value={form.email} onChange={set('email')} />
                    </Field>
                  </div>
                  <Field label={t('job.note')} htmlFor="note">
                    <TextArea id="note" rows={4} maxLength={3000} placeholder={t('job.notePlaceholder')} value={form.cover_note} onChange={set('cover_note')} />
                  </Field>
                  <Field label={t('job.cv')} hint={t('job.cvHelp')}>
                    <div className="flex items-center gap-2">
                      <FilePick accept="application/pdf,image/jpeg,image/png,image/webp" onPick={f => { setCv(f); setError(f.size > MAX_CV ? t('job.cvTooBig') : undefined); }}>
                        <span className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-ink-200 bg-white px-3 text-sm font-semibold text-ink-700 hover:bg-ink-50">
                          <FileText size={15} /> {t('job.cvPick')}
                        </span>
                      </FilePick>
                      {cv && <span className="truncate text-sm text-ink-600">{cv.name}</span>}
                    </div>
                  </Field>
                  {/* Honeypot: hidden from people, filled in by bots */}
                  <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                    <label>Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} /></label>
                  </div>
                  {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
                  <Button type="submit" className="w-full justify-center" disabled={sending}>{sending ? t('job.sending') : t('job.submit')}</Button>
                </form>
              )}
            </section>
          </div>
        )}

        <p className="mt-8 text-center text-xs text-ink-400">
          <a href={hrHref('/')} className="hover:text-ink-600">{t('job.poweredBy')}</a>
        </p>
      </div>
    </div>
  );
}
