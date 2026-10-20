/** Draws catalog pages onto <canvas> elements (browser only). The same pages
 *  feed the on-screen preview, the JPG export and the PDF export, so all three
 *  are guaranteed to match. Canvas text also means Sinhala/Tamil product names
 *  render properly, which jsPDF's built-in fonts can't do. */

import { hexToRgb, normalizeHex, readableTextColor } from "@/lib/cod/brand";
import {
  INK,
  LINE,
  MUTED,
  canvasesToPdf,
  drawContain,
  drawCover,
  fitText,
  font,
  graphemes,
  loadImage,
  roundedRect,
  wrapText,
  type Ctx,
} from "@/lib/cod/canvas-doc";

import {
  CARD_STYLES,
  FIRST_HEADER_H,
  FOOTER_H,
  MARGIN,
  PAGE_H,
  PAGE_W,
  layoutCatalog,
  type CardStyle,
  type Columns,
  type Placement,
} from "@/lib/cod/catalog-layout";

export interface CatalogEntry {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  stock: number;
  lowStockThreshold: number;
  imageUrl: string | null;
}

export interface CatalogBusiness {
  name: string;
  phone: string;
  address: string;
  tagline: string;
  logoUrl: string | null;
}

/** Text drawn on the pages. Templates keep their `{phone}` / `{n}` / `{total}` placeholders. */
export interface CatalogLabels {
  toOrder: string;
  page: string;
  soldOut: string;
  onlyLeft: string;
  empty: string;
}

const fill = (template: string, vars: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (whole, k: string) => (k in vars ? String(vars[k]) : whole));

export interface CatalogOptions {
  labels: CatalogLabels;
  title: string;
  subtitle: string;
  columns: Columns;
  showPrice: boolean;
  /** Show "Sold out" / "Only N left" badges. */
  showStock: boolean;
  showSku: boolean;
  groupByCategory: boolean;
  accent: string;
}


