'use client';
import Link from 'next/link';
import { MapPin, Calendar, Wifi, MessageSquare } from 'lucide-react';
import { productPath } from '../../lib/platform';
import { useTasksT } from '../../lib/tasks/i18n';
import { lkr, timeAgo, fmtDay } from '../../lib/tasks/format';
import type { TaskCard as TaskCardData } from '../../lib/tasks/types';
import { Avatar, CategoryIcon, StatusBadge } from './ui';

export default function TaskCard({ task, footer }: { task: TaskCardData; footer?: React.ReactNode }) {
  const { t, locale } = useTasksT();
  return (
    <Link href={productPath('tasks', `/t/${task.id}`)}
      className="kh-card p-4 flex gap-4 hover:border-amber-dark/60 transition-colors">
      {task.thumbnail ? (
        <img src={task.thumbnail} alt="" className="w-20 h-20 rounded-xl object-cover flex-shrink-0 hidden sm:block" />
      ) : (
        <div className="w-20 h-20 rounded-xl flex-shrink-0 hidden sm:flex items-center justify-center bg-amber-light text-amber-dark">
          <CategoryIcon name={task.category?.icon} size={28} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-bold text-ink-900 leading-snug line-clamp-2">{task.title}</h3>
          <span className="text-base font-extrabold text-ink-900 whitespace-nowrap">{lkr(task.agreed_amount ?? task.budget)}</span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500">
          <span className="inline-flex items-center gap-1">
            {task.location_type === 'remote'
              ? <><Wifi size={13} /> {t('card.remote')}</>
              : <><MapPin size={13} /> {[task.city, task.district].filter(Boolean).join(', ')}</>}
          </span>
          <span className="inline-flex items-center gap-1">
            <Calendar size={13} /> {task.due_date ? `${t('card.due')} ${fmtDay(task.due_date)}` : t('card.flexible')}
          </span>
          <span className="inline-flex items-center gap-1"><MessageSquare size={13} /> {task.offers_count} {t('card.offers')}</span>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <StatusBadge status={task.status} />
            {task.category && <span className="text-xs text-ink-400 truncate">{task.category.name}</span>}
          </div>
          {task.poster && (
            <span className="flex items-center gap-1.5 text-xs text-ink-400 flex-shrink-0">
              <Avatar name={task.poster.name} url={task.poster.photo_url} size={20} />
              {timeAgo(task.created_at, locale)}
            </span>
          )}
        </div>
        {footer}
      </div>
    </Link>
  );
}
