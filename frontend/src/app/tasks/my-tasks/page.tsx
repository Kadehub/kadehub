'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import TaskCard from '../../../components/tasks/TaskCard';
import { EmptyState, ErrorState, PageLoader } from '../../../components/tasks/ui';
import { productPath } from '../../../lib/platform';
import { useRequireLogin } from '../../../lib/tasks/auth';
import { useTasksT } from '../../../lib/tasks/i18n';
import { lkr } from '../../../lib/tasks/format';
import type { MyOffer, TaskCard as TaskCardData } from '../../../lib/tasks/types';
import api from '../../../lib/api';

const p = (path: string) => productPath('tasks', path);
type Tab = 'posted' | 'working' | 'offers';

export default function MyTasksPage() {
  const { t } = useTasksT();
  const { ready } = useRequireLogin();
  const [tab, setTab] = useState<Tab>('posted');
  const [posted, setPosted] = useState<TaskCardData[] | null>(null);
  const [offers, setOffers] = useState<MyOffer[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!ready) return;
    Promise.all([api.get<TaskCardData[]>('/tasks/me/posted'), api.get<MyOffer[]>('/tasks/me/offers')])
      .then(([a, b]) => { setPosted(a.data); setOffers(b.data); })
      .catch(() => setError(true));
  }, [ready]);

  if (!ready || (!error && (!posted || !offers))) return <PageLoader />;
  if (error) return <div className="max-w-xl mx-auto px-4 py-10"><ErrorState title={t('common.error')} text={t('common.errorDesc')} /></div>;

  const working = offers!.filter(o => o.assigned_to_me);
  const tabs: Array<[Tab, string, number]> = [
    ['posted', t('my.posted'), posted!.length],
    ['working', t('my.working'), working.length],
    ['offers', t('my.offers'), offers!.length],
  ];
  const postCta = <Link href={p('/post')} className="inline-flex px-4 py-2 rounded-xl text-sm kh-btn-amber">{t('nav.post')}</Link>;
  const browseCta = <Link href={p('/browse')} className="inline-flex px-4 py-2 rounded-xl text-sm kh-btn-amber">{t('nav.browse')}</Link>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-extrabold text-ink-900">{t('my.title')}</h1>
      <div className="mt-4 flex gap-1 p-1 rounded-xl bg-ink-100 w-full sm:w-fit overflow-x-auto">
        {tabs.map(([key, label, count]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 sm:flex-none whitespace-nowrap px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === key ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-800'}`}>
            {label} <span className="text-ink-400">({count})</span>
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        {tab === 'posted' && (posted!.length === 0
          ? <EmptyState title={t('empty.postedTitle')} text={t('my.emptyPosted')} action={postCta} />
          : posted!.map(task => <TaskCard key={task.id} task={task} />))}

        {tab === 'working' && (working.length === 0
          ? <EmptyState title={t('empty.workingTitle')} text={t('my.emptyWorking')} action={browseCta} />
          : working.map(o => <TaskCard key={o.offer.id} task={o.task} />))}

        {tab === 'offers' && (offers!.length === 0
          ? <EmptyState title={t('empty.offersTitle')} text={t('my.emptyOffers')} action={browseCta} />
          : offers!.map(o => (
            <TaskCard key={o.offer.id} task={o.task} footer={
              <p className="mt-2 text-xs text-ink-500">
                {t(`my.offerStatus.${o.offer.status}` as any)} · <b className="text-ink-700">{lkr(o.offer.amount)}</b>
              </p>
            } />
          )))}
      </div>
    </div>
  );
}
