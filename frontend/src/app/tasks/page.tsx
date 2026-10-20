'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search, ArrowRight, Briefcase, ListChecks, Users, MessageCircle, Lock, Star, Bell, Globe, Flag, PenLine,
  Inbox, UserCheck, CheckCircle2, Home, Store, Laptop, Hammer,
} from 'lucide-react';
import InteractiveMascot from '../../components/brand/InteractiveMascot';
import TaskCard from '../../components/tasks/TaskCard';
import { CategoryIcon, EmptyState } from '../../components/tasks/ui';
import { productPath } from '../../lib/platform';
import {
  LandingFeatures, LandingShowcase, LandingSteps, LandingAudiences, LandingFaq,
} from '../../components/platform/ProductLanding';
import { TasksMock, QaMock, ReviewMock } from '../../components/platform/ProductMocks';
import { useTasksT } from '../../lib/tasks/i18n';
import type { Category, Paged, TaskCard as TaskCardData } from '../../lib/tasks/types';
import api from '../../lib/api';

const p = (path: string) => productPath('tasks', path);

// tasks.kadehub.com/ — public landing for the marketplace
export default function TasksHomePage() {
  const { t } = useTasksT();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [latest, setLatest] = useState<TaskCardData[] | null>(null);

  useEffect(() => {
    api.get<Category[]>('/tasks/categories').then(r => setCategories(r.data)).catch(() => {});
    api.get<Paged<TaskCardData>>('/tasks', { params: { limit: 6 } }).then(r => setLatest(r.data.items)).catch(() => setLatest([]));
  }, []);

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(p(`/browse${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`));
  };

  return (
    <div>
      {/* Hero */}
      <section style={{ background: 'linear-gradient(180deg,#FFF8E1 0%,#F8FAFC 100%)' }}>
        <div className="max-w-6xl mx-auto px-4 py-12 sm:py-16 grid gap-8 md:grid-cols-[1.3fr_1fr] items-center">
          <div className="text-center md:text-left">
            <h1 className="text-3xl sm:text-5xl font-extrabold text-ink-900 leading-tight tracking-tight">{t('home.title')}</h1>
            <p className="mt-4 text-base sm:text-lg text-ink-500 max-w-xl mx-auto md:mx-0">{t('home.subtitle')}</p>
            <form onSubmit={search} className="mt-7 flex gap-2 max-w-xl mx-auto md:mx-0">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                <input value={q} onChange={e => setQ(e.target.value)} placeholder={t('home.searchPlaceholder')}
                  className="w-full pl-10 pr-3 py-3 rounded-xl border border-ink-200 bg-white text-sm focus:outline-none focus:border-amber-dark" />
              </div>
              <button type="submit" className="px-5 py-3 rounded-xl text-sm kh-btn-amber">{t('home.search')}</button>
            </form>
            <div className="mt-4 flex flex-wrap gap-3 justify-center md:justify-start">
              <Link href={p('/post')} className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm kh-btn-primary">
                {t('nav.post')} <ArrowRight size={15} />
              </Link>
              <Link href={p('/browse')} className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold border-2 border-ink-200 text-ink-700 hover:bg-white">
                <Briefcase size={15} /> {t('home.earnCta')}
              </Link>
            </div>
          </div>
          {/* Room above for the speech bubble so it never covers the buttons on phones */}
          <div className="flex justify-center pt-16 md:pt-0">
            <InteractiveMascot width="clamp(170px, 28vw, 240px)" priority className="kh-mascot-enter"
              label={t('mascot.label')} greeting={t('mascot.greeting')}
              messages={[t('mascot.tip1'), t('mascot.tip2'), t('mascot.tip3')]} />
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-6xl mx-auto px-4 py-10">
        <h2 className="text-xl font-extrabold text-ink-900">{t('home.categories')}</h2>
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {categories.map(c => (
            <Link key={c.id} href={p(`/browse?category=${c.slug}`)}
              className="kh-card px-3 py-4 flex flex-col items-center text-center gap-2 hover:border-amber-dark/60 transition-colors">
              <span className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-light text-amber-dark">
                <CategoryIcon name={c.icon} size={20} />
              </span>
              <span className="text-xs font-semibold text-ink-700 leading-tight">{c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Latest */}
      <section className="max-w-6xl mx-auto px-4 pb-10">
        <div className="flex items-end justify-between">
          <h2 className="text-xl font-extrabold text-ink-900">{t('home.latest')}</h2>
          <Link href={p('/browse')} className="text-sm font-semibold text-amber-dark hover:underline">{t('home.seeAll')} →</Link>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {latest === null
            ? [...Array(4)].map((_, i) => <div key={i} className="kh-card h-32 animate-pulse" />)
            : latest.map(task => <TaskCard key={task.id} task={task} />)}
        </div>
        {latest?.length === 0 && (
          <EmptyState title={t('empty.browseTitle')} text={t('browse.empty')}
            action={<Link href={p('/post')} className="inline-flex px-4 py-2 rounded-xl text-sm kh-btn-amber">{t('nav.post')}</Link>} />
        )}
      </section>

      {/* Landing sections: what Tasks offers, how it works, who it's for, FAQ */}
      <LandingFeatures slug="tasks" eyebrow={t('land.eyebrowFeatures')} title={t('land.featTitle')} subtitle={t('land.featSub')} items={[
        { icon: ListChecks,    title: t('land.f1t'), text: t('land.f1d') },
        { icon: Users,         title: t('land.f2t'), text: t('land.f2d') },
        { icon: MessageCircle, title: t('land.f3t'), text: t('land.f3d') },
        { icon: Lock,          title: t('land.f6t'), text: t('land.f6d') },
        { icon: Star,          title: t('land.f5t'), text: t('land.f5d') },
        { icon: MessageCircle, title: t('land.f4t'), text: t('land.f4d') },
        { icon: Bell,          title: t('land.f7t'), text: t('land.f7d') },
        { icon: Globe,         title: t('land.f8t'), text: t('land.f8d') },
        { icon: Flag,          title: t('land.f9t'), text: t('land.f9d') },
      ]} />

      <LandingShowcase slug="tasks" rows={[
        { eyebrow: t('land.s1e'), title: t('land.s1t'), text: t('land.s1d'), bullets: [t('land.s1b1'), t('land.s1b2'), t('land.s1b3')], visual: <TasksMock /> },
        { eyebrow: t('land.s2e'), title: t('land.s2t'), text: t('land.s2d'), bullets: [t('land.s2b1'), t('land.s2b2'), t('land.s2b3')], visual: <QaMock /> },
        { eyebrow: t('land.s3e'), title: t('land.s3t'), text: t('land.s3d'), bullets: [t('land.s3b1'), t('land.s3b2'), t('land.s3b3')], visual: <ReviewMock /> },
      ]} />

      <LandingSteps slug="tasks" eyebrow={t('land.eyebrowHow')} title={t('land.howTitle')} steps={[
        { icon: PenLine,      title: t('land.st1t'), text: t('land.st1d') },
        { icon: Inbox,        title: t('land.st2t'), text: t('land.st2d') },
        { icon: UserCheck,    title: t('land.st3t'), text: t('land.st3d') },
        { icon: CheckCircle2, title: t('land.st4t'), text: t('land.st4d') },
      ]} />

      <LandingAudiences slug="tasks" eyebrow={t('land.eyebrowFor')} title={t('land.forTitle')} items={[
        { icon: Home,   title: t('land.a1t'), text: t('land.a1d') },
        { icon: Store,  title: t('land.a2t'), text: t('land.a2d') },
        { icon: Laptop, title: t('land.a3t'), text: t('land.a3d') },
        { icon: Hammer, title: t('land.a4t'), text: t('land.a4d') },
      ]} />

      <LandingFaq slug="tasks" eyebrow={t('land.eyebrowFaq')} title={t('land.faqTitle')} items={[
        { q: t('land.q1'), a: t('land.a1') },
        { q: t('land.q2'), a: t('land.a2') },
        { q: t('land.q3'), a: t('land.a3') },
        { q: t('land.q4'), a: t('land.a4') },
        { q: t('land.q5'), a: t('land.a5') },
        { q: t('land.q6'), a: t('land.a6') },
      ]} />

      {/* Earn */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="rounded-3xl px-6 py-8 sm:px-10 flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left"
          style={{ background: 'linear-gradient(135deg,#B45309 0%,#F59E0B 100%)' }}>
          <div className="flex-1">
            <h2 className="text-xl sm:text-2xl font-extrabold text-white">{t('home.earn')}</h2>
            <p className="mt-1 text-sm text-white/80">{t('home.earnd')}</p>
          </div>
          <Link href={p('/browse')} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold bg-white text-amber-dark hover:bg-amber-light">
            {t('home.earnCta')} <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
