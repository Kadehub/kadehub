'use client';

import { useCallback, useEffect, useState } from 'react';
import { useHr } from '../../../components/hr/HrContext';
import { EmptyState, ExportButton, Loading, LoadError, MonthPicker, PageHeader, Tabs, cn, tbl } from '../../../components/hr/ui';
import api from '../../../lib/api';
import { hasKey, useHrT, type HrKey } from '../../../lib/hr/i18n';
import { formatLKR, formatNumber, thisPeriod } from '../../../lib/hr/format';
import type { ReportData, ReportKey } from '../../../lib/hr/types';

const ALL: ReportKey[] = ['payroll', 'attendance', 'leave', 'roster', 'hiring', 'assets'];
/** Reports that are not about one month. */
const TIMELESS: ReportKey[] = ['hiring', 'assets'];
/** Text columns; everything else is a number and aligns right. */
const TEXT_COLUMNS = new Set(['emp_code', 'name', 'status', 'title', 'code', 'category', 'holder', 'holder_status', 'issued_date']);

// staff.kadehub.com/reports — monthly figures, ready for Excel
export default function ReportsPage() {
  const { t } = useHrT();
  const { owner, branch } = useHr();
  const reports = ALL.filter(k => k !== 'payroll' || owner);
  const [key, setKey] = useState<ReportKey>(reports[0]);
  const [period, setPeriod] = useState(thisPeriod());
  const [data, setData] = useState<ReportData | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    setData(null);
    api.get<ReportData>(`/hr/reports/${key}`, { params: { period, ...(branch ? { branch_id: branch } : {}) } })
      .then(r => setData(r.data))
      .catch(() => setFailed(true));
  }, [key, period, branch]);
  useEffect(() => { load(); }, [load]);

  const header = (col: string) => data?.labels?.[col] ?? (hasKey(`rep.col.${col}`) ? t(`rep.col.${col}` as HrKey) : col);
  /** Status and category codes become words; money gets LKR; other numbers are tidied. */
  const cell = (col: string, v: string | number | undefined, forExport = false) => {
    if (v === undefined || v === null || v === '') return forExport ? '' : '—';
    if (data?.money.includes(col)) return forExport ? Number(v).toFixed(2) : formatLKR(Number(v));
    if (typeof v === 'string' && hasKey(`rep.val.${v}`)) return t(`rep.val.${v}` as HrKey);
    if (typeof v === 'number') return forExport ? v : formatNumber(v);
    return v;
  };
  const totals = data ? Object.entries(data.totals) : [];

  return (
    <div className="space-y-5">
      <PageHeader title={t('rep.title')} subtitle={t('rep.subtitle')}
        actions={data && (
          <ExportButton filename={`${key}-${TIMELESS.includes(key) ? 'all' : period}`} header={data.columns.map(header)}
            rows={data.rows.map(r => data.columns.map(c => cell(c, r[c], true) as string | number))} />
        )} />
      <Tabs<ReportKey> value={key} onChange={setKey} items={reports.map(k => ({ value: k, label: t(`rep.tab.${k}` as HrKey) }))} />
      {!TIMELESS.includes(key) && <MonthPicker value={period} onChange={setPeriod} max={thisPeriod()} />}

      {failed ? <LoadError onRetry={load} /> : !data ? <Loading /> : !data.rows.length ? (
        <EmptyState title={TIMELESS.includes(key) ? t('rep.emptyAll') : t('rep.empty')} />
      ) : (
        <>
          {totals.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {totals.map(([k, v]) => (
                <div key={k} className="kh-card px-4 py-2.5">
                  <p className="text-2xs text-ink-500">{header(k)}</p>
                  <p className="text-sm font-bold tabular-nums text-ink-900">{data.money.includes(k) ? formatLKR(v) : formatNumber(v)}</p>
                </div>
              ))}
            </div>
          )}
          <div className={tbl.wrap}>
            <table className={tbl.table}>
              <thead>
                <tr>{data.columns.map(c => <th key={c} className={cn(tbl.th, !TEXT_COLUMNS.has(c) && tbl.right)}>{header(c)}</th>)}</tr>
              </thead>
              <tbody>
                {data.rows.map((r, i) => (
                  <tr key={i} className="hover:bg-ink-50">
                    {data.columns.map(c => (
                      <td key={c} className={cn(tbl.td, 'whitespace-nowrap', !TEXT_COLUMNS.has(c) && cn(tbl.right, 'tabular-nums'), c === 'name' && 'font-medium text-ink-800')}>
                        {cell(c, r[c])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-ink-400">{t('rep.rows', { n: data.rows.length })}</p>
        </>
      )}
    </div>
  );
}
