'use client';

import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { MascotState } from '../../../components/brand/Mascot';
import { PremiumLock } from '../../../components/cod/bits';
import { Button, Card, Kpi, NativeSelect, PageHeader, tbl } from '../../../components/cod/ui';
import api from '../../../lib/api';
import { useT } from '../../../lib/cod/i18n/client';
import { formatLKR, formatLKRCompact } from '../../../lib/cod/format';
import { monthLabel, type RangeKey } from '../../../lib/cod/dates';
import { expenseCategoryLabel } from '../../../lib/cod/business-types';
import type { ReportModel } from '../../../lib/cod/dashboard';
import type { OrderStatus } from '../../../lib/cod/types';

const RANGE_KEYS: RangeKey[] = ['this_month', 'last_month', 'last_3_months', 'this_year', 'all'];

// cod.kadehub.com/reports — revenue / COGS / profit for a range; 6-month trend (Premium)
export default function CodReportsPage() {
  const t = useT();
  const [rangeKey, setRangeKey] = useState<RangeKey>('this_month');
  const [data, setData] = useState<{ premium: boolean; report: ReportModel } | null>(null);
  const [failed, setFailed] = useState(false);

  const load = () => {
    setFailed(false);
    api.get('/cod/reports', { params: { range: rangeKey } }).then(r => setData(r.data)).catch(() => setFailed(true));
  };
  useEffect(load, [rangeKey]);

  const header = (
    <PageHeader title={t('nav.reports')} actions={
      <NativeSelect value={rangeKey} onChange={e => setRangeKey(e.target.value as RangeKey)} className="w-48">
        {RANGE_KEYS.map(k => <option key={k} value={k}>{t(`range.${k}`)}</option>)}
      </NativeSelect>
    } />
  );

  if (failed) {
    return <div className="space-y-4">{header}<MascotState variant="error" title={t('app.loadErrorTitle')} description={t('app.loadErrorBody')}
      action={<Button onClick={load}>{t('common.retry')}</Button>} /></div>;
  }
  if (!data) return <div className="space-y-4">{header}<MascotState variant="loading" size="sm" title={t('app.loading')} /></div>;

  const { report: r, premium } = data;
  // Sample numbers from the server when locked
  const monthly = r.monthly.map(m => ({ ...m, label: monthLabel(m.key, t.locale) }));

  return (
    <div className="space-y-4">
      {header}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi label={t('common.revenue')} value={formatLKRCompact(r.revenue)} />
        <Kpi label={t('rep.cogs')} value={formatLKRCompact(r.cogs)} />
        <Kpi label={t('rep.grossProfit')} value={formatLKRCompact(r.grossProfit)} />
        <Kpi label={t('common.expenses')} value={formatLKRCompact(r.expensesTotal)} />
        <Kpi label={t('common.netProfit')} value={formatLKRCompact(r.netProfit)} tone={r.netProfit < 0 ? 'danger' : undefined} />
      </div>

      <Card title={t('rep.chartTitle')} bodyClassName="h-72">
        <PremiumLock locked={!premium} message={t('premium.unlockChart')} className="h-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={v => formatLKRCompact(v)} width={64} />
              <Tooltip formatter={(v: number) => formatLKR(v)} />
              <Bar dataKey="revenue" name={t('common.revenue')} fill="var(--cod-primary)" radius={4} />
              <Bar dataKey="expenses" name={t('common.expenses')} fill="#ef4444" radius={4} />
              <Bar dataKey="net" name={t('common.netProfit')} fill="#10b981" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </PremiumLock>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={t('dash.ordersByStatus')}>
          {r.statusCounts.length === 0 ? <p className="text-sm text-ink-400">{t('rep.noOrdersRange')}</p> : (
            <table className={tbl.table}>
              <thead><tr><th className={tbl.th}>{t('common.status')}</th><th className={`${tbl.th} ${tbl.right}`}>{t('common.count')}</th></tr></thead>
              <tbody>
                {r.statusCounts.map(s => (
                  <tr key={s.status}><td className={tbl.td}>{t(`status.${s.status as OrderStatus}`)}</td><td className={`${tbl.td} ${tbl.right}`}>{s.count}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
        <Card title={t('rep.expensesByCategory')}>
          {r.expenseByCategory.length === 0 ? <p className="text-sm text-ink-400">{t('rep.noExpensesRange')}</p> : (
            <table className={tbl.table}>
              <thead><tr><th className={tbl.th}>{t('common.category')}</th><th className={`${tbl.th} ${tbl.right}`}>{t('common.amount')}</th></tr></thead>
              <tbody>
                {r.expenseByCategory.map(e => (
                  <tr key={e.category}><td className={tbl.td}>{expenseCategoryLabel(t, e.category)}</td><td className={`${tbl.td} ${tbl.right}`}>{formatLKR(e.amount)}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  );
}
