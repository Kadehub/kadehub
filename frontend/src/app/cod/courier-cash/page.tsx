'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { AlertTriangle, Coins, FileUp, Trash2 } from 'lucide-react';
import { MascotState } from '../../../components/brand/Mascot';
import { codHref } from '../../../components/cod/bits';
import { fetchCouriers } from '../../../components/cod/couriers';
import { ConfirmDialog } from '../../../components/cod/orders';
import { Badge, Button, Card, Dialog, Field, Kpi, NativeSelect, PageHeader, TextInput, cn, tbl } from '../../../components/cod/ui';
import api from '../../../lib/api';
import { useCodCan } from '../../../lib/cod/capabilities';
import { formatDate, formatLKR } from '../../../lib/cod/format';
import { useT } from '../../../lib/cod/i18n/client';
import type { MessageKey } from '../../../lib/cod/i18n/messages/en';
import { orderError } from '../../../lib/cod/order-messages';
import { guessMapping, readStatementFile, splitFee, statementRows, toTable, type StatementMapping, type StatementRow, type StatementTable } from '../../../lib/cod/statement';
import type { Courier } from '../../../lib/cod/types';

interface CashOrder { id: number; invoice_number: string; customer_name: string; tracking_number: string | null; courier_id: number; courier_name: string; total_amount: number; delivered_at: string | null }
interface Remittance { id: number; courier_id: number; courier_name: string; reference: string; paid_on: string; collected: number; fees: number; received: number; notes: string | null }
interface Overview {
  overdue_after_days: number;
  totals: { with_couriers: number; orders: number; overdue: number; received_this_month: number; fees_this_month: number; delivered_without_courier: number };
  couriers: { courier_id: number; name: string; count: number; amount: number; overdue_count: number; overdue_amount: number; oldest: string | null }[];
  orders: CashOrder[];
  remittances: Remittance[];
}
type Outcome = 'matched' | 'short' | 'over' | 'not_delivered' | 'unmatched' | 'duplicate' | 'ambiguous' | 'already_settled' | 'wrong_courier';
interface CheckedLine { row: number; order_id: number | null; invoice_number: string | null; customer_name: string | null; tracking_number: string; collected: number; fee: number; expected: number; difference: number; outcome: Outcome }
interface Preview { lines: CheckedLine[]; totals: { collected: number; fees: number; net: number; applied: number; skipped: number; problems: number } }

const OUTCOME_KEY: Record<Outcome, MessageKey> = {
  matched: 'cash.outcome.matched', short: 'cash.outcome.short', over: 'cash.outcome.over', not_delivered: 'cash.outcome.notDelivered',
  unmatched: 'cash.outcome.unmatched', duplicate: 'cash.outcome.duplicate', ambiguous: 'cash.outcome.ambiguous',
  already_settled: 'cash.outcome.alreadySettled', wrong_courier: 'cash.outcome.wrongCourier',
};
const OUTCOME_TONE: Record<Outcome, 'green' | 'amber' | 'red' | 'gray'> = {
  matched: 'green', short: 'red', over: 'amber', not_delivered: 'amber', unmatched: 'red', duplicate: 'gray', ambiguous: 'red', already_settled: 'gray', wrong_courier: 'red',
};
const isApplied = (o: Outcome) => ['matched', 'short', 'over', 'not_delivered'].includes(o);
const todayLocal = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10);

