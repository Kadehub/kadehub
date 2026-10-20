/** Shared canvas drawing helpers for the generated documents (catalog, invoice).
 *  Documents are drawn on <canvas> rather than with jsPDF text so that Sinhala and
 *  Tamil render correctly (jsPDF's built-in fonts can't draw or shape those
 *  scripts), and so the preview, JPG and PDF always match. Browser only. */

export const FONT =
  '"Segoe UI", system-ui, -apple-system, Roboto, "Noto Sans", "Noto Sans Sinhala", "Noto Sans Tamil", "Helvetica Neue", Arial, sans-serif';

export const INK = "#111827";
export const MUTED = "#6b7280";
export const LINE = "#e5e7eb";

// ---------- images ----------

const imageCache = new Map<string, Promise<HTMLImageElement | null>>();

/** Loads an image through fetch → blob so the canvas is never tainted by a
 *  cross-origin image. Resolves null (never rejects) when it can't be loaded. */
export function loadImage(url: string): Promise<HTMLImageElement | null> {
  let pending = imageCache.get(url);
  if (!pending) {
    pending = (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const objectUrl = URL.createObjectURL(await res.blob());
        return await new Promise<HTMLImageElement | null>((resolve) => {
          const img = new Image();
          img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(img);
          };
          img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(null);
          };
          img.src = objectUrl;
        });
      } catch {
        return null;
      }
    })();
    imageCache.set(url, pending);
  }
  return pending;
}

// ---------- drawing helpers ----------

export type Ctx = CanvasRenderingContext2D;

export function roundedRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function drawCover(ctx: Ctx, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const sw = w / scale;
  const sh = h / scale;
  ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, x, y, w, h);
}

export function drawContain(ctx: Ctx, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const scale = Math.min(w / img.naturalWidth, h / img.naturalHeight);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

const segmenter =
  typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;

export function graphemes(text: string): string[] {
  return segmenter ? Array.from(segmenter.segment(text), (s) => s.segment) : Array.from(text);
}

/** Greedy word wrap into at most `maxLines` lines, hard-breaking words that are
 *  wider than the box (Sinhala/CJK text has no spaces) and ending with "…" if cut. */
export function wrapText(ctx: Ctx, text: string, maxWidth: number, maxLines: number): string[] {
  const width = (s: string) => ctx.measureText(s).width;
  const lines: string[] = [];
  let cur = "";

  for (const word of text.split(/\s+/).filter(Boolean)) {
    const attempt = cur ? `${cur} ${word}` : word;
    if (width(attempt) <= maxWidth) {
      cur = attempt;
      continue;
    }
    if (cur) lines.push(cur);
    cur = "";
    if (width(word) <= maxWidth) {
      cur = word;
      continue;
    }
    for (const g of graphemes(word)) {
      if (!cur || width(cur + g) <= maxWidth) cur += g;
      else {
        lines.push(cur);
        cur = g;
      }
    }
  }
  if (cur) lines.push(cur);

  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  const last = graphemes(kept[maxLines - 1]);
  while (last.length > 0 && width(last.join("").trimEnd() + "…") > maxWidth) last.pop();
  kept[maxLines - 1] = last.join("").trimEnd() + "…";
  return kept;
}

export function fitText(ctx: Ctx, text: string, maxWidth: number): string {
  return wrapText(ctx, text, maxWidth, 1)[0] ?? "";
}

export const font = (weight: 400 | 600 | 700, size: number) => `${weight} ${size}px ${FONT}`;

/** Largest font size (down to `minSize`) at which `text` fits `maxWidth` on one line.
 *  Translated words can be much longer than English ones (e.g. Tamil "விலைப்பட்டியல்"). */
export function fitFontSize(
  ctx: Ctx,
  text: string,
  weight: 400 | 600 | 700,
  size: number,
  minSize: number,
  maxWidth: number,
): number {
  let s = size;
  for (; s > minSize; s -= 2) {
    ctx.font = font(weight, s);
    if (ctx.measureText(text).width <= maxWidth) return s;
  }
  return minSize;
}

export function canvasToBlob(canvas: HTMLCanvasElement, quality = 0.92): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not encode image"))), "image/jpeg", quality);
  });
}

/** Builds an A4 PDF with one full-bleed image per page. JPEG suits photo-heavy pages
 *  (catalog); PNG keeps small text crisp (invoice). */
export async function canvasesToPdf(
  pages: HTMLCanvasElement[],
  format: "JPEG" | "PNG" = "JPEG",
): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  pages.forEach((canvas, i) => {
    if (i > 0) doc.addPage();
    const data = format === "PNG" ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", 0.92);
    doc.addImage(data, format, 0, 0, 210, 297);
  });
  return doc.output("blob");
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
