'use client';

import { useHrT, type HrKey } from '../../../lib/hr/i18n';
import { formatDate, formatLKR, formatPeriod } from '../../../lib/hr/format';
import type { PayslipDetail } from '../../../lib/hr/types';
import { localDay, payslipLines, type SlipLine } from './lines';

/** Only `.hr-print-area` prints; toolbars and the app shell are hidden. Each sheet starts a new page. */
export function PrintStyles() {
  return (
    <style>{`
      @media print {
        @page { size: A4; margin: 12mm; }
        body * { visibility: hidden; }
        .hr-print-area, .hr-print-area * { visibility: visible; }
        .hr-print-area { position: absolute; left: 0; top: 0; width: 100%; }
        .hr-sheet { box-shadow: none !important; border: 0 !important; break-after: page; page-break-after: always; }
        .hr-sheet:last-child { break-after: auto; page-break-after: auto; }
        .hr-no-print { display: none !important; }
      }
    `}</style>
  );
}

function Lines({ title, lines, total }: { title: string; lines: SlipLine[]; total?: { label: string; amount: number } }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-ink-500">{title}</p>
      <table className="w-full text-sm">
        <tbody>
          {lines.map(l => (
            <tr key={l.label} className="border-b border-ink-100">
              <td className="py-1.5 pr-2 text-ink-700">{l.label}</td>
              <td className="py-1.5 text-right tabular-nums text-ink-800">{l.negative ? '− ' : ''}{formatLKR(l.amount)}</td>
            </tr>
          ))}
          {total && (
            <tr>
              <td className="py-1.5 pr-2 font-semibold text-ink-900">{total.label}</td>
              <td className="py-1.5 text-right font-semibold tabular-nums text-ink-900">{formatLKR(total.amount)}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/** One payslip as a printable A4-friendly sheet. */
export default function PayslipSheet({ detail }: { detail: PayslipDetail }) {
  const { t } = useHrT();
  const { payslip: p, employee: e, business: b } = detail;
  const { earnings, deductions, employer, attendance } = payslipLines(p, b, t);
  const info: Array<[HrKey, string]> = [
    ['pay.empCode', e.emp_code], ['pay.jobTitle', e.job_title], ['pay.department', e.department], ['pay.branchName', e.branch_name],
    ['pay.nic', e.nic], ['pay.epfNumber', e.epf_number], ['pay.bank', e.bank_name], ['pay.account', e.bank_account],
  ];

  return (
    <article className="hr-sheet relative mx-auto w-full max-w-3xl overflow-hidden rounded-2xl border border-ink-200 bg-white p-6 shadow-sm sm:p-8">
      {detail.run_status === 'draft' && (
        <span aria-hidden className="pointer-events-none absolute right-6 top-6 rotate-12 rounded-md border-2 border-amber-400 px-2 py-0.5 text-xs font-extrabold tracking-widest text-amber-500">
          {t('pay.draftWatermark')}
        </span>
      )}
      <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 pb-4" style={{ borderColor: b.brand_color }}>
        <div className="flex items-center gap-3">
          {b.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={b.logo_url} alt="" className="h-12 w-12 rounded object-contain" />
          )}
          <div>
            <p className="text-lg font-bold text-ink-900">{b.name}</p>
            {b.address && <p className="text-xs text-ink-500">{b.address}</p>}
            {b.phone && <p className="text-xs text-ink-500">{b.phone}</p>}
          </div>
        </div>
        <div className="text-right">
          <p className="text-xl font-extrabold" style={{ color: b.brand_color }}>{t('pay.payslip')}</p>
          <p className="text-sm font-semibold text-ink-700">{t('pay.forMonth', { month: formatPeriod(detail.period) })}</p>
        </div>
      </header>

      <section className="mt-4">
        <p className="text-base font-bold text-ink-900">{e.full_name}</p>
        <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
          {info.filter(([, v]) => v).map(([k, v]) => (
            <div key={k} className="min-w-0">
              <dt className="text-2xs uppercase tracking-wide text-ink-400">{t(k)}</dt>
              <dd className="truncate font-medium text-ink-800">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-5 grid gap-6 sm:grid-cols-2">
        <Lines title={t('pay.earnings')} lines={earnings} total={{ label: t('pay.gross'), amount: p.gross }} />
        <Lines title={t('pay.deductions')} lines={deductions} total={{ label: t('pay.totalDeductionsLine'), amount: p.total_deductions }} />
      </section>

      <section className="mt-5 flex items-center justify-between rounded-xl px-4 py-3" style={{ background: `color-mix(in srgb, ${b.brand_color} 10%, white)` }}>
        <span className="text-sm font-bold text-ink-800">{t('pay.netPay')}</span>
        <span className="text-2xl font-extrabold tabular-nums" style={{ color: b.brand_color }}>{formatLKR(p.net_pay)}</span>
      </section>

      <section className="mt-5 grid gap-6 sm:grid-cols-2">
        <div>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-ink-500">{t('pay.attendance')}</p>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            {attendance.map(a => (
              <div key={a.label} className="flex justify-between gap-2 border-b border-ink-100 py-1">
                <dt className="text-ink-500">{a.label}</dt><dd className="tabular-nums text-ink-800">{a.value}</dd>
              </div>
            ))}
          </dl>
        </div>
        {employer.length > 0 && <Lines title={t('pay.employerCost')} lines={employer} />}
      </section>

      {p.note && <p className="mt-4 rounded-lg bg-ink-50 px-3 py-2 text-sm text-ink-600">{p.note}</p>}

      <footer className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-ink-100 pt-3 text-xs text-ink-400">
        <span>
          {p.paid_at
            ? t('pay.paidOn', { date: formatDate(localDay(p.paid_at)), method: p.payment_method ? t(`pay.method.${p.payment_method}` as HrKey) : '' })
            : t('pay.notPaidYet')}
        </span>
        <span>{b.footer || t('pay.generated')}</span>
      </footer>
    </article>
  );
}
