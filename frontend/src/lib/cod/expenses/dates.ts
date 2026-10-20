/** Local calendar-day helpers for expenses. Expense dates are plain `yyyy-MM-dd` strings in the user's local time. */

const pad = (n: number) => String(n).padStart(2, '0');

export function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "Today" as the user's local date. */
export function localToday(now = new Date()): string {
  return ymd(now);
}

export function parseYmd(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function addDays(s: string, days: number): string {
  const d = parseYmd(s);
  d.setDate(d.getDate() + days);
  return ymd(d);
}

export function monthKey(s: string): string {
  return s.slice(0, 7);
}

export function startOfMonthYmd(now = new Date()): string {
  return ymd(new Date(now.getFullYear(), now.getMonth(), 1));
}

export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/** Whole days from a to b (b − a), both yyyy-MM-dd. */
export function daysBetween(a: string, b: string): number {
  return Math.round((parseYmd(b).getTime() - parseYmd(a).getTime()) / 86_400_000);
}

export type Period = 'this_month' | 'last_month' | 'last_3_months' | 'this_year' | 'all';
export interface YmdRange { from: string | null; to: string | null }

/** Inclusive yyyy-MM-dd bounds for a period (null = open). */
export function periodRange(period: Period, now = new Date()): YmdRange {
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (period) {
    case 'this_month': return { from: ymd(new Date(y, m, 1)), to: ymd(new Date(y, m + 1, 0)) };
    case 'last_month': return { from: ymd(new Date(y, m - 1, 1)), to: ymd(new Date(y, m, 0)) };
    case 'last_3_months': return { from: ymd(new Date(y, m - 2, 1)), to: ymd(new Date(y, m + 1, 0)) };
    case 'this_year': return { from: `${y}-01-01`, to: `${y}-12-31` };
    default: return { from: null, to: null };
  }
}

export function inRange(date: string, r: YmdRange): boolean {
  return (!r.from || date >= r.from) && (!r.to || date <= r.to);
}

/** Last n month keys (oldest → newest), e.g. ['2026-05', …, '2026-10']. */
export function lastMonthKeys(n: number, now = new Date()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`);
  }
  return out;
}
