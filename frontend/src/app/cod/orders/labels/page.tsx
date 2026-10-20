'use client';

import { useEffect, useState } from 'react';
import { MascotState } from '../../../../components/brand/Mascot';
import { useCod } from '../../../../components/cod/CodContext';
import { codHref } from '../../../../components/cod/bits';
import { LabelCard, PrintStyles, PrintToolbar } from '../../../../components/cod/orders-print';
import api from '../../../../lib/api';
import { useT } from '../../../../lib/cod/i18n/client';
import type { OrderDetail } from '../../../../lib/cod/types';

// cod.kadehub.com/orders/labels?ids=1,2,3 — shipping labels for several orders on A4 (2 × 4 per sheet)
export default function CodLabelsPage() {
  const t = useT();
  const { me } = useCod();
  const [orders, setOrders] = useState<OrderDetail[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const ids = (new URLSearchParams(window.location.search).get('ids') ?? '')
      .split(',').map(Number).filter(n => Number.isInteger(n) && n > 0).slice(0, 80);
    Promise.all(ids.map(id => api.get<OrderDetail>(`/cod/orders/${id}`).then(r => r.data).catch(() => null)))
      .then(list => setOrders(list.filter((o): o is OrderDetail => !!o)))
      .catch(() => setFailed(true));
  }, []);

  if (failed) return <MascotState variant="error" title={t('app.loadErrorTitle')} description={t('app.loadErrorBody')} />;
  if (!orders) return <MascotState variant="loading" size="sm" title={t('app.loading')} />;
  if (!orders.length) return <MascotState variant="empty" title={t('print.noLabels')} />;

  return (
    <div>
      <PrintStyles />
      <PrintToolbar backHref={codHref('/orders')} label={t('orders.backToOrders')} />
      <div className="cod-print grid grid-cols-1 gap-3 sm:grid-cols-2 print:grid-cols-2">
        {orders.map(o => <LabelCard key={o.id} order={o} business={me.business} />)}
      </div>
    </div>
  );
}
