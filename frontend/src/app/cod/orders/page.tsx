'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Boxes, Eye, Lock, MessageCircle, MoreHorizontal, Printer, Tag, Trash2, X } from 'lucide-react';
import { MascotState } from '../../../components/brand/Mascot';
import { useCod } from '../../../components/cod/CodContext';
import { StatusDot, codHref } from '../../../components/cod/bits';
import { ConfirmDialog, OrderForm, StatusSelect } from '../../../components/cod/orders';
import { Badge, Button, Dialog, Menu, MenuItem, NativeSelect, PageHeader, SearchInput, TextInput, btnClass, cn, tbl } from '../../../components/cod/ui';
import api from '../../../lib/api';
import { useT } from '../../../lib/cod/i18n/client';
import type { RangeKey } from '../../../lib/cod/dates';
import { formatDate, formatLKR } from '../../../lib/cod/format';
import { STATUS_STYLE } from '../../../lib/cod/order-status';
import { applyStatus, scopeOrders, statusChips, type OrderFilters } from '../../../lib/cod/order-filters';
import { PAYMENT_TYPE_KEY, orderError } from '../../../lib/cod/order-messages';
import { whatsappUrl } from '../../../lib/cod/order-share';
import { summariseCredit } from '../../../lib/cod/credit';
import { useCodCan } from '../../../lib/cod/capabilities';
import { ORDER_STATUSES, PAYMENT_TYPES, type Item, type Order, type OrderStatus, type PaymentType } from '../../../lib/cod/types';

const RANGE_KEYS: (RangeKey | 'custom')[] = ['all', 'today', 'yesterday', 'this_month', 'last_month', 'last_3_months', 'this_year', 'custom'];
const isPayment = (v: string | null): v is PaymentType => !!v && (PAYMENT_TYPES as string[]).includes(v);

type BulkResult = { updated: number; unchanged?: number; failed: { id: number; invoice_number: string | null; reason: string; item?: string }[] };

