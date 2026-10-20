import {
  startOfMonth,
  endOfMonth,
  subMonths,
  subDays,
  startOfDay,
  endOfDay,
  format,
} from "date-fns";
import type { Locale } from "@/lib/cod/i18n/config";
import { MONTHS_SHORT } from "@/lib/cod/i18n/months";

export type RangeKey =
  | "today"
  | "yesterday"
  | "this_month"
  | "last_month"
  | "last_3_months"
  | "this_year"
  | "all";

export interface DateRange {
  from: Date;
  to: Date;
}

export function resolveRange(key: RangeKey, now = new Date()): DateRange {
  switch (key) {
    case "today":
      return { from: startOfDay(now), to: endOfDay(now) };
    case "yesterday": {
      const y = subDays(now, 1);
      return { from: startOfDay(y), to: endOfDay(y) };
    }
    case "last_month": {
      const m = subMonths(now, 1);
      return { from: startOfMonth(m), to: endOfMonth(m) };
    }
    case "last_3_months":
      return { from: startOfMonth(subMonths(now, 2)), to: endOfMonth(now) };
    case "this_year":
      return { from: new Date(now.getFullYear(), 0, 1), to: endOfDay(now) };
    case "all":
      return { from: new Date(2000, 0, 1), to: endOfDay(now) };
    case "this_month":
    default:
      return { from: startOfMonth(now), to: endOfMonth(now) };
  }
}

/** Inclusive ISO bounds suitable for `gte`/`lte` against timestamptz columns. */
export function toIsoBounds(range: DateRange) {
  return {
    from: startOfDay(range.from).toISOString(),
    to: endOfDay(range.to).toISOString(),
  };
}

/** Last N month buckets (oldest → newest) as { key, label, from, to }. */
export function lastNMonths(n: number, now = new Date()) {
  const out: { key: string; label: string; from: Date; to: Date }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = subMonths(now, i);
    out.push({
      key: format(d, "yyyy-MM"),
      label: format(d, "MMM"),
      from: startOfMonth(d),
      to: endOfMonth(d),
    });
  }
  return out;
}

/** Short month name ("Sep" / "සැප්" / "செப்") for a `yyyy-MM` bucket key. */
export function monthLabel(key: string, locale: Locale): string {
  const month = Number(key.split("-")[1]);
  return MONTHS_SHORT[locale][month - 1] ?? key;
}
