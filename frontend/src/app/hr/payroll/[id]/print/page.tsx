'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { ArrowLeft, Download, Printer } from 'lucide-react';
import { hrHref, useHr } from '../../../../../components/hr/HrContext';
import { Button, EmptyState, Loading, LoadError } from '../../../../../components/hr/ui';
import PayslipSheet, { PrintStyles } from '../../../../../components/hr/payroll/PayslipSheet';
import { payslipPdf } from '../../../../../components/hr/payroll/payslip-pdf';
import { downloadBlob } from '../../../../../lib/cod/canvas-doc';
import api from '../../../../../lib/api';
import { useHrT } from '../../../../../lib/hr/i18n';
import type { PayrollRunDetail, PayslipDetail } from '../../../../../lib/hr/types';

// staff.kadehub.com/payroll/:id/print — every payslip of a run, one per printed page
export default function PrintRunPage() {
  const { t } = useHrT();
  const { owner } = useHr();
  const { id } = useParams<{ id: string }>();
  const [slips, setSlips] = useState<PayslipDetail[] | null>(null);
  const [period, setPeriod] = useState('');
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setFailed(false);
    try {
      const { data: run } = await api.get<PayrollRunDetail>(`/hr/payroll/runs/${id}`);
      setPeriod(run.period);
      const details = await Promise.all(run.payslips.map(p => api.get<PayslipDetail>(`/hr/payslips/${p.id}`).then(r => r.data)));
      setSlips(details);
    } catch {
      setFailed(true);
    }
  }, [id]);
  useEffect(() => { if (owner) load(); }, [load, owner]);

  if (!owner) return <EmptyState title={t('pay.ownerOnlyTitle')} description={t('pay.ownerOnlyBody')} />;
  if (failed) return <LoadError onRetry={load} />;
  if (!slips) return <Loading />;

  async function download() {
    setBusy(true);
    try {
      downloadBlob(await payslipPdf(slips!, t), `payslips-${period}.pdf`);
    } catch {
      toast.error(t('pay.pdfFailed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <PrintStyles />
      <div className="hr-no-print flex flex-wrap items-center justify-between gap-2">
        <Link href={hrHref(`/payroll/${id}`)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-ink-800">
          <ArrowLeft size={15} /> {t('pay.backToRun')}
        </Link>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={busy || !slips.length} onClick={download}><Download /> {busy ? t('pay.makingPdf') : t('pay.downloadPdf')}</Button>
          <Button size="sm" disabled={!slips.length} onClick={() => window.print()}><Printer /> {t('common.print')}</Button>
        </div>
      </div>
      {!slips.length ? <EmptyState title={t('pay.emptyRun')} /> : (
        <div className="hr-print-area space-y-6">
          {slips.map(d => <PayslipSheet key={d.payslip.id} detail={d} />)}
        </div>
      )}
    </div>
  );
}