// cod.kadehub.com/orders — orders with status chips, search, date range, payment filter and (Premium) bulk status change
export default function CodOrdersPage() {
  const t = useT();
  const router = useRouter();
  const can = useCodCan();
  const { me, refresh } = useCod();
  const premium = !!me.premium;
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [failed, setFailed] = useState(false);
  const [filters, setFilters] = useState<OrderFilters>({ search: '', range: 'all', payment: 'all', status: 'all' });
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkTarget, setBulkTarget] = useState<OrderStatus | ''>('');
  const [confirming, setConfirming] = useState<OrderStatus | null>(null);
  const [working, setWorking] = useState(false);
  const [deleting, setDeleting] = useState<Order | null>(null);

  const load = () => {
    setFailed(false);
    Promise.all([api.get<Order[]>('/cod/orders'), api.get<Item[]>('/cod/items')])
      .then(([o, i]) => { setOrders(o.data); setItems(i.data); })
      .catch(() => setFailed(true));
  };
  useEffect(load, []);

  // ?payment=… is mirrored both ways (read once on load, written on change without a navigation)
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get('payment');
    if (isPayment(p)) setFilters(f => ({ ...f, payment: p }));
  }, []);
  function setPayment(payment: 'all' | PaymentType) {
    setFilters(f => ({ ...f, payment }));
    const url = new URL(window.location.href);
    if (payment === 'all') url.searchParams.delete('payment'); else url.searchParams.set('payment', payment);
    window.history.replaceState(null, '', url.toString());
  }

  const scoped = useMemo(() => scopeOrders(orders ?? [], filters), [orders, filters]);
  const filtered = useMemo(() => applyStatus(scoped, filters.status), [scoped, filters.status]);
  const chips = useMemo(() => statusChips(scoped), [scoped]);

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

  async function onDelete() {
    if (!deleting) return;
    setWorking(true);
    try {
      await api.delete(`/cod/orders/${deleting.id}`);
      toast.success(t('orders.deleted'));
      setOrders(list => (list ?? []).filter(o => o.id !== deleting.id));
      setDeleting(null);
      refresh();
    } catch (err) {
      toast.error(orderError(err, t));
    } finally {
      setWorking(false);
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
      const { data } = await api.post<BulkResult>('/cod/orders/bulk-status', { ids: plan.toChange.map(o => o.id), status: confirming });
      if (data.failed.length) {
        const reasons = data.failed.slice(0, 4).map(f => `${f.invoice_number ?? `#${f.id}`}: ${f.reason === 'INSUFFICIENT_STOCK' ? t('bulk.reasonStock', { item: f.item ?? '' }) : f.reason}`).join(' · ');
        toast(t('bulk.partial', { updated: data.updated, failed: data.failed.length, reasons }), { icon: '⚠️', duration: 9000 });
      } else {
        toast.success(t('bulk.done', { count: data.updated }));
      }
      setConfirming(null);
      setSelected(new Set());
      setBulkTarget('');
      load();
    } catch (err) {
      toast.error(orderError(err, t));
    } finally {
      setWorking(false);
    }
  }

  const updateOne = (o: Order) => setOrders(list => (list ?? []).map(x => (x.id === o.id ? { ...x, ...o } : x)));
  const labelsHref = codHref(`/orders/labels?ids=${Array.from(selected).join(',')}`);
  const newOrder = can('orders_create') ? <OrderForm items={items} onSaved={load} /> : null;

  const paymentBadge = (o: Order) => {
    const type = o.payment_type ?? 'cod';
    if (type !== 'credit') return <Badge className="border border-ink-200 bg-white">{t(PAYMENT_TYPE_KEY[type])}</Badge>;
    const c = summariseCredit(o.total_amount, o.paid ?? 0);
    return <Badge tone={c.status === 'paid' ? 'green' : c.status === 'partial' ? 'amber' : 'red'}>{t('pay.credit')} · {t(`credit.status.${c.status}`)}</Badge>;
  };

  return (
    <div className="space-y-4">
      <PageHeader title={t('nav.orders')} subtitle={t.n('orders.total', orders.length)} actions={<>
        <Link href={codHref('/orders/units')} className={btnClass('outline')}><Boxes /> {t('orders.units')}</Link>
        {newOrder}
      </>} />

      {orders.length === 0 ? (
        <MascotState variant="empty" title={t('orders.emptyTitle')} description={t('orders.empty')} action={newOrder} />
      ) : (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <SearchInput value={filters.search} onChange={search => setFilters(f => ({ ...f, search }))} placeholder={t('orders.searchPlaceholder2')} />
            <NativeSelect aria-label={t('orders.dateRange')} value={filters.range} onChange={e => setFilters(f => ({ ...f, range: e.target.value as OrderFilters['range'] }))} className="sm:w-44">
              {RANGE_KEYS.map(k => <option key={k} value={k}>{k === 'custom' ? t('range.custom') : t(`range.${k}`)}</option>)}
            </NativeSelect>
          </div>
          {filters.range === 'custom' && (
            <div className="grid grid-cols-2 gap-2 sm:max-w-sm">
              <TextInput type="date" aria-label={t('range.from')} value={filters.from ?? ''} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} />
              <TextInput type="date" aria-label={t('range.to')} value={filters.to ?? ''} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} />
            </div>
          )}

          {/* payment filter */}
          <div role="group" aria-label={t('pay.label')} className="flex gap-1.5 overflow-x-auto">
            {(['all', ...PAYMENT_TYPES] as const).map(p => (
              <button key={p} type="button" aria-pressed={filters.payment === p} onClick={() => setPayment(p)}
                className={cn('min-h-[36px] shrink-0 rounded-full border px-3 text-xs font-semibold',
                  filters.payment === p ? 'border-[color:var(--cod-primary)] bg-[color:var(--cod-primary)] text-[color:var(--cod-primary-fg)]' : 'border-ink-200 bg-white text-ink-600 hover:bg-ink-50')}>
                {p === 'all' ? t('orders.allPayments') : t(PAYMENT_TYPE_KEY[p])}
              </button>
            ))}
          </div>

          {/* status chips — counts & values follow search/date/payment; click to filter, click again to clear */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {chips.map(c => (
              <button key={c.key} type="button" aria-pressed={filters.status === c.key}
                onClick={() => setFilters(f => ({ ...f, status: f.status === c.key && c.key !== 'all' ? 'all' : c.key }))}
                className={cn('min-w-[7.5rem] shrink-0 rounded-xl border bg-white px-3 py-2 text-left transition-colors hover:bg-ink-50',
                  filters.status === c.key ? 'border-[color:var(--cod-primary)] ring-1 ring-[color:var(--cod-primary)]' : 'border-ink-200')}>
                <span className="flex items-center gap-1.5 text-[11px] text-ink-500">
                  {c.key !== 'all' && <StatusDot status={c.key} />}
                  {c.key === 'all' ? t('orders.cardAll') : t(`status.${c.key}`)} · {c.count}
                </span>
                <span className="mt-0.5 block text-sm font-semibold text-ink-900">{formatLKR(c.total)}</span>
              </button>
            ))}
          </div>

          {selected.size > 0 && (
            <div className="sticky top-14 z-10 flex flex-wrap items-center gap-2 rounded-xl border border-ink-200 bg-white px-3 py-2 shadow-sm">
              <span className="text-sm font-medium">{t('bulk.selected', { count: selected.size })}</span>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <Link href={labelsHref} className={btnClass('outline', 'sm')}><Tag /> {t('print.labels')}</Link>
                {can('orders_status') && <>
                  <NativeSelect value={bulkTarget} onChange={e => setBulkTarget(e.target.value as OrderStatus)} className="h-8 w-40 text-xs" aria-label={t('bulk.changeTo')}>
                    <option value="" disabled>{t('bulk.changeTo')}</option>
                    {ORDER_STATUSES.map(s => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
                  </NativeSelect>
                  <Button size="sm" disabled={!bulkTarget} onClick={startBulk}>{t('bulk.apply')}</Button>
                </>}
                <Button size="icon-sm" variant="ghost" aria-label={t('bulk.clear')} onClick={() => setSelected(new Set())}><X /></Button>
              </div>
            </div>
          )}

          {filtered.length === 0 ? (
            <p className="rounded-xl border border-dashed border-ink-300 p-8 text-center text-sm text-ink-500">{t('orders.noMatch')}</p>
          ) : (
            <>
              {/* phones: one compact card per order; the card opens the order, actions sit beside it */}
              <ul className="space-y-2 md:hidden">
                {filtered.map(o => (
                  <li key={o.id} className={cn('flex items-stretch gap-1 rounded-xl border bg-white', selected.has(o.id) ? 'border-[color:var(--cod-primary)]' : 'border-ink-200')}>
                    {premium && (
                      <label className="flex w-10 shrink-0 items-center justify-center">
                        <input type="checkbox" className="h-5 w-5 accent-[color:var(--cod-primary)]" checked={selected.has(o.id)}
                          aria-label={t('orders.selectRow', { invoice: o.invoice_number })} onChange={() => toggleRow(o.id)} />
                      </label>
                    )}
                    <Link href={codHref(`/orders/${o.id}`)} className={cn('min-w-0 flex-1 py-2.5', !premium && 'pl-3')}>
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-ink-900">{o.customer_name}</span>
                        <span className="shrink-0 text-sm font-bold text-ink-900">{formatLKR(o.total_amount)}</span>
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-1.5 text-2xs text-ink-500">
                        <span className="font-medium">{o.invoice_number}</span>
                        <span>· {formatDate(o.created_at, t.locale)}</span>
                        <span className={cn('rounded-full px-1.5 py-0.5 font-semibold', STATUS_STYLE[o.status].badge)}>{t(`status.${o.status}`)}</span>
                        {paymentBadge(o)}
                      </span>
                    </Link>
                    {o.customer_phone && (
                      <a href={whatsappUrl(o.customer_phone, '')} target="_blank" rel="noopener noreferrer" aria-label={t('orders.whatsappCustomer', { name: o.customer_name })}
                        className="flex w-11 shrink-0 items-center justify-center text-emerald-600 hover:bg-emerald-50"><MessageCircle size={18} /></a>
                    )}
                  </li>
                ))}
              </ul>

              <div className={cn(tbl.wrap, 'hidden md:block')}>
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
                    <th className={tbl.th}>{t('pay.label')}</th>
                    <th className={`${tbl.th} ${tbl.right}`}>{t('common.total')}</th>
                    <th className={tbl.th}>{t('common.status')}</th>
                    <th className={tbl.th}>{t('common.date')}</th>
                    <th className={tbl.th} />
                  </tr></thead>
                  <tbody>
                    {filtered.map(o => (
                      <tr key={o.id} className={selected.has(o.id) ? 'bg-ink-50' : undefined}>
                        <td className={tbl.td}>
                          <input type="checkbox" className="h-4 w-4 accent-[color:var(--cod-primary)]" checked={selected.has(o.id)} disabled={!premium}
                            aria-label={t('orders.selectRow', { invoice: o.invoice_number })} onChange={() => toggleRow(o.id)} />
                        </td>
                        <td className={tbl.td}>
                          <Link href={codHref(`/orders/${o.id}`)} className="font-semibold text-[color:var(--cod-primary)] hover:underline">{o.invoice_number}</Link>
                        </td>
                        <td className={`${tbl.td} max-w-[14rem] truncate`}>{o.customer_name}</td>
                        <td className={`${tbl.td} text-ink-500`}>{o.customer_phone || '—'}</td>
                        <td className={`${tbl.td} text-ink-500`}>{o.city || '—'}</td>
                        <td className={tbl.td}>{paymentBadge(o)}</td>
                        <td className={`${tbl.td} ${tbl.right}`}>{formatLKR(o.total_amount)}</td>
                        <td className={tbl.td}><StatusSelect order={o} onChanged={updateOne} /></td>
                        <td className={`${tbl.td} whitespace-nowrap text-ink-500`}>{formatDate(o.created_at, t.locale)}</td>
                        <td className={tbl.td}>
                          <Menu label={t('orders.actions')} trigger={<MoreHorizontal />}>
                            {close => (
                              <>
                                <MenuItem onClick={() => { close(); router.push(codHref(`/orders/${o.id}`)); }}><Eye /> {t('orders.view')}</MenuItem>
                                <MenuItem onClick={() => { close(); window.open(codHref(`/orders/${o.id}/print?view=invoice`), '_blank'); }}><Printer /> {t('print.invoice')}</MenuItem>
                                {o.customer_phone && <MenuItem onClick={() => { close(); window.open(whatsappUrl(o.customer_phone, ''), '_blank', 'noopener,noreferrer'); }}><MessageCircle /> WhatsApp</MenuItem>}
                                {can('orders_create') && <MenuItem danger onClick={() => { close(); setDeleting(o); }}><Trash2 /> {t('orders.deleteAria')}</MenuItem>}
                              </>
                            )}
                          </Menu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      <ConfirmDialog open={!!deleting} busy={working} danger title={t('orders.deleteAria')}
        message={deleting ? t('orders.deleteConfirm', { invoice: deleting.invoice_number }) + (deleting.stock_deducted ? ` ${t('orders.deleteRestores')}` : '') : ''}
        confirmLabel={t('orders.deleteAria')} onCancel={() => setDeleting(null)} onConfirm={onDelete} />

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
