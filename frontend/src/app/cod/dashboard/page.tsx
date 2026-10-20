'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { MascotState } from '../../../components/brand/Mascot';
import InteractiveMascot from '../../../components/brand/InteractiveMascot';
import { useCod } from '../../../components/cod/CodContext';
import { PremiumLock, codHref } from '../../../components/cod/bits';
import { Badge, Button, Card, Kpi, PageHeader, tbl } from '../../../components/cod/ui';
import api from '../../../lib/api';
import CashTab from '../../../components/cod/cash-tab';
import { useRouter } from 'next/navigation';
import { useCodCan } from '../../../lib/cod/capabilities';
import { useT } from '../../../lib/cod/i18n/client';
import { formatDate, formatLKR, formatLKRCompact } from '../../../lib/cod/format';
import { monthLabel } from '../../../lib/cod/dates';
import { STATUS_STYLE } from '../../../lib/cod/order-status';
import type { DashboardModel } from '../../../lib/cod/dashboard';
import type { OrderStatus } from '../../../lib/cod/types';

type DashTab = 'overview' | 'cash';

/** Dashboard tabs: Overview for everyone with `reports`; "Personal & Cash" only with `personal_finance` (?tab=cash). */
export default function CodDashboardPage() {
  const t = useT();
  const can = useCodCan();
  const [tab, setTab] = useState<DashTab>('overview');
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('tab') === 'cash') setTab('cash');
  }, []);
  const pick = (next: DashTab) => {
    setTab(next);
    const url = new URL(window.location.href);
    if (next === 'cash') url.searchParams.set('tab', 'cash'); else url.searchParams.delete('tab');
    window.history.replaceState(null, '', url);
  };
  const showCash = can('personal_finance');

  return (
    <div className="space-y-5">
      {showCash && (
        <div className="inline-flex rounded-xl border border-ink-200 bg-white p-1" role="tablist">
          {(['overview', 'cash'] as const).map(k => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => pick(k)}
              className={`min-h-[36px] rounded-lg px-4 text-sm font-semibold transition-colors ${tab === k ? 'bg-[color:var(--cod-primary)] text-[color:var(--cod-primary-fg)]' : 'text-ink-600 hover:bg-ink-50'}`}>
              {k === 'overview' ? t('fin.tabOverview') : t('fin.tabCash')}
            </button>
          ))}
        </div>
      )}
      {showCash && tab === 'cash' ? <CashTab /> : <OverviewDashboard />}
    </div>
  );
}

