'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { CheckCheck, Trash2 } from 'lucide-react';
import api from '../../lib/api';
import { useT } from '../../lib/cod/i18n/client';
import { formatDate, formatLKR } from '../../lib/cod/format';
import { BUCKET_TONE, summariseCredit } from '../../lib/cod/credit';
import { orderError } from '../../lib/cod/order-messages';
import { useCodCan } from '../../lib/cod/capabilities';
import { PAYMENT_METHODS, type OrderDetail, type PaymentMethod } from '../../lib/cod/types';
import { Badge, Button, Card, Field, NativeSelect, TextInput, cn } from './ui';

const localToday = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

/** Paid / owed / due for a credit order, its payments, and add / settle / delete. */
export function CreditPanel({ order, onChanged }: { order: OrderDetail; onChanged: () => void }) {
  const t = useT();
  const can = useCodCan();
  const allowed = can('credit');
  const { credit } = order;
  const [form, setForm] = useState({ amount: '', date: localToday(), method: 'cash' as PaymentMethod, notes: '' });
  const [busy, setBusy] = useState<'add' | 'settle' | number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const preview = summariseCredit(credit.total, credit.paid + (Number(form.amount) || 0));
  const closed = order.status === 'cancelled' || order.status === 'returned';

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!(amount > 0)) { toast.error(t('err.paymentAmount')); return; }
    if (amount > credit.outstanding) { toast.error(t('err.paymentTooLarge', { outstanding: formatLKR(credit.outstanding) })); return; }
    setBusy('add');
    try {
      await api.post(`/cod/orders/${order.id}/payments`, { amount, payment_date: form.date, method: form.method, notes: form.notes || null });
      toast.success(t('credit.paymentAdded'));
      setForm(f => ({ ...f, amount: '', notes: '' }));
      onChanged();
    } catch (err) {
      toast.error(orderError(err, t));
    } finally { setBusy(null); }
  }

  async function settle() {
    setBusy('settle');
    try {
      await api.post(`/cod/orders/${order.id}/settle`, { payment_date: form.date, method: form.method });
      toast.success(t('credit.settled'));
      onChanged();
    } catch (err) {
      toast.error(orderError(err, t));
    } finally { setBusy(null); }
  }

  async function remove(id: number) {
    if (confirmDelete !== id) { setConfirmDelete(id); return; }
    setBusy(id);
    try {
      await api.delete(`/cod/orders/${order.id}/payments/${id}`);
      toast.success(t('credit.paymentDeleted'));
      setConfirmDelete(null);
      onChanged();
    } catch (err) {
      toast.error(orderError(err, t));
    } finally { setBusy(null); }
  }

  return (
    <Card title={t('credit.panelTitle')}>
      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label={t('common.total')} value={formatLKR(credit.total)} />
        <Stat label={t('credit.paid')} value={formatLKR(credit.paid)} tone="green" />
        <Stat label={t('credit.outstanding')} value={formatLKR(credit.outstanding)} tone={credit.outstanding > 0 ? 'red' : undefined} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <Badge tone={credit.status === 'paid' ? 'green' : credit.status === 'partial' ? 'amber' : 'gray'}>{t(`credit.status.${credit.status}`)}</Badge>
        {credit.outstanding > 0 && credit.bucket !== 'none' && <Badge tone={BUCKET_TONE[credit.bucket]}>{t(`credit.bucket.${credit.bucket}`)}</Badge>}
        {order.payment_due_date && <span className="text-ink-500">{t('credit.dueOn', { date: formatDate(order.payment_due_date, t.locale) })}</span>}
        {order.credit_note && <span className="w-full text-xs text-ink-500">{order.credit_note}</span>}
      </div>

      {order.payments.length > 0 && (
        <ul className="mt-4 divide-y divide-ink-100 rounded-xl border border-ink-200">
          {order.payments.map(p => (
            <li key={p.id} className="flex items-center gap-2 px-3 py-2 text-sm">
              <span className="min-w-0 flex-1">
                <span className="font-semibold text-ink-900">{formatLKR(p.amount)}</span>
                <span className="ml-2 text-ink-500">{formatDate(p.payment_date, t.locale)} · {t(`method.${p.method}`)}</span>
                {p.notes && <span className="block truncate text-xs text-ink-400">{p.notes}</span>}
              </span>
              {allowed && (
                <Button variant={confirmDelete === p.id ? 'danger' : 'ghost'} size={confirmDelete === p.id ? 'sm' : 'icon'}
                  aria-label={t('credit.deletePayment')} disabled={busy === p.id} onClick={() => remove(p.id)} onBlur={() => setConfirmDelete(null)}>
                  {confirmDelete === p.id ? t('credit.tapToConfirm') : <Trash2 />}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {allowed && !closed && credit.outstanding > 0 && (
        <form onSubmit={add} className="mt-4 space-y-3 border-t border-ink-100 pt-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('credit.amount')} htmlFor="pay_amount" hint={Number(form.amount) > 0 ? t('credit.after', { value: formatLKR(preview.outstanding) }) : undefined}>
              <TextInput id="pay_amount" type="number" min={0.01} step="0.01" max={credit.outstanding} inputMode="decimal" value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder={String(credit.outstanding)} />
            </Field>
            <Field label={t('common.date')} htmlFor="pay_date">
              <TextInput id="pay_date" type="date" max={localToday()} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </Field>
            <Field label={t('credit.method')} htmlFor="pay_method">
              <NativeSelect id="pay_method" value={form.method} onChange={e => setForm(f => ({ ...f, method: e.target.value as PaymentMethod }))}>
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{t(`method.${m}`)}</option>)}
              </NativeSelect>
            </Field>
            <Field label={t('common.notes')} htmlFor="pay_notes">
              <TextInput id="pay_notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </Field>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={settle} disabled={busy !== null}><CheckCheck /> {t('credit.settle', { value: formatLKR(credit.outstanding) })}</Button>
            <Button type="submit" disabled={busy !== null}>{busy === 'add' ? t('common.saving') : t('credit.addPayment')}</Button>
          </div>
        </form>
      )}
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'green' | 'red' }) {
  return (
    <div className="rounded-xl bg-ink-50 px-2 py-2">
      <p className="text-2xs text-ink-500">{label}</p>
      <p className={cn('text-sm font-bold', tone === 'green' ? 'text-emerald-700' : tone === 'red' ? 'text-red-600' : 'text-ink-900')}>{value}</p>
    </div>
  );
}
