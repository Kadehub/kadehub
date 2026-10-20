'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Plus, Trash2 } from 'lucide-react';
import api from '../../lib/api';
import { useT } from '../../lib/cod/i18n/client';
import { formatLKR } from '../../lib/cod/format';
import { round2 } from '../../lib/cod/calc';
import { STATUS_STYLE } from '../../lib/cod/order-status';
import { ORDER_STATUSES, type Item, type Order, type OrderStatus } from '../../lib/cod/types';
import { apiError } from '../../lib/cod/session';
import { useCod } from './CodContext';
import { codHref } from './bits';
import { Button, Dialog, Field, SearchInput, TextArea, TextInput, cn } from './ui';

/** Coloured status pill that moves the order to another stage (stock follows on the server). */
export function StatusSelect({ order, onChanged }: { order: Pick<Order, 'id' | 'status'>; onChanged?: (o: Order) => void }) {
  const t = useT();
  const [value, setValue] = useState<OrderStatus>(order.status);
  const [busy, setBusy] = useState(false);
  // Keep in step when the parent reloads with a new status (e.g. after a bulk change)
  const [seen, setSeen] = useState(order.status);
  if (seen !== order.status) { setSeen(order.status); setValue(order.status); }

  async function change(next: OrderStatus) {
    const prev = value;
    setValue(next);
    setBusy(true);
    try {
      const { data } = await api.patch<Order>(`/cod/orders/${order.id}/status`, { status: next });
      toast.success(t('orders.marked', { status: t(`status.${next}`) }));
      onChanged?.(data);
    } catch (err) {
      setValue(prev);
      toast.error(apiError(err, t));
    } finally {
      setBusy(false);
    }
  }

  return (
    <select aria-label={t('common.status')} value={value} disabled={busy} onChange={e => change(e.target.value as OrderStatus)}
      className={cn('h-7 rounded-full border-0 pl-2.5 pr-7 text-xs font-semibold', STATUS_STYLE[value].badge)}>
      {ORDER_STATUSES.map(s => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
    </select>
  );
}

interface Line { item_id: number; item_name: string; quantity: number; unit_price: number }

/** New COD order: customer, searchable item picker with editable qty/price, delivery and discount. */
export function OrderForm({ items, onCreated }: { items: Item[]; onCreated?: () => void }) {
  const t = useT();
  const router = useRouter();
  const { me, labels, refresh } = useCod();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [search, setSearch] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [customer, setCustomer] = useState({ customer_name: '', customer_phone: '', customer_address: '', city: '', notes: '' });
  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const [discount, setDiscount] = useState(0);

  const results = useMemo(() => {
    if (!search) return [];
    const q = search.toLowerCase();
    return items.filter(i => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q)).slice(0, 8);
  }, [items, search]);

  function addItem(item: Item) {
    setLines(prev => prev.some(l => l.item_id === item.id)
      ? prev.map(l => (l.item_id === item.id ? { ...l, quantity: l.quantity + 1 } : l))
      : [...prev, { item_id: item.id, item_name: item.name, quantity: 1, unit_price: Number(item.selling_price) }]);
    setSearch('');
  }
  const updateLine = (id: number, patch: Partial<Line>) => setLines(prev => prev.map(l => (l.item_id === id ? { ...l, ...patch } : l)));

  const subtotal = round2(lines.reduce((s, l) => s + l.quantity * l.unit_price, 0));
  const total = round2(subtotal + deliveryCharge - discount);

  function reset() {
    setLines([]); setSearch(''); setDeliveryCharge(0); setDiscount(0); setError(undefined);
    setCustomer({ customer_name: '', customer_phone: '', customer_address: '', city: '', notes: '' });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customer.customer_name.trim()) { setError(t('err.customerName')); return; }
    const valid = lines.filter(l => l.quantity > 0);
    if (!valid.length) { setError(t('orders.addAtLeastOne', { item: labels.singularLower })); return; }
    setPending(true);
    setError(undefined);
    try {
      const { data } = await api.post<Order>('/cod/orders', {
        ...customer, notes: customer.notes || null, delivery_charge: deliveryCharge, discount,
        lines: valid.map(l => ({ item_id: l.item_id, quantity: Math.trunc(l.quantity), unit_price: l.unit_price })),
      });
      toast.success(t('orders.created'));
      setOpen(false);
      reset();
      refresh();
      onCreated?.();
      router.push(codHref(`/orders/${data.id}`));
    } catch (err) {
      setError(apiError(err, t, me));
    } finally {
      setPending(false);
    }
  }

  const c = (key: keyof typeof customer) => ({
    value: customer[key], onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setCustomer(v => ({ ...v, [key]: e.target.value })),
  });

  return (
    <>
      <Button onClick={() => setOpen(true)}><Plus /> {t('orders.new')}</Button>
      <Dialog open={open} onClose={() => { setOpen(false); reset(); }} title={t('orders.formTitle')} width="max-w-2xl">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={t('orders.customerName')} htmlFor="customer_name"><TextInput id="customer_name" required {...c('customer_name')} /></Field>
            <Field label={t('common.phone')} htmlFor="customer_phone"><TextInput id="customer_phone" type="tel" {...c('customer_phone')} /></Field>
            <Field label={t('common.address')} htmlFor="customer_address"><TextInput id="customer_address" {...c('customer_address')} /></Field>
            <Field label={t('common.city')} htmlFor="city"><TextInput id="city" {...c('city')} /></Field>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-ink-700">{labels.plural}</p>
            <div className="relative">
              <SearchInput value={search} onChange={setSearch} placeholder={t('orders.searchItems', { items: labels.pluralLower })} />
              {results.length > 0 && (
                <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-ink-200 bg-white shadow-lg">
                  {results.map(i => (
                    <button type="button" key={i.id} onClick={() => addItem(i)}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-ink-50">
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
                  <div key={l.item_id} className="flex flex-wrap items-center gap-2 p-2">
                    <span className="min-w-[8rem] flex-1 truncate text-sm">{l.item_name}</span>
                    <TextInput type="number" min={1} aria-label={t('common.quantity')} value={l.quantity}
                      onChange={e => updateLine(l.item_id, { quantity: Number(e.target.value) })} className="w-16" />
                    <TextInput type="number" step="0.01" min={0} aria-label={t('common.unitPrice')} value={l.unit_price}
                      onChange={e => updateLine(l.item_id, { unit_price: Number(e.target.value) })} className="w-24" />
                    <span className="w-24 text-right text-sm">{formatLKR(l.quantity * l.unit_price)}</span>
                    <Button variant="ghost" size="icon" aria-label={t('orders.deleteAria')}
                      onClick={() => setLines(prev => prev.filter(x => x.item_id !== l.item_id))}><Trash2 /></Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label={t('orders.deliveryCharge')} htmlFor="delivery_charge">
              <TextInput id="delivery_charge" type="number" step="0.01" min={0} value={deliveryCharge} onChange={e => setDeliveryCharge(Number(e.target.value))} />
            </Field>
            <Field label={t('orders.discountLkr')} htmlFor="discount">
              <TextInput id="discount" type="number" step="0.01" min={0} value={discount} onChange={e => setDiscount(Number(e.target.value))} />
            </Field>
          </div>
          <Field label={t('common.notes')} htmlFor="notes"><TextArea id="notes" rows={2} {...c('notes')} /></Field>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-ink-200 bg-ink-50 p-3 text-sm">
            <span className="text-ink-500">
              {t('orders.summary', { subtotal: formatLKR(subtotal), delivery: formatLKR(deliveryCharge) })}
              {discount > 0 && t('orders.summaryDiscount', { discount: formatLKR(discount) })}
            </span>
            <span className="text-base font-bold text-ink-900">{formatLKR(total)}</span>
          </div>

          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>{pending ? t('orders.creating') : t('orders.create')}</Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
