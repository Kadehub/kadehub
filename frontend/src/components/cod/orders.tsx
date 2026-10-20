'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ChevronDown, PencilLine, Plus, Trash2 } from 'lucide-react';
import api from '../../lib/api';
import { useT } from '../../lib/cod/i18n/client';
import type { MessageKey } from '../../lib/cod/i18n/messages/en';
import { formatLKR } from '../../lib/cod/format';
import { round2 } from '../../lib/cod/calc';
import { STATUS_STYLE } from '../../lib/cod/order-status';
import { statusConfirmKey } from '../../lib/cod/credit';
import { PAYMENT_TYPE_KEY, orderError } from '../../lib/cod/order-messages';
import { useCodCan } from '../../lib/cod/capabilities';
import {
  ORDER_STATUSES, PAYMENT_METHODS, PAYMENT_TYPES,
  type CustomerType, type Item, type Order, type OrderDetail, type OrderStatus, type PaymentMethod, type PaymentType,
} from '../../lib/cod/types';
import { useCod } from './CodContext';
import { codHref } from './bits';
import { Button, Dialog, Field, NativeSelect, SearchInput, TextArea, TextInput, btnClass, cn } from './ui';

/** Yes / No confirmation with the spec's exact wording for risky status changes. */
export function ConfirmDialog({ open, title, message, confirmLabel, busy, onConfirm, onCancel, danger }: {
  open: boolean; title: string; message: string; confirmLabel: string; busy?: boolean; danger?: boolean;
  onConfirm: () => void; onCancel: () => void;
}) {
  const t = useT();
  return (
    <Dialog open={open} onClose={() => !busy && onCancel()} title={title} width="max-w-md">
      <p className="text-sm text-ink-600">{message}</p>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={busy}>{t('common.cancel')}</Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} disabled={busy}>{busy ? t('common.saving') : confirmLabel}</Button>
      </div>
    </Dialog>
  );
}

/**
 * Coloured status pill that moves the order to another stage (stock follows on the server).
 * Delivered / cancelled / returned and leaving delivered ask for confirmation first.
 */
