'use client';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, SlidersHorizontal } from 'lucide-react';
import TaskCard from '../../../components/tasks/TaskCard';
import { EmptyState, ErrorState, PageLoader, fieldCls } from '../../../components/tasks/ui';
import { productPath } from '../../../lib/platform';
import { useTasksT } from '../../../lib/tasks/i18n';
import { DISTRICTS, type Category, type Paged, type TaskCard as TaskCardData } from '../../../lib/tasks/types';
import api from '../../../lib/api';

const p = (path: string) => productPath('tasks', path);
const FILTER_KEYS = ['q', 'category', 'district', 'remote', 'min', 'max', 'status', 'sort', 'page'] as const;

function BrowseContent() {
  const { t } = useTasksT();
  const router = useRouter();
  const params = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [data, setData] = useState<Paged<TaskCardData> | null>(null);
  const [error, setError] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [retry, setRetry] = useState(0);

  // Form state mirrors the URL; "Apply" writes it back so results are shareable/bookmarkable
  const initial = Object.fromEntries(FILTER_KEYS.map(k => [k, params.get(k) || ''])) as Record<(typeof FILTER_KEYS)[number], string>;
  const [form, setForm] = useState(initial);
  const queryString = params.toString();

  useEffect(() => {
    api.get<Category[]>('/tasks/categories').then(r => setCategories(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setForm(Object.fromEntries(FILTER_KEYS.map(k => [k, params.get(k) || ''])) as any);
    setData(null);
    setError(false);
    const query = Object.fromEntries(FILTER_KEYS.map(k => [k, params.get(k)]).filter(([, v]) => v));
    api.get<Paged<TaskCardData>>('/tasks', { params: query })
      .then(r => setData(r.data))
      .catch(() => setError(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString, retry]);

  const push = (values: Record<string, string>) => {
    const qs = new URLSearchParams(Object.entries(values).filter(([, v]) => v)).toString();
    router.push(p(`/browse${qs ? `?${qs}` : ''}`));
  };
  const apply = (e?: React.FormEvent) => { e?.preventDefault(); push({ ...form, page: '' }); setShowFilters(false); };
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(f => ({ ...f, [k]: e.target.value }));
  const page = data?.page || 1;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-ink-900">{t('browse.title')}</h1>
        <button onClick={() => setShowFilters(s => !s)} className="lg:hidden inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border border-ink-200 bg-white">
          <SlidersHorizontal size={15} /> {t('browse.filters')}
        </button>
      </div>

      <form onSubmit={apply} className="mt-4 relative">
        <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
        <input value={form.q} onChange={set('q')} placeholder={t('home.searchPlaceholder')}
          className="w-full pl-10 pr-24 py-3 rounded-xl border border-ink-200 bg-white text-sm focus:outline-none focus:border-amber-dark" />
        <button type="submit" className="absolute right-1.5 top-1/2 -translate-y-1/2 px-4 py-2 rounded-lg text-sm kh-btn-amber">{t('home.search')}</button>
      </form>

      <div className="mt-6 grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className={`${showFilters ? 'block' : 'hidden'} lg:block`}>
          <form onSubmit={apply} className="kh-card p-4 space-y-4 lg:sticky lg:top-20">
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-ink-600">{t('browse.category')}</span>
              <select value={form.category} onChange={set('category')} className={fieldCls}>
                <option value="">{t('browse.allCategories')}</option>
                {categories.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-ink-600">{t('browse.location')}</span>
              <select value={form.remote} onChange={set('remote')} className={fieldCls}>
                <option value="">{t('browse.any')}</option>
                <option value="false">{t('browse.inPerson')}</option>
                <option value="true">{t('browse.remote')}</option>
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-ink-600">{t('browse.district')}</span>
              <select value={form.district} onChange={set('district')} className={fieldCls}>
                <option value="">{t('browse.allDistricts')}</option>
                {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-ink-600">{t('browse.minBudget')}</span>
                <input type="number" min={0} value={form.min} onChange={set('min')} className={fieldCls} />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-ink-600">{t('browse.maxBudget')}</span>
                <input type="number" min={0} value={form.max} onChange={set('max')} className={fieldCls} />
              </label>
            </div>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-ink-600">{t('browse.status')}</span>
              <select value={form.status} onChange={set('status')} className={fieldCls}>
                <option value="">{t('status.open')}</option>
                <option value="assigned">{t('status.assigned')}</option>
                <option value="completed">{t('status.completed')}</option>
                <option value="closed">{t('status.closed')}</option>
                <option value="all">{t('status.all')}</option>
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-ink-600">{t('browse.sort')}</span>
              <select value={form.sort} onChange={set('sort')} className={fieldCls}>
                <option value="">{t('browse.sortNewest')}</option>
                <option value="budget_high">{t('browse.sortBudgetHigh')}</option>
                <option value="budget_low">{t('browse.sortBudgetLow')}</option>
                <option value="due_soon">{t('browse.sortDue')}</option>
              </select>
            </label>
            <div className="flex gap-2 pt-1">
              <button type="submit" className="flex-1 px-3 py-2 rounded-lg text-sm kh-btn-amber">{t('browse.apply')}</button>
              <button type="button" onClick={() => push({})} className="px-3 py-2 rounded-lg text-sm font-semibold border border-ink-200 text-ink-600 hover:bg-ink-50">
                {t('browse.clear')}
              </button>
            </div>
          </form>
        </aside>

        <section>
          {error ? (
            <ErrorState title={t('common.error')} text={t('common.errorDesc')}
              action={<button onClick={() => setRetry(r => r + 1)} className="px-4 py-2 rounded-xl text-sm kh-btn-amber">{t('common.retry')}</button>} />
          ) : !data ? (
            <PageLoader />
          ) : data.items.length === 0 ? (
            <EmptyState title={t('empty.browseTitle')} text={t('browse.empty')}
              action={<Link href={p('/post')} className="inline-flex px-4 py-2 rounded-xl text-sm kh-btn-amber">{t('nav.post')}</Link>} />
          ) : (
            <>
              <p className="mb-3 text-sm text-ink-500"><b className="text-ink-800">{data.total}</b> {t('browse.results')}</p>
              <div className="space-y-3">
                {data.items.map(task => <TaskCard key={task.id} task={task} />)}
              </div>
              {data.pages > 1 && (
                <div className="mt-6 flex items-center justify-center gap-3">
                  <button disabled={page <= 1} onClick={() => push({ ...initial, page: String(page - 1) })}
                    className="px-4 py-2 rounded-lg text-sm font-semibold border border-ink-200 bg-white disabled:opacity-40">{t('browse.prev')}</button>
                  <span className="text-sm text-ink-500">{page} / {data.pages}</span>
                  <button disabled={page >= data.pages} onClick={() => push({ ...initial, page: String(page + 1) })}
                    className="px-4 py-2 rounded-lg text-sm font-semibold border border-ink-200 bg-white disabled:opacity-40">{t('browse.next')}</button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

export default function BrowsePage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <BrowseContent />
    </Suspense>
  );
}
