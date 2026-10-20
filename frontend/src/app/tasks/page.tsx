'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, ArrowRight, PenLine, MessageSquare, CheckCircle2, Briefcase } from 'lucide-react';
import Mascot from '../../components/brand/Mascot';
import TaskCard from '../../components/tasks/TaskCard';
import { CategoryIcon, EmptyState } from '../../components/tasks/ui';
import { productPath } from '../../lib/platform';
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

  const steps = [
    { icon: PenLine, title: t('home.step1'), desc: t('home.step1d') },
    { icon: MessageSquare, title: t('home.step2'), desc: t('home.step2d') },
    { icon: CheckCircle2, title: t('home.step3'), desc: t('home.step3d') },
  ];

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
          <div className="flex justify-center">
            <Mascot size="xl" animation="enter" priority className="hidden sm:block" />
            <Mascot size="lg" animation="enter" priority className="sm:hidden" />
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

      {/* How it works */}
      <section className="bg-white border-y border-ink-100">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <h2 className="text-xl sm:text-2xl font-extrabold text-ink-900 text-center">{t('home.how')}</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            {steps.map(({ icon: Icon, title, desc }, i) => (
              <div key={title} className="rounded-2xl border border-ink-100 p-5">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-light text-amber-dark"><Icon size={19} /></span>
                  <span className="text-xs font-bold text-ink-400">0{i + 1}</span>
                </div>
                <h3 className="mt-4 font-bold text-ink-900">{title}</h3>
                <p className="mt-1 text-sm text-ink-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

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
