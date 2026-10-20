'use client';

import Link from 'next/link';
import { ArrowLeft, Printer } from 'lucide-react';
import { useT } from '../../lib/cod/i18n/client';
import { formatDate, formatLKR } from '../../lib/cod/format';
import { PAYMENT_TYPE_KEY } from '../../lib/cod/order-messages';
import type { Business, OrderDetail } from '../../lib/cod/types';
import { Button, btnClass } from './ui';

/**
 * Print CSS: only `.cod-print` shows on paper (the app shell is hidden), A4 with 12 mm margins.
 * Labels avoid splitting across pages.
 */
export function PrintStyles() {
  return (
    <style>{`
      @media print {
        @page { size: A4; margin: 12mm; }
        body * { visibility: hidden !important; }
        .cod-print, .cod-print * { visibility: visible !important; }
        .cod-print { position: absolute; left: 0; top: 0; width: 100%; }
        .no-print { display: none !important; }
        .cod-label { break-inside: avoid; page-break-inside: avoid; }
      }
    `}</style>
  );
}

export function PrintToolbar({ backHref, label }: { backHref: string; label: string }) {
  const t = useT();
  return (
    <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-2">
      <Link href={backHref} className={btnClass('outline')}><ArrowLeft /> {label}</Link>
      <Button onClick={() => window.print()}><Printer /> {t('print.print')}</Button>
    </div>
  );
}

function BusinessHeader({ b }: { b: Business }) {
  return (
    <div className="flex items-start gap-3">
      {b.logo_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={b.logo_url} alt="" className="h-14 w-14 rounded object-contain" />
      )}
      <div>
        <p className="text-lg font-bold" style={{ color: b.brand_color }}>{b.name}</p>
        {b.tagline && <p className="text-xs text-ink-500">{b.tagline}</p>}
        <p className="text-xs text-ink-600">{[b.address, b.city].filter(Boolean).join(', ')}</p>
        {b.phone && <p className="text-xs text-ink-600">{b.phone}</p>}
      </div>
    </div>
  );
}

