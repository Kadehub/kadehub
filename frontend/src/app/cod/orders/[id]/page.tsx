'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  AlertTriangle, ArrowLeft, Copy, Download, FileText, MessageCircle, PencilLine, Printer, Receipt, RotateCcw, Share2,
  ShieldCheck, Smartphone, Tag, Trash2,
} from 'lucide-react';
import { MascotState } from '../../../../components/brand/Mascot';
import { useCod } from '../../../../components/cod/CodContext';
import { codHref } from '../../../../components/cod/bits';
import { ConfirmDialog, OrderForm, StatusSelect, StatusStepper } from '../../../../components/cod/orders';
import { CreditPanel } from '../../../../components/cod/orders-credit';
import { Button, Card, Menu, MenuItem, TextInput, btnClass, cn, tbl } from '../../../../components/cod/ui';
import api from '../../../../lib/api';
import { useT } from '../../../../lib/cod/i18n/client';
import { formatDate, formatLKR } from '../../../../lib/cod/format';
import { canvasesToPdf, downloadBlob } from '../../../../lib/cod/canvas-doc';
import { invoiceFileName, type InvoicePdfData } from '../../../../lib/cod/invoice-pdf';
import { renderInvoicePages } from '../../../../lib/cod/invoice-render';
import { buildOrderMessage, normalizePhone, whatsappUrl } from '../../../../lib/cod/order-share';
import { shareFiles, useCanShare } from '../../../../lib/cod/use-can-share';
import type { Item, OrderDetail } from '../../../../lib/cod/types';
import { PAYMENT_TYPE_KEY, buildConfirmationMessage, orderError } from '../../../../lib/cod/order-messages';
import { useCodCan } from '../../../../lib/cod/capabilities';

