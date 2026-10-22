'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { CheckCircle2, Info, Plus, Trash2 } from 'lucide-react';
import api from '../../../lib/api';
import { apiError } from '../../../lib/hr/api';
import { useHrT, type HrKey } from '../../../lib/hr/i18n';
import { formatDate, formatNumber, today } from '../../../lib/hr/format';
import { REVIEW_AREAS, type Employee, type Review, type ReviewArea, type Warning, type WarningLevel } from '../../../lib/hr/types';
import { hrHref, useHr } from '../../../components/hr/HrContext';
import {
  Button, ConfirmDialog, Dialog, EmployeeSelect, EmptyState, Field, InfoRow, LoadError, Loading, NativeSelect, PageHeader, Pill,
  Stars, Tabs, TextArea, TextInput, tbl,
} from '../../../components/hr/ui';
import { LEVEL_TONE } from '../../../components/hr/talent/shared';

type Tab = 'reviews' | 'warnings';
const LEVELS: WarningLevel[] = ['verbal', 'written', 'final'];

// staff.kadehub.com/performance — reviews and warnings on file, acknowledged by staff on the kiosk
export default function PerformancePage() {
  const { t } = useHrT();
  const { branch, owner } = useHr();
  const [tab, setTab] = useState<Tab>('reviews');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employee, setEmployee] = useState<number | ''>('');
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [warnings, setWarnings] = useState<Warning[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [creating, setCreating] = useState<Tab | null>(null);
  const [viewReview, setViewReview] = useState<Review | null>(null);
  const [viewWarning, setViewWarning] = useState<Warning | null>(null);
  const [deleting, setDeleting] = useState<{ kind: Tab; id: number } | null>(null);

  useEffect(() => {
    api.get<Employee[]>('/hr/employees', { params: { branch_id: branch ?? undefined } }).then(r => setEmployees(r.data)).catch(() => {});
  }, [branch]);

  const load = useCallback(() => {
    setFailed(false);
    setReviews(null);
    setWarnings(null);
    const params = { employee_id: employee || undefined };
    Promise.all([api.get<Review[]>('/hr/reviews', { params }), api.get<Warning[]>('/hr/warnings', { params })])
      .then(([r, w]) => { setReviews(r.data); setWarnings(w.data); })
      .catch(() => setFailed(true));
  }, [employee]);
  useEffect(load, [load]);

  // The list endpoints cover every branch the user sees; the header's branch narrows it down
  const inBranch = useMemo(() => new Set(employees.map(e => e.id)), [employees]);
  const shownReviews = (reviews ?? []).filter(r => branch === null || inBranch.has(r.employee_id));
  const shownWarnings = (warnings ?? []).filter(w => branch === null || inBranch.has(w.employee_id));

  const ack = (at: string | null) => at
    ? <Pill tone="green"><CheckCircle2 size={11} /> {t('perf.acknowledged')}</Pill>
    : <Pill tone="gray">{t('perf.notAcknowledged')}</Pill>;
  const person = (id: number, name?: string) => <Link href={hrHref(`/employees/${id}`)} className="font-medium text-ink-800 hover:underline">{name}</Link>;

  return (
    <div className="space-y-5">
      <PageHeader title={t('perf.title')} subtitle={t('perf.subtitle')}
        actions={<Button onClick={() => setCreating(tab)}><Plus /> {tab === 'reviews' ? t('perf.newReview') : t('perf.newWarning')}</Button>} />

      <p className="flex items-start gap-2 rounded-xl bg-violet-50 px-3 py-2 text-sm text-violet-900"><Info size={16} className="mt-0.5 shrink-0" /> {t('perf.kioskNote')}</p>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <Tabs<Tab> value={tab} onChange={setTab} items={[
          { value: 'reviews', label: t('perf.reviews'), badge: shownReviews.length || undefined },
          { value: 'warnings', label: t('perf.warnings'), badge: shownWarnings.length || undefined },
        ]} />
        <EmployeeSelect employees={employees} value={employee} onChange={setEmployee} placeholder={t('perf.allEmployees')} className="w-auto min-w-[14rem]" />
      </div>

      {failed ? <LoadError onRetry={load} />
        : !reviews || !warnings ? <Loading />
        : tab === 'reviews' ? (
          !shownReviews.length ? (
            <div className="kh-card"><EmptyState scene="grow" title={t('perf.noReviews')} description={t('perf.noReviewsBody')}
              action={<Button onClick={() => setCreating('reviews')}><Plus /> {t('perf.newReview')}</Button>} /></div>
          ) : (
            <>
              <div className={`${tbl.wrap} hidden md:block`}>
                <table className={tbl.table}>
                  <thead><tr>
                    <th className={tbl.th}>{t('common.employee')}</th><th className={tbl.th}>{t('perf.period')}</th><th className={tbl.th}>{t('common.date')}</th>
                    <th className={tbl.th}>{t('perf.overall')}</th><th className={tbl.th}>{t('perf.reviewer')}</th><th className={tbl.th}>{t('common.status')}</th><th className={tbl.th} />
                  </tr></thead>
                  <tbody>
                    {shownReviews.map(r => (
                      <tr key={r.id} className="cursor-pointer hover:bg-ink-50" onClick={() => setViewReview(r)}>
                        <td className={tbl.td} onClick={e => e.stopPropagation()}>{person(r.employee_id, r.employee_name)}</td>
                        <td className={tbl.td}>{r.period || '—'}</td>
                        <td className={tbl.td}>{formatDate(r.review_date)}</td>
                        <td className={tbl.td}><span className="inline-flex items-center gap-1.5"><Stars value={r.overall} size={13} /> <span className="text-xs text-ink-500">{formatNumber(r.overall, 1)}</span></span></td>
                        <td className={tbl.td}>{r.reviewer_name}</td>
                        <td className={tbl.td}>{ack(r.acknowledged_at)}</td>
                        <td className={`${tbl.td} ${tbl.right}`} onClick={e => e.stopPropagation()}>
                          {owner && <Button variant="ghost" size="icon-sm" aria-label={t('perf.deleteReview')} onClick={() => setDeleting({ kind: 'reviews', id: r.id })}><Trash2 /></Button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className="space-y-2 md:hidden">
                {shownReviews.map(r => (
                  <li key={r.id}>
                    <button type="button" onClick={() => setViewReview(r)} className="kh-card w-full p-3 text-left">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-ink-800">{r.employee_name}</span>
                        <Stars value={r.overall} size={13} />
                      </div>
                      <p className="mt-0.5 text-xs text-ink-500">{[r.period, formatDate(r.review_date), r.reviewer_name].filter(Boolean).join(' · ')}</p>
                      <div className="mt-1.5">{ack(r.acknowledged_at)}</div>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )
        ) : (
          !shownWarnings.length ? (
            <div className="kh-card"><EmptyState scene="relax" title={t('perf.noWarnings')} description={t('perf.noWarningsBody')} /></div>
          ) : (
            <>
              <div className={`${tbl.wrap} hidden md:block`}>
                <table className={tbl.table}>
                  <thead><tr>
                    <th className={tbl.th}>{t('common.employee')}</th><th className={tbl.th}>{t('perf.level')}</th><th className={tbl.th}>{t('common.date')}</th>
                    <th className={tbl.th}>{t('common.reason')}</th><th className={tbl.th}>{t('perf.issuedBy')}</th><th className={tbl.th}>{t('common.status')}</th><th className={tbl.th} />
                  </tr></thead>
                  <tbody>
                    {shownWarnings.map(w => (
                      <tr key={w.id} className="cursor-pointer hover:bg-ink-50" onClick={() => setViewWarning(w)}>
                        <td className={tbl.td} onClick={e => e.stopPropagation()}>{person(w.employee_id, w.employee_name)}</td>
                        <td className={tbl.td}><Pill tone={LEVEL_TONE[w.level]}>{t(`perf.level.${w.level}` as HrKey)}</Pill></td>
                        <td className={tbl.td}>{formatDate(w.warning_date)}</td>
                        <td className={`${tbl.td} max-w-xs truncate`}>{w.reason}</td>
                        <td className={tbl.td}>{w.issued_by_name}</td>
                        <td className={tbl.td}>{ack(w.acknowledged_at)}</td>
                        <td className={`${tbl.td} ${tbl.right}`} onClick={e => e.stopPropagation()}>
                          {owner && <Button variant="ghost" size="icon-sm" aria-label={t('perf.deleteWarning')} onClick={() => setDeleting({ kind: 'warnings', id: w.id })}><Trash2 /></Button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className="space-y-2 md:hidden">
                {shownWarnings.map(w => (
                  <li key={w.id}>
                    <button type="button" onClick={() => setViewWarning(w)} className="kh-card w-full p-3 text-left">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-ink-800">{w.employee_name}</span>
                        <Pill tone={LEVEL_TONE[w.level]}>{t(`perf.level.${w.level}` as HrKey)}</Pill>
                      </div>
                      <p className="mt-0.5 text-sm text-ink-700">{w.reason}</p>
                      <p className="mt-0.5 text-xs text-ink-500">{formatDate(w.warning_date)} · {w.issued_by_name}</p>
                      <div className="mt-1.5">{ack(w.acknowledged_at)}</div>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )
        )}

      <ReviewDialog open={creating === 'reviews'} employees={employees} defaultEmployee={employee} onClose={() => setCreating(null)}
        onSaved={r => setReviews(list => [{ ...r, employee_name: employees.find(e => e.id === r.employee_id)?.full_name }, ...(list ?? [])])} />
      <WarningDialog open={creating === 'warnings'} employees={employees} defaultEmployee={employee} onClose={() => setCreating(null)}
        onSaved={w => setWarnings(list => [{ ...w, employee_name: employees.find(e => e.id === w.employee_id)?.full_name }, ...(list ?? [])])} />

      <Dialog open={!!viewReview} onClose={() => setViewReview(null)} title={t('perf.reviewFor', { name: viewReview?.employee_name ?? '' })}>
        {viewReview && (
          <div className="space-y-4 text-sm">
            <div className="divide-y divide-ink-100">
              <InfoRow label={t('perf.period')} value={viewReview.period} />
              <InfoRow label={t('perf.reviewDate')} value={formatDate(viewReview.review_date)} />
              <InfoRow label={t('perf.reviewer')} value={viewReview.reviewer_name} />
              {REVIEW_AREAS.map(k => <InfoRow key={k} label={t(`perf.area.${k}` as HrKey)} value={<Stars value={viewReview.ratings[k] ?? 0} size={14} />} />)}
              <InfoRow label={t('perf.overall')} value={<span className="inline-flex items-center gap-1.5"><Stars value={viewReview.overall} size={14} /> {formatNumber(viewReview.overall, 1)}</span>} />
            </div>
            {([['perf.strengths', viewReview.strengths], ['perf.improvements', viewReview.improvements], ['perf.goals', viewReview.goals]] as const)
              .filter(([, v]) => v).map(([k, v]) => (
                <div key={k}><p className="font-semibold text-ink-700">{t(k)}</p><p className="mt-1 whitespace-pre-line text-ink-600">{v}</p></div>
              ))}
            <div>{ack(viewReview.acknowledged_at)}</div>
          </div>
        )}
      </Dialog>

      <Dialog open={!!viewWarning} onClose={() => setViewWarning(null)} title={t('perf.warningFor', { name: viewWarning?.employee_name ?? '' })}>
        {viewWarning && (
          <div className="space-y-4 text-sm">
            <div className="divide-y divide-ink-100">
              <InfoRow label={t('perf.level')} value={<Pill tone={LEVEL_TONE[viewWarning.level]}>{t(`perf.level.${viewWarning.level}` as HrKey)}</Pill>} />
              <InfoRow label={t('perf.warningDate')} value={formatDate(viewWarning.warning_date)} />
              <InfoRow label={t('perf.issuedBy')} value={viewWarning.issued_by_name} />
              <InfoRow label={t('common.reason')} value={viewWarning.reason} />
            </div>
            {viewWarning.details && <div><p className="font-semibold text-ink-700">{t('perf.details')}</p><p className="mt-1 whitespace-pre-line text-ink-600">{viewWarning.details}</p></div>}
            <div>{ack(viewWarning.acknowledged_at)}</div>
          </div>
        )}
      </Dialog>

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)}
        title={deleting?.kind === 'reviews' ? t('perf.deleteReview') : t('perf.deleteWarning')}
        message={<p>{t('perf.deleteBody')} {t('common.cannotUndo')}</p>} confirmLabel={t('common.delete')}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await api.delete(`/hr/${deleting.kind}/${deleting.id}`);
            if (deleting.kind === 'reviews') setReviews(l => l?.filter(r => r.id !== deleting.id) ?? null);
            else setWarnings(l => l?.filter(w => w.id !== deleting.id) ?? null);
          } catch (err) {
            toast.error(apiError(err, t));
          }
        }} />
    </div>
  );
}

function ReviewDialog({ open, employees, defaultEmployee, onClose, onSaved }: {
  open: boolean; employees: Employee[]; defaultEmployee: number | ''; onClose: () => void; onSaved: (r: Review) => void;
}) {
  const { t } = useHrT();
  const blank = () => ({
    employee_id: defaultEmployee, period: '', review_date: today(),
    ratings: Object.fromEntries(REVIEW_AREAS.map(k => [k, 0])) as Record<ReviewArea, number>,
    strengths: '', improvements: '', goals: '',
  });
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (open) setForm(blank()); }, [open]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (REVIEW_AREAS.some(k => !form.ratings[k])) { toast.error(t('perf.rateAll')); return; }
    setSaving(true);
    try {
      const { data } = await api.post<Review>('/hr/reviews', form);
      onSaved(data);
      onClose();
    } catch (err) {
      toast.error(apiError(err, t));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={t('perf.newReview')} width="max-w-xl">
      <form onSubmit={save} className="space-y-4">
        <Field label={t('common.employee')} htmlFor="rv_emp">
          <EmployeeSelect id="rv_emp" required employees={employees} value={form.employee_id} onChange={v => setForm(f => ({ ...f, employee_id: v }))} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('perf.period')} htmlFor="rv_period">
            <TextInput id="rv_period" maxLength={60} placeholder={t('perf.periodPlaceholder')} value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value }))} />
          </Field>
          <Field label={t('perf.reviewDate')} htmlFor="rv_date">
            <TextInput id="rv_date" type="date" required value={form.review_date} onChange={e => setForm(f => ({ ...f, review_date: e.target.value }))} />
          </Field>
        </div>
        <div className="divide-y divide-ink-100 rounded-xl border border-ink-200 px-3">
          {REVIEW_AREAS.map(k => (
            <div key={k} className="flex items-center justify-between gap-3 py-2">
              <span className="text-sm font-medium text-ink-700">{t(`perf.area.${k}` as HrKey)}</span>
              <Stars value={form.ratings[k]} size={20} label={t(`perf.area.${k}` as HrKey)}
                onChange={v => setForm(f => ({ ...f, ratings: { ...f.ratings, [k]: v } }))} />
            </div>
          ))}
        </div>
        {(['strengths', 'improvements', 'goals'] as const).map(k => (
          <Field key={k} label={t(`perf.${k}`)} htmlFor={`rv_${k}`}>
            <TextArea id={`rv_${k}`} rows={2} maxLength={3000} value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />
          </Field>
        ))}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>{t('common.cancel')}</Button>
          <Button type="submit" disabled={saving}>{saving ? t('common.saving') : t('common.save')}</Button>
        </div>
      </form>
    </Dialog>
  );
}

function WarningDialog({ open, employees, defaultEmployee, onClose, onSaved }: {
  open: boolean; employees: Employee[]; defaultEmployee: number | ''; onClose: () => void; onSaved: (w: Warning) => void;
}) {
  const { t } = useHrT();
  const blank = () => ({ employee_id: defaultEmployee, level: 'verbal' as WarningLevel, warning_date: today(), reason: '', details: '' });
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (open) setForm(blank()); }, [open]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.post<Warning>('/hr/warnings', form);
      onSaved(data);
      onClose();
    } catch (err) {
      toast.error(apiError(err, t));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={t('perf.newWarning')}>
      <form onSubmit={save} className="space-y-4">
        <Field label={t('common.employee')} htmlFor="wn_emp">
          <EmployeeSelect id="wn_emp" required employees={employees} value={form.employee_id} onChange={v => setForm(f => ({ ...f, employee_id: v }))} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('perf.level')} htmlFor="wn_level">
            <NativeSelect id="wn_level" value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value as WarningLevel }))}>
              {LEVELS.map(l => <option key={l} value={l}>{t(`perf.level.${l}` as HrKey)}</option>)}
            </NativeSelect>
          </Field>
          <Field label={t('perf.warningDate')} htmlFor="wn_date">
            <TextInput id="wn_date" type="date" required value={form.warning_date} onChange={e => setForm(f => ({ ...f, warning_date: e.target.value }))} />
          </Field>
        </div>
        <Field label={t('common.reason')} htmlFor="wn_reason">
          <TextInput id="wn_reason" required maxLength={200} value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
        </Field>
        <Field label={t('perf.details')} htmlFor="wn_details">
          <TextArea id="wn_details" rows={4} maxLength={5000} value={form.details} onChange={e => setForm(f => ({ ...f, details: e.target.value }))} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>{t('common.cancel')}</Button>
          <Button type="submit" disabled={saving}>{saving ? t('common.saving') : t('common.save')}</Button>
        </div>
      </form>
    </Dialog>
  );
}
