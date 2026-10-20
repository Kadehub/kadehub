'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { MapPin, BadgeCheck, Briefcase, ClipboardList } from 'lucide-react';
import { Avatar, EmptyState, ErrorState, PageLoader, RatingLine, Stars } from '../../../../components/tasks/ui';
import { productPath } from '../../../../lib/platform';
import { useTasksT } from '../../../../lib/tasks/i18n';
import { timeAgo } from '../../../../lib/tasks/format';
import type { PublicProfile } from '../../../../lib/tasks/types';
import api from '../../../../lib/api';

const p = (path: string) => productPath('tasks', path);

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { t, locale } = useTasksT();
  const [data, setData] = useState<PublicProfile | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api.get<PublicProfile>(`/tasks/users/${id}`).then(r => setData(r.data)).catch(() => setFailed(true));
  }, [id]);

  if (failed) {
    return (
      <div className="max-w-xl mx-auto px-4 py-10">
        <ErrorState title={t('common.error')} text={t('common.notFoundDesc')}
          action={<Link href={p('/browse')} className="px-4 py-2 rounded-xl text-sm kh-btn-amber">{t('common.backToBrowse')}</Link>} />
      </div>
    );
  }
  if (!data) return <PageLoader />;

  const { user, profile, reviews } = data;
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 grid gap-6 md:grid-cols-[300px_1fr]">
      <aside className="kh-card p-6 h-fit text-center">
        <div className="flex justify-center"><Avatar name={user.name} url={user.photo_url} size={88} /></div>
        <h1 className="mt-3 text-xl font-extrabold text-ink-900">{user.name}</h1>
        {profile.headline && <p className="mt-1 text-sm text-ink-500">{profile.headline}</p>}
        <div className="mt-3 flex justify-center"><RatingLine avg={profile.rating_avg} count={profile.rating_count} /></div>
        <div className="mt-4 space-y-2 text-sm text-ink-600 text-left">
          {profile.district && <p className="flex items-center gap-2"><MapPin size={15} className="text-ink-400" /> {profile.district}</p>}
          <p className="flex items-center gap-2"><Briefcase size={15} className="text-ink-400" /> {profile.completed_count} {t('user.completed')}</p>
          <p className="flex items-center gap-2"><ClipboardList size={15} className="text-ink-400" /> {data.tasks_posted} {t('user.tasksPosted')}</p>
          {profile.phone_verified && <p className="flex items-center gap-2 text-teal-dark"><BadgeCheck size={15} /> {t('user.verifiedPhone')}</p>}
          <p className="text-xs text-ink-400 pt-1">{t('user.memberSince')} {new Date(user.member_since).toLocaleDateString('en-LK', { month: 'long', year: 'numeric' })}</p>
        </div>
      </aside>

      <section className="space-y-6 min-w-0">
        {profile.bio && (
          <div className="kh-card p-5">
            <p className="text-sm text-ink-700 whitespace-pre-line">{profile.bio}</p>
          </div>
        )}
        {profile.skills.length > 0 && (
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide text-ink-400">{t('user.skills')}</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {profile.skills.map(s => <span key={s} className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-light text-amber-dark">{s}</span>)}
            </div>
          </div>
        )}
        <div>
          <h2 className="text-lg font-extrabold text-ink-900">{t('user.reviews')} <span className="text-ink-400 font-semibold">({reviews.length})</span></h2>
          <div className="mt-3 space-y-3">
            {reviews.length === 0 ? (
              <EmptyState size="xs" pose="love" title={t('empty.reviewsTitle')} text={t('user.noReviews')} />
            ) : reviews.map(r => (
              <div key={r.id} className="kh-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar name={r.reviewer.name} url={r.reviewer.photo_url} size={32} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink-800 truncate">{r.reviewer.name}</p>
                      <p className="text-xs text-ink-400">{r.role === 'tasker' ? t('user.asTasker') : t('user.asPoster')} · {timeAgo(r.created_at, locale)}</p>
                    </div>
                  </div>
                  <Stars value={r.rating} />
                </div>
                {r.comment && <p className="mt-2 text-sm text-ink-700 whitespace-pre-line">{r.comment}</p>}
                {r.task && <Link href={p(`/t/${r.task.id}`)} className="mt-2 inline-block text-xs text-amber-dark hover:underline">{r.task.title}</Link>}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
