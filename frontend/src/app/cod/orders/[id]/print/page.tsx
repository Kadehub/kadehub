'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { MascotState } from '../../../../../components/brand/Mascot';
import { useCod } from '../../../../../components/cod/CodContext';
import { codHref } from '../../../../../components/cod/bits';
import { InvoiceDoc, LabelCard, PrintStyles, PrintToolbar, ReceiptDoc } from '../../../../../components/cod/orders-print';
import api from '../../../../../lib/api';
import { useT } from '../../../../../lib/cod/i18n/client';
import type { OrderDetail } from '../../../../../lib/cod/types';

type View = 'invoice' | 'receipt' | 'label';

// cod.kadehub.com/orders/[id]/print?view=invoice|receipt|label — A4 print views
export default function CodOrderPrintPage() {
  const t = useT();
  const { id } = useParams<{ id: string }>();
  const { me } = useCod();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [failed, setFailed] = useState(false);
  const [view, setView] = useState<View>('invoice');

  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get('view');
    if (v === 'receipt' || v === 'label') setView(v);
    api.get<OrderDetail>(`/cod/orders/${id}`).then(r => setOrder(r.data)).catch(() => setFailed(true));
  }, [id]);

  if (failed) return <MascotState variant="error" title={t('app.loadErrorTitle')} description={t('app.loadErrorBody')} />;
  if (!order) return <MascotState variant="loading" size="sm" title={t('app.loading')} />;

  return (
    <div>
      <PrintStyles />
      <PrintToolbar backHref={codHref(`/orders/${order.id}`)} label={order.invoice_number} />
      {view === 'invoice' && <InvoiceDoc order={order} business={me.business} />}
      {view === 'receipt' && <ReceiptDoc order={order} business={me.business} />}
      {view === 'label' && <div className="cod-print mx-auto max-w-[95mm]"><LabelCard order={order} business={me.business} /></div>}
    </div>
  );
}
