/** Money & number formatting helpers (LKR is the display currency). */

import type { Locale } from "@/lib/cod/i18n/config";
import { formatShortDate } from "@/lib/cod/i18n/months";

const lkr = new Intl.NumberFormat("en-LK", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Format a LKR amount as `Rs. 1,234.00`. */
export function formatLKR(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  return `Rs. ${lkr.format(Number.isFinite(n) ? n : 0)}`;
}

/** Compact LKR for tight spaces: `Rs. 1.2K`, `Rs. 3.4M`. */
export function formatLKRCompact(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `Rs. ${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `Rs. ${(n / 1_000).toFixed(1)}K`;
  return `Rs. ${lkr.format(n)}`;
}

const num = new Intl.NumberFormat("en-LK");
export function formatNumber(value: number | null | undefined): string {
  return num.format(Number(value ?? 0));
}

/** Percent with one decimal, e.g. `42.5%`. */
export function formatPercent(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  return `${Number.isFinite(n) ? n.toFixed(1) : "0.0"}%`;
}

export function formatDate(value: string | Date | null | undefined, locale: Locale = "en"): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(d.getTime()) ? "—" : formatShortDate(d, locale);
}

export function currencySymbol(code: string): string {
  switch (code) {
    case "USD":
      return "$";
    case "CNY":
      return "¥";
    case "LKR":
      return "Rs.";
    default:
      return code;
  }
}
