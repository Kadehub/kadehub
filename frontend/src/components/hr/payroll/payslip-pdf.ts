/**
 * Payslip PDF. Drawn on a canvas like COD's invoices so Sinhala names and labels render
 * (jsPDF's own fonts can't shape them), then wrapped in an A4 PDF. Browser only.
 */
import { LINE, MUTED, INK, canvasesToPdf, drawContain, fitText, font, loadImage } from '../../../lib/cod/canvas-doc';
import { formatDate, formatLKR, formatPeriod } from '../../../lib/hr/format';
import type { HrT, HrKey } from '../../../lib/hr/i18n';
import type { PayslipDetail } from '../../../lib/hr/types';
import { localDay, payslipLines, type SlipLine } from './lines';

const W = 1240;
const H = 1754;
const M = 90;

async function drawPayslip(detail: PayslipDetail, t: HrT): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const { payslip: p, employee: e, business: b } = detail;
  const brand = b.brand_color || '#7c3aed';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = 'alphabetic';

  // Header: logo + business on the left, title + month on the right
  let x = M;
  const logo = b.logo_url ? await loadImage(b.logo_url) : null;
  if (logo) { drawContain(ctx, logo, M, M - 10, 110, 110); x = M + 130; }
  ctx.fillStyle = INK;
  ctx.font = font(700, 38);
  ctx.fillText(fitText(ctx, b.name, 560), x, M + 30);
  ctx.fillStyle = MUTED;
  ctx.font = font(400, 24);
  if (b.address) ctx.fillText(fitText(ctx, b.address, 560), x, M + 66);
  if (b.phone) ctx.fillText(b.phone, x, M + 98);
  ctx.textAlign = 'right';
  ctx.fillStyle = brand;
  ctx.font = font(700, 48);
  ctx.fillText(t('pay.payslip'), W - M, M + 34);
  ctx.fillStyle = INK;
  ctx.font = font(600, 26);
  ctx.fillText(t('pay.forMonth', { month: formatPeriod(detail.period) }), W - M, M + 74);
  if (detail.run_status === 'draft') {
    ctx.fillStyle = '#d97706';
    ctx.font = font(700, 22);
    ctx.fillText(t('pay.draftWatermark'), W - M, M + 108);
  }
  ctx.textAlign = 'left';
  ctx.fillStyle = brand;
  ctx.fillRect(M, M + 135, W - 2 * M, 5);

  // Employee
  let y = M + 200;
  ctx.fillStyle = INK;
  ctx.font = font(700, 34);
  ctx.fillText(fitText(ctx, e.full_name, W - 2 * M), M, y);
  y += 30;
  const info: Array<[HrKey, string]> = ([
    ['pay.empCode', e.emp_code], ['pay.jobTitle', e.job_title], ['pay.department', e.department], ['pay.branchName', e.branch_name],
    ['pay.nic', e.nic], ['pay.epfNumber', e.epf_number], ['pay.bank', e.bank_name], ['pay.account', e.bank_account],
  ] as Array<[HrKey, string]>).filter(([, v]) => v);
  const colW = (W - 2 * M) / 4;
  info.forEach(([k, v], i) => {
    const cx = M + (i % 4) * colW;
    const cy = y + 40 + Math.floor(i / 4) * 70;
    ctx.fillStyle = MUTED;
    ctx.font = font(400, 20);
    ctx.fillText(fitText(ctx, t(k).toUpperCase(), colW - 20), cx, cy);
    ctx.fillStyle = INK;
    ctx.font = font(600, 24);
    ctx.fillText(fitText(ctx, v, colW - 20), cx, cy + 30);
  });
  y += 40 + Math.ceil(info.length / 4) * 70 + 20;

  // Earnings and deductions side by side
  const { earnings, deductions, employer, attendance } = payslipLines(p, b, t);
  const half = (W - 2 * M - 60) / 2;
  const table = (title: string, lines: SlipLine[], total: { label: string; amount: number } | null, tx: number, ty: number) => {
    ctx.fillStyle = MUTED;
    ctx.font = font(700, 20);
    ctx.fillText(title.toUpperCase(), tx, ty);
    let ly = ty + 16;
    for (const l of lines) {
      ly += 44;
      ctx.fillStyle = INK;
      ctx.font = font(400, 24);
      ctx.fillText(fitText(ctx, l.label, half - 230), tx, ly);
      ctx.textAlign = 'right';
      ctx.fillText(`${l.negative ? '− ' : ''}${formatLKR(l.amount)}`, tx + half, ly);
      ctx.textAlign = 'left';
      ctx.fillStyle = LINE;
      ctx.fillRect(tx, ly + 14, half, 2);
    }
    if (total) {
      ly += 48;
      ctx.fillStyle = INK;
      ctx.font = font(700, 25);
      ctx.fillText(fitText(ctx, total.label, half - 230), tx, ly);
      ctx.textAlign = 'right';
      ctx.fillText(formatLKR(total.amount), tx + half, ly);
      ctx.textAlign = 'left';
    }
    return ly;
  };
  const endL = table(t('pay.earnings'), earnings, { label: t('pay.gross'), amount: p.gross }, M, y);
  const endR = table(t('pay.deductions'), deductions, { label: t('pay.totalDeductionsLine'), amount: p.total_deductions }, M + half + 60, y);
  y = Math.max(endL, endR) + 50;

  // Net pay band
  ctx.fillStyle = `${brand}1f`;
  ctx.fillRect(M, y, W - 2 * M, 100);
  ctx.fillStyle = INK;
  ctx.font = font(700, 30);
  ctx.fillText(t('pay.netPay'), M + 30, y + 62);
  ctx.textAlign = 'right';
  ctx.fillStyle = brand;
  ctx.font = font(700, 44);
  ctx.fillText(formatLKR(p.net_pay), W - M - 30, y + 66);
  ctx.textAlign = 'left';
  y += 160;

  // Attendance and employer contributions
  ctx.fillStyle = MUTED;
  ctx.font = font(700, 20);
  ctx.fillText(t('pay.attendance').toUpperCase(), M, y);
  attendance.forEach((a, i) => {
    const ay = y + 50 + i * 40;
    ctx.fillStyle = MUTED;
    ctx.font = font(400, 22);
    ctx.fillText(fitText(ctx, a.label, half - 120), M, ay);
    ctx.fillStyle = INK;
    ctx.textAlign = 'right';
    ctx.fillText(a.value, M + half, ay);
    ctx.textAlign = 'left';
  });
  if (employer.length) table(t('pay.employerCost'), employer, null, M + half + 60, y);
  y += 50 + attendance.length * 40 + 20;

  if (p.note) {
    ctx.fillStyle = MUTED;
    ctx.font = font(400, 22);
    ctx.fillText(fitText(ctx, p.note, W - 2 * M), M, y + 20);
  }

  // Footer
  ctx.fillStyle = LINE;
  ctx.fillRect(M, H - M - 50, W - 2 * M, 2);
  ctx.fillStyle = MUTED;
  ctx.font = font(400, 20);
  const paid = p.paid_at
    ? t('pay.paidOn', { date: formatDate(localDay(p.paid_at)), method: p.payment_method ? t(`pay.method.${p.payment_method}` as HrKey) : '' })
    : t('pay.notPaidYet');
  ctx.fillText(paid, M, H - M);
  ctx.textAlign = 'right';
  ctx.fillText(fitText(ctx, b.footer || t('pay.generated'), 600), W - M, H - M);
  ctx.textAlign = 'left';
  return canvas;
}

export function payslipFileName(detail: PayslipDetail) {
  return `payslip-${detail.period}-${detail.employee.emp_code || detail.employee.id}.pdf`.replace(/[^\w.-]/g, '_');
}

export async function payslipPdf(details: PayslipDetail[], t: HrT): Promise<Blob> {
  const pages: HTMLCanvasElement[] = [];
  for (const d of details) pages.push(await drawPayslip(d, t));
  return canvasesToPdf(pages, 'PNG');
}
