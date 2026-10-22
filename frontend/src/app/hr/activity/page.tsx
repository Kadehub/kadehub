'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '../../../lib/api';
import { hasKey, useHrT, type HrT } from '../../../lib/hr/i18n';
import { formatDate, formatLKR, formatPeriod, localTime } from '../../../lib/hr/format';
import type { ActivityItem } from '../../../lib/hr/types';
import { useHr } from '../../../components/hr/HrContext';
import { Button, EmptyState, LoadError, Loading, PageHeader } from '../../../components/hr/ui';
import { OwnerOnly } from '../../../components/hr/people/bits';

const PAGE_SIZE = 50;

/** One readable line per logged action; unknown actions fall back to their raw name. */
function describe(item: ActivityItem, t: HrT): string {
  const key = `act.${item.action}`;
  if (!hasKey(key)) return item.action;
  const d = (item.details ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (v === null || v === undefined ? '' : String(v));
  const date = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) ? formatDate(v) : str(v));
  const pay = (v: unknown) => {
    const p = v as { base_salary?: number; fixed_allowance?: number } | undefined;
    if (!p) return '';
    return formatLKR(p.base_salary ?? 0, { decimals: false }) + (p.fixed_allowance ? ` + ${formatLKR(p.fixed_allowance, { decimals: false })}` : '');
  };
  const salary = item.action === 'employee.salary';
  return t(key, {
    name: str(d.name),
    date: date(d.date),
    from: salary ? pay(d.from) : date(d.from),
    to: salary ? pay(d.to) : str(d.to),
    amount: typeof d.amount === 'number' ? formatLKR(d.amount) : str(d.amount),
    period: typeof d.period === 'string' && /^\d{4}-\d{2}$/.test(d.period) ? formatPeriod(d.period) : str(d.period),
    title: str(d.title),
    job: str(d.job),
    overall: str(d.overall),
    reason: str(d.reason),
    asset: str(d.asset),
  });
}

// staff.kadehub.com/activity — owner only
export default function ActivityPage() {
  const { t } = useHrT();
  const { owner } = useHr();
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ total: number; items: ActivityItem[] } | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setFailed(false);
    try { setData((await api.get('/hr/activity', { params: { page } })).data); } catch { setFailed(true); }
  }, [page]);
  useEffect(() => { if (owner) load(); }, [owner, load]);

  if (!owner) return <OwnerOnly title={t('set.ownerOnlyTitle')} body={t('set.ownerOnlyBody')} />;
  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="space-y-5">
      <PageHeader title={t('act.title')} subtitle={t('act.subtitle')} />
      {failed ? <LoadError onRetry={load} /> : !data ? <Loading /> : data.items.length === 0 ? <EmptyState title={t('act.empty')} scene="relax" /> : (
        <>
          <ul className="kh-card divide-y divide-ink-100">
            {data.items.map(item => (
              <li key={item.id} className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <span className="text-sm text-ink-800">{describe(item, t)}</span>
                <span className="shrink-0 text-xs text-ink-400">
                  {item.user_name && `${item.user_name} · `}{formatDate(new Date(new Date(item.created_at).getTime() + 5.5 * 3_600_000).toISOString().slice(0, 10))} {localTime(item.created_at)}
                </span>
              </li>
            ))}
          </ul>
          {pages > 1 && (
            <div className="flex items-center justify-between gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>{t('common.previous')}</Button>
              <span className="text-sm text-ink-500">{t('act.page', { page, pages })}</span>
              <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>{t('common.following')}</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