/** A4 invoice: business header, number, dates, customer, lines, totals, payment type, PO and credit terms. */
export function InvoiceDoc({ order, business }: { order: OrderDetail; business: Business }) {
  const t = useT();
  const o = order;
  return (
    <article className="cod-print mx-auto max-w-[190mm] bg-white p-6 text-sm text-ink-800 print:p-0">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-ink-200 pb-4">
        <BusinessHeader b={business} />
        <div className="text-right">
          <p className="text-2xl font-extrabold tracking-tight text-ink-900">{t('print.invoiceTitle')}</p>
          <p className="font-semibold">{o.invoice_number}</p>
          <p className="text-xs text-ink-500">{t('common.date')}: {formatDate(o.created_at, t.locale)}</p>
          <p className="text-xs text-ink-500">{t('pay.label')}: {t(PAYMENT_TYPE_KEY[o.payment_type ?? 'cod'])}</p>
          {o.po_number && <p className="text-xs text-ink-500">{t('orders.poNumber')}: {o.po_number}</p>}
          {o.payment_type === 'credit' && o.payment_due_date && <p className="text-xs font-semibold text-ink-700">{t('credit.dueOn', { date: formatDate(o.payment_due_date, t.locale) })}</p>}
        </div>
      </div>
      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">{t('print.billTo')}</p>
        <p className="font-semibold">{o.customer_name}</p>
        <p className="text-xs text-ink-600">{[o.customer_phone, o.customer_email].filter(Boolean).join(' · ')}</p>
        <p className="text-xs text-ink-600">{[o.customer_address, o.city].filter(Boolean).join(', ')}</p>
      </div>
      <table className="mt-4 w-full border-collapse text-sm">
        <thead><tr className="border-b border-ink-300 text-left text-xs uppercase text-ink-500">
          <th className="py-1.5">#</th><th className="py-1.5">{t('print.description')}</th>
          <th className="py-1.5 text-right">{t('common.quantity')}</th><th className="py-1.5 text-right">{t('common.unitPrice')}</th><th className="py-1.5 text-right">{t('common.total')}</th>
        </tr></thead>
        <tbody>
          {o.order_items.map((l, i) => (
            <tr key={l.id} className="border-b border-ink-100">
              <td className="py-1.5">{i + 1}</td><td className="py-1.5">{l.item_name}</td>
              <td className="py-1.5 text-right">{l.quantity}</td><td className="py-1.5 text-right">{formatLKR(l.unit_price)}</td><td className="py-1.5 text-right">{formatLKR(l.line_total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="ml-auto mt-3 w-64 space-y-1">
        <Line label={t('common.subtotal')} value={formatLKR(o.subtotal)} />
        <Line label={t('common.delivery')} value={formatLKR(o.delivery_charge)} />
        {o.discount > 0 && <Line label={t('common.discount')} value={`-${formatLKR(o.discount)}`} />}
        <div className="flex justify-between border-t border-ink-300 pt-1 text-base font-bold"><span>{t('common.total')}</span><span>{formatLKR(o.total_amount)}</span></div>
        {o.payment_type === 'credit' && <>
          <Line label={t('credit.paid')} value={formatLKR(o.credit.paid)} />
          <Line label={t('credit.outstanding')} value={formatLKR(o.credit.outstanding)} />
        </>}
      </div>
      {o.notes && <p className="mt-4 text-xs text-ink-600">{o.notes}</p>}
      {business.invoice_footer && <p className="mt-6 border-t border-ink-200 pt-3 text-center text-xs text-ink-500">{business.invoice_footer}</p>}
    </article>
  );
}

/** Compact receipt (narrow column, centred on the page). */
export function ReceiptDoc({ order, business }: { order: OrderDetail; business: Business }) {
  const t = useT();
  const o = order;
  return (
    <article className="cod-print mx-auto w-[80mm] bg-white p-3 font-mono text-[11px] text-ink-900">
      <p className="text-center text-sm font-bold">{business.name}</p>
      {business.phone && <p className="text-center">{business.phone}</p>}
      <p className="mt-2 text-center">{o.invoice_number} · {formatDate(o.created_at, t.locale)}</p>
      <p className="text-center">{o.customer_name}</p>
      <div className="my-2 border-t border-dashed border-ink-400" />
      {o.order_items.map(l => (
        <div key={l.id}>
          <p>{l.item_name}</p>
          <p className="flex justify-between"><span>{l.quantity} × {formatLKR(l.unit_price)}</span><span>{formatLKR(l.line_total)}</span></p>
        </div>
      ))}
      <div className="my-2 border-t border-dashed border-ink-400" />
      <p className="flex justify-between"><span>{t('common.delivery')}</span><span>{formatLKR(o.delivery_charge)}</span></p>
      {o.discount > 0 && <p className="flex justify-between"><span>{t('common.discount')}</span><span>-{formatLKR(o.discount)}</span></p>}
      <p className="flex justify-between text-sm font-bold"><span>{t('common.total')}</span><span>{formatLKR(o.total_amount)}</span></p>
      <p className="mt-1">{t('pay.label')}: {t(PAYMENT_TYPE_KEY[o.payment_type ?? 'cod'])}</p>
      {o.payment_type === 'credit' && <p>{t('credit.outstanding')}: {formatLKR(o.credit.outstanding)}</p>}
      <p className="mt-2 text-center">{business.invoice_footer || t('print.thanks')}</p>
    </article>
  );
}

/** Shipping label: sender, recipient, invoice and what to collect. */
export function LabelCard({ order, business }: { order: OrderDetail; business: Business }) {
  const t = useT();
  const o = order;
  const collect = o.payment_type === 'cod' ? formatLKR(o.total_amount)
    : o.payment_type === 'credit' ? t('print.labelCredit') : t('print.labelPaid');
  return (
    <div className="cod-label flex h-[64mm] flex-col justify-between rounded-lg border-2 border-ink-800 p-3 text-ink-900">
      <div className="flex justify-between gap-2 text-[10px]">
        <span><span className="font-semibold">{t('print.from')}:</span> {business.name}{business.phone ? ` · ${business.phone}` : ''}</span>
        <span className="font-semibold">{o.invoice_number}</span>
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase text-ink-500">{t('print.to')}</p>
        <p className="text-base font-bold leading-tight">{o.customer_name}</p>
        <p className="text-sm font-semibold">{o.customer_phone}</p>
        <p className="text-xs">{[o.customer_address, o.city].filter(Boolean).join(', ')}</p>
      </div>
      <div className="flex items-end justify-between gap-2">
        <span className="text-[10px]">{o.tracking_number ? `${t('orders.tracking')}: ${o.tracking_number}` : ''}</span>
        <span className="rounded border-2 border-ink-900 px-2 py-0.5 text-sm font-extrabold">{o.payment_type === 'cod' ? `${t('print.collect')} ` : ''}{collect}</span>
      </div>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between"><span className="text-ink-500">{label}</span><span>{value}</span></div>;
}
