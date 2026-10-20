/** Draws the A4 COD invoice on <canvas> pages (browser only). Canvas text renders
 *  Sinhala/Tamil customer, address and item names properly — jsPDF's built-in
 *  fonts can't — and lets the invoice follow the app language. The pages are
 *  turned into a PDF by `canvasesToPdf`. Layout mirrors the earlier jsPDF invoice. */

import { DEFAULT_BRAND_COLOR, hexToRgb, normalizeHex } from "@/lib/cod/brand";
import { INK, MUTED, drawContain, fitFontSize, fitText, font, loadImage, wrapText, type Ctx } from "@/lib/cod/canvas-doc";
import { PAGE_H, PAGE_W } from "@/lib/cod/catalog-layout";
import { formatDate, formatLKR } from "@/lib/cod/format";
import type { InvoicePdfData } from "@/lib/cod/invoice-pdf";
import type { Translator } from "@/lib/cod/i18n/translator";

const M = 94; // 16mm side margin
const COL_QTY = 768;
const COL_UNIT = 945;
const COL_AMT = PAGE_W - M;
const ROW_LIMIT = 1500; // a table row must end above this
const TOTALS_LIMIT = 1560; // the totals + notes block must end above this
const FOOTER_Y = 1690;
const RULE = "#dcdcdc";

