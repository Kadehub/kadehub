import type { HrT } from '../../../lib/hr/i18n';
import { formatLKR, formatPeriod } from '../../../lib/hr/format';
import type { Payslip, RunStatus } from '../../../lib/hr/types';

export const RUN_TONE: Record<RunStatus, 'amber' | 'blue' | 'green'> = { draft: 'amber', finalized: 'blue', paid: 'green' };
export const PAY_METHODS = ['cash', 'bank', 'cheque', 'other'] as const;

export interface SlipLine { label: string; amount: number; negative?: boolean }

export interface SlipRates { epf_employee_pct: number; epf_employer_pct: number; etf_employer_pct: number }

const fmt = (n: number) => Number(n.toFixed(2)).toString();

/**
 * The payslip's lines in display order. Zero lines are left out, except basic pay so a payslip is
 * never empty. Shared by the run dialog, the printable payslip and the PDF.
 */
export function payslipLines(p: Payslip, rates: SlipRates, t: HrT) {
  const keep = (l: SlipLine) => l.amount !== 0;
  const earnings: SlipLine[] = [
    { label: t('pay.basePay'), amount: p.base_pay },
    ...[
      { label: t('pay.nopayDeduction', { n: fmt(p.nopay_days) }), amount: p.nopay_deduction, negative: true },
      { label: t('pay.overtimePay', { n: fmt(p.overtime_hours) }), amount: p.overtime_pay },
      { label: t('pay.allowances'), amount: p.allowances },
      { label: t('pay.bonus'), amount: p.bonus },
      { label: t('pay.otherEarnings'), amount: p.other_earnings },
    ].filter(keep),
  ];
  const deductions: SlipLine[] = [
    { label: t('pay.epfEmployee', { pct: fmt(rates.epf_employee_pct) }), amount: p.epf_employee },
    { label: t('pay.lateDeduction', { n: p.late_minutes }), amount: p.late_deduction },
    { label: t('pay.advanceDeduction'), amount: p.advance_deduction },
    { label: t('pay.assetDeduction'), amount: p.asset_deduction },
    { label: t('pay.otherDeductions'), amount: p.other_deductions },
  ].filter(keep);
  const employer: SlipLine[] = [
    { label: t('pay.epfEmployer', { pct: fmt(rates.epf_employer_pct) }), amount: p.epf_employer },
    { label: t('pay.etfEmployer', { pct: fmt(rates.etf_employer_pct) }), amount: p.etf_employer },
  ].filter(keep);
  const attendance: Array<{ label: string; value: string }> = [
    { label: t('pay.daysWorked'), value: fmt(p.days_worked) },
    { label: t('pay.paidLeaveDays'), value: fmt(p.paid_leave_days) },
    { label: t('pay.absentDays'), value: fmt(p.absent_days) },
    { label: t('pay.hoursWorked'), value: fmt(p.hours_worked) },
    { label: t('pay.otHours'), value: fmt(p.overtime_hours) },
    { label: t('pay.lateMinutes'), value: String(p.late_minutes) },
  ];
  return { earnings, deductions, employer, attendance };
}

/** Colombo calendar day of an ISO instant ("2026-03-31T20:00:00Z" → "2026-04-01"). */
export function localDay(iso: string): string {
  return new Date(new Date(iso).getTime() + 5.5 * 3_600_000).toISOString().slice(0, 10);
}

/** WhatsApp text summarising one payslip. */
export function payslipMessage(t: HrT, d: { period: string; business: string; name: string; gross: number; deductions: number; net: number }) {
  return t('pay.waText', {
    business: d.business, month: formatPeriod(d.period), name: d.name,
    gross: formatLKR(d.gross), deductions: formatLKR(d.deductions), net: formatLKR(d.net),
  });
}
