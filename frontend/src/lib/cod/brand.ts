/** Brand-colour helpers shared by the app theme, invoices and catalogs. */

export const DEFAULT_BRAND_COLOR = "#0f172a";

/** Accent colours offered in the picker — all dark/saturated enough for white text. */
export const BRAND_SWATCHES = [
  "#0f172a", // slate
  "#1d4ed8", // blue
  "#0e7490", // teal
  "#15803d", // green
  "#b45309", // amber
  "#c2410c", // orange
  "#be123c", // rose
  "#7e22ce", // purple
] as const;

const HEX = /^#[0-9a-f]{6}$/i;

export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && HEX.test(value);
}

/** Returns `value` lower-cased if it is a valid `#rrggbb`, otherwise the fallback. */
export function normalizeHex(value: unknown, fallback = DEFAULT_BRAND_COLOR): string {
  return isHexColor(value) ? value.toLowerCase() : fallback;
}

export function hexToRgb(hex: string): [number, number, number] {
  const h = normalizeHex(hex).slice(1);
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

/** WCAG relative luminance, 0 (black) – 1 (white). */
export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** White or near-black — whichever reads better on top of `background`. */
export function readableTextColor(background: string): "#ffffff" | "#111827" {
  return luminance(background) > 0.4 ? "#111827" : "#ffffff";
}
