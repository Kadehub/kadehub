'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { ArrowLeft, Download, MessageCircle, Printer } from 'lucide-react';
import { hrHref, useHr } from '../../../../../components/hr/HrContext';
import { Button, EmptyState, Loading, LoadError } from '../../../../../components/hr/ui';
import PayslipSheet, { PrintStyles } from '../../../../../components/hr/payroll/PayslipSheet';
import { payslipFileName, payslipPdf } from '../../../../../components/hr/payroll/payslip-pdf';
import { payslipMessage } from '../../../../../components/hr/payroll/lines';
import { downloadBlob } from '../../../../../lib/cod/canvas-doc';
import api from '../../../../../lib/api';
import { useHrT } from '../../../../../lib/hr/i18n';
import { whatsappLink } from '../../../../../lib/hr/format';
import type { PayslipDetail } from '../../../../../lib/hr/types';

// staff.kadehub.com/payroll/payslips/:id — one printable payslip
export default function PayslipPage() {
  const { t } = useHrT();
  const { owner } = useHr();
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<PayslipDetail | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const printed = useRef(false);

  const load = useCallback(() => {
    setFailed(false);
    api.get<PayslipDetail>(`/hr/payslips/${id}`).then(r => setDetail(r.data)).catch(() => setFailed(true));
  }, [id]);
  useEffect(() => { if (owner) load(); }, [load, owner]);

  useEffect(() => {
    if (detail && new URLSearchParams(window.location.search).get('print') === '1' && !printed.current) {
      printed.current = true;
      setTimeout(() => window.print(), 300);
    }
  }, [detail]);

  if (!owner) return <EmptyState title={t('pay.ownerOnlyTitle')} description={t('pay.ownerOnlyBody')} />;
  if (failed) return <LoadError onRetry={load} />;
  if (!detail) return <Loading />;

  const p = detail.payslip;
  const message = payslipMessage(t, {
    period: detail.period, business: detail.business.name, name: detail.employee.full_name,
    gross: p.gross, deductions: p.total_deductions, net: p.net_pay,
  });

  async function makePdf() {
    setBusy(true);
    try {
      return await payslipPdf([detail!], t);
    } catch (err) {
      toast.error(t('pay.pdfFailed'));
      throw err;
    } finally {
      setBusy(false);
    }
  }

  async function download() {
    try { downloadBlob(await makePdf(), payslipFileName(detail!)); } catch {}
  }

  /** Phones share the PDF itself; elsewhere (or if sharing fails) the text goes to wa.me. */
  async function share() {
    const fallback = () => {
      if (!detail!.employee.phone) { toast.error(t('pay.noPhone')); return; }
      window.open(whatsappLink(detail!.employee.phone, message), '_blank', 'noopener');
    };
    try {
      if (typeof navigator.share === 'function' && typeof navigator.canShare === 'function') {
        const file = new File([await makePdf()], payslipFileName(detail!), { type: 'application/pdf' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], text: message });
          return;
        }
      }
      fallback();
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') fallback();
    }
  }

  return (
    <div className="space-y-4">
      <PrintStyles />
      <div className="hr-no-print flex flex-wrap items-center justify-between gap-2">
        <Link href={hrHref(`/payroll/${p.run_id}`)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-ink-800">
          <ArrowLeft size={15} /> {t('pay.backToRun')}
        </Link>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}><Printer /> {t('common.print')}</Button>
          <Button variant="outline" size="sm" onClick={download} disabled={busy}><Download /> {busy ? t('pay.makingPdf') : t('pay.downloadPdf')}</Button>
          <Button size="sm" onClick={share} disabled={busy}><MessageCircle /> {t('pay.sendWhatsapp')}</Button>
        </div>
      </div>
      <div className="hr-print-area">
        <PayslipSheet detail={detail} />
      </div>
    </div>
  );
}