// cod.kadehub.com/courier-cash — what each courier still owes, and the payments that settled it
export default function CourierCashPage() {
  const t = useT();
  const can = useCodCan();
  const [data, setData] = useState<Overview | null>(null);
  const [failed, setFailed] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [paying, setPaying] = useState<{ id: number; name: string } | null>(null);
  const [viewing, setViewing] = useState<number | null>(null);
  const [undoing, setUndoing] = useState<Remittance | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setFailed(false);
    api.get<Overview>('/cod/settlements').then(r => setData(r.data)).catch(() => setFailed(true));
  };
  useEffect(load, []);

  if (!can('reports')) return <MascotState variant="error" title={t('err.noPermission')} />;
  if (failed) return <MascotState variant="error" title={t('app.loadErrorTitle')} description={t('app.loadErrorBody')} action={<Button onClick={load}>{t('common.retry')}</Button>} />;
  if (!data) return <MascotState variant="loading" size="sm" title={t('app.loading')} />;

  async function undo() {
    if (!undoing) return;
    setBusy(true);
    try {
      await api.delete(`/cod/settlements/${undoing.id}`);
      toast.success(t('cash.undone'));
      setUndoing(null);
      load();
    } catch (err) {
      toast.error(orderError(err, t));
    } finally {
      setBusy(false);
    }
  }

  const { totals } = data;
  return (
    <div className="space-y-4">
      <PageHeader title={t('nav.courierCash')} subtitle={t('cash.subtitle')}
        actions={<Button onClick={() => setUploading(true)}><FileUp /> {t('cash.upload')}</Button>} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label={t('cash.withCouriers')} value={formatLKR(totals.with_couriers)} hint={t('cash.ordersCount', { count: totals.orders })} />
        <Kpi label={t('cash.overdue')} value={formatLKR(totals.overdue)} hint={t('cash.overdueHint', { days: data.overdue_after_days })} tone={totals.overdue > 0 ? 'danger' : undefined} />
        <Kpi label={t('cash.receivedMonth')} value={formatLKR(totals.received_this_month)} />
        <Kpi label={t('cash.feesMonth')} value={formatLKR(totals.fees_this_month)} />
      </div>

      {totals.delivered_without_courier > 0 && (
        <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {t('cash.noCourierNote', { count: totals.delivered_without_courier })}
        </p>
      )}

      <Card title={t('cash.byCourier')}>
        {data.couriers.length === 0 ? <p className="text-sm text-ink-500">{t('cash.allSettled')}</p> : (
          <div className="overflow-x-auto">
            <table className={tbl.table}>
              <thead><tr>
                <th className={tbl.th}>{t('orders.courier')}</th>
                <th className={`${tbl.th} ${tbl.right}`}>{t('nav.orders')}</th>
                <th className={`${tbl.th} ${tbl.right}`}>{t('cash.owed')}</th>
                <th className={`${tbl.th} ${tbl.right}`}>{t('cash.overdue')}</th>
                <th className={tbl.th}>{t('cash.oldest')}</th>
                <th className={tbl.th} />
              </tr></thead>
              <tbody>
                {data.couriers.map(c => (
                  <tr key={c.courier_id}>
                    <td className={`${tbl.td} font-semibold`}>{c.name}</td>
                    <td className={`${tbl.td} ${tbl.right} whitespace-nowrap`}>{c.count}</td>
                    <td className={`${tbl.td} ${tbl.right} whitespace-nowrap`}>{formatLKR(c.amount)}</td>
                    <td className={cn(tbl.td, tbl.right, 'whitespace-nowrap', c.overdue_amount > 0 && 'font-semibold text-red-600')}>{formatLKR(c.overdue_amount)}</td>
                    <td className={`${tbl.td} whitespace-nowrap text-ink-500`}>{c.oldest ? formatDate(c.oldest, t.locale) : '—'}</td>
                    <td className={`${tbl.td} ${tbl.right} whitespace-nowrap`}>
                      <Button variant="outline" size="sm" onClick={() => setPaying({ id: c.courier_id, name: c.name })}><Coins /> {t('cash.recordPayment')}</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title={t('cash.payments')}>
        {data.remittances.length === 0 ? <p className="text-sm text-ink-500">{t('cash.noPayments')}</p> : (
          <div className="overflow-x-auto">
            <table className={tbl.table}>
              <thead><tr>
                <th className={tbl.th}>{t('common.date')}</th>
                <th className={tbl.th}>{t('orders.courier')}</th>
                <th className={tbl.th}>{t('cash.reference')}</th>
                <th className={`${tbl.th} ${tbl.right}`}>{t('cash.collected')}</th>
                <th className={`${tbl.th} ${tbl.right}`}>{t('cash.fees')}</th>
                <th className={`${tbl.th} ${tbl.right}`}>{t('cash.received')}</th>
                <th className={tbl.th} />
              </tr></thead>
              <tbody>
                {data.remittances.map(r => (
                  <tr key={r.id}>
                    <td className={`${tbl.td} whitespace-nowrap`}>
                      <button type="button" className="font-semibold text-[color:var(--cod-primary)] hover:underline" onClick={() => setViewing(r.id)}>{formatDate(r.paid_on, t.locale)}</button>
                    </td>
                    <td className={tbl.td}>{r.courier_name}</td>
                    <td className={`${tbl.td} text-ink-500`}>{r.reference || '—'}</td>
                    <td className={`${tbl.td} ${tbl.right} whitespace-nowrap`}>{formatLKR(r.collected)}</td>
                    <td className={`${tbl.td} ${tbl.right} whitespace-nowrap`}>{formatLKR(r.fees)}</td>
                    <td className={`${tbl.td} ${tbl.right} whitespace-nowrap`}>{formatLKR(r.received)}</td>
                    <td className={`${tbl.td} ${tbl.right} whitespace-nowrap`}>
                      <Button variant="ghost" size="icon" aria-label={t('cash.undo')} className="text-red-600" onClick={() => setUndoing(r)}><Trash2 /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {uploading && <StatementDialog onClose={() => setUploading(false)} onSaved={() => { setUploading(false); load(); }} />}
      {paying && <ManualPaymentDialog courier={paying} orders={data.orders.filter(o => o.courier_id === paying.id)} onClose={() => setPaying(null)} onSaved={() => { setPaying(null); load(); }} />}
      {viewing !== null && <PaymentDetail id={viewing} onClose={() => setViewing(null)} />}
      <ConfirmDialog open={!!undoing} busy={busy} danger title={t('cash.undo')} message={t('cash.undoConfirm')} confirmLabel={t('cash.undo')} onCancel={() => setUndoing(null)} onConfirm={undo} />
    </div>
  );
}

function PaymentFields({ paidOn, setPaidOn, reference, setReference, received, setReceived, net }: {
  paidOn: string; setPaidOn: (v: string) => void; reference: string; setReference: (v: string) => void; received: string; setReceived: (v: string) => void; net: number;
}) {
  const t = useT();
  const differs = received !== '' && Math.abs(Number(received) - net) >= 0.01;
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Field label={t('cash.paidOn')} htmlFor="paid_on"><TextInput id="paid_on" type="date" required value={paidOn} onChange={e => setPaidOn(e.target.value)} /></Field>
      <Field label={t('cash.reference')} htmlFor="reference"><TextInput id="reference" maxLength={100} value={reference} onChange={e => setReference(e.target.value)} /></Field>
      <Field label={t('cash.receivedInBank')} htmlFor="received" hint={differs ? t('cash.receivedDiffers', { amount: formatLKR(net) }) : undefined}>
        <TextInput id="received" type="number" min={0} step="0.01" inputMode="decimal" placeholder={String(Math.max(net, 0))} value={received} onChange={e => setReceived(e.target.value)} />
      </Field>
    </div>
  );
}

/** Upload → match the columns → check against orders → save. Nothing is stored until the last step. */
function StatementDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const t = useT();
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [courierId, setCourierId] = useState('');
  const [table, setTable] = useState<StatementTable | null>(null);
  const [mapping, setMapping] = useState<StatementMapping>({ tracking: '', collected: '', fee: '' });
  const [preview, setPreview] = useState<Preview | null>(null);
  const [rows, setRows] = useState<StatementRow[]>([]);
  const [unreadable, setUnreadable] = useState<string[]>([]);
  const [paidOn, setPaidOn] = useState(todayLocal());
  const [reference, setReference] = useState('');
  const [received, setReceived] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => { fetchCouriers().then(setCouriers).catch(() => setError(t('app.loadErrorBody'))); }, [t]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !courierId) return;
    setError(undefined);
    setPreview(null);
    setBusy(true);
    try {
      const parsed = toTable(await readStatementFile(file));
      if (!parsed) { setError(t('cash.fileEmpty')); setTable(null); return; }
      const saved = await api.get<{ mapping: Partial<StatementMapping> | null }>(`/cod/settlements/mapping/${courierId}`).then(r => r.data.mapping).catch(() => null);
      setTable(parsed);
      setMapping(guessMapping(parsed.headers, saved));
    } catch {
      setError(t('cash.fileUnreadable'));
      setTable(null);
    } finally {
      setBusy(false);
    }
  }

  async function check() {
    if (!table) return;
    if (!mapping.tracking || !mapping.collected) { setError(t('cash.mapRequired')); return; }
    const read = statementRows(table, mapping);
    if (!read.rows.length) { setError(t('cash.fileEmpty')); return; }
    setBusy(true);
    setError(undefined);
    try {
      const { data } = await api.post<Preview>('/cod/settlements/preview', { courier_id: Number(courierId), rows: read.rows });
      setRows(read.rows);
      setUnreadable(read.unreadable);
      setPreview(data);
    } catch (err) {
      setError(orderError(err, t));
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    setError(undefined);
    try {
      await api.post('/cod/settlements', {
        courier_id: Number(courierId), rows, paid_on: paidOn, reference: reference || undefined, mapping,
        ...(received !== '' ? { received: Number(received) } : {}),
      });
      toast.success(t('cash.saved'));
      onSaved();
    } catch (err) {
      setError(orderError(err, t));
      setBusy(false);
    }
  }

  const column = (id: string, label: string, key: keyof StatementMapping, optional = false) => (
    <Field label={label} htmlFor={id}>
      <NativeSelect id={id} value={mapping[key]} onChange={e => { setMapping(m => ({ ...m, [key]: e.target.value })); setPreview(null); }}>
        <option value="">{optional ? t('cash.noColumn') : t('cash.chooseColumn')}</option>
        {table?.headers.map(h => <option key={h} value={h}>{h}</option>)}
      </NativeSelect>
    </Field>
  );

  return (
    <Dialog open onClose={() => !busy && onClose()} title={t('cash.upload')} width="max-w-3xl">
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('orders.courier')} htmlFor="statement_courier">
            <NativeSelect id="statement_courier" value={courierId} onChange={e => { setCourierId(e.target.value); setTable(null); setPreview(null); }}>
              <option value="">{t('cash.chooseCourier')}</option>
              {couriers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </NativeSelect>
          </Field>
          <Field label={t('cash.statementFile')} htmlFor="statement_file" hint={t('cash.fileHint')}>
            <TextInput id="statement_file" type="file" accept=".csv,.xlsx,text/csv" disabled={!courierId || busy} onChange={onFile} />
          </Field>
        </div>

        {table && (
          <div className="grid gap-3 sm:grid-cols-3">
            {column('map_tracking', t('cash.mapTracking'), 'tracking')}
            {column('map_collected', t('cash.mapCollected'), 'collected')}
            {column('map_fee', t('cash.mapFee'), 'fee', true)}
          </div>
        )}
        {table && !preview && <Button onClick={check} disabled={busy}>{busy ? t('common.preparing') : t('cash.check')}</Button>}

        {preview && (
          <>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="rounded-xl bg-ink-50 p-3"><p className="text-xs text-ink-500">{t('cash.collected')}</p><p className="font-bold">{formatLKR(preview.totals.collected)}</p></div>
              <div className="rounded-xl bg-ink-50 p-3"><p className="text-xs text-ink-500">{t('cash.fees')}</p><p className="font-bold">{formatLKR(preview.totals.fees)}</p></div>
              <div className="rounded-xl bg-ink-50 p-3"><p className="text-xs text-ink-500">{t('cash.net')}</p><p className="font-bold">{formatLKR(preview.totals.net)}</p></div>
            </div>
            <p className="text-sm text-ink-600">{t('cash.previewSummary', { applied: preview.totals.applied, skipped: preview.totals.skipped, problems: preview.totals.problems })}</p>
            {unreadable.length > 0 && <p role="alert" className="text-sm text-red-600">{t('cash.unreadableRows', { rows: unreadable.slice(0, 8).join(', ') })}</p>}
            <div className={cn(tbl.wrap, 'max-h-72 overflow-y-auto')}>
              <table className={tbl.table}>
                <thead><tr>
                  <th className={tbl.th}>{t('orders.tracking')}</th>
                  <th className={tbl.th}>{t('common.invoice')}</th>
                  <th className={`${tbl.th} ${tbl.right}`}>{t('cash.expected')}</th>
                  <th className={`${tbl.th} ${tbl.right}`}>{t('cash.collected')}</th>
                  <th className={`${tbl.th} ${tbl.right}`}>{t('cash.fees')}</th>
                  <th className={tbl.th}>{t('common.status')}</th>
                </tr></thead>
                <tbody>
                  {/* Problems first: that's what the person needs to read */}
                  {[...preview.lines].sort((a, b) => Number(a.outcome === 'matched') - Number(b.outcome === 'matched') || a.row - b.row).map(l => (
                    <tr key={l.row} className={isApplied(l.outcome) ? undefined : 'opacity-70'}>
                      <td className={tbl.td}>{l.tracking_number}</td>
                      <td className={`${tbl.td} text-ink-500`}>{l.invoice_number ?? '—'}</td>
                      <td className={`${tbl.td} ${tbl.right} whitespace-nowrap`}>{l.order_id ? formatLKR(l.expected) : '—'}</td>
                      <td className={`${tbl.td} ${tbl.right} whitespace-nowrap`}>{formatLKR(l.collected)}</td>
                      <td className={`${tbl.td} ${tbl.right} whitespace-nowrap`}>{formatLKR(l.fee)}</td>
                      <td className={tbl.td}><Badge tone={OUTCOME_TONE[l.outcome]}>{t(OUTCOME_KEY[l.outcome])}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PaymentFields paidOn={paidOn} setPaidOn={setPaidOn} reference={reference} setReference={setReference} received={received} setReceived={setReceived} net={preview.totals.net} />
          </>
        )}

        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" disabled={busy} onClick={onClose}>{t('common.cancel')}</Button>
          {preview && <Button disabled={busy || !preview.totals.applied || !paidOn} onClick={save}>{busy ? t('common.saving') : t('cash.save', { count: preview.totals.applied })}</Button>}
        </div>
      </div>
    </Dialog>
  );
}

/** For couriers that send no usable statement: tick what the payment covered. */
function ManualPaymentDialog({ courier, orders, onClose, onSaved }: { courier: { id: number; name: string }; orders: CashOrder[]; onClose: () => void; onSaved: () => void }) {
  const t = useT();
  const [selected, setSelected] = useState<Set<number>>(() => new Set(orders.map(o => o.id)));
  const [fees, setFees] = useState('');
  const [paidOn, setPaidOn] = useState(todayLocal());
  const [reference, setReference] = useState('');
  const [received, setReceived] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const chosen = useMemo(() => orders.filter(o => selected.has(o.id)), [orders, selected]);
  const collected = Math.round(chosen.reduce((s, o) => s + Number(o.total_amount), 0) * 100) / 100;
  const net = Math.round((collected - (Number(fees) || 0)) * 100) / 100;
  const toggle = (id: number) => setSelected(prev => { const n = new Set(prev); if (!n.delete(id)) n.add(id); return n; });

  async function save() {
    setBusy(true);
    setError(undefined);
    const split = splitFee(Number(fees) || 0, chosen.length);
    try {
      await api.post('/cod/settlements', {
        courier_id: courier.id, paid_on: paidOn, reference: reference || undefined,
        rows: chosen.map((o, i) => ({ order_id: o.id, collected: Number(o.total_amount), fee: split[i] })),
        ...(received !== '' ? { received: Number(received) } : {}),
      });
      toast.success(t('cash.saved'));
      onSaved();
    } catch (err) {
      setError(orderError(err, t));
      setBusy(false);
    }
  }

  return (
    <Dialog open onClose={() => !busy && onClose()} title={t('cash.recordPaymentFrom', { courier: courier.name })} width="max-w-2xl">
      <div className="space-y-4">
        <ul className="max-h-64 divide-y divide-ink-100 overflow-y-auto rounded-xl border border-ink-200">
          {orders.map(o => (
            <li key={o.id}>
              <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-ink-50">
                <input type="checkbox" className="h-4 w-4 accent-[color:var(--cod-primary)]" checked={selected.has(o.id)} onChange={() => toggle(o.id)} />
                <span className="min-w-0 flex-1 truncate">
                  <Link href={codHref(`/orders/${o.id}`)} className="font-semibold hover:underline">{o.invoice_number}</Link> · {o.customer_name}
                  {o.tracking_number && <span className="text-ink-500"> · {o.tracking_number}</span>}
                </span>
                <span className="shrink-0 font-semibold">{formatLKR(o.total_amount)}</span>
              </label>
            </li>
          ))}
        </ul>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-ink-50 p-3 text-sm"><p className="text-xs text-ink-500">{t('cash.collected')}</p><p className="font-bold">{formatLKR(collected)}</p></div>
          <Field label={t('cash.totalFees')} htmlFor="manual_fees"><TextInput id="manual_fees" type="number" min={0} step="0.01" inputMode="decimal" placeholder="0" value={fees} onChange={e => setFees(e.target.value)} /></Field>
          <div className="rounded-xl bg-ink-50 p-3 text-sm"><p className="text-xs text-ink-500">{t('cash.net')}</p><p className="font-bold">{formatLKR(net)}</p></div>
        </div>
        <PaymentFields paidOn={paidOn} setPaidOn={setPaidOn} reference={reference} setReference={setReference} received={received} setReceived={setReceived} net={net} />
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" disabled={busy} onClick={onClose}>{t('common.cancel')}</Button>
          <Button disabled={busy || !chosen.length || !paidOn} onClick={save}>{busy ? t('common.saving') : t('cash.save', { count: chosen.length })}</Button>
        </div>
      </div>
    </Dialog>
  );
}

function PaymentDetail({ id, onClose }: { id: number; onClose: () => void }) {
  const t = useT();
  const [data, setData] = useState<(Remittance & { lines: (CheckedLine & { id: number })[] }) | null>(null);
  useEffect(() => {
    api.get(`/cod/settlements/${id}`).then(r => setData(r.data)).catch(err => { toast.error(orderError(err, t)); onClose(); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  return (
    <Dialog open onClose={onClose} title={data ? `${data.courier_name} · ${formatDate(data.paid_on, t.locale)}` : t('app.loading')} width="max-w-2xl">
      {data && (
        <div className={tbl.wrap}>
          <table className={tbl.table}>
            <thead><tr>
              <th className={tbl.th}>{t('common.invoice')}</th>
              <th className={tbl.th}>{t('orders.tracking')}</th>
              <th className={`${tbl.th} ${tbl.right}`}>{t('cash.collected')}</th>
              <th className={`${tbl.th} ${tbl.right}`}>{t('cash.fees')}</th>
              <th className={tbl.th}>{t('common.status')}</th>
            </tr></thead>
            <tbody>
              {data.lines.map(l => (
                <tr key={l.id}>
                  <td className={tbl.td}>{l.order_id ? <Link href={codHref(`/orders/${l.order_id}`)} className="font-semibold hover:underline">{l.invoice_number}</Link> : '—'}</td>
                  <td className={`${tbl.td} text-ink-500`}>{l.tracking_number || '—'}</td>
                  <td className={`${tbl.td} ${tbl.right} whitespace-nowrap`}>{formatLKR(l.collected)}</td>
                  <td className={`${tbl.td} ${tbl.right} whitespace-nowrap`}>{formatLKR(l.fee)}</td>
                  <td className={tbl.td}><Badge tone={OUTCOME_TONE[l.outcome]}>{t(OUTCOME_KEY[l.outcome])}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Dialog>
  );
}