// cod.kadehub.com/dashboard — KPIs for this month, revenue vs expenses (Premium), status mix, recent orders, low stock
function OverviewDashboard() {
  const t = useT();
  const { me, labels } = useCod();
  const [data, setData] = useState<{ premium: boolean; model: DashboardModel } | null>(null);
  const [failed, setFailed] = useState(false);

  const router = useRouter();
  // Staff without the `reports` capability (cashiers) land on orders instead of a forbidden dashboard
  const canReports = useCodCan()('reports');

  const load = () => {
    setFailed(false);
    api.get('/cod/dashboard').then(r => setData(r.data)).catch(() => setFailed(true));
  };
  useEffect(() => {
    if (!canReports) { router.replace(codHref('/orders')); return; }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canReports]);
  if (!canReports) return <MascotState variant="loading" size="sm" title={t('app.loading')} />;

  if (failed) {
    return <MascotState variant="error" title={t('app.loadErrorTitle')} description={t('app.loadErrorBody')}
      action={<Button onClick={load}>{t('common.retry')}</Button>} />;
  }
  if (!data) return <MascotState variant="loading" size="sm" title={t('app.loading')} />;

  const { model, premium } = data;
  const donut = model.ordersByStatus.filter(s => s.count > 0).map(s => ({ ...s, name: t(`status.${s.status as OrderStatus}`) }));
  // The backend already sends sample numbers here for accounts without Premium
  const monthly = model.monthly.map(m => ({ ...m, label: monthLabel(m.key, t.locale) }));

  return (
    <div className="space-y-6">
      <PageHeader title={t('nav.dashboard')} subtitle={t('dash.subtitle', { business: me.business.name })}
        leading={<InteractiveMascot width={52} bubbleSide="right" label={t('mascot.label')}
          messages={[t('mascot.tip1'), t('mascot.tip2'), t('mascot.tip3')]} />} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <Kpi label={t('common.revenue')} value={formatLKRCompact(model.revenue)} />
        <Kpi label={t('common.expenses')} value={formatLKRCompact(model.expensesTotal)} />
        <Kpi label={t('common.netProfit')} value={formatLKRCompact(model.netProfit)}
          hint={model.netProfit >= 0 ? t('dash.profitable') : t('dash.loss')} tone={model.netProfit < 0 ? 'danger' : undefined} />
        <Kpi label={t('dash.codPipeline')} value={formatLKRCompact(model.codPipelineValue)}
          hint={t('dash.pipelineHint', { count: model.codPipelineCount })} />
        <Kpi label={t('dash.inventoryValue')} value={formatLKRCompact(model.inventoryValue)} />
        <Kpi label={t('dash.lowStock')} value={String(model.lowStockCount)}
          hint={model.lowStockCount > 0 ? t('dash.needsRestock') : t('dash.allGood')} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title={t('dash.chartRevExp')} className="lg:col-span-2" bodyClassName="h-72">
          <PremiumLock locked={!premium} message={t('premium.unlockChart')} className="h-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={v => formatLKRCompact(v)} width={64} />
                <Tooltip formatter={(v: number) => formatLKR(v)} />
                <Bar dataKey="revenue" name={t('common.revenue')} fill="var(--cod-primary)" radius={4} />
                <Bar dataKey="expenses" name={t('common.expenses')} fill="#ef4444" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </PremiumLock>
        </Card>

        <Card title={t('dash.ordersByStatus')} bodyClassName="h-72">
          {donut.length === 0 ? (
            <p className="flex h-full items-center justify-center text-sm text-ink-400">{t('dash.noOrdersMonth')}</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={donut} dataKey="count" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                  {donut.map(d => <Cell key={d.status} fill={STATUS_STYLE[d.status as OrderStatus].color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={t('dash.recentOrders')}>
          {model.recentOrders.length === 0 ? (
            <p className="text-sm text-ink-400">{t('dash.noOrders')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className={tbl.table}>
                <thead><tr>
                  <th className={tbl.th}>{t('common.invoice')}</th>
                  <th className={tbl.th}>{t('common.customer')}</th>
                  <th className={tbl.th}>{t('common.status')}</th>
                  <th className={`${tbl.th} ${tbl.right}`}>{t('common.total')}</th>
                </tr></thead>
                <tbody>
                  {model.recentOrders.map(o => (
                    <tr key={o.id}>
                      <td className={tbl.td}><Link href={codHref(`/orders/${o.id}`)} className="font-medium underline underline-offset-4">{o.invoice_number}</Link></td>
                      <td className={tbl.td}>{o.customer_name}</td>
                      <td className={tbl.td}><span className={`rounded-full px-2 py-0.5 text-2xs font-semibold ${STATUS_STYLE[o.status].badge}`}>{t(`status.${o.status}`)}</span></td>
                      <td className={`${tbl.td} ${tbl.right}`}>{formatLKR(o.total_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title={t('dash.lowStock')}>
          {model.lowStockItems.length === 0 ? (
            <p className="text-sm text-ink-400">{t('dash.nothingLow')}</p>
          ) : (
            <table className={tbl.table}>
              <thead><tr>
                <th className={tbl.th}>{labels.singular}</th>
                <th className={`${tbl.th} ${tbl.right}`}>{t('common.stock')}</th>
              </tr></thead>
              <tbody>
                {model.lowStockItems.map(i => (
                  <tr key={i.id}>
                    <td className={tbl.td}><Link href={codHref('/items')} className="underline underline-offset-4">{i.name}</Link></td>
                    <td className={`${tbl.td} ${tbl.right}`}><Badge tone="red">{i.stock_quantity}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      {model.topItems.length > 0 && (
        <Card title={t('dash.topItems', { items: labels.pluralLower })}>
          <table className={tbl.table}>
            <thead><tr>
              <th className={tbl.th}>{labels.singular}</th>
              <th className={`${tbl.th} ${tbl.right}`}>{t('dash.qtySold')}</th>
              <th className={`${tbl.th} ${tbl.right}`}>{t('common.revenue')}</th>
            </tr></thead>
            <tbody>
              {model.topItems.map(i => (
                <tr key={i.name}>
                  <td className={tbl.td}>{i.name}</td>
                  <td className={`${tbl.td} ${tbl.right}`}>{i.qty}</td>
                  <td className={`${tbl.td} ${tbl.right}`}>{formatLKR(i.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <p className="text-xs text-ink-400">{t('dash.lastUpdated', { date: formatDate(new Date(), t.locale) })}</p>
    </div>
  );
}