/** Returns the invoice as one or more page canvases. `scale` 1 = 1240×1754px (A4 at 150dpi). */
export async function renderInvoicePages(
  d: InvoicePdfData,
  logoUrl: string | null | undefined,
  t: Translator,
  scale = 1,
): Promise<HTMLCanvasElement[]> {
  const accent = normalizeHex(d.business.brand_color, DEFAULT_BRAND_COLOR);
  const [ar, ag, ab] = hexToRgb(accent);
  const logo = logoUrl ? await loadImage(logoUrl) : null;

  const pages: { canvas: HTMLCanvasElement; ctx: Ctx }[] = [];
  let ctx!: Ctx;
  let y = 0;

  const rule = (x1: number, x2: number, at: number, color = RULE) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x1, at);
    ctx.lineTo(x2, at);
    ctx.stroke();
  };

  const newCanvas = () => {
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(PAGE_W * scale);
    canvas.height = Math.round(PAGE_H * scale);
    ctx = canvas.getContext("2d")!;
    ctx.scale(scale, scale);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, PAGE_W, PAGE_H);
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, PAGE_W, 24);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    pages.push({ canvas, ctx });
  };

  const statusLabel = t.has(`status.${d.status}`)
    ? t(`status.${d.status}` as Parameters<Translator>[0])
    : d.status;

  // ---------- page-1 header ----------
  const drawFirstHeader = () => {
    let nameX = M;
    if (logo) {
      const box = { w: 165, h: 95 };
      const s = Math.min(box.w / logo.naturalWidth, box.h / logo.naturalHeight, 1);
      const w = logo.naturalWidth * s;
      const h = logo.naturalHeight * s;
      drawContain(ctx, logo, M, 59, w, h);
      nameX = M + w + 24;
    }
    y = 118;
    // The title shrinks to fit (Tamil "விலைப்பட்டியல்" is far wider than "INVOICE").
    const title = t("inv.title");
    const titleSize = fitFontSize(ctx, title, 700, 56, 34, 400);
    ctx.font = font(700, titleSize);
    const titleW = ctx.measureText(title).width;
    ctx.fillStyle = accent;
    ctx.textAlign = "right";
    ctx.fillText(title, COL_AMT, y);
    ctx.textAlign = "left";

    const leftW = COL_AMT - nameX - titleW - 40;
    ctx.fillStyle = INK;
    ctx.font = font(700, fitFontSize(ctx, d.business.name, 700, 44, 30, leftW));
    ctx.fillText(fitText(ctx, d.business.name, leftW), nameX, y);

    const left = [
      d.business.tagline,
      d.business.address,
      d.business.phone ? t("inv.mobile", { phone: d.business.phone }) : "",
    ].filter(Boolean) as string[];
    const right = [
      d.invoice_number,
      formatDate(d.created_at, t.locale),
      t("inv.cod", { status: statusLabel.toUpperCase() }),
    ];
    ctx.font = font(400, 26);
    for (let row = 0; row < Math.max(left.length, right.length); row++) {
      y += row === 0 ? 36 : 31;
      ctx.fillStyle = MUTED;
      if (left[row]) ctx.fillText(fitText(ctx, left[row], COL_AMT - nameX - 330), nameX, y);
      ctx.fillStyle = "#3c3c3c";
      ctx.textAlign = "right";
      if (right[row]) ctx.fillText(right[row], COL_AMT, y);
      ctx.textAlign = "left";
    }
    y += 31;
    rule(M, COL_AMT, y);
  };

  // ---------- continuation-page header ----------
  const drawNextHeader = () => {
    y = 96;
    ctx.fillStyle = INK;
    ctx.font = font(700, 30);
    ctx.fillText(fitText(ctx, d.business.name, 640), M, y);
    ctx.fillStyle = MUTED;
    ctx.font = font(400, 26);
    ctx.textAlign = "right";
    ctx.fillText(d.invoice_number, COL_AMT, y);
    ctx.textAlign = "left";
    y += 30;
    rule(M, COL_AMT, y);
    y += 20;
  };

  const drawTableHeader = () => {
    y += 30;
    ctx.fillStyle = "#787878";
    ctx.font = font(600, 20);
    ctx.fillText(fitText(ctx, t("inv.item"), 400), M, y);
    ctx.textAlign = "right";
    ctx.fillText(t("inv.qty"), COL_QTY, y);
    ctx.fillText(t("inv.unit"), COL_UNIT, y);
    ctx.fillText(t("inv.amount"), COL_AMT, y);
    ctx.textAlign = "left";
    y += 12;
    rule(M, COL_AMT, y);
    y += 40;
  };

  // ---------- bill to ----------
  newCanvas();
  drawFirstHeader();
  y += 47;
  ctx.fillStyle = "#969696";
  ctx.font = font(600, 20);
  ctx.fillText(t("inv.billTo"), M, y);
  y += 34;
  ctx.fillStyle = "#1e1e1e";
  ctx.font = font(700, 33);
  const nameLines = wrapText(ctx, d.customer.name || "-", 770, 2);
  nameLines.forEach((line, i) => ctx.fillText(line, M, y + i * 40));
  let by = y + (nameLines.length - 1) * 40 + 34;
  ctx.fillStyle = "#5a5a5a";
  ctx.font = font(400, 26);
  for (const value of [d.customer.phone, d.customer.address, d.customer.city].filter(Boolean)) {
    for (const line of wrapText(ctx, String(value), 770, 3)) {
      ctx.fillText(line, M, by);
      by += 31;
    }
  }
  y = Math.max(by, y + 60) + 18;
  rule(M, COL_AMT, y);
  drawTableHeader();

  // ---------- item rows ----------
  const nameW = COL_QTY - 90 - M;
  const LINE_H = 34;
  for (const li of d.lines) {
    ctx.font = font(400, 27);
    const lines = wrapText(ctx, li.name, nameW, 2);
    const rowH = Math.max(lines.length, 1) * LINE_H + 12;
    if (y + rowH > ROW_LIMIT) {
      newCanvas();
      drawNextHeader();
      drawTableHeader();
    }
    ctx.font = font(400, 27);
    ctx.fillStyle = "#1e1e1e";
    lines.forEach((line, i) => ctx.fillText(line, M, y + i * LINE_H));
    ctx.textAlign = "right";
    ctx.fillText(String(li.quantity), COL_QTY, y);
    ctx.fillText(formatLKR(li.unit_price), COL_UNIT, y);
    ctx.fillText(formatLKR(li.line_total), COL_AMT, y);
    ctx.textAlign = "left";
    y += rowH;
  }

  // ---------- totals + notes ----------
  ctx.font = font(400, 24);
  const noteLines = d.notes ? wrapText(ctx, d.notes, PAGE_W - 2 * M, 6) : [];
  const need = 24 + (d.discount > 0 ? 3 : 2) * 36 + 84 + (noteLines.length ? 60 + noteLines.length * 31 : 0);
  if (y + need > TOTALS_LIMIT) {
    newCanvas();
    drawNextHeader();
  }

  y += 4;
  rule(708, COL_AMT, y);
  y += 38;
  // Labels start at the left of the totals rule; their room is whatever the amount leaves over.
  const LABEL_X = 730;
  const totalsRow = (label: string, value: string) => {
    ctx.font = font(400, 26);
    ctx.fillStyle = "#5a5a5a";
    const room = COL_AMT - LABEL_X - ctx.measureText(value).width - 30;
    ctx.fillText(fitText(ctx, label, room), LABEL_X, y);
    ctx.textAlign = "right";
    ctx.fillText(value, COL_AMT, y);
    ctx.textAlign = "left";
    y += 36;
  };
  totalsRow(t("inv.subtotal"), formatLKR(d.subtotal));
  totalsRow(t("inv.delivery"), formatLKR(d.delivery_charge));
  if (d.discount > 0) totalsRow(t("inv.discount"), `- ${formatLKR(d.discount)}`);
  rule(708, COL_AMT, y - 14, "#b4b4b4");
  y += 20;
  ctx.font = font(700, 34);
  ctx.fillStyle = `rgb(${ar},${ag},${ab})`;
  const totalValue = formatLKR(d.total_amount);
  ctx.fillText(fitText(ctx, t("inv.total"), COL_AMT - LABEL_X - ctx.measureText(totalValue).width - 30), LABEL_X, y);
  ctx.textAlign = "right";
  ctx.fillText(totalValue, COL_AMT, y);
  ctx.textAlign = "left";
  y += 36;

  if (noteLines.length) {
    y += 34;
    ctx.fillStyle = "#969696";
    ctx.font = font(600, 20);
    ctx.fillText(t("inv.notes"), M, y);
    y += 32;
    ctx.fillStyle = "#5a5a5a";
    ctx.font = font(400, 24);
    noteLines.forEach((line, i) => ctx.fillText(line, M, y + i * 31));
  }

  // ---------- footer on every page ----------
  const footerText = d.business.footer?.trim() || `${t("inv.thanks")}  ·  ${d.business.name}`;
  pages.forEach(({ ctx: c }, index) => {
    c.font = font(400, 21);
    c.fillStyle = "#a0a0a0";
    c.textAlign = "center";
    const lines = wrapText(c, footerText, PAGE_W - 2 * M, 3);
    lines.forEach((line, i) => c.fillText(line, PAGE_W / 2, FOOTER_Y - (lines.length - 1) * 28 + i * 28));
    if (pages.length > 1) {
      c.textAlign = "right";
      c.fillText(t("inv.page", { n: index + 1, total: pages.length }), COL_AMT, FOOTER_Y + 40);
    }
    c.textAlign = "left";
  });

  return pages.map((p) => p.canvas);
}