// cod.kadehub.com/orders/[id] — order detail: status stepper, customer trust, credit, print views, sharing
export default function CodOrderPage() {
  const t = useT();
  const router = useRouter();
  const can = useCodCan();
  const { id } = useParams<{ id: string }>();
  const { me, labels, refresh } = useCod();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [state, setState] = useState<'loading' | 'missing' | 'error' | 'ready'>('loading');
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tracking, setTracking] = useState<string | null>(null);

  const load = (quiet = false) => {
    if (!quiet) setState('loading');
    api.get<OrderDetail>(`/cod/orders/${id}`)
      .then(r => { setOrder(r.data); setState('ready'); })
      .catch(err => setState(err?.response?.status === 404 ? 'missing' : 'error'));
  };
  useEffect(() => {
    load();
    api.get<Item[]>('/cod/items').then(r => setItems(r.data)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const b = me.business;
  const invoice = useMemo<InvoicePdfData | null>(() => order && {
    business: {
      name: b.name, phone: b.phone, address: [b.address, b.city].filter(Boolean).join(', '),
      tagline: b.tagline, footer: b.invoice_footer, brand_color: b.brand_color,
    },
    invoice_number: order.invoice_number,
    created_at: order.created_at,
    status: order.status,
    customer: { name: order.customer_name, phone: order.customer_phone, address: order.customer_address, city: order.city },
    lines: order.order_items.map(l => ({ name: l.item_name, quantity: l.quantity, unit_price: Number(l.unit_price), line_total: Number(l.line_total) })),
    subtotal: Number(order.subtotal),
    delivery_charge: Number(order.delivery_charge),
    discount: Number(order.discount),
    total_amount: Number(order.total_amount),
    notes: order.notes,
  }, [order, b]);

  if (state === 'loading') return <MascotState variant="loading" size="sm" title={t('app.loading')} />;
  if (state !== 'ready' || !order || !invoice) {
    return <MascotState variant="error" title={t('app.loadErrorTitle')} description={state === 'error' ? t('app.loadErrorBody') : undefined}
      action={<div className="flex gap-2">
        <Link href={codHref('/orders')} className={btnClass('outline')}>{t('orders.backToOrders')}</Link>
        {state === 'error' && <Button onClick={() => load()}>{t('common.retry')}</Button>}
      </div>} />;
  }
  const o = order;

  async function onDelete() {
    setBusy(true);
    try {
      await api.delete(`/cod/orders/${o.id}`);
      toast.success(t('orders.deleted'));
      refresh();
      router.push(codHref('/orders'));
    } catch (err) {
      toast.error(orderError(err, t));
      setBusy(false);
    }
  }

  async function saveTracking() {
    if (tracking === null) return;
    setBusy(true);
    try {
      await api.patch(`/cod/orders/${o.id}/tracking`, { tracking_number: tracking || null });
      toast.success(t('orders.saved'));
      setTracking(null);
      load(true);
    } catch (err) {
      toast.error(orderError(err, t));
    } finally { setBusy(false); }
  }

  function sendConfirmation() {
    window.open(whatsappUrl(o.customer_phone, buildConfirmationMessage(o, b.name, t)), '_blank', 'noopener,noreferrer');
    api.post(`/cod/orders/${o.id}/confirmation-sent`).then(() => load(true)).catch(() => {});
  }

  const trust = o.trust;
  const risky = !!trust && trust.returned >= 2;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={codHref('/orders')} className="mb-1 flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900">
            <ArrowLeft size={14} /> {t('orders.breadcrumb')}
          </Link>
          <h1 className="text-xl font-bold tracking-tight text-ink-900">{o.invoice_number}</h1>
          <p className="text-sm text-ink-500">
            {formatDate(o.created_at, t.locale)} · {t(PAYMENT_TYPE_KEY[o.payment_type ?? 'cod'])}
            {o.reordered_from_order_id && <> · <Link className="underline" href={codHref(`/orders/${o.reordered_from_order_id}`)}>{t('orders.reorderOf')}</Link></>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusSelect order={o} onChanged={() => load(true)} />
          {can('orders_create') && <OrderForm items={items} mode="edit" source={o} onSaved={() => load(true)}
            trigger={open => <Button variant="outline" onClick={open}><PencilLine /> {t('orders.edit')}</Button>} />}
          {can('orders_create') && <OrderForm items={items} mode="reorder" source={o}
            trigger={open => <Button variant="outline" onClick={open}><RotateCcw /> {t('orders.reorder')}</Button>} />}
          <PrintMenu orderId={o.id} data={invoice} logoUrl={b.logo_url} />
          <ShareButton data={invoice} logoUrl={b.logo_url} />
        </div>
      </div>

      <Card><StatusStepper status={o.status} /></Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4">
          <Card title={t('common.customer')}>
            <div className="space-y-1 text-sm">
              <p className="font-semibold text-ink-900">{o.customer_name}</p>
              {o.customer_phone && <p>{o.customer_phone}</p>}
              {o.customer_email && <p className="text-ink-500">{o.customer_email}</p>}
              {o.customer_address && <p>{o.customer_address}</p>}
              {o.city && <p>{o.city}</p>}
              <p className="text-xs text-ink-500">
                {o.customer_type === 'wholesale' ? t('orders.wholesale') : t('orders.retail')}
                {o.po_number ? ` · ${t('orders.poNumber')} ${o.po_number}` : ''}
              </p>
              {trust && (
                <p className={cn('mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold', risky ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700')}>
                  {risky ? <AlertTriangle size={12} /> : <ShieldCheck size={12} />}
                  {t('orders.trust', { delivered: trust.delivered, returned: trust.returned })}
                </p>
              )}
              {risky && <p className="text-xs text-red-600">{t('orders.trustWarn')}</p>}
            </div>
          </Card>

          <Card title={t('orders.fulfilment')}>
            <div className="space-y-3 text-sm">
              <div>
                <label htmlFor="tracking" className="text-xs font-medium text-ink-500">{t('orders.tracking')}</label>
                <div className="mt-1 flex gap-2">
                  <TextInput id="tracking" value={tracking ?? o.tracking_number ?? ''} disabled={!can('orders_status')}
                    onChange={e => setTracking(e.target.value)} placeholder="—" />
                  {tracking !== null && <Button onClick={saveTracking} disabled={busy}>{t('orders.saveTracking')}</Button>}
                </div>
              </div>
              <div>
                <Button variant="outline" onClick={sendConfirmation} disabled={!o.customer_phone} className="w-full justify-center">
                  <MessageCircle /> {t('orders.sendConfirmation')}
                </Button>
                <p className="mt-1 text-xs text-ink-500">
                  {o.confirmation_sent_at ? t('orders.confirmationSentAt', { date: formatDate(o.confirmation_sent_at, t.locale) }) : t('orders.confirmationNotSent')}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <Card title={labels.plural}>
            <div className="overflow-x-auto">
              <table className={tbl.table}>
                <thead><tr>
                  <th className={tbl.th}>{labels.singular}</th>
                  <th className={`${tbl.th} ${tbl.right}`}>{t('common.quantity')}</th>
                  <th className={`${tbl.th} ${tbl.right}`}>{t('common.unitPrice')}</th>
                  <th className={`${tbl.th} ${tbl.right}`}>{t('common.total')}</th>
                </tr></thead>
                <tbody>
                  {o.order_items.map(l => (
                    <tr key={l.id}>
                      <td className={tbl.td}>{l.item_name}{l.item_id == null && <span className="ml-1.5 rounded bg-ink-100 px-1 text-2xs text-ink-500">{t('orders.customTag')}</span>}</td>
                      <td className={`${tbl.td} ${tbl.right}`}>{l.quantity}</td>
                      <td className={`${tbl.td} ${tbl.right}`}>{formatLKR(l.unit_price)}</td>
                      <td className={`${tbl.td} ${tbl.right}`}>{formatLKR(l.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="ml-auto mt-4 max-w-xs space-y-1 text-sm">
              <Row label={t('common.subtotal')} value={formatLKR(o.subtotal)} />
              <Row label={t('common.delivery')} value={formatLKR(o.delivery_charge)} />
              {o.discount > 0 && <Row label={t('common.discount')} value={`-${formatLKR(o.discount)}`} />}
              <div className="flex justify-between border-t border-ink-200 pt-1 text-base font-bold text-ink-900">
                <span>{t('common.total')}</span><span>{formatLKR(o.total_amount)}</span>
              </div>
            </div>
            {o.notes && <p className="mt-4 border-t border-ink-100 pt-3 text-sm text-ink-500">{o.notes}</p>}
          </Card>

          {o.payment_type === 'credit' && <CreditPanel order={o} onChanged={() => load(true)} />}
        </div>
      </div>

      <div className="flex flex-wrap justify-between gap-2">
        <Link href={codHref('/orders')} className={btnClass('outline')}>{t('orders.backToOrders')}</Link>
        {can('orders_create') && <Button variant="ghost" className="text-red-600" onClick={() => setDeleting(true)}><Trash2 /> {t('orders.deleteAria')}</Button>}
      </div>

      <ConfirmDialog open={deleting} busy={busy} danger title={t('orders.deleteAria')}
        message={t('orders.deleteConfirm', { invoice: o.invoice_number }) + (o.stock_deducted ? ` ${t('orders.deleteRestores')}` : '')}
        confirmLabel={t('orders.deleteAria')} onCancel={() => setDeleting(false)} onConfirm={onDelete} />
    </div>
  );
}

/** Invoice / receipt / label pages (A4 print CSS) plus the canvas PDF download. */
function PrintMenu({ orderId, data, logoUrl }: { orderId: number; data: InvoicePdfData; logoUrl: string | null }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const open = (view: string) => window.open(codHref(`/orders/${orderId}/print?view=${view}`), '_blank');
  async function pdf() {
    setBusy(true);
    try {
      const pages = await renderInvoicePages(data, logoUrl, t);
      downloadBlob(await canvasesToPdf(pages, 'PNG'), invoiceFileName(data.invoice_number));
    } catch {
      toast.error(t('cat.error'));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Menu label={t('print.menu')} trigger={<Printer />}>
      {close => (
        <>
          <MenuItem onClick={() => { close(); open('invoice'); }}><FileText /> {t('print.invoice')}</MenuItem>
          <MenuItem onClick={() => { close(); open('receipt'); }}><Receipt /> {t('print.receipt')}</MenuItem>
          <MenuItem onClick={() => { close(); open('label'); }}><Tag /> {t('print.label')}</MenuItem>
          <MenuItem onClick={() => { close(); pdf(); }}><Download /> {busy ? t('common.preparing') : t('print.pdf')}</MenuItem>
        </>
      )}
    </Menu>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between"><span className="text-ink-500">{label}</span><span>{value}</span></div>;
}

/** WhatsApp, the device's share sheet (with the invoice PDF where allowed), or copy the message. */
function ShareButton({ data, logoUrl }: { data: InvoicePdfData; logoUrl: string | null }) {
  const t = useT();
  const canShare = useCanShare();
  const message = useMemo(() => buildOrderMessage(data, t), [data, t]);
  const customerHasWhatsApp = normalizePhone(data.customer.phone) !== null;
  const [open, setOpen] = useState(false);
  // The share sheet must open straight from the click, so the PDF is built ahead of time
  // (iOS Safari drops the user gesture across an await)
  const [pdf, setPdf] = useState<File | null>(null);
  useEffect(() => {
    if (!canShare) return;
    let cancelled = false;
    (async () => {
      const blob = await canvasesToPdf(await renderInvoicePages(data, logoUrl, t), 'PNG');
      if (!cancelled) setPdf(new File([blob], invoiceFileName(data.invoice_number), { type: 'application/pdf' }));
    })().catch(() => { /* sharing text only is still fine */ });
    return () => { cancelled = true; };
  }, [canShare, data, logoUrl, t]);

  async function shareViaApps() {
    setOpen(false);
    const title = `Invoice ${data.invoice_number}`;
    try {
      if (pdf) {
        const result = await shareFiles([pdf], { title, text: message });
        if (result !== 'unsupported') return;
      }
      await navigator.share({ title, text: message });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      toast.error(t('share.failed'));
    }
  }

  async function copyMessage() {
    setOpen(false);
    try {
      await navigator.clipboard.writeText(message);
      toast.success(t('share.copied'));
    } catch {
      toast.error(t('share.copyFailed'));
    }
  }

  const option = 'flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-ink-700 hover:bg-ink-50 [&_svg]:mt-0.5 [&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0';
  return (
    <div className="relative">
      <Button onClick={() => setOpen(o => !o)} aria-expanded={open}><Share2 /> {t('common.share')}</Button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} aria-hidden />
          <div role="menu" className="absolute right-0 z-30 mt-1 w-72 rounded-xl border border-ink-200 bg-white p-1 shadow-lg">
            <p className="px-2.5 py-1.5 text-xs font-semibold text-ink-500">{t('share.menuLabel', { invoice: data.invoice_number })}</p>
            <button type="button" role="menuitem" className={option}
              onClick={() => { setOpen(false); window.open(whatsappUrl(data.customer.phone, message), '_blank', 'noopener,noreferrer'); }}>
              <MessageCircle />
              <span>{t('share.whatsapp')}
                <span className="block text-xs text-ink-400">
                  {customerHasWhatsApp ? t('share.toCustomer', { name: data.customer.name || data.customer.phone }) : t('share.chooseContact')}
                </span>
              </span>
            </button>
            {canShare && (
              <button type="button" role="menuitem" className={option} onClick={shareViaApps}>
                <Smartphone />
                <span>{t('share.otherApps')}
                  <span className="block text-xs text-ink-400">{pdf ? t('share.withPdf') : t('share.messageOnly')}</span>
                </span>
              </button>
            )}
            <div className={cn('my-1 border-t border-ink-100')} />
            <button type="button" role="menuitem" className={option} onClick={copyMessage}><Copy /> {t('share.copy')}</button>
          </div>
        </>
      )}
    </div>
  );
}
