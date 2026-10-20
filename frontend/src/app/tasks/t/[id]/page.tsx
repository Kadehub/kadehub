'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  MapPin, Wifi, Calendar, Flag, MessageSquare, CheckCircle2, XCircle, Pencil, ShieldCheck, Info,
} from 'lucide-react';
import Modal from '../../../../components/ui/Modal';
import { MascotState } from '../../../../components/brand/Mascot';
import {
  Avatar, CategoryIcon, EmptyState, ErrorState, PageLoader, RatingLine, Spinner, StatusBadge, Stars, fieldCls,
} from '../../../../components/tasks/ui';
import { productPath } from '../../../../lib/platform';
import { useTasksT } from '../../../../lib/tasks/i18n';
import { apiError, fmtDay, lkr, timeAgo } from '../../../../lib/tasks/format';
import { DISTRICTS, type TaskDetail } from '../../../../lib/tasks/types';
import api from '../../../../lib/api';
import { useAuthStore } from '../../../../hooks/useAuth';

const p = (path: string) => productPath('tasks', path);
const REPORT_REASONS = ['spam', 'scam', 'inappropriate', 'off_platform_payment', 'no_show', 'other'] as const;

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, locale } = useTasksT();
  const me = useAuthStore(s => s.user);
  const [data, setData] = useState<TaskDetail | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'notfound' | 'error'>('loading');
  const [busy, setBusy] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState<'closed' | 'reviewed' | null>(null);

  const [offerOpen, setOfferOpen] = useState(false);
  const [offer, setOffer] = useState({ amount: '', message: '' });
  const [reportOpen, setReportOpen] = useState(false);
  const [report, setReport] = useState({ reason: 'spam', details: '' });
  const [reviewOpen, setReviewOpen] = useState(false);
  const [review, setReview] = useState({ rating: 5, comment: '' });
  const [editOpen, setEditOpen] = useState(false);
  const [edit, setEdit] = useState({ title: '', description: '', budget: '', district: '', city: '', due_date: '' });
  const [question, setQuestion] = useState('');
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [reply, setReply] = useState('');

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<TaskDetail>(`/tasks/${id}`);
      setData(data);
      setStatus('ready');
    } catch (err: any) {
      setStatus(err?.response?.status === 404 || err?.response?.status === 400 ? 'notfound' : 'error');
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function act(key: string, fn: () => Promise<any>, success?: string) {
    setBusy(key);
    try {
      await fn();
      if (success) toast.success(success);
      await load();
      return true;
    } catch (err) {
      toast.error(apiError(err, t('common.error')));
      return false;
    } finally {
      setBusy(null);
    }
  }

  const signInFirst = () => { window.location.href = '/login'; };

  if (status === 'loading') return <PageLoader />;
  if (status !== 'ready' || !data) {
    return (
      <div className="max-w-xl mx-auto px-4 py-10">
        <ErrorState
          title={status === 'notfound' ? t('common.notFound') : t('common.error')}
          text={status === 'notfound' ? t('common.notFoundDesc') : t('common.errorDesc')}
          action={status === 'notfound'
            ? <Link href={p('/browse')} className="px-4 py-2 rounded-xl text-sm kh-btn-amber">{t('common.backToBrowse')}</Link>
            : <button onClick={() => { setStatus('loading'); load(); }} className="px-4 py-2 rounded-xl text-sm kh-btn-amber">{t('common.retry')}</button>} />
      </div>
    );
  }

  const { task, offers, questions, reviews, viewer } = data;
  const open = task.status === 'open';
  const canAsk = viewer.signed_in && open;

  const statusInfo =
    task.hidden ? t('detail.hiddenInfo')
    : task.status === 'completed' ? (viewer.is_poster ? t('detail.completedInfo') : t('detail.waitingConfirm'))
    : task.status === 'closed' ? t('detail.closedInfo')
    : task.status === 'cancelled' ? t('detail.cancelledInfo')
    : null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {celebrate && (
        <div className="kh-card px-6 py-8 mb-6">
          <MascotState variant="success" size="sm" pose={celebrate === 'closed' ? 'celebrate' : 'love'}
            title={celebrate === 'closed' ? t('success.closed') : t('success.reviewed')}
            description={celebrate === 'closed' ? t('success.closedDesc') : t('success.reviewedDesc')}
            action={celebrate === 'closed' && viewer.can_review
              ? <button onClick={() => { setCelebrate(null); setReviewOpen(true); }} className="px-4 py-2 rounded-xl text-sm kh-btn-amber">{t('detail.leaveReview')}</button>
              : <button onClick={() => setCelebrate(null)} className="px-4 py-2 rounded-xl text-sm font-semibold border border-ink-200">{t('common.close')}</button>} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Main column */}
        <div className="space-y-6 min-w-0">
          <div className="kh-card p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={task.status} />
              {task.category && (
                <Link href={p(`/browse?category=${task.category.slug}`)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-500 hover:text-ink-800">
                  <CategoryIcon name={task.category.icon} size={14} /> {task.category.name}
                </Link>
              )}
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold text-ink-900 leading-tight break-words">{task.title}</h1>

            <div className="mt-4 grid sm:grid-cols-3 gap-3">
              <Link href={p(`/u/${task.poster.id}`)} className="flex items-center gap-2.5 min-w-0">
                <Avatar name={task.poster.name} url={task.poster.photo_url} size={36} />
                <span className="min-w-0">
                  <span className="block text-2xs uppercase tracking-wide text-ink-400">{t('detail.postedBy')}</span>
                  <span className="block text-sm font-semibold text-ink-800 truncate">{task.poster.name}</span>
                </span>
              </Link>
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-full bg-ink-100 flex items-center justify-center text-ink-500">
                  {task.location_type === 'remote' ? <Wifi size={16} /> : <MapPin size={16} />}
                </span>
                <span>
                  <span className="block text-2xs uppercase tracking-wide text-ink-400">{t('detail.location')}</span>
                  <span className="block text-sm font-semibold text-ink-800">
                    {task.location_type === 'remote' ? t('card.remote') : [task.city, task.district].filter(Boolean).join(', ')}
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-full bg-ink-100 flex items-center justify-center text-ink-500"><Calendar size={16} /></span>
                <span>
                  <span className="block text-2xs uppercase tracking-wide text-ink-400">{t('detail.dueDate')}</span>
                  <span className="block text-sm font-semibold text-ink-800">{task.due_date ? fmtDay(task.due_date) : t('card.flexible')}</span>
                </span>
              </div>
            </div>

            <h2 className="mt-6 text-sm font-bold uppercase tracking-wide text-ink-400">{t('detail.details')}</h2>
            <p className="mt-2 text-sm text-ink-700 whitespace-pre-line break-words">{task.description}</p>

            {task.attachments.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {task.attachments.map(a => (
                  <a key={a.id} href={a.url} target="_blank" rel="noreferrer">
                    <img src={a.url} alt="" className="w-28 h-28 rounded-xl object-cover border border-ink-100" />
                  </a>
                ))}
              </div>
            )}

            <div className="mt-5 flex items-center justify-between text-xs text-ink-400">
              <span>{timeAgo(task.created_at, locale)}</span>
              {viewer.signed_in && !viewer.is_poster && (
                <button onClick={() => setReportOpen(true)} className="inline-flex items-center gap-1 hover:text-coral"><Flag size={13} /> {t('detail.report')}</button>
              )}
            </div>
          </div>

          {/* Offers */}
          <section>
            <h2 className="text-lg font-extrabold text-ink-900">{t('detail.offers')} <span className="text-ink-400 font-semibold">({offers.filter(o => o.status !== 'withdrawn').length})</span></h2>
            <div className="mt-3 space-y-3">
              {offers.length === 0 ? (
                <EmptyState size="xs" title={t('empty.offersOnTask')} text={t('detail.noOffers')}
                  action={!viewer.is_poster && open ? (
                    <button onClick={() => (viewer.signed_in ? setOfferOpen(true) : signInFirst())} className="px-4 py-2 rounded-xl text-sm kh-btn-amber">
                      {t('detail.makeOffer')}
                    </button>
                  ) : undefined} />
              ) : offers.map(o => (
                <div key={o.id} className={`kh-card p-4 ${o.status === 'accepted' ? 'border-teal' : ''} ${o.status === 'withdrawn' || o.status === 'rejected' ? 'opacity-60' : ''}`}>
                  <div className="flex items-start justify-between gap-3">
                    <Link href={p(`/u/${o.tasker.id}`)} className="flex items-center gap-2.5 min-w-0">
                      <Avatar name={o.tasker.name} url={o.tasker.photo_url} size={40} />
                      <span className="min-w-0">
                        <span className="block text-sm font-bold text-ink-900 truncate">{o.tasker.name}</span>
                        <span className="flex items-center gap-2">
                          <RatingLine avg={o.tasker.rating_avg} count={o.tasker.rating_count} />
                          {o.tasker.completed_count > 0 && <span className="text-xs text-ink-400">· {o.tasker.completed_count} {t('detail.completedTasks')}</span>}
                        </span>
                      </span>
                    </Link>
                    <div className="text-right flex-shrink-0">
                      {o.amount !== null && <p className="text-base font-extrabold text-ink-900">{lkr(o.amount)}</p>}
                      {o.status !== 'pending' && <p className="text-2xs font-semibold uppercase text-ink-400">{t(`my.offerStatus.${o.status}` as any)}</p>}
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-ink-700 whitespace-pre-line break-words">{o.message}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-ink-400">{timeAgo(o.created_at, locale)}</span>
                    {viewer.is_poster && open && o.status === 'pending' && (
                      <button disabled={!!busy}
                        onClick={() => confirm(t('detail.acceptConfirm')) && act(`accept-${o.id}`, () => api.post(`/tasks/offers/${o.id}/accept`))}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm kh-btn-primary">
                        {busy === `accept-${o.id}` ? <Spinner className="!w-4 !h-4" /> : <CheckCircle2 size={15} />} {t('detail.accept')}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {offers.length > 0 && <p className="mt-2 text-xs text-ink-400 flex items-center gap-1"><ShieldCheck size={13} /> {t('detail.contactHidden')}</p>}
          </section>

          {/* Questions */}
          <section>
            <h2 className="text-lg font-extrabold text-ink-900">{t('detail.questions')} <span className="text-ink-400 font-semibold">({questions.length})</span></h2>
            {canAsk && (
              <form className="mt-3 flex gap-2" onSubmit={async e => {
                e.preventDefault();
                if (question.trim().length < 2) return;
                if (await act('ask', () => api.post(`/tasks/${task.id}/questions`, { body: question.trim() }))) setQuestion('');
              }}>
                <input className={fieldCls} value={question} maxLength={1000} placeholder={t('detail.askPlaceholder')} onChange={e => setQuestion(e.target.value)} />
                <button type="submit" disabled={busy === 'ask'} className="px-4 rounded-lg text-sm kh-btn-amber">{t('detail.ask')}</button>
              </form>
            )}
            <div className="mt-3 space-y-3">
              {questions.length === 0 ? (
                <p className="text-sm text-ink-400">{t('detail.noQuestions')}</p>
              ) : questions.map(q => (
                <div key={q.id} className="kh-card p-4">
                  <div className="flex gap-2.5">
                    <Avatar name={q.user.name} url={q.user.photo_url} size={30} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm"><b className="text-ink-900">{q.user.name}</b> <span className="text-xs text-ink-400">{timeAgo(q.created_at, locale)}</span></p>
                      <p className="mt-1 text-sm text-ink-700 whitespace-pre-line break-words">{q.body}</p>
                      {q.replies.map(r => (
                        <div key={r.id} className="mt-3 pl-3 border-l-2 border-amber-light flex gap-2">
                          <Avatar name={r.user.name} url={r.user.photo_url} size={24} />
                          <div className="min-w-0">
                            <p className="text-sm"><b className="text-ink-900">{r.user.name}</b> <span className="text-xs text-ink-400">{timeAgo(r.created_at, locale)}</span></p>
                            <p className="text-sm text-ink-700 whitespace-pre-line break-words">{r.body}</p>
                          </div>
                        </div>
                      ))}
                      {canAsk && (viewer.is_poster || q.user.id === me?.id) && (replyTo === q.id ? (
                        <form className="mt-3 flex gap-2" onSubmit={async e => {
                          e.preventDefault();
                          if (reply.trim().length < 2) return;
                          if (await act('reply', () => api.post(`/tasks/${task.id}/questions`, { body: reply.trim(), parent_id: q.id }))) { setReply(''); setReplyTo(null); }
                        }}>
                          <input autoFocus className={fieldCls} value={reply} maxLength={1000} placeholder={t('detail.replyPlaceholder')} onChange={e => setReply(e.target.value)} />
                          <button type="submit" className="px-3 rounded-lg text-sm kh-btn-amber">{t('detail.reply')}</button>
                        </form>
                      ) : (
                        <button onClick={() => setReplyTo(q.id)} className="mt-2 text-xs font-semibold text-amber-dark hover:underline">{t('detail.reply')}</button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Reviews */}
          {task.status === 'closed' && (
            <section>
              <h2 className="text-lg font-extrabold text-ink-900">{t('detail.reviews')}</h2>
              <div className="mt-3 space-y-3">
                {reviews.length === 0 ? (
                  <EmptyState size="xs" pose="love" title={t('empty.reviewsTitle')} text={t('user.noReviews')}
                    action={viewer.can_review ? <button onClick={() => setReviewOpen(true)} className="px-4 py-2 rounded-xl text-sm kh-btn-amber">{t('detail.leaveReview')}</button> : undefined} />
                ) : reviews.map(r => (
                  <div key={r.id} className="kh-card p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-sm font-semibold text-ink-800">
                        <Avatar name={r.reviewer.name} url={r.reviewer.photo_url} size={26} /> {r.reviewer.name}
                        <span className="text-xs font-normal text-ink-400">{r.role === 'tasker' ? `→ ${t('user.asTasker')}` : `→ ${t('user.asPoster')}`}</span>
                      </span>
                      <Stars value={r.rating} />
                    </div>
                    {r.comment && <p className="mt-2 text-sm text-ink-700 whitespace-pre-line">{r.comment}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <div className="kh-card p-5 lg:sticky lg:top-20">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">{task.agreed_amount ? t('detail.agreed') : t('detail.budget')}</p>
            <p className="mt-1 text-3xl font-extrabold text-ink-900">{lkr(task.agreed_amount ?? task.budget)}</p>

            {statusInfo && (
              <p className="mt-4 text-sm text-ink-600 bg-ink-50 rounded-lg px-3 py-2 flex gap-2"><Info size={15} className="flex-shrink-0 mt-0.5 text-ink-400" /> {statusInfo}</p>
            )}

            {task.assigned_tasker && task.status !== 'open' && (
              <div className="mt-4 flex items-center gap-2.5">
                <Avatar name={task.assigned_tasker.name} url={task.assigned_tasker.photo_url} size={32} />
                <span className="text-sm"><span className="text-ink-400">{t('detail.assignedTo')}</span> <b className="text-ink-800">{task.assigned_tasker.name}</b></span>
              </div>
            )}

            <div className="mt-5 space-y-2">
              {/* Open: taskers make offers */}
              {open && !viewer.is_poster && !viewer.my_offer && (
                <button onClick={() => (viewer.signed_in ? setOfferOpen(true) : signInFirst())} className="w-full px-4 py-3 rounded-xl text-sm kh-btn-amber">
                  {viewer.signed_in ? t('detail.makeOffer') : t('detail.signInToOffer')}
                </button>
              )}
              {open && viewer.my_offer?.status === 'pending' && (
                <div className="rounded-xl border border-amber-dark/40 bg-amber-light px-3 py-3">
                  <p className="text-xs font-semibold text-ink-500">{t('detail.yourOffer')}</p>
                  <p className="text-lg font-extrabold text-ink-900">{lkr(viewer.my_offer.amount)}</p>
                  <button disabled={!!busy} onClick={() => act('withdraw', () => api.post(`/tasks/offers/${viewer.my_offer!.id}/withdraw`))}
                    className="mt-2 text-xs font-semibold text-coral hover:underline">{t('detail.withdraw')}</button>
                </div>
              )}

              {/* Assigned / completed: the two parties */}
              {(viewer.is_poster || viewer.is_tasker) && task.assigned_tasker && ['assigned', 'completed', 'closed'].includes(task.status) && (
                <Link href={p(`/messages/${task.id}`)} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border-2 border-ink-200 text-ink-700 hover:bg-ink-50">
                  <MessageSquare size={16} /> {t('detail.messages')}
                </Link>
              )}
              {viewer.is_tasker && task.status === 'assigned' && (
                <button disabled={!!busy} onClick={() => act('complete', () => api.post(`/tasks/${task.id}/complete`))}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm kh-btn-primary">
                  {busy === 'complete' ? <Spinner className="!w-4 !h-4" /> : <CheckCircle2 size={16} />} {t('detail.markComplete')}
                </button>
              )}
              {viewer.is_poster && ['assigned', 'completed'].includes(task.status) && (
                <button disabled={!!busy} onClick={async () => {
                  if (!confirm(t('detail.confirmText'))) return;
                  if (await act('confirm', () => api.post(`/tasks/${task.id}/confirm`))) setCelebrate('closed');
                }} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm kh-btn-primary">
                  {busy === 'confirm' ? <Spinner className="!w-4 !h-4" /> : <CheckCircle2 size={16} />} {t('detail.confirm')}
                </button>
              )}
              {viewer.can_review && (
                <button onClick={() => setReviewOpen(true)} className="w-full px-4 py-2.5 rounded-xl text-sm kh-btn-amber">{t('detail.leaveReview')}</button>
              )}

              {/* Poster management */}
              {viewer.is_poster && open && (
                <button onClick={() => {
                  setEdit({ title: task.title, description: task.description, budget: String(task.budget), district: task.district || '', city: task.city || '', due_date: task.due_date || '' });
                  setEditOpen(true);
                }} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-ink-200 text-ink-700 hover:bg-ink-50">
                  <Pencil size={15} /> {t('detail.edit')}
                </button>
              )}
              {viewer.is_poster && ['open', 'assigned'].includes(task.status) && (
                <button disabled={!!busy} onClick={() => confirm(t('detail.cancelConfirm')) && act('cancel', () => api.post(`/tasks/${task.id}/cancel`))}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-coral hover:bg-coral-light">
                  <XCircle size={15} /> {t('detail.cancel')}
                </button>
              )}
            </div>

            <p className="mt-5 text-xs text-ink-500 leading-relaxed border-t border-ink-100 pt-4">{t('detail.payDirect')}</p>
          </div>
        </aside>
      </div>

      {/* Make offer */}
      <Modal open={offerOpen} onClose={() => setOfferOpen(false)} title={t('detail.makeOffer')}>
        <form className="space-y-4" onSubmit={async e => {
          e.preventDefault();
          if (!(Number(offer.amount) >= 500)) return toast.error(t('post.needBudget'));
          if (offer.message.trim().length < 10) return toast.error(t('detail.offerShort'));
          const ok = await act('offer', () => api.post(`/tasks/${task.id}/offers`, { amount: Number(offer.amount), message: offer.message.trim() }));
          if (ok) { setOfferOpen(false); setOffer({ amount: '', message: '' }); }
        }}>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-ink-700">{t('detail.amount')}</span>
            <input type="number" min={500} className={`${fieldCls} text-lg font-bold`} value={offer.amount} placeholder={String(task.budget)}
              onChange={e => setOffer(o => ({ ...o, amount: e.target.value }))} />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-ink-700">{t('detail.offerMessage')}</span>
            <textarea className={`${fieldCls} min-h-[110px]`} maxLength={2000} value={offer.message}
              onChange={e => setOffer(o => ({ ...o, message: e.target.value }))} />
          </label>
          <p className="text-xs text-ink-400">{t('detail.contactHidden')}</p>
          <button type="submit" disabled={busy === 'offer'} className="w-full px-4 py-3 rounded-xl text-sm kh-btn-amber">{t('detail.sendOffer')}</button>
        </form>
      </Modal>

      {/* Edit task */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title={t('detail.edit')}>
        <form className="space-y-3" onSubmit={async e => {
          e.preventDefault();
          const ok = await act('edit', () => api.patch(`/tasks/${task.id}`, {
            title: edit.title.trim(), description: edit.description.trim(), budget: Number(edit.budget),
            district: edit.district || undefined, city: edit.city, due_date: edit.due_date || undefined,
          }));
          if (ok) setEditOpen(false);
        }}>
          <input className={fieldCls} value={edit.title} maxLength={150} onChange={e => setEdit(v => ({ ...v, title: e.target.value }))} />
          <textarea className={`${fieldCls} min-h-[120px]`} value={edit.description} maxLength={5000} onChange={e => setEdit(v => ({ ...v, description: e.target.value }))} />
          <div className="grid grid-cols-2 gap-2">
            <input type="number" min={500} className={fieldCls} value={edit.budget} onChange={e => setEdit(v => ({ ...v, budget: e.target.value }))} />
            <input type="date" className={fieldCls} value={edit.due_date} onChange={e => setEdit(v => ({ ...v, due_date: e.target.value }))} />
            <select className={fieldCls} value={edit.district} onChange={e => setEdit(v => ({ ...v, district: e.target.value }))}>
              <option value="">—</option>
              {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <input className={fieldCls} value={edit.city} placeholder={t('post.cityPh')} onChange={e => setEdit(v => ({ ...v, city: e.target.value }))} />
          </div>
          <button type="submit" disabled={busy === 'edit'} className="w-full px-4 py-3 rounded-xl text-sm kh-btn-amber">{t('detail.save')}</button>
        </form>
      </Modal>

      {/* Review */}
      <Modal open={reviewOpen} onClose={() => setReviewOpen(false)} title={t('detail.leaveReview')}>
        <form className="space-y-4" onSubmit={async e => {
          e.preventDefault();
          const ok = await act('review', () => api.post(`/tasks/${task.id}/reviews`, { rating: review.rating, comment: review.comment.trim() || undefined }));
          if (ok) { setReviewOpen(false); setCelebrate('reviewed'); }
        }}>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-ink-700">{t('detail.rating')}</span>
            <Stars value={review.rating} size={26} onChange={v => setReview(r => ({ ...r, rating: v }))} />
          </div>
          <textarea className={`${fieldCls} min-h-[100px]`} maxLength={1000} placeholder={t('detail.comment')} value={review.comment}
            onChange={e => setReview(r => ({ ...r, comment: e.target.value }))} />
          <button type="submit" disabled={busy === 'review'} className="w-full px-4 py-3 rounded-xl text-sm kh-btn-amber">{t('detail.submitReview')}</button>
        </form>
      </Modal>

      {/* Report */}
      <Modal open={reportOpen} onClose={() => setReportOpen(false)} title={t('detail.report')}>
        <form className="space-y-3" onSubmit={async e => {
          e.preventDefault();
          setBusy('report');
          try {
            await api.post('/tasks/reports', { task_id: task.id, reason: report.reason, details: report.details.trim() || undefined });
            toast.success(t('detail.reported'));
            setReportOpen(false);
          } catch (err) {
            toast.error(apiError(err));
          } finally { setBusy(null); }
        }}>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-ink-700">{t('detail.reportReason')}</span>
            <select className={fieldCls} value={report.reason} onChange={e => setReport(r => ({ ...r, reason: e.target.value }))}>
              {REPORT_REASONS.map(r => <option key={r} value={r}>{t(`report.${r}` as any)}</option>)}
            </select>
          </label>
          <textarea className={`${fieldCls} min-h-[90px]`} maxLength={1000} placeholder={t('detail.reportDetails')} value={report.details}
            onChange={e => setReport(r => ({ ...r, details: e.target.value }))} />
          <button type="submit" disabled={busy === 'report'} className="w-full px-4 py-3 rounded-xl text-sm kh-btn-primary">{t('detail.sendReport')}</button>
        </form>
      </Modal>
    </div>
  );
}
