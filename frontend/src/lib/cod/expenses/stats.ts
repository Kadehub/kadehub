/** Aggregations for the Expenses page (pure, unit-tested). */
import { addDays, daysBetween, inRange, lastMonthKeys, localToday, monthKey, type YmdRange } from './dates';
import { BUSINESS_TOUR, type SpendRow } from './types';

const round2 = (n: number) => Math.round(n * 100) / 100;
const total = (rows: SpendRow[]) => round2(rows.reduce((s, r) => s + Number(r.amount), 0));

export interface BusinessKpis {
  total: number;
  tour: number;
  entries: number;
  perDay: number;
  /** % change vs the previous equal-length period (null when there's nothing to compare). */
  change: number | null;
}

/**
 * KPIs for the rows inside `range` (all rows are passed so the previous period can be measured).
 * For an open range ("All") the span runs from the first expense to today and there's no comparison.
 */
export function businessKpis(all: SpendRow[], range: YmdRange, now = new Date()): BusinessKpis {
  const rows = all.filter(r => inRange(r.expense_date, range));
  const t = total(rows);
  const today = localToday(now);
  const from = range.from ?? rows.reduce((m, r) => (r.expense_date < m ? r.expense_date : m), today);
  const to = range.to && range.to < today ? range.to : today;
  const days = Math.max(1, daysBetween(from, to) + 1);
  let change: number | null = null;
  if (range.from) {
    const span = daysBetween(range.from, range.to ?? today) + 1;
    const prev: YmdRange = { from: addDays(range.from, -span), to: addDays(range.from, -1) };
    const prevTotal = total(all.filter(r => inRange(r.expense_date, prev)));
    if (prevTotal > 0) change = Math.round(((t - prevTotal) / prevTotal) * 1000) / 10;
  }
  return {
    total: t,
    tour: total(rows.filter(r => r.category === BUSINESS_TOUR)),
    entries: rows.length,
    perDay: round2(t / days),
    change,
  };
}

export interface CategorySlice { category: string; amount: number; count: number; pct: number }

export function byCategory(rows: SpendRow[]): CategorySlice[] {
  const t = total(rows);
  const map = new Map<string, { amount: number; count: number }>();
  for (const r of rows) {
    const c = map.get(r.category) ?? { amount: 0, count: 0 };
    c.amount = round2(c.amount + Number(r.amount));
    c.count += 1;
    map.set(r.category, c);
  }
  return Array.from(map.entries())
    .map(([category, v]) => ({ category, ...v, pct: t > 0 ? Math.round((v.amount / t) * 1000) / 10 : 0 }))
    .sort((a, b) => b.amount - a.amount);
}

/** Totals per month for the last n months: [{ key: 'yyyy-MM', total, byCategory: {cat: amount} }]. */
export function monthlySeries(rows: SpendRow[], n = 6, now = new Date()) {
  const keys = lastMonthKeys(n, now);
  const out = keys.map(key => ({ key, total: 0, byCategory: {} as Record<string, number> }));
  const idx = new Map(keys.map((k, i) => [k, i]));
  for (const r of rows) {
    const i = idx.get(monthKey(r.expense_date));
    if (i === undefined) continue;
    const a = Number(r.amount);
    out[i].total = round2(out[i].total + a);
    out[i].byCategory[r.category] = round2((out[i].byCategory[r.category] ?? 0) + a);
  }
  return out;
}

/** Monthly summary rows (newest first) over every month that has data: month, entries, top category, total. */
export function monthlySummary(rows: SpendRow[]) {
  const map = new Map<string, SpendRow[]>();
  for (const r of rows) {
    const k = monthKey(r.expense_date);
    map.set(k, [...(map.get(k) ?? []), r]);
  }
  return Array.from(map.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([key, list]) => ({ key, entries: list.length, top: byCategory(list)[0]?.category ?? '', total: total(list) }));
}

/** Rows grouped by day (newest first) with a per-day total. */
export function groupByDay<T extends SpendRow>(rows: T[]) {
  const map = new Map<string, T[]>();
  for (const r of rows) map.set(r.expense_date, [...(map.get(r.expense_date) ?? []), r]);
  return Array.from(map.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([date, list]) => ({ date, rows: list, total: total(list) }));
}

export function sumAmounts(rows: SpendRow[]) {
  return total(rows);
}
