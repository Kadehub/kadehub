'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { MascotState } from '../../../components/brand/Mascot';
import { codHref } from '../../../components/cod/bits';
import { BucketBadge, RemindButton } from '../../../components/cod/credit-bits';
import { Button, Kpi, PageHeader, SearchInput, cn, tbl } from '../../../components/cod/ui';
import api from '../../../lib/api';
import { useT } from '../../../lib/cod/i18n/client';
import { formatDate, formatLKR } from '../../../lib/cod/format';
import type { CreditCustomer } from '../../../lib/cod/types';

type Overview = { customers: CreditCustomer[]; totals: { billed: number; collected: number; outstanding: number; overdue: number; due_soon: number } };
type Filter = 'open' | 'overdue' | 'due' | 'upcoming' | 'settled' | 'all';
const FILTERS: Filter[] = ['open', 'overdue', 'due', 'upcoming', 'settled', 'all'];

// cod.kadehub.com/credit — who owes what: per-customer balances (grouped by phone), due buckets and WhatsApp reminders
export default function CodCreditPage() {
  const t = useT();
  const [data, setData] = useState<Overview | null>(null);
  const [failed, setFailed] = useState(false);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('open');

  const load = () => {
    setFailed(false);
    api.get<Overview>('/cod/credit').then(r => setData(r.data)).catch(() => setFailed(true));
  };
  useEffect(load, []);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const digits = needle.replace(/\D/g, '');
    return (data?.customers ?? []).filter(c => {
      if (filter === 'open' && c.outstanding <= 0) return false;
      if (filter === 'settled' && c.outstanding > 0) return false;
      if ((filter === 'overdue' || filter === 'due' || filter === 'upcoming') && !(c.outstanding > 0 && bucketMatches(c, filter))) return false;
      if (!needle) return true;
      return c.name.toLowerCase().includes(needle) || (digits.length >= 3 && c.phone.replace(/\D/g, '').includes(digits));
    });
  }, [data, q, filter]);

  if (failed) return <MascotState variant="error" title={t('app.loadErrorTitle')} description={t('app.loadErrorBody')} action={<Button onClick={load}>{t('common.retry')}</Button>} />;
  if (!data) return <MascotState variant="loading" size="sm" title={t('app.loading')} />;

  const tt = data.totals;
  return (
    <div className="space-y-4">
      <PageHeader title={t('nav.credit')} subtitle={t('credit.subtitle')} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label={t('credit.outstanding')} value={formatLKR(tt.outstanding)} />
        <Kpi label={t('credit.bucket.overdue')} value={formatLKR(tt.overdue)} tone={tt.overdue > 0 ? 'danger' : undefined} />
        <Kpi label={t('credit.dueSoon')} value={formatLKR(tt.due_soon)} />
        <Kpi label={t('credit.collected')} value={formatLKR(tt.collected)} hint={t('credit.ofBilled', { value: formatLKR(tt.billed) })} />
      </div>

      {data.customers.length === 0 ? (
        <MascotState variant="empty" title={t('credit.emptyTitle')} description={t('credit.empty')} />
      ) : (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <SearchInput value={q} onChange={setQ} placeholder={t('credit.search')} />
          </div>
          <div role="group" aria-label={t('credit.filter')} className="flex gap-1.5 overflow-x-auto">
            {FILTERS.map(f => (
              <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}
                className={cn('min-h-[36px] shrink-0 rounded-full border px-3 text-xs font-semibold',
                  filter === f ? 'border-[color:var(--cod-primary)] bg-[color:var(--cod-primary)] text-[color:var(--cod-primary-fg)]' : 'border-ink-200 bg-white text-ink-600 hover:bg-ink-50')}>
                {t(`credit.filter.${f}`)}
              </button>
            ))}
          </div>

          {list.length === 0 ? (
            <p className="rounded-xl border border-dashed border-ink-300 p-8 text-center text-sm text-ink-500">{t('credit.noMatch')}</p>
          ) : (
            <>
              <ul className="space-y-2 md:hidden">
                {list.map(c => (
                  <li key={c.key} className="flex items-stretch rounded-xl border border-ink-200 bg-white">
                    <Link href={codHref(`/credit/${encodeURIComponent(c.key)}`)} className="min-w-0 flex-1 px-3 py-2.5">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-ink-900">{c.name}</span>
                        <span className={cn('shrink-0 text-sm font-bold', c.outstanding > 0 ? 'text-red-600' : 'text-emerald-700')}>{formatLKR(c.outstanding)}</span>
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-1.5 text-2xs text-ink-500">
                        <span>{c.phone || '—'}</span>
                        <span>· {t('credit.invoicesCount', { count: c.open_invoices, total: c.invoices })}</span>
                        <BucketBadge bucket={c.outstanding > 0 ? c.bucket : 'none'} settled={c.outstanding <= 0} />
                        {c.next_due && <span>· {t('credit.nextDue', { date: formatDate(c.next_due, t.locale) })}</span>}
                      </span>
                    </Link>
                    {c.phone && <RemindButton compact name={c.name} phone={c.phone} invoices={c.open} />}
                  </li>
                ))}
              </ul>

              <div className={cn(tbl.wrap, 'hidden md:block')}>
                <table className={tbl.table}>
                  <thead><tr>
                    <th className={tbl.th}>{t('common.customer')}</th>
                    <th className={tbl.th}>{t('common.phone')}</th>
                    <th className={`${tbl.th} ${tbl.right}`}>{t('credit.billed')}</th>
                    <th className={`${tbl.th} ${tbl.right}`}>{t('credit.collected')}</th>
                    <th className={`${tbl.th} ${tbl.right}`}>{t('credit.outstanding')}</th>
                    <th className={`${tbl.th} ${tbl.right}`}>{t('credit.bucket.overdue')}</th>
                    <th className={tbl.th}>{t('credit.nextDueCol')}</th>
                    <th className={tbl.th} />
                  </tr></thead>
                  <tbody>
                    {list.map(c => (
                      <tr key={c.key}>
                        <td className={tbl.td}>
                          <Link href={codHref(`/credit/${encodeURIComponent(c.key)}`)} className="font-semibold text-[color:var(--cod-primary)] hover:underline">{c.name}</Link>
                          <span className="ml-2 text-xs text-ink-400">{t('credit.invoicesCount', { count: c.open_invoices, total: c.invoices })}</span>
                        </td>
                        <td className={`${tbl.td} text-ink-500`}>{c.phone || '—'}</td>
                        <td className={`${tbl.td} ${tbl.right}`}>{formatLKR(c.billed)}</td>
                        <td className={`${tbl.td} ${tbl.right}`}>{formatLKR(c.collected)}</td>
                        <td className={`${tbl.td} ${tbl.right} font-semibold`}>{formatLKR(c.outstanding)}</td>
                        <td className={`${tbl.td} ${tbl.right} ${c.overdue > 0 ? 'text-red-600' : ''}`}>{formatLKR(c.overdue)}</td>
                        <td className={tbl.td}>
                          <span className="flex items-center gap-1.5">
                            <BucketBadge bucket={c.outstanding > 0 ? c.bucket : 'none'} settled={c.outstanding <= 0} />
                            {c.next_due && <span className="text-xs text-ink-500">{formatDate(c.next_due, t.locale)}</span>}
                          </span>
                        </td>
                        <td className={tbl.td}>{c.phone && <RemindButton name={c.name} phone={c.phone} invoices={c.open} />}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function bucketMatches(c: CreditCustomer, f: 'overdue' | 'due' | 'upcoming') {
  if (f === 'overdue') return c.overdue > 0;
  return c.bucket === f;
}
