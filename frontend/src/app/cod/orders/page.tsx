'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Boxes, Eye, Lock, MoreHorizontal, Trash2, X } from 'lucide-react';
import { MascotState } from '../../../components/brand/Mascot';
import { useCod } from '../../../components/cod/CodContext';
import { StatusDot, codHref } from '../../../components/cod/bits';
import { OrderForm, StatusSelect } from '../../../components/cod/orders';
import { Badge, Button, Dialog, Menu, MenuItem, NativeSelect, PageHeader, SearchInput, btnClass, cn, tbl } from '../../../components/cod/ui';
import api from '../../../lib/api';
import { useT } from '../../../lib/cod/i18n/client';
import { resolveRange, type RangeKey } from '../../../lib/cod/dates';
import { formatDate, formatLKR } from '../../../lib/cod/format';
import { apiError } from '../../../lib/cod/session';
import { ORDER_STATUSES, type Item, type Order, type OrderStatus } from '../../../lib/cod/types';

const RANGE_KEYS: RangeKey[] = ['all', 'today', 'yesterday', 'this_month', 'last_month', 'last_3_months', 'this_year'];

// cod.kadehub.com/orders — COD orders with status cards, search, date range and (Premium) bulk status change
export default function CodOrdersPage() {
  const t = useT();
  const router = useRouter();
  const { me, refresh } = useCod();
  const premium = !!me.premium;
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [failed, setFailed] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | OrderStatus>('all');
  const [rangeKey, setRangeKey] = useState<RangeKey>('all');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkTarget, setBulkTarget] = useState<OrderStatus | ''>('');
  const [confirming, setConfirming] = useState<OrderStatus | null>(null);
  const [working, setWorking] = useState(false);

  const load = () => {
    setFailed(false);
    Promise.all([api.get<Order[]>('/cod/orders'), api.get<Item[]>('/cod/items')])
      .then(([o, i]) => { setOrders(o.data); setItems(i.data); })
      .catch(() => setFailed(true));
  };
  useEffect(load, []);

  // Search + date range decide what the status cards add up; the status filter narrows the table
  const scoped = useMemo(() => {
    const range = resolveRange(rangeKey);
    const q = search.trim().toLowerCase();
    return (orders ?? []).filter(o => {
      if (rangeKey !== 'all') {
        const d = new Date(o.created_at);
        if (d < range.from || d > range.to) return false;
      }
      return !q || o.customer_name.toLowerCase().includes(q) || o.invoice_number.toLowerCase().includes(q) || o.customer_phone.toLowerCase().includes(q);
    });
  }, [orders, search, rangeKey]);
  const filtered = useMemo(() => (status === 'all' ? scoped : scoped.filter(o => o.status === status)), [scoped, status]);
  const cards = useMemo(() => {
    const by = new Map<OrderStatus, { count: number; total: number }>(ORDER_STATUSES.map(s => [s, { count: 0, total: 0 }]));
    for (const o of scoped) { const c = by.get(o.status)!; c.count++; c.total += Number(o.total_amount); }
    return [
      { key: 'all' as const, count: scoped.length, total: scoped.reduce((s, o) => s + Number(o.total_amount), 0) },
      ...ORDER_STATUSES.map(s => ({ key: s, ...by.get(s)! })),
    ];
  }, [scoped]);

  const targets = (orders ?? []).filter(o => selected.has(o.id));
  const plan = useMemo(() => {
    if (!confirming) return null;
    const toChange = targets.filter(o => o.status !== confirming);
    return {
      toChange,
      skipped: targets.length - toChange.length,
      restore: toChange.filter(o => o.stock_deducted && confirming !== 'delivered').length,
      deduct: toChange.filter(o => !o.stock_deducted && confirming === 'delivered').length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirming, orders, selected]);

  if (failed) {
    return <MascotState variant="error" title={t('app.loadErrorTitle')} description={t('app.loadErrorBody')}
      action={<Button onClick={load}>{t('common.retry')}</Button>} />;
  }
  if (!orders) return <MascotState variant="loading" size="sm" title={t('app.loading')} />;

  const allSelected = filtered.length > 0 && filtered.every(o => selected.has(o.id));
  const toggleRow = (id: number) => setSelected(prev => { const n = new Set(prev); if (!n.delete(id)) n.add(id); return n; });

  function onSelectAll() {
    if (!premium) {
      toast(shown => (
        <span className="flex items-center gap-3 text-sm">
          {t('premium.selectAll')}
          <button className={btnClass('primary', 'sm')} onClick={() => { toast.dismiss(shown.id); router.push(codHref('/billing')); }}>{t('premium.upgrade')}</button>
        </span>
      ));
      return;
    }
    setSelected(allSelected ? new Set() : new Set(filtered.map(o => o.id)));
  }

  async function onDelete(id: number, invoice: string) {
    if (!confirm(t('orders.deleteConfirm', { invoice }))) return;
    try {
      await api.delete(`/cod/orders/${id}`);
      toast.success(t('orders.deleted'));
      setOrders(list => (list ?? []).filter(o => o.id !== id));
      refresh();
    } catch (err) {
      toast.error(apiError(err, t));
    }
  }

  function startBulk() {
    if (!bulkTarget) return;
    if (targets.every(o => o.status === bulkTarget)) { toast(t('bulk.nothing')); return; }
    setConfirming(bulkTarget);
  }

  async function applyBulk() {
    if (!plan || !confirming) return;
    setWorking(true);
    try {
      const { data } = await api.post<{ updated: number }>('/cod/orders/bulk-status', { ids: plan.toChange.map(o => o.id), status: confirming });
      toast.success(t('bulk.done', { count: data.updated }));
      setConfirming(null);
      setSelected(new Set());
      setBulkTarget('');
      load();
    } catch (err) {
      toast.error(apiError(err, t));
    } finally {
      setWorking(false);
    }
  }

  const updateOne = (o: Order) => setOrders(list => (list ?? []).map(x => (x.id === o.id ? { ...x, ...o } : x)));

  return (
    <div className="space-y-4">
      <PageHeader title={t('nav.orders')} subtitle={t.n('orders.total', orders.length)} actions={<>
        <Link href={codHref('/orders/units')} className={btnClass('outline')}><Boxes /> {t('orders.units')}</Link>
        <OrderForm items={items} onCreated={load} />
      </>} />

      {orders.length === 0 ? (
        <MascotState variant="empty" title={t('orders.emptyTitle')} description={t('orders.empty')}
          action={<OrderForm items={items} onCreated={load} />} />
      ) : (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <SearchInput value={search} onChange={setSearch} placeholder={t('orders.searchPlaceholder')} />
            <NativeSelect value={status} onChange={e => setStatus(e.target.value as 'all' | OrderStatus)} className="sm:w-44">
              <option value="all">{t('common.allStatuses')}</option>
              {ORDER_STATUSES.map(s => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
            </NativeSelect>
            <NativeSelect value={rangeKey} onChange={e => setRangeKey(e.target.value as RangeKey)} className="sm:w-44">
              {RANGE_KEYS.map(k => <option key={k} value={k}>{t(`range.${k}`)}</option>)}
            </NativeSelect>
          </div>

          {/* status cards — click to filter */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {cards.map(c => (
              <button key={c.key} type="button" aria-pressed={status === c.key} onClick={() => setStatus(c.key)}
                className={cn('min-w-[8rem] shrink-0 rounded-xl border bg-white px-3 py-2 text-left transition-colors hover:bg-ink-50',
                  status === c.key ? 'border-[color:var(--cod-primary)] ring-1 ring-[color:var(--cod-primary)]' : 'border-ink-200')}>
                <span className="flex items-center gap-1.5 text-[11px] text-ink-500">
                  {c.key !== 'all' && <StatusDot status={c.key} />}
                  {c.key === 'all' ? t('orders.cardAll') : t(`status.${c.key}`)} · {c.count}
                </span>
                <span className="mt-0.5 block text-sm font-semibold text-ink-900">{formatLKR(c.total)}</span>
              </button>
            ))}
          </div>

          {selected.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-ink-200 bg-ink-100/60 px-3 py-2">
              <span className="text-sm font-medium">{t('bulk.selected', { count: selected.size })}</span>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <NativeSelect value={bulkTarget} onChange={e => setBulkTarget(e.target.value as OrderStatus)} className="h-8 w-44 text-xs">
                  <option value="" disabled>{t('bulk.changeTo')}</option>
                  {ORDER_STATUSES.map(s => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
                </NativeSelect>
                <Button size="sm" disabled={!bulkTarget} onClick={startBulk}>{t('bulk.apply')}</Button>
                <Button size="icon-sm" variant="ghost" aria-label={t('bulk.clear')} onClick={() => setSelected(new Set())}><X /></Button>
              </div>
            </div>
          )}

          {filtered.length === 0 ? (
            <p className="rounded-xl border border-dashed border-ink-300 p-8 text-center text-sm text-ink-500">{t('orders.noMatch')}</p>
          ) : (
            <div className={tbl.wrap}>
              <table className={tbl.table}>
                <thead><tr>
                  <th className={`${tbl.th} w-10`}>
                    {premium ? (
                      <input type="checkbox" className="h-4 w-4 accent-[color:var(--cod-primary)]" aria-label={t('orders.cardAll')}
                        checked={allSelected} onChange={onSelectAll} />
                    ) : (
                      <button type="button" onClick={onSelectAll} aria-label={t('premium.selectAllAria')} title={t('premium.selectAllAria')}
                        className="flex h-5 w-5 items-center justify-center rounded border border-dashed border-ink-300 text-ink-400 hover:bg-ink-100">
                        <Lock size={11} />
                      </button>
                    )}
                  </th>
                  <th className={tbl.th}>{t('common.invoice')}</th>
                  <th className={tbl.th}>{t('common.customer')}</th>
                  <th className={tbl.th}>{t('common.phone')}</th>
                  <th className={tbl.th}>{t('common.city')}</th>
                  <th className={tbl.th}>{t('orders.type')}</th>
                  <th className={`${tbl.th} ${tbl.right}`}>{t('common.total')}</th>
                  <th className={tbl.th}>{t('common.status')}</th>
                  <th className={tbl.th}>{t('common.date')}</th>
                  <th className={tbl.th} />
                </tr></thead>
                <tbody>
                  {filtered.map(o => (
                    <tr key={o.id} className={selected.has(o.id) ? 'bg-ink-50' : undefined}>
                      <td className={tbl.td}>
                        <input type="checkbox" className="h-4 w-4 accent-[color:var(--cod-primary)]" checked={selected.has(o.id)}
                          aria-label={t('orders.selectRow', { invoice: o.invoice_number })} onChange={() => toggleRow(o.id)} />
                      </td>
                      <td className={tbl.td}>
                        <Link href={codHref(`/orders/${o.id}`)} className="font-semibold text-[color:var(--cod-primary)] hover:underline">{o.invoice_number}</Link>
                      </td>
                      <td className={`${tbl.td} max-w-[14rem] truncate`}>{o.customer_name}</td>
                      <td className={`${tbl.td} text-ink-500`}>{o.customer_phone || '—'}</td>
                      <td className={`${tbl.td} text-ink-500`}>{o.city || '—'}</td>
                      <td className={tbl.td}><Badge className="border border-ink-200 bg-white">COD</Badge></td>
                      <td className={`${tbl.td} ${tbl.right}`}>{formatLKR(o.total_amount)}</td>
                      <td className={tbl.td}><StatusSelect order={o} onChanged={updateOne} /></td>
                      <td className={`${tbl.td} whitespace-nowrap text-ink-500`}>{formatDate(o.created_at, t.locale)}</td>
                      <td className={tbl.td}>
                        <Menu label={t('orders.actions')} trigger={<MoreHorizontal />}>
                          {close => (
                            <>
                              <MenuItem onClick={() => { close(); router.push(codHref(`/orders/${o.id}`)); }}><Eye /> {t('orders.view')}</MenuItem>
                              <MenuItem danger onClick={() => { close(); onDelete(o.id, o.invoice_number); }}><Trash2 /> {t('orders.deleteAria')}</MenuItem>
                            </>
                          )}
                        </Menu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <Dialog open={confirming !== null} onClose={() => !working && setConfirming(null)}
        title={plan && confirming ? t('bulk.title', { count: plan.toChange.length, status: t(`status.${confirming}`) }) : ''}>
        {plan && confirming && (
          <div className="space-y-3">
            <p className="text-sm text-ink-500">{t('bulk.description')}</p>
            {plan.skipped > 0 && <p className="text-sm text-ink-500">{t('bulk.skipped', { count: plan.skipped, status: t(`status.${confirming}`) })}</p>}
            {(plan.restore > 0 || plan.deduct > 0) && (
              <p className="rounded-lg bg-ink-100 px-3 py-2 text-sm">
                {plan.restore > 0 && t('bulk.stockRestore', { count: plan.restore })}
                {plan.restore > 0 && plan.deduct > 0 && ' '}
                {plan.deduct > 0 && t('bulk.stockDeduct', { count: plan.deduct })}
              </p>
            )}
            <ul className="max-h-56 divide-y divide-ink-100 overflow-y-auto rounded-lg border border-ink-200 text-sm">
              {plan.toChange.map(o => (
                <li key={o.id} className="flex items-center justify-between gap-3 px-3 py-1.5">
                  <span className="font-medium">{o.invoice_number}</span>
                  <span className="min-w-0 flex-1 truncate text-ink-500">{o.customer_name}</span>
                  <span className="shrink-0 text-xs text-ink-500">
                    {t(`status.${o.status}`)} → <span className="font-semibold text-ink-900">{t(`status.${confirming}`)}</span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirming(null)} disabled={working}>{t('common.cancel')}</Button>
              <Button onClick={applyBulk} disabled={working || plan.toChange.length === 0}>
                {working ? t('bulk.working') : t('bulk.confirm', { count: plan.toChange.length })}
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
