'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { EmptyState, ErrorState, PageLoader } from '../../../components/tasks/ui';
import { productPath } from '../../../lib/platform';
import { useRequireLogin } from '../../../lib/tasks/auth';
import { useTasksT } from '../../../lib/tasks/i18n';
import { timeAgo } from '../../../lib/tasks/format';
import type { Notification } from '../../../lib/tasks/types';
import api from '../../../lib/api';

const p = (path: string) => productPath('tasks', path);

export default function NotificationsPage() {
  const { t, locale } = useTasksT();
  const { ready } = useRequireLogin();
  const [items, setItems] = useState<Notification[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!ready) return;
    api.get<Notification[]>('/tasks/me/notifications').then(r => setItems(r.data)).catch(() => setError(true));
  }, [ready]);

  const markAll = async () => {
    await api.post('/tasks/me/notifications/read-all').catch(() => {});
    setItems(list => list?.map(n => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })) ?? list);
  };

  const open = (n: Notification) => {
    if (!n.read_at) api.post(`/tasks/me/notifications/${n.id}/read`).catch(() => {});
  };

  if (!ready || (!items && !error)) return <PageLoader />;
  if (error) return <div className="max-w-xl mx-auto px-4 py-10"><ErrorState title={t('common.error')} text={t('common.errorDesc')} /></div>;

  const hasUnread = items!.some(n => !n.read_at);
  const href = (n: Notification) =>
    !n.task_id ? p('/notifications') : n.type === 'message_received' ? p(`/messages/${n.task_id}`) : p(`/t/${n.task_id}`);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-ink-900">{t('notif.title')}</h1>
        {hasUnread && <button onClick={markAll} className="text-sm font-semibold text-amber-dark hover:underline">{t('notif.markAll')}</button>}
      </div>
      <div className="mt-5">
        {items!.length === 0 ? (
          <EmptyState scene="relax" title={t('empty.notifTitle')} text={t('notif.empty')}
            action={<Link href={p('/browse')} className="inline-flex px-4 py-2 rounded-xl text-sm kh-btn-amber">{t('nav.browse')}</Link>} />
        ) : (
          <div className="kh-card divide-y divide-ink-100 overflow-hidden">
            {items!.map(n => (
              <Link key={n.id} href={href(n)} onClick={() => open(n)}
                className={`flex items-start gap-3 px-4 py-3.5 hover:bg-ink-50 ${n.read_at ? '' : 'bg-amber-light/50'}`}>
                <span className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${n.read_at ? 'bg-ink-100 text-ink-400' : 'text-white'}`}
                  style={n.read_at ? undefined : { background: '#F59E0B' }}>
                  <Bell size={16} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${n.read_at ? 'text-ink-700' : 'font-bold text-ink-900'}`}>{n.title}</p>
                  {n.body && <p className="text-sm text-ink-500 line-clamp-2">{n.body}</p>}
                  <p className="mt-0.5 text-2xs text-ink-400">{timeAgo(n.created_at, locale)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
