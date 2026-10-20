'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { ArrowLeft, Copy, MessageCircle, Printer, Share2, Smartphone } from 'lucide-react';
import { MascotState } from '../../../../components/brand/Mascot';
import { useCod } from '../../../../components/cod/CodContext';
import { codHref } from '../../../../components/cod/bits';
import { StatusSelect } from '../../../../components/cod/orders';
import { Button, Card, btnClass, cn, tbl } from '../../../../components/cod/ui';
import api from '../../../../lib/api';
import { useT } from '../../../../lib/cod/i18n/client';
import { formatDate, formatLKR } from '../../../../lib/cod/format';
import { canvasesToPdf, downloadBlob } from '../../../../lib/cod/canvas-doc';
import { invoiceFileName, type InvoicePdfData } from '../../../../lib/cod/invoice-pdf';
import { renderInvoicePages } from '../../../../lib/cod/invoice-render';
import { buildOrderMessage, normalizePhone, whatsappUrl } from '../../../../lib/cod/order-share';
import { shareFiles, useCanShare } from '../../../../lib/cod/use-can-share';
import type { Order, OrderItem } from '../../../../lib/cod/types';

type OrderWithLines = Order & { order_items: OrderItem[] };

// cod.kadehub.com/orders/[id] — order detail, status, printable invoice (canvas → PDF) and sharing
export default function CodOrderPage() {
  const t = useT();
  const { id } = useParams<{ id: string }>();
  const { me, labels } = useCod();
  const [order, setOrder] = useState<OrderWithLines | null>(null);
  const [state, setState] = useState<'loading' | 'missing' | 'error' | 'ready'>('loading');

  const load = () => {
    setState('loading');
    api.get<OrderWithLines>(`/cod/orders/${id}`)
      .then(r => { setOrder(r.data); setState('ready'); })
      .catch(err => setState(err?.response?.status === 404 ? 'missing' : 'error'));
  };
  useEffect(load, [id]);

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
        {state === 'error' && <Button onClick={load}>{t('common.retry')}</Button>}
      </div>} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={codHref('/orders')} className="mb-1 flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900">
            <ArrowLeft size={14} /> {t('orders.breadcrumb')}
          </Link>
          <h1 className="text-xl font-bold tracking-tight text-ink-900">{order.invoice_number}</h1>
          <p className="text-sm text-ink-500">{formatDate(order.created_at, t.locale)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusSelect order={order} onChanged={o => setOrder(cur => (cur ? { ...cur, ...o } : cur))} />
          <InvoiceButton data={invoice} logoUrl={b.logo_url} />
          <ShareButton data={invoice} logoUrl={b.logo_url} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title={t('common.customer')}>
          <div className="space-y-1 text-sm">
            <p className="font-semibold text-ink-900">{order.customer_name}</p>
            {order.customer_phone && <p>{order.customer_phone}</p>}
            {order.customer_address && <p>{order.customer_address}</p>}
            {order.city && <p>{order.city}</p>}
          </div>
        </Card>
        <Card title={labels.plural} className="lg:col-span-2">
          <div className="overflow-x-auto">
            <table className={tbl.table}>
              <thead><tr>
                <th className={tbl.th}>{labels.singular}</th>
                <th className={`${tbl.th} ${tbl.right}`}>{t('common.quantity')}</th>
                <th className={`${tbl.th} ${tbl.right}`}>{t('common.unitPrice')}</th>
                <th className={`${tbl.th} ${tbl.right}`}>{t('common.total')}</th>
              </tr></thead>
              <tbody>
                {order.order_items.map(l => (
                  <tr key={l.id}>
                    <td className={tbl.td}>{l.item_name}</td>
                    <td className={`${tbl.td} ${tbl.right}`}>{l.quantity}</td>
                    <td className={`${tbl.td} ${tbl.right}`}>{formatLKR(l.unit_price)}</td>
                    <td className={`${tbl.td} ${tbl.right}`}>{formatLKR(l.line_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="ml-auto mt-4 max-w-xs space-y-1 text-sm">
            <Row label={t('common.subtotal')} value={formatLKR(order.subtotal)} />
            <Row label={t('common.delivery')} value={formatLKR(order.delivery_charge)} />
            {order.discount > 0 && <Row label={t('common.discount')} value={`-${formatLKR(order.discount)}`} />}
            <div className="flex justify-between border-t border-ink-200 pt-1 text-base font-bold text-ink-900">
              <span>{t('common.total')}</span><span>{formatLKR(order.total_amount)}</span>
            </div>
          </div>
          {order.notes && <p className="mt-4 border-t border-ink-100 pt-3 text-sm text-ink-500">{order.notes}</p>}
        </Card>
      </div>

      <Link href={codHref('/orders')} className={btnClass('outline')}>{t('orders.backToOrders')}</Link>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between"><span className="text-ink-500">{label}</span><span>{value}</span></div>;
}

function InvoiceButton({ data, logoUrl }: { data: InvoicePdfData; logoUrl: string | null }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  async function onDownload() {
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
    <Button variant="outline" onClick={onDownload} disabled={busy}>
      <Printer /> {busy ? t('common.preparing') : t('share.print')}
    </Button>
  );
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
