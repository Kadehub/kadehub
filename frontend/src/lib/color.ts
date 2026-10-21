/**
 * Text that sits on (or is) a brand/category colour must stay readable: WCAG AA asks for 4.5:1 for normal text.
 * Brand colours themselves stay as they are for icons, charts and borders; these helpers pick the text colour.
 */

type RGB = [number, number, number];

function rgb(hex: string): RGB {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const toHex = ([r, g, b]: RGB) => '#' + [r, g, b].map(v => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('');

function luminance(c: RGB): number {
  const [r, g, b] = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [l1, l2] = [luminance(rgb(a)), luminance(rgb(b))].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/** `amount` of `color` over `base` (like CSS color-mix / a translucent tint). */
export function mix(color: string, amount: number, base = '#ffffff'): string {
  const a = rgb(color), b = rgb(base);
  return toHex([0, 1, 2].map(i => a[i] * amount + b[i] * (1 - amount)) as RGB);
}

const INK = '#0F172A';

/** White or near-black, whichever reads better on this background. */
export function onColor(bg: string): string {
  return contrast('#ffffff', bg) >= contrast(INK, bg) ? '#FFFFFF' : INK;
}

/** The colour itself, darkened just enough to read as text on `bg`. */
export function readableText(color: string, bg = '#ffffff', min = 4.5): string {
  let c = rgb(color);
  for (let i = 0; i < 20 && contrast(toHex(c), bg) < min; i++) c = c.map(v => v * 0.9) as RGB;
  return toHex(c);
}