export function StatusSelect({ order, onChanged, disabled }: { order: Pick<Order, 'id' | 'status'>; onChanged?: (o: Order) => void; disabled?: boolean }) {
  const t = useT();
  const can = useCodCan();
  const [value, setValue] = useState<OrderStatus>(order.status);
  const [busy, setBusy] = useState(false);
  const [asking, setAsking] = useState<{ to: OrderStatus; key: MessageKey } | null>(null);
  // Keep in step when the parent reloads with a new status (e.g. after a bulk change)
  const [seen, setSeen] = useState(order.status);
  if (seen !== order.status) { setSeen(order.status); setValue(order.status); }

  async function apply(next: OrderStatus) {
    const prev = value;
    setValue(next);
    setBusy(true);
    try {
      const { data } = await api.patch<Order>(`/cod/orders/${order.id}/status`, { status: next });
      toast.success(t('orders.marked', { status: t(`status.${next}`) }));
      onChanged?.(data);
    } catch (err) {
      setValue(prev);
      toast.error(orderError(err, t));
    } finally {
      setBusy(false);
      setAsking(null);
    }
  }

  function pick(next: OrderStatus) {
    const key = statusConfirmKey(value, next);
    if (key) setAsking({ to: next, key });
    else apply(next);
  }

  return (
    <>
      <select aria-label={t('common.status')} value={value} disabled={busy || disabled || !can('orders_status')} onChange={e => pick(e.target.value as OrderStatus)}
        className={cn('h-8 rounded-full border-0 pl-2.5 pr-7 text-xs font-semibold', STATUS_STYLE[value].badge)}>
        {ORDER_STATUSES.map(s => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
      </select>
      <ConfirmDialog open={!!asking} busy={busy} title={asking ? t('confirm.title', { status: t(`status.${asking.to}`) }) : ''}
        message={asking ? t(asking.key) : ''} confirmLabel={asking ? t('confirm.yes', { status: t(`status.${asking.to}`) }) : ''}
        danger={asking?.to === 'cancelled' || asking?.to === 'returned'}
        onCancel={() => setAsking(null)} onConfirm={() => asking && apply(asking.to)} />
    </>
  );
}

/** Horizontal status stepper for the order page (pending → confirmed → ongoing → delivered). */
export function StatusStepper({ status }: { status: OrderStatus }) {
  const t = useT();
  const flow: OrderStatus[] = ['pending', 'confirmed', 'ongoing', 'delivered'];
  const idx = flow.indexOf(status);
  const off = status === 'returned' || status === 'cancelled';
  return (
    <ol className="flex items-center gap-1" aria-label={t('common.status')}>
      {flow.map((s, i) => {
        const done = !off && i <= idx;
        return (
          <li key={s} className="flex min-w-0 flex-1 items-center gap-1">
            <span aria-current={s === status ? 'step' : undefined}
              className={cn('flex min-w-0 flex-1 items-center justify-center gap-1 rounded-lg px-1.5 py-1.5 text-2xs font-semibold sm:text-xs',
                done ? STATUS_STYLE[s].badge : 'bg-ink-100 text-ink-400')}>
              {done && <span aria-hidden>✓</span>}<span className="truncate">{t(`status.${s}`)}</span>
            </span>
            {i < flow.length - 1 && <span aria-hidden className={cn('h-0.5 w-2 shrink-0 rounded', done && i < idx ? 'bg-emerald-400' : 'bg-ink-200')} />}
          </li>
        );
      })}
      {off && <li className={cn('ml-1 rounded-lg px-2 py-1.5 text-xs font-semibold', STATUS_STYLE[status].badge)}>{t(`status.${status}`)}</li>}
    </ol>
  );
}

interface Line { key: string; item_id: number | null; item_name: string; quantity: number; unit_price: number; stock?: number }
let lineSeq = 0;
const nextKey = () => `l${++lineSeq}`;
const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

type Mode = 'create' | 'edit' | 'reorder';

/**
 * New / edit / reorder COD order: customer, catalogue picker + custom lines with editable qty/price,
 * delivery and discount, payment type (COD · Pay now · Credit) with credit terms, and extra details.
 */
export function OrderForm({ items, mode = 'create', source, onSaved, trigger }: {
  items: Item[]; mode?: Mode; source?: OrderDetail; onSaved?: (o: Order) => void;
  /** Custom opener; defaults to a "New order" button */
  trigger?: (open: () => void) => React.ReactNode;
}) {
  const t = useT();
  const router = useRouter();
  const { me, labels, refresh } = useCod();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [search, setSearch] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [customer, setCustomer] = useState({ customer_name: '', customer_phone: '', customer_address: '', city: '', notes: '', customer_email: '', po_number: '', tracking_number: '' });
  const [customerType, setCustomerType] = useState<CustomerType>('retail');
  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [paymentType, setPaymentType] = useState<PaymentType>('cod');
  const [credit, setCredit] = useState({ days: '', due: '', note: '', initial: '', method: 'cash' as PaymentMethod });
  const [saveAs, setSaveAs] = useState<OrderStatus>('pending');
  const [more, setMore] = useState(false);

  const itemById = useMemo(() => new Map(items.map(i => [i.id, i])), [items]);
  const results = useMemo(() => {
    if (!search) return [];
    const q = search.toLowerCase();
    return items.filter(i => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q)).slice(0, 8);
  }, [items, search]);

  function fill() {
    if (!source) return;
    setCustomer({
      customer_name: source.customer_name, customer_phone: source.customer_phone, customer_address: source.customer_address,
      city: source.city, notes: mode === 'edit' ? source.notes ?? '' : '', customer_email: source.customer_email ?? '',
      po_number: mode === 'edit' ? source.po_number ?? '' : '', tracking_number: mode === 'edit' ? source.tracking_number ?? '' : '',
    });
    setCustomerType(source.customer_type ?? 'retail');
    setPaymentType(source.payment_type ?? 'cod');
    setDeliveryCharge(Number(source.delivery_charge));
    setDiscount(mode === 'edit' ? Number(source.discount) : 0);
    setCredit({
      days: source.credit_period_days != null ? String(source.credit_period_days) : '',
      due: mode === 'edit' ? source.payment_due_date ?? '' : '', note: mode === 'edit' ? source.credit_note ?? '' : '', initial: '', method: 'cash',
    });
    setLines(source.order_items.map(l => {
      const item = l.item_id != null ? itemById.get(l.item_id) : undefined;
      // Reorder uses today's prices; editing keeps what was charged
      const price = mode === 'reorder' && item ? Number(item.selling_price) : Number(l.unit_price);
      return { key: nextKey(), item_id: item ? item.id : null, item_name: item ? item.name : l.item_name, quantity: l.quantity, unit_price: price, stock: item?.stock_quantity };
    }));
    setMore(mode === 'edit' && !!(source.customer_email || source.po_number || source.tracking_number || source.notes || source.customer_type === 'wholesale'));
  }

  function reset() {
    setLines([]); setSearch(''); setDeliveryCharge(0); setDiscount(0); setError(undefined); setPaymentType('cod');
    setCredit({ days: '', due: '', note: '', initial: '', method: 'cash' }); setSaveAs('pending'); setCustomerType('retail'); setMore(false);
    setCustomer({ customer_name: '', customer_phone: '', customer_address: '', city: '', notes: '', customer_email: '', po_number: '', tracking_number: '' });
  }

  function openForm() { reset(); fill(); setOpen(true); }

  function addItem(item: Item) {
    setLines(prev => prev.some(l => l.item_id === item.id)
      ? prev.map(l => (l.item_id === item.id ? { ...l, quantity: l.quantity + 1 } : l))
      : [...prev, { key: nextKey(), item_id: item.id, item_name: item.name, quantity: 1, unit_price: Number(item.selling_price), stock: item.stock_quantity }]);
    setSearch('');
  }
  const addCustom = () => setLines(prev => [...prev, { key: nextKey(), item_id: null, item_name: search.trim(), quantity: 1, unit_price: 0 }]);
  const updateLine = (key: string, patch: Partial<Line>) => setLines(prev => prev.map(l => (l.key === key ? { ...l, ...patch } : l)));

  const subtotal = round2(lines.reduce((s, l) => s + (l.quantity > 0 ? l.quantity * l.unit_price : 0), 0));
  const total = round2(subtotal + deliveryCharge - discount);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customer.customer_name.trim()) { setError(t('err.customerName')); return; }
    const valid = lines.filter(l => l.quantity > 0);
    if (!valid.length) { setError(t('orders.addAtLeastOne', { item: labels.singularLower })); return; }
    if (valid.some(l => l.item_id == null && !l.item_name.trim())) { setError(t('err.customLineName')); return; }
    if (valid.some(l => l.unit_price < 0) || deliveryCharge < 0 || discount < 0) { setError(t('err.negativeAmount')); return; }
    setPending(true);
    setError(undefined);
    const body: Record<string, unknown> = {
      customer_name: customer.customer_name, customer_phone: customer.customer_phone, customer_address: customer.customer_address,
      city: customer.city, notes: customer.notes || null, customer_email: customer.customer_email || null,
      po_number: customer.po_number || null, tracking_number: customer.tracking_number || null, customer_type: customerType,
      delivery_charge: deliveryCharge, discount, payment_type: paymentType,
      lines: valid.map(l => ({ item_id: l.item_id, custom_name: l.item_id == null ? l.item_name.trim() : undefined, quantity: Math.trunc(l.quantity), unit_price: l.unit_price })),
    };
    if (paymentType === 'credit') {
      body.credit_period_days = credit.days === '' ? null : Number(credit.days);
      body.payment_due_date = credit.due || null;
      body.credit_note = credit.note || null;
    }
    try {
      let saved: Order & { warning?: string };
      if (mode === 'edit' && source) {
        saved = (await api.put<Order>(`/cod/orders/${source.id}`, body)).data;
        toast.success(t('orders.saved'));
      } else {
        if (paymentType === 'credit' && Number(credit.initial) > 0) { body.initial_payment = Number(credit.initial); body.initial_payment_method = credit.method; }
        if (saveAs !== 'pending') body.status = saveAs;
        if (mode === 'reorder' && source) body.reordered_from_order_id = source.id;
        saved = (await api.post<Order & { warning?: string }>('/cod/orders', body)).data;
        if (saved.warning === 'SAVED_PENDING_NO_STOCK') toast(t('orders.savedPendingNoStock'), { icon: '⚠️', duration: 7000 });
        else toast.success(t('orders.created'));
      }
      setOpen(false);
      refresh();
      onSaved?.(saved);
      if (mode !== 'edit') router.push(codHref(`/orders/${saved.id}`));
    } catch (err) {
      setError(orderError(err, t, me));
    } finally {
      setPending(false);
    }
  }

  const c = (key: keyof typeof customer) => ({
    value: customer[key], onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setCustomer(v => ({ ...v, [key]: e.target.value })),
  });
  const title = mode === 'edit' ? t('orders.editTitle', { invoice: source?.invoice_number ?? '' }) : mode === 'reorder' ? t('orders.reorderTitle') : t('orders.formTitle');

  return (
    <>
      {trigger ? trigger(openForm) : <Button onClick={openForm}><Plus /> {t('orders.new')}</Button>}
      <Dialog open={open} onClose={() => setOpen(false)} title={title} width="max-w-2xl">
        <form onSubmit={onSubmit} className="space-y-4">
          {/* Two columns even on phones: phone + city share a row so the order fits on one screen */}
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('orders.customerName')} htmlFor="customer_name" className="col-span-2 sm:col-span-1"><TextInput id="customer_name" required {...c('customer_name')} /></Field>
            <Field label={t('common.phone')} htmlFor="customer_phone"><TextInput id="customer_phone" type="tel" inputMode="tel" {...c('customer_phone')} /></Field>
            <Field label={t('common.city')} htmlFor="city" className="sm:order-last"><TextInput id="city" {...c('city')} /></Field>
            <Field label={t('common.address')} htmlFor="customer_address" className="col-span-2 sm:col-span-1"><TextInput id="customer_address" {...c('customer_address')} /></Field>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-ink-700">{labels.plural}</p>
            <div className="relative">
              <SearchInput value={search} onChange={setSearch} placeholder={t('orders.searchItems', { items: labels.pluralLower })}
                trailing={<button type="button" onClick={addCustom} className={btnClass('outline', 'sm', 'shrink-0')}><Plus /> {t('orders.customLine')}</button>} />
              {results.length > 0 && (
                <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-ink-200 bg-white shadow-lg">
                  {results.map(i => (
                    <button type="button" key={i.id} onClick={() => addItem(i)}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm hover:bg-ink-50">
                      <span>{i.name} <span className="text-ink-400">{t('orders.inStock', { count: i.stock_quantity })}</span></span>
                      <span className="text-ink-500">{formatLKR(i.selling_price)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {lines.length > 0 && (
              <div className="divide-y divide-ink-100 rounded-xl border border-ink-200">
                {lines.map(l => (
                  <div key={l.key} className="flex flex-wrap items-center gap-2 p-2">
                    {l.item_id == null ? (
                      <TextInput aria-label={t('orders.customLineName')} placeholder={t('orders.customLineName')} value={l.item_name}
                        onChange={e => updateLine(l.key, { item_name: e.target.value })} className="min-w-[8rem] flex-1" />
                    ) : (
                      <span className="min-w-[8rem] flex-1 truncate text-sm">
                        {l.item_name}
                        {l.stock != null && l.quantity > l.stock && <span className="ml-1 text-2xs font-semibold text-amber-700">{t('orders.lowStockWarn', { count: l.stock })}</span>}
                      </span>
                    )}
                    <TextInput type="number" min={1} inputMode="numeric" aria-label={t('common.quantity')} value={l.quantity}
                      onChange={e => updateLine(l.key, { quantity: Number(e.target.value) })} className="w-16" />
                    <TextInput type="number" step="0.01" min={0} inputMode="decimal" aria-label={t('common.unitPrice')} value={l.unit_price}
                      onChange={e => updateLine(l.key, { unit_price: Number(e.target.value) })} className="w-24" />
                    <span className="w-24 text-right text-sm">{formatLKR(l.quantity * l.unit_price)}</span>
                    <Button variant="ghost" size="icon" aria-label={t('orders.removeLine')}
                      onClick={() => setLines(prev => prev.filter(x => x.key !== l.key))}><Trash2 /></Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label={t('orders.deliveryCharge')} htmlFor="delivery_charge">
              <TextInput id="delivery_charge" type="number" step="0.01" min={0} inputMode="decimal" value={deliveryCharge} onChange={e => setDeliveryCharge(Number(e.target.value))} />
            </Field>
            <Field label={t('orders.discountLkr')} htmlFor="discount">
              <TextInput id="discount" type="number" step="0.01" min={0} inputMode="decimal" value={discount} onChange={e => setDiscount(Number(e.target.value))} />
            </Field>
          </div>

          {/* Payment type */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-ink-700">{t('pay.label')}</p>
            <div role="radiogroup" aria-label={t('pay.label')} className="grid grid-cols-3 gap-2">
              {PAYMENT_TYPES.map(p => (
                <button key={p} type="button" role="radio" aria-checked={paymentType === p} onClick={() => setPaymentType(p)}
                  className={cn('min-h-[44px] rounded-xl border px-2 text-sm font-semibold transition-colors',
                    paymentType === p ? 'border-[color:var(--cod-primary)] bg-[color:var(--cod-primary)] text-[color:var(--cod-primary-fg)]' : 'border-ink-200 bg-white text-ink-700 hover:bg-ink-50')}>
                  {t(PAYMENT_TYPE_KEY[p])}
                </button>
              ))}
            </div>
            {paymentType === 'credit' && (
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-ink-200 bg-ink-50 p-3">
                <Field label={t('credit.periodDays')} htmlFor="credit_days">
                  <TextInput id="credit_days" type="number" min={0} inputMode="numeric" value={credit.days} placeholder="30" onChange={e => setCredit(v => ({ ...v, days: e.target.value }))} />
                </Field>
                <Field label={t('credit.dueDate')} htmlFor="credit_due" hint={t('credit.dueHint')}>
                  <TextInput id="credit_due" type="date" value={credit.due} onChange={e => setCredit(v => ({ ...v, due: e.target.value }))} />
                </Field>
                {mode !== 'edit' && (
                  <>
                    <Field label={t('credit.initialPayment')} htmlFor="credit_initial">
                      <TextInput id="credit_initial" type="number" min={0} step="0.01" inputMode="decimal" value={credit.initial} placeholder="0" onChange={e => setCredit(v => ({ ...v, initial: e.target.value }))} />
                    </Field>
                    <Field label={t('credit.method')} htmlFor="credit_method">
                      <NativeSelect id="credit_method" value={credit.method} onChange={e => setCredit(v => ({ ...v, method: e.target.value as PaymentMethod }))}>
                        {PAYMENT_METHODS.map(m => <option key={m} value={m}>{t(`method.${m}`)}</option>)}
                      </NativeSelect>
                    </Field>
                  </>
                )}
                <Field label={t('credit.note')} htmlFor="credit_note" className="col-span-2">
                  <TextInput id="credit_note" value={credit.note} onChange={e => setCredit(v => ({ ...v, note: e.target.value }))} />
                </Field>
              </div>
            )}
          </div>

          {mode !== 'edit' && (
            <Field label={t('orders.saveAs')} htmlFor="save_as">
              <NativeSelect id="save_as" value={saveAs} onChange={e => setSaveAs(e.target.value as OrderStatus)}>
                {(['pending', 'confirmed', 'ongoing', 'delivered'] as OrderStatus[]).map(s => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
              </NativeSelect>
            </Field>
          )}

          <div>
            <button type="button" aria-expanded={more} onClick={() => setMore(m => !m)}
              className="flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-ink-600 hover:text-ink-900">
              <ChevronDown size={16} className={cn('transition-transform', more && 'rotate-180')} /> {t('orders.moreDetails')}
            </button>
            {more && (
              <div className="mt-2 grid grid-cols-2 gap-3">
                <Field label={t('orders.customerType')} htmlFor="customer_type">
                  <NativeSelect id="customer_type" value={customerType} onChange={e => setCustomerType(e.target.value as CustomerType)}>
                    <option value="retail">{t('orders.retail')}</option>
                    <option value="wholesale">{t('orders.wholesale')}</option>
                  </NativeSelect>
                </Field>
                <Field label={t('common.email')} htmlFor="customer_email"><TextInput id="customer_email" type="email" {...c('customer_email')} /></Field>
                <Field label={t('orders.poNumber')} htmlFor="po_number"><TextInput id="po_number" {...c('po_number')} /></Field>
                <Field label={t('orders.tracking')} htmlFor="tracking_number"><TextInput id="tracking_number" {...c('tracking_number')} /></Field>
                <Field label={t('common.notes')} htmlFor="notes" className="col-span-2"><TextArea id="notes" rows={2} {...c('notes')} /></Field>
              </div>
            )}
          </div>

          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          {/* Total sits with the button in the pinned bar, so it's always visible while filling the form */}
          <div className="flex items-center justify-between gap-3">
            <span className="min-w-0 text-sm">
              <span className="block text-base font-bold text-ink-900">{formatLKR(total)}</span>
              <span className="block truncate text-xs text-ink-500">
                {t('orders.summary', { subtotal: formatLKR(subtotal), delivery: formatLKR(deliveryCharge) })}
                {discount > 0 && t('orders.summaryDiscount', { discount: formatLKR(discount) })}
              </span>
            </span>
            <Button type="submit" disabled={pending} className="flex-shrink-0">
              {pending ? t('orders.creating') : mode === 'edit' ? <><PencilLine /> {t('common.saveChanges')}</> : t('orders.create')}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}

export { today as localToday };
