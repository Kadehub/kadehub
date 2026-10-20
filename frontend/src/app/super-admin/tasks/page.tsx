'use client';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Eye, EyeOff, XCircle, CheckCircle2, Plus, Trash2, ExternalLink, Search } from 'lucide-react';
import api from '../../../lib/api';
import { productUrl } from '../../../lib/platform';
import { lkr, apiError } from '../../../lib/tasks/format';
import type { Category, Paged, TaskCard } from '../../../lib/tasks/types';

type Tab = 'tasks' | 'reports' | 'categories';

interface Stats {
  tasks: Record<string, number>;
  total_tasks: number;
  hidden_tasks: number;
  offers: number;
  taskers: number;
  open_reports: number;
  closed_value: number;
}

interface Report {
  id: number; reason: string; details: string | null; status: string; created_at: string;
  reporter: { id: number; name: string } | null;
  task: { id: number; title: string; hidden: boolean; status: string } | null;
  reported_user: { id: number; name: string } | null;
}

const STATUS_CLS: Record<string, string> = {
  open: 'kh-badge-teal', assigned: 'kh-badge-blue', completed: 'kh-badge-amber', closed: 'kh-badge-gray', cancelled: 'kh-badge-red',
};

/** Moderation for KadeHub Tasks (the marketplace at tasks.kadehub.com). */
export default function SuperAdminTasksPage() {
  const [tab, setTab] = useState<Tab>('tasks');
  const [stats, setStats] = useState<Stats | null>(null);
  const [tasks, setTasks] = useState<Paged<TaskCard> | null>(null);
  const [filters, setFilters] = useState({ q: '', status: '', hidden: '', page: 1 });
  const [reports, setReports] = useState<Report[] | null>(null);
  const [reportStatus, setReportStatus] = useState('open');
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [newCat, setNewCat] = useState({ name: '', icon: '' });

  const loadStats = useCallback(() => api.get<Stats>('/tasks/admin/stats').then(r => setStats(r.data)).catch(() => {}), []);
  const loadTasks = useCallback(() => {
    api.get<Paged<TaskCard>>('/tasks/admin/tasks', {
      params: { q: filters.q || undefined, status: filters.status || undefined, hidden: filters.hidden || undefined, page: filters.page },
    }).then(r => setTasks(r.data)).catch(err => toast.error(apiError(err)));
  }, [filters]);
  const loadReports = useCallback(() => {
    api.get<Report[]>('/tasks/admin/reports', { params: { status: reportStatus || undefined } })
      .then(r => setReports(r.data)).catch(err => toast.error(apiError(err)));
  }, [reportStatus]);
  const loadCategories = useCallback(() => {
    api.get<Category[]>('/tasks/admin/categories').then(r => setCategories(r.data)).catch(err => toast.error(apiError(err)));
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { if (tab === 'tasks') loadTasks(); }, [tab, loadTasks]);
  useEffect(() => { if (tab === 'reports') loadReports(); }, [tab, loadReports]);
  useEffect(() => { if (tab === 'categories') loadCategories(); }, [tab, loadCategories]);

  async function run(fn: () => Promise<any>, done: string, reload: () => void) {
    try {
      await fn();
      toast.success(done);
      reload();
      loadStats();
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  const statCards = stats ? [
    { label: 'Open tasks', value: stats.tasks.open || 0 },
    { label: 'In progress', value: (stats.tasks.assigned || 0) + (stats.tasks.completed || 0) },
    { label: 'Closed', value: stats.tasks.closed || 0 },
    { label: 'Offers', value: stats.offers },
    { label: 'Taskers', value: stats.taskers },
    { label: 'Open reports', value: stats.open_reports },
    { label: 'Value of closed tasks', value: lkr(stats.closed_value) },
  ] : [];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink-900">Marketplace</h1>
          <p className="text-sm text-ink-500">KadeHub Tasks moderation</p>
        </div>
        <a href={productUrl('tasks', '/')} target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border border-ink-200 bg-white hover:bg-ink-50">
          Open Tasks <ExternalLink size={14} />
        </a>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {stats === null
          ? [...Array(7)].map((_, i) => <div key={i} className="kh-card h-20 animate-pulse" />)
          : statCards.map(s => (
            <div key={s.label} className="kh-card p-4">
              <p className="text-2xs font-semibold uppercase tracking-wide text-ink-400">{s.label}</p>
              <p className="mt-1 text-lg font-extrabold text-ink-900">{s.value}</p>
            </div>
          ))}
      </div>

      <div className="flex gap-1 p-1 rounded-xl bg-ink-100 w-fit">
        {(['tasks', 'reports', 'categories'] as Tab[]).map(k => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize ${tab === k ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500'}`}>
            {k}{k === 'reports' && stats?.open_reports ? ` (${stats.open_reports})` : ''}
          </button>
        ))}
      </div>

      {tab === 'tasks' && (
        <div className="kh-card overflow-hidden">
          <form className="p-3 flex flex-wrap gap-2 border-b border-ink-100"
            onSubmit={e => { e.preventDefault(); setFilters(f => ({ ...f, page: 1 })); loadTasks(); }}>
            <div className="relative flex-1 min-w-[200px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input value={filters.q} onChange={e => setFilters(f => ({ ...f, q: e.target.value }))} placeholder="Search title"
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-ink-200 text-sm" />
            </div>
            <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value, page: 1 }))} className="px-3 py-2 rounded-lg border border-ink-200 text-sm">
              <option value="">All statuses</option>
              {['open', 'assigned', 'completed', 'closed', 'cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={filters.hidden} onChange={e => setFilters(f => ({ ...f, hidden: e.target.value, page: 1 }))} className="px-3 py-2 rounded-lg border border-ink-200 text-sm">
              <option value="">Visible + hidden</option>
              <option value="true">Hidden only</option>
            </select>
          </form>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-400">
                <tr>
                  <th className="px-4 py-2.5">Task</th>
                  <th className="px-4 py-2.5">Poster</th>
                  <th className="px-4 py-2.5">Budget</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Offers</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {!tasks ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-ink-400">Loading…</td></tr>
                ) : tasks.items.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-ink-400">No tasks</td></tr>
                ) : tasks.items.map(task => (
                  <tr key={task.id} className={task.hidden ? 'bg-red-50/40' : ''}>
                    <td className="px-4 py-3 max-w-xs">
                      <a href={productUrl('tasks', `/t/${task.id}`)} target="_blank" rel="noreferrer" className="font-semibold text-ink-800 hover:underline line-clamp-1">{task.title}</a>
                      <p className="text-xs text-ink-400">#{task.id} · {task.category?.name} · {new Date(task.created_at).toLocaleDateString('en-LK')}</p>
                    </td>
                    <td className="px-4 py-3 text-ink-600">{task.poster?.name}</td>
                    <td className="px-4 py-3 font-semibold">{lkr(task.agreed_amount ?? task.budget)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-2xs font-bold uppercase px-2 py-0.5 rounded-full ${STATUS_CLS[task.status]}`}>{task.status}</span>
                      {task.hidden && <span className="ml-1 text-2xs font-bold uppercase px-2 py-0.5 rounded-full kh-badge-red">hidden</span>}
                    </td>
                    <td className="px-4 py-3 text-ink-600">{task.offers_count}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button title={task.hidden ? 'Unhide' : 'Hide'} className="p-2 rounded-lg hover:bg-ink-100 text-ink-500"
                          onClick={() => run(() => api.post(`/tasks/admin/tasks/${task.id}/hidden`, { hidden: !task.hidden }), task.hidden ? 'Task visible again' : 'Task hidden', loadTasks)}>
                          {task.hidden ? <Eye size={16} /> : <EyeOff size={16} />}
                        </button>
                        {['open', 'assigned'].includes(task.status) && (
                          <button title="Cancel task" className="p-2 rounded-lg hover:bg-red-50 text-coral"
                            onClick={() => confirm(`Cancel "${task.title}"? The poster and taskers will be notified.`) &&
                              run(() => api.post(`/tasks/admin/tasks/${task.id}/cancel`), 'Task cancelled', loadTasks)}>
                            <XCircle size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {tasks && tasks.pages > 1 && (
            <div className="p-3 flex items-center justify-end gap-2 border-t border-ink-100 text-sm">
              <button disabled={tasks.page <= 1} onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))} className="px-3 py-1.5 rounded-lg border border-ink-200 disabled:opacity-40">Prev</button>
              <span className="text-ink-500">{tasks.page} / {tasks.pages}</span>
              <button disabled={tasks.page >= tasks.pages} onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))} className="px-3 py-1.5 rounded-lg border border-ink-200 disabled:opacity-40">Next</button>
            </div>
          )}
        </div>
      )}

      {tab === 'reports' && (
        <div className="kh-card overflow-hidden">
          <div className="p-3 border-b border-ink-100">
            <select value={reportStatus} onChange={e => setReportStatus(e.target.value)} className="px-3 py-2 rounded-lg border border-ink-200 text-sm">
              <option value="open">Open</option>
              <option value="resolved">Resolved</option>
              <option value="">All</option>
            </select>
          </div>
          <div className="divide-y divide-ink-100">
            {!reports ? (
              <p className="px-4 py-8 text-center text-sm text-ink-400">Loading…</p>
            ) : reports.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-ink-400">No reports</p>
            ) : reports.map(r => (
              <div key={r.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink-800">
                    <span className="kh-badge-red text-2xs font-bold uppercase px-2 py-0.5 rounded-full mr-2">{r.reason.replace(/_/g, ' ')}</span>
                    {r.task ? <a href={productUrl('tasks', `/t/${r.task.id}`)} target="_blank" rel="noreferrer" className="hover:underline">{r.task.title}</a> : r.reported_user?.name}
                  </p>
                  {r.details && <p className="mt-1 text-sm text-ink-600">{r.details}</p>}
                  <p className="mt-1 text-xs text-ink-400">by {r.reporter?.name} · {new Date(r.created_at).toLocaleString('en-LK')}{r.task?.hidden ? ' · task hidden' : ''}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {r.task && !r.task.hidden && (
                    <button className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-ink-200 hover:bg-ink-50"
                      onClick={() => run(() => api.post(`/tasks/admin/tasks/${r.task!.id}/hidden`, { hidden: true }), 'Task hidden', loadReports)}>
                      <EyeOff size={13} /> Hide task
                    </button>
                  )}
                  {r.status === 'open' && (
                    <button className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold kh-btn-primary"
                      onClick={() => run(() => api.post(`/tasks/admin/reports/${r.id}/resolve`), 'Report resolved', loadReports)}>
                      <CheckCircle2 size={13} /> Resolve
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'categories' && (
        <div className="kh-card overflow-hidden">
          <form className="p-3 flex flex-wrap gap-2 border-b border-ink-100" onSubmit={e => {
            e.preventDefault();
            if (newCat.name.trim().length < 2) return;
            run(() => api.post('/tasks/admin/categories', { name: newCat.name.trim(), icon: newCat.icon.trim() || undefined, sort_order: categories?.length ?? 0 }),
              'Category added', () => { setNewCat({ name: '', icon: '' }); loadCategories(); });
          }}>
            <input value={newCat.name} onChange={e => setNewCat(c => ({ ...c, name: e.target.value }))} placeholder="New category name"
              className="flex-1 min-w-[180px] px-3 py-2 rounded-lg border border-ink-200 text-sm" />
            <input value={newCat.icon} onChange={e => setNewCat(c => ({ ...c, icon: e.target.value }))} placeholder="Lucide icon (optional)"
              className="w-48 px-3 py-2 rounded-lg border border-ink-200 text-sm" />
            <button type="submit" className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm kh-btn-primary"><Plus size={15} /> Add</button>
          </form>
          <div className="divide-y divide-ink-100">
            {!categories ? (
              <p className="px-4 py-8 text-center text-sm text-ink-400">Loading…</p>
            ) : categories.map(c => (
              <div key={c.id} className="px-4 py-2.5 flex items-center gap-3">
                <input defaultValue={c.name} className="flex-1 px-2 py-1.5 rounded-md border border-transparent hover:border-ink-200 focus:border-ink-300 text-sm"
                  onBlur={e => e.target.value.trim() && e.target.value.trim() !== c.name &&
                    run(() => api.patch(`/tasks/admin/categories/${c.id}`, { name: e.target.value.trim(), slug: c.slug }), 'Category renamed', loadCategories)} />
                <span className="text-xs text-ink-400 w-32 truncate">{c.slug}</span>
                <label className="flex items-center gap-1.5 text-xs text-ink-600">
                  <input type="checkbox" checked={!!c.is_active}
                    onChange={e => run(() => api.patch(`/tasks/admin/categories/${c.id}`, { name: c.name, slug: c.slug, is_active: e.target.checked }), 'Saved', loadCategories)} />
                  Active
                </label>
                <button title="Delete" className="p-2 rounded-lg hover:bg-red-50 text-coral"
                  onClick={() => confirm(`Delete "${c.name}"? Categories in use are deactivated instead.`) &&
                    run(() => api.delete(`/tasks/admin/categories/${c.id}`), 'Category removed', loadCategories)}>
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
