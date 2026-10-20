'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { MascotState } from '../../../../components/brand/Mascot';
import { codHref } from '../../../../components/cod/bits';
import { RemindButton } from '../../../../components/cod/credit-bits';
import { Badge, Button, Kpi, btnClass, cn, tbl } from '../../../../components/cod/ui';
import api from '../../../../lib/api';
import { useT } from '../../../../lib/cod/i18n/client';
import { formatDate, formatLKR } from '../../../../lib/cod/format';
import { BUCKET_TONE } from '../../../../lib/cod/credit';
import type { CreditInvoice } from '../../../../lib/cod/types';

type CustomerCredit = { key: string; name: string; phone: string; billed: number; collected: number; outstanding: number; invoices: CreditInvoice[] };

// cod.kadehub.com/credit/[key] — one customer's credit invoices (payments are recorded on each order)
export default function CodCreditCustomerPage() {
  const t = useT();
  const { key } = useParams<{ key: string }>();
  const [data, setData] = useState<CustomerCredit | null>(null);
  const [state, setState] = useState<'loading' | 'error' | 'missing' | 'ready'>('loading');

  const load = () => {
    setState('loading');
    api.get<CustomerCredit>(`/cod/credit/customers/${encodeURIComponent(decodeURIComponent(key))}`)
      .then(r => { setData(r.data); setState('ready'); })
      .catch(err => setState(err?.response?.status === 404 ? 'missing' : 'error'));
  };
  useEffect(load, [key]);

  if (state === 'loading') return <MascotState variant="loading" size="sm" title={t('app.loading')} />;
  if (state !== 'ready' || !data) {
    return <MascotState variant="error" title={t('app.loadErrorTitle')}
      action={<div className="flex gap-2">
        <Link href={codHref('/credit')} className={btnClass('outline')}>{t('credit.back')}</Link>
        {state === 'error' && <Button onClick={load}>{t('common.retry')}</Button>}
      </div>} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={codHref('/credit')} className="mb-1 flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900"><ArrowLeft size={14} /> {t('nav.credit')}</Link>
          <h1 className="truncate text-xl font-bold tracking-tight text-ink-900">{data.name}</h1>
          <p className="text-sm text-ink-500">{data.phone || '—'}</p>
        </div>
        {data.phone && <RemindButton name={data.name} phone={data.phone} invoices={data.invoices} />}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Kpi label={t('credit.billed')} value={formatLKR(data.billed)} />
        <Kpi label={t('credit.collected')} value={formatLKR(data.collected)} />
        <Kpi label={t('credit.outstanding')} value={formatLKR(data.outstanding)} tone={data.outstanding > 0 ? 'danger' : undefined} />
      </div>

      <ul className="space-y-2 md:hidden">
        {data.invoices.map(i => (
          <li key={i.order_id}>
            <Link href={codHref(`/orders/${i.order_id}`)} className="block rounded-xl border border-ink-200 bg-white px-3 py-2.5">
              <span className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-semibold text-ink-900">{i.invoice_number}</span>
                <span className={cn('text-sm font-bold', i.outstanding > 0 ? 'text-red-600' : 'text-emerald-700')}>{formatLKR(i.outstanding)}</span>
              </span>
              <span className="mt-1 flex flex-wrap items-center gap-1.5 text-2xs text-ink-500">
                <span>{formatDate(i.created_at, t.locale)}</span>
                <span>· {t('credit.paidOf', { paid: formatLKR(i.paid), total: formatLKR(i.total) })}</span>
                <Badge tone={i.credit_status === 'paid' ? 'green' : i.credit_status === 'partial' ? 'amber' : 'gray'}>{t(`credit.status.${i.credit_status}`)}</Badge>
                {i.outstanding > 0 && i.bucket !== 'none' && <Badge tone={BUCKET_TONE[i.bucket]}>{t(`credit.bucket.${i.bucket}`)}</Badge>}
                {i.payment_due_date && <span>· {t('credit.dueOn', { date: formatDate(i.payment_due_date, t.locale) })}</span>}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className={cn(tbl.wrap, 'hidden md:block')}>
        <table className={tbl.table}>
          <thead><tr>
            <th className={tbl.th}>{t('common.invoice')}</th>
            <th className={tbl.th}>{t('common.date')}</th>
            <th className={`${tbl.th} ${tbl.right}`}>{t('common.total')}</th>
            <th className={`${tbl.th} ${tbl.right}`}>{t('credit.paid')}</th>
            <th className={`${tbl.th} ${tbl.right}`}>{t('credit.outstanding')}</th>
            <th className={tbl.th}>{t('common.status')}</th>
            <th className={tbl.th}>{t('credit.dueDate')}</th>
          </tr></thead>
          <tbody>
            {data.invoices.map(i => (
              <tr key={i.order_id}>
                <td className={tbl.td}><Link href={codHref(`/orders/${i.order_id}`)} className="font-semibold text-[color:var(--cod-primary)] hover:underline">{i.invoice_number}</Link></td>
                <td className={`${tbl.td} text-ink-500`}>{formatDate(i.created_at, t.locale)}</td>
                <td className={`${tbl.td} ${tbl.right}`}>{formatLKR(i.total)}</td>
                <td className={`${tbl.td} ${tbl.right}`}>{formatLKR(i.paid)}</td>
                <td className={`${tbl.td} ${tbl.right} font-semibold`}>{formatLKR(i.outstanding)}</td>
                <td className={tbl.td}>
                  <span className="flex flex-wrap gap-1">
                    <Badge tone={i.credit_status === 'paid' ? 'green' : i.credit_status === 'partial' ? 'amber' : 'gray'}>{t(`credit.status.${i.credit_status}`)}</Badge>
                    {i.outstanding > 0 && i.bucket !== 'none' && <Badge tone={BUCKET_TONE[i.bucket]}>{t(`credit.bucket.${i.bucket}`)}</Badge>}
                  </span>
                </td>
                <td className={`${tbl.td} text-ink-500`}>{i.payment_due_date ? formatDate(i.payment_due_date, t.locale) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-ink-500">{t('credit.recordHint')}</p>
    </div>
  );
}
