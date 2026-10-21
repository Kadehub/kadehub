'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Avatar, EmptyState, ErrorState, PageLoader, StatusBadge } from '../../../components/tasks/ui';
import { productPath } from '../../../lib/platform';
import { useRequireLogin } from '../../../lib/tasks/auth';
import { useTasksT } from '../../../lib/tasks/i18n';
import { timeAgo } from '../../../lib/tasks/format';
import type { Thread } from '../../../lib/tasks/types';
import api from '../../../lib/api';

const p = (path: string) => productPath('tasks', path);

export default function MessagesPage() {
  const { t, locale } = useTasksT();
  const { ready } = useRequireLogin();
  const [threads, setThreads] = useState<Thread[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!ready) return;
    const load = () => api.get<Thread[]>('/tasks/me/threads').then(r => { setThreads(r.data); setError(false); }).catch(() => setError(true));
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [ready]);

  if (!ready || (!threads && !error)) return <PageLoader />;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-extrabold text-ink-900">{t('msg.title')}</h1>
      <div className="mt-5">
        {error && !threads ? (
          <ErrorState title={t('common.error')} text={t('common.errorDesc')} />
        ) : threads!.length === 0 ? (
          <EmptyState scene="sleep" title={t('empty.messagesTitle')} text={t('msg.empty')}
            action={<Link href={p('/browse')} className="inline-flex px-4 py-2 rounded-xl text-sm kh-btn-amber">{t('nav.browse')}</Link>} />
        ) : (
          <div className="kh-card divide-y divide-ink-100 overflow-hidden">
            {threads!.map(th => (
              <Link key={th.task.id} href={p(`/messages/${th.task.id}`)} className="flex items-center gap-3 px-4 py-3.5 hover:bg-ink-50">
                <Avatar name={th.other?.name} url={th.other?.photo_url} size={42} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm truncate ${th.unread ? 'font-extrabold text-ink-900' : 'font-semibold text-ink-800'}`}>{th.other?.name}</p>
                    <span className="text-2xs text-ink-400 flex-shrink-0">{timeAgo(th.updated_at, locale)}</span>
                  </div>
                  <p className="text-xs text-ink-500 truncate">{th.task.title}</p>
                  <p className={`text-sm truncate ${th.unread ? 'text-ink-800' : 'text-ink-400'}`}>
                    {th.last_message ? `${th.last_message.mine ? `${t('msg.you')}: ` : ''}${th.last_message.body}` : t('msg.noMessages')}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <StatusBadge status={th.task.status} />
                  {th.unread > 0 && (
                    <span className="min-w-[20px] h-5 px-1.5 rounded-full text-2xs font-bold text-ink-900 flex items-center justify-center" style={{ background: '#F59E0B' }}>
                      {th.unread}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
