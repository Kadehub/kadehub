'use client';
import api from '../../lib/api';

/** Text input styling shared by the super admin pages. */
export const inputCls = 'w-full border border-ink-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-600/40';

export function errMsg(err: any, fallback: string): string {
  const m = err?.response?.data?.message;
  return Array.isArray(m) ? m[0] : m || fallback;
}

/** Downloads a CSV endpoint (sent with the admin's token) as a file. */
export async function downloadCsv(path: string, params: Record<string, unknown>, name: string) {
  const res = await api.get(path, { params, responseType: 'blob' });
  const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  URL.revokeObjectURL(url);
}

export function Pager({ page, total, limit, onPage }: { page: number; total: number; limit: number; onPage: (p: number) => void }) {
  if (total <= limit) return null;
  return (
    <div className="px-5 py-3.5 border-t border-ink-100 flex flex-wrap items-center justify-between gap-2 text-sm text-ink-500">
      <span>Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total.toLocaleString()}</span>
      <div className="flex gap-2">
        <button disabled={page === 1} onClick={() => onPage(page - 1)}
          className="px-3 py-1.5 border border-ink-200 rounded-lg disabled:opacity-40 hover:bg-ink-50 text-xs font-semibold">← Prev</button>
        <button disabled={page * limit >= total} onClick={() => onPage(page + 1)}
          className="px-3 py-1.5 border border-ink-200 rounded-lg disabled:opacity-40 hover:bg-ink-50 text-xs font-semibold">Next →</button>
      </div>
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="kh-card p-4">
      <p className="text-xs font-semibold text-ink-400 uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-xl font-bold text-ink-900 [overflow-wrap:anywhere]">{value}</p>
      {hint && <p className="text-xs text-ink-400 mt-0.5">{hint}</p>}
    </div>
  );
}

export const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString() : '—');
export const fmtLKR = (n: number) => `LKR ${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
export const titleCase = (s?: string | null) => (s ? s.replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '—');
