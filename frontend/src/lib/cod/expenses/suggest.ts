import { addDays, localToday } from './dates';
import type { SpendRow } from './types';

const round2 = (n: number) => Math.round(n * 100) / 100;
const norm = (s: string | null | undefined) => (s ?? '').trim().toLowerCase();

/**
 * Quick-amount chips for a category: the user's 3 most-used amounts for it first (ties → most recent),
 * then the category's defaults, without repeats, at most `max`.
 */
export function quickAmounts(rows: SpendRow[], category: string, defaults: number[], max = 6): number[] {
  const counts = new Map<number, { n: number; last: string }>();
  for (const r of rows) {
    if (r.category !== category) continue;
    const a = round2(Number(r.amount));
    const c = counts.get(a) ?? { n: 0, last: '' };
    c.n += 1;
    if (r.expense_date > c.last) c.last = r.expense_date;
    counts.set(a, c);
  }
  const used = Array.from(counts.entries())
    .sort((x, y) => y[1].n - x[1].n || (y[1].last > x[1].last ? 1 : -1))
    .slice(0, 3)
    .map(([a]) => a);
  const out = [...used];
  for (const d of defaults) if (!out.includes(d)) out.push(d);
  return out.slice(0, max);
}

export interface RepeatChip { category: string; amount: number; count: number }

/** One-tap repeats: category + amount pairs used at least twice in the last `days` days, most used first (top `max`). */
export function oneTapRepeats(rows: SpendRow[], now = new Date(), days = 90, max = 6): RepeatChip[] {
  const since = addDays(localToday(now), -days);
  const map = new Map<string, RepeatChip & { last: string }>();
  for (const r of rows) {
    if (r.expense_date < since) continue;
    const amount = round2(Number(r.amount));
    const key = `${r.category}|${amount}`;
    const c = map.get(key) ?? { category: r.category, amount, count: 0, last: '' };
    c.count += 1;
    if (r.expense_date > c.last) c.last = r.expense_date;
    map.set(key, c);
  }
  return Array.from(map.values())
    .filter(c => c.count >= 2)
    .sort((a, b) => b.count - a.count || (b.last > a.last ? 1 : -1))
    .slice(0, max)
    .map(({ category, amount, count }) => ({ category, amount, count }));
}

/**
 * Lookalike check mirrored from the server: same date, category and amount, and the same text
 * (business: title; personal: note), compared trimmed and case-insensitive. `ignoreId` excludes the row being edited.
 */
export function findLookalike<T extends SpendRow & { id: number }>(
  rows: T[], row: SpendRow, field: 'title' | 'notes', ignoreId?: number,
): T | undefined {
  const amount = round2(Number(row.amount));
  return rows.find(r =>
    r.id !== ignoreId
    && r.expense_date === row.expense_date
    && r.category === row.category
    && round2(Number(r.amount)) === amount
    && norm(r[field]) === norm(row[field]));
}

/** Last payment method used (newest row first in `rows`), for the Paid-by default. */
export function lastMethod(rows: { payment_method: string | null }[], fallback = 'cash'): string {
  return rows.find(r => r.payment_method)?.payment_method ?? fallback;
}