const priceFmt = new Intl.NumberFormat("en-LK", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const priceFmtCents = new Intl.NumberFormat("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** `Rs. 1,500` for whole amounts, `Rs. 1,499.50` otherwise. */
export function formatCatalogPrice(value: number): string {
  const n = Number(value);
  const safe = Number.isFinite(n) ? n : 0;
  return `Rs. ${Number.isInteger(safe) ? priceFmt.format(safe) : priceFmtCents.format(safe)}`;
}

// ---------- page sections ----------

function drawHeader(
  ctx: Ctx,
  first: boolean,
  b: CatalogBusiness,
  logo: HTMLImageElement | null,
  o: CatalogOptions,
  accent: string,
) {
  const onAccent = readableTextColor(accent);
  const [r, g, bl] = hexToRgb(onAccent);

  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, PAGE_W, first ? 190 : 70);

  if (!first) {
    ctx.fillStyle = onAccent;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.font = font(700, 30);
    ctx.fillText(fitText(ctx, b.name, 640), MARGIN, 36);
    ctx.textAlign = "right";
    ctx.font = font(400, 24);
    ctx.fillStyle = `rgba(${r},${g},${bl},0.85)`;
    ctx.fillText(fitText(ctx, o.title, 420), PAGE_W - MARGIN, 36);
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
    return;
  }

  let textX = MARGIN;
  if (logo) {
    const box = 110;
    ctx.fillStyle = "#ffffff";
    roundedRect(ctx, MARGIN, 40, box, box, 22);
    ctx.fill();
    drawContain(ctx, logo, MARGIN + 10, 50, box - 20, box - 20);
    textX = MARGIN + box + 28;
  }
  const maxW = PAGE_W - MARGIN - textX;
  ctx.textAlign = "left";
  ctx.fillStyle = onAccent;
  ctx.font = font(700, 50);
  ctx.fillText(fitText(ctx, b.name, maxW), textX, b.tagline ? 100 : 112);
  if (b.tagline) {
    ctx.font = font(400, 26);
    ctx.fillStyle = `rgba(${r},${g},${bl},0.85)`;
    ctx.fillText(fitText(ctx, b.tagline, maxW), textX, 146);
  }

  ctx.fillStyle = INK;
  ctx.font = font(700, 56);
  ctx.fillText(fitText(ctx, o.title, PAGE_W - 2 * MARGIN), MARGIN, 262);
  if (o.subtitle) {
    ctx.fillStyle = MUTED;
    ctx.font = font(400, 24);
    ctx.fillText(fitText(ctx, o.subtitle, PAGE_W - 2 * MARGIN), MARGIN, 296);
  }
}

function drawFooter(
  ctx: Ctx,
  b: CatalogBusiness,
  labels: CatalogLabels,
  accent: string,
  page: number,
  total: number,
) {
  const top = PAGE_H - FOOTER_H + 10;
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(MARGIN, top);
  ctx.lineTo(PAGE_W - MARGIN, top);
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.fillStyle = accent;
  ctx.font = font(700, 26);
  ctx.fillText(
    fitText(ctx, b.phone ? fill(labels.toOrder, { phone: b.phone }) : b.name, 800),
    MARGIN,
    top + 38,
  );
  if (b.address) {
    ctx.fillStyle = MUTED;
    ctx.font = font(400, 20);
    ctx.fillText(fitText(ctx, b.address, 800), MARGIN, top + 66);
  }
  ctx.textAlign = "right";
  ctx.fillStyle = MUTED;
  ctx.font = font(400, 20);
  ctx.fillText(fill(labels.page, { n: page, total }), PAGE_W - MARGIN, top + 38);
  ctx.textAlign = "left";
}

function drawHeading(ctx: Ctx, text: string, x: number, y: number, w: number, accent: string) {
  ctx.fillStyle = INK;
  ctx.font = font(700, 36);
  ctx.textAlign = "left";
  ctx.fillText(fitText(ctx, text, w - 40), x, y + 50);
  ctx.fillStyle = accent;
  ctx.fillRect(x, y + 64, 72, 5);
}

function drawPill(ctx: Ctx, text: string, x: number, y: number, fill: string, size: number) {
  ctx.font = font(700, size);
  const padX = size * 0.7;
  const h = size * 1.7;
  const w = ctx.measureText(text).width + padX * 2;
  ctx.fillStyle = fill;
  roundedRect(ctx, x, y, w, h, h / 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.fillText(text, x + padX, y + h / 2 + size * 0.35);
  return w;
}

function drawCard(
  ctx: Ctx,
  p: Extract<Placement<CatalogEntry>, { kind: "card" }>,
  img: HTMLImageElement | null,
  o: CatalogOptions,
  style: CardStyle,
  accent: string,
) {
  const { x, y, w, h, imageH, entry: e } = p;
  const radius = 20;

  ctx.fillStyle = "#ffffff";
  roundedRect(ctx, x, y, w, h, radius);
  ctx.fill();

  ctx.save();
  roundedRect(ctx, x, y, w, h, radius);
  ctx.clip();

  // image area
  if (img) {
    drawCover(ctx, img, x, y, w, imageH);
  } else {
    const [r, g, b] = hexToRgb(accent);
    ctx.fillStyle = `rgba(${r},${g},${b},0.1)`;
    ctx.fillRect(x, y, w, imageH);
    ctx.fillStyle = `rgba(${r},${g},${b},0.55)`;
    ctx.font = font(700, Math.round(imageH * 0.4));
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(graphemes(e.name.trim())[0]?.toUpperCase() ?? "?", x + w / 2, y + imageH / 2);
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
  }

  const soldOut = e.stock <= 0;
  if (o.showStock && soldOut) {
    ctx.fillStyle = "rgba(255,255,255,0.62)";
    ctx.fillRect(x, y, w, imageH);
    ctx.font = font(700, style.nameFont);
    const label = o.labels.soldOut;
    const pillW = ctx.measureText(label).width + style.nameFont * 1.6;
    const pillH = style.nameFont * 1.9;
    ctx.fillStyle = INK;
    roundedRect(ctx, x + (w - pillW) / 2, y + (imageH - pillH) / 2, pillW, pillH, pillH / 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText(label, x + w / 2, y + imageH / 2 + style.nameFont * 0.35);
    ctx.textAlign = "left";
  } else if (o.showStock && e.stock <= e.lowStockThreshold) {
    drawPill(ctx, fill(o.labels.onlyLeft, { n: e.stock }), x + 14, y + 14, "#b45309", style.metaFont);
  }
  ctx.restore();

  // text area
  const pad = 18;
  const textW = w - 2 * pad;
  ctx.fillStyle = INK;
  ctx.font = font(700, style.nameFont);
  ctx.textAlign = "left";
  wrapText(ctx, e.name, textW, style.nameLines).forEach((line, i) => {
    ctx.fillText(line, x + pad, y + imageH + 14 + style.nameFont + i * style.nameFont * 1.22);
  });

  const bottomBaseline = y + h - 16;
  if (o.showPrice) {
    ctx.fillStyle = accent;
    ctx.font = font(700, style.priceFont);
    ctx.fillText(fitText(ctx, formatCatalogPrice(e.price), textW), x + pad, bottomBaseline);
  }
  const meta = [!o.groupByCategory ? e.category : "", o.showSku ? e.sku : ""]
    .filter((s) => s && s !== "Uncategorized")
    .join(" · ");
  if (meta) {
    ctx.fillStyle = MUTED;
    ctx.font = font(400, style.metaFont);
    const metaBaseline = o.showPrice ? bottomBaseline - style.priceFont - 6 : bottomBaseline;
    ctx.fillText(fitText(ctx, meta, textW), x + pad, metaBaseline);
  }

  ctx.strokeStyle = LINE;
  ctx.lineWidth = 2;
  roundedRect(ctx, x, y, w, h, radius);
  ctx.stroke();
}

// ---------- public API ----------

/** Renders every catalog page to a canvas. `scale` 1 = 1240×1754px (A4 at 150dpi). */
export async function renderCatalogPages(
  business: CatalogBusiness,
  entries: CatalogEntry[],
  options: CatalogOptions,
  scale = 1,
): Promise<HTMLCanvasElement[]> {
  const accent = normalizeHex(options.accent);
  const style = CARD_STYLES[options.columns];
  const pages = layoutCatalog(entries, options);

  const [logo, images] = await Promise.all([
    business.logoUrl ? loadImage(business.logoUrl) : Promise.resolve(null),
    Promise.all(entries.map((e) => (e.imageUrl ? loadImage(e.imageUrl) : Promise.resolve(null)))),
  ]);
  const imageById = new Map(entries.map((e, i) => [e.id, images[i]]));

  return pages.map((page, index) => {
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(PAGE_W * scale);
    canvas.height = Math.round(PAGE_H * scale);
    const ctx = canvas.getContext("2d")!;
    ctx.scale(scale, scale);

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, PAGE_W, PAGE_H);
    drawHeader(ctx, index === 0, business, logo, options, accent);

    if (entries.length === 0) {
      ctx.fillStyle = MUTED;
      ctx.font = font(400, 30);
      ctx.textAlign = "center";
      ctx.fillText(options.labels.empty, PAGE_W / 2, FIRST_HEADER_H + 200);
      ctx.textAlign = "left";
    }

    for (const pl of page.placements) {
      if (pl.kind === "heading") drawHeading(ctx, pl.text, pl.x, pl.y, pl.w, accent);
      else drawCard(ctx, pl, imageById.get(pl.entry.id) ?? null, options, style, accent);
    }

    drawFooter(ctx, business, options.labels, accent, index + 1, pages.length);
    return canvas;
  });
}

/** `my-shop-catalog.pdf`; falls back to `catalog.pdf` for names with no latin letters. */
export function catalogFileName(businessName: string, ext: "pdf" | "jpg", page?: number): string {
  const slug = businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${slug ? slug + "-" : ""}catalog${page ? `-page-${page}` : ""}.${ext}`;
}

export const catalogToPdf = canvasesToPdf;
export { canvasToBlob, downloadBlob } from "@/lib/cod/canvas-doc";

