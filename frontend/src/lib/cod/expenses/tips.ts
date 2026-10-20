/**
 * Personal-spending pace and tips. Pure functions (no framework, no I/O), month-to-date, unit-tested.
 * Tips are returned as ids + numbers; the UI translates and formats them (lib/cod/i18n keys `tip.<id>.*`).
 */
import { daysBetween, daysInMonth, localToday, ymd } from './dates';
import type { SpendRow } from './types';

const round2 = (n: number) => Math.round(n * 100) / 100;
const sum = (rows: SpendRow[]) => round2(rows.reduce((s, r) => s + Number(r.amount), 0));

export interface MonthPace {
  spent: number;
  daysElapsed: number;
  daysInMonth: number;
  daysLeft: number;
  /** Straight-line month-end estimate. */
  projected: number;
  /** budget − spent (null without a budget). */
  left: number | null;
  /** max(0, left) / (daysLeft + 1): today counts as a day you can still spend (null without a budget). */
  safePerDay: number | null;
  /** Last month's spend from day 1 up to the same day number. */
  lastMonthSameDays: number;
}

function monthRows(rows: SpendRow[], now: Date) {
  const y = now.getFullYear();
  const m = now.getMonth();
  const first = ymd(new Date(y, m, 1));
  const today = localToday(now);
  return rows.filter(r => r.expense_date >= first && r.expense_date <= today);
}

export function monthPace(rows: SpendRow[], budget: number | null | undefined, now = new Date()): MonthPace {
  const y = now.getFullYear();
  const m = now.getMonth();
  const dim = daysInMonth(y, m);
  const daysElapsed = now.getDate();
  const daysLeft = dim - daysElapsed;
  const spent = sum(monthRows(rows, now));
  const projected = round2((spent / daysElapsed) * dim);
  const hasBudget = typeof budget === 'number' && budget > 0;
  const left = hasBudget ? round2(budget - spent) : null;
  const safePerDay = hasBudget ? round2(Math.max(0, left!) / (daysLeft + 1)) : null;

  // Last month, day 1 → same day number (clamped to last month's length)
  const lastFirst = new Date(y, m - 1, 1);
  const lastDim = daysInMonth(lastFirst.getFullYear(), lastFirst.getMonth());
  const lastFrom = ymd(lastFirst);
  const lastTo = ymd(new Date(lastFirst.getFullYear(), lastFirst.getMonth(), Math.min(daysElapsed, lastDim)));
  const lastMonthSameDays = sum(rows.filter(r => r.expense_date >= lastFrom && r.expense_date <= lastTo));

  return { spent, daysElapsed, daysInMonth: dim, daysLeft, projected, left, safePerDay, lastMonthSameDays };
}

export type TipTone = 'good' | 'warn' | 'info';
export type TipId =
  | 'over_budget' | 'cash_negative' | 'pace' | 'keep_low' | 'up_vs_last' | 'lifestyle' | 'top_category'
  | 'quiet' | 'pickme' | 'small_spends' | 'on_track' | 'below_last' | 'set_budget' | 'keep_good'
  | 'invest_first' | 'invested';
export type TipIcon = 'alert' | 'wallet' | 'trend_up' | 'trend_down' | 'glass' | 'pie' | 'clock' | 'car' | 'coins' | 'check' | 'piggy' | 'target';

export interface Tip {
  id: TipId;
  rank: number;
  tone: TipTone;
  icon: TipIcon;
  /** Numbers (and a category name) for the translated title/detail. Money values are plain numbers. */
  params: Record<string, number | string>;
}

export interface TipOptions {
  budget?: number | null;
  now?: Date;
  /** Business net profit for the same period (dashboard only). */
  businessNet?: number;
  /** businessNet − personal expenses (dashboard only). */
  remainingCash?: number;
  max?: number;
}

export function buildTips(rows: SpendRow[], opts: TipOptions = {}): Tip[] {
  const { budget = null, now = new Date(), businessNet, remainingCash, max = 4 } = opts;
  if (!rows.length) return [];

  const pace = monthPace(rows, budget, now);
  const mtd = monthRows(rows, now);
  const { spent, daysElapsed: day } = pace;
  const hasBudget = typeof budget === 'number' && budget > 0;
  const byCat = new Map<string, number>();
  for (const r of mtd) byCat.set(r.category, round2((byCat.get(r.category) ?? 0) + Number(r.amount)));
  const tips: Tip[] = [];
  const add = (id: TipId, rank: number, tone: TipTone, icon: TipIcon, params: Tip['params'] = {}) => tips.push({ id, rank, tone, icon, params });
  const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

  if (hasBudget && spent > budget!) add('over_budget', 100, 'warn', 'alert', { over: round2(spent - budget!) });
  if (typeof remainingCash === 'number' && remainingCash < 0) add('cash_negative', 95, 'warn', 'wallet', { amount: round2(-remainingCash) });
  if (hasBudget && spent <= budget! && day >= 5 && pace.projected > budget! * 1.05) {
    add('pace', 90, 'warn', 'trend_up', { projected: pace.projected, budget: budget!, safePerDay: pace.safePerDay ?? 0, daysLeft: pace.daysLeft });
  }
  const keptPct = typeof businessNet === 'number' && businessNet > 0 && typeof remainingCash === 'number' && remainingCash >= 0
    ? pct(remainingCash, businessNet) : null;
  if (keptPct !== null && keptPct < 30) add('keep_low', 80, 'warn', 'wallet', { pct: keptPct });
  if (day >= 3 && pace.lastMonthSameDays > 0 && spent >= pace.lastMonthSameDays * 1.2) {
    add('up_vs_last', 70, 'warn', 'trend_up', { pct: pct(spent - pace.lastMonthSameDays, pace.lastMonthSameDays) });
  }
  const lifestyle = round2((byCat.get('Alcohol') ?? 0) + (byCat.get('Outings') ?? 0));
  if (spent > 0 && lifestyle / spent >= 0.3) add('lifestyle', 65, 'warn', 'glass', { pct: pct(lifestyle, spent), amount: lifestyle });

  const nonInvest = Array.from(byCat.entries()).filter(([c]) => c !== 'Investment').sort((a, b) => b[1] - a[1]);
  if (byCat.size > 1 && nonInvest.length && spent > 0 && nonInvest[0][1] / spent >= 0.4) {
    add('top_category', 60, 'info', 'pie', { category: nonInvest[0][0], pct: pct(nonInvest[0][1], spent), save: round2(nonInvest[0][1] * 0.2) });
  }
  const lastLogged = rows.reduce((m, r) => (r.expense_date > m ? r.expense_date : m), '');
  const quiet = lastLogged ? daysBetween(lastLogged, localToday(now)) : 0;
  if (quiet >= 4) add('quiet', 55, 'info', 'clock', { days: quiet });
  const rides = mtd.filter(r => r.category === 'PickMe');
  if (rides.length >= 8) add('pickme', 50, 'info', 'car', { count: rides.length, amount: sum(rides) });
  const small = mtd.filter(r => Number(r.amount) < 1000);
  if (small.length >= 12) add('small_spends', 45, 'info', 'coins', { count: small.length, amount: sum(small) });
  if (hasBudget && spent <= budget! && pace.projected <= budget! * 1.05) {
    add('on_track', 40, 'good', 'check', { left: pace.left ?? 0, safePerDay: pace.safePerDay ?? 0 });
  }
  if (day >= 3 && pace.lastMonthSameDays > 0 && spent <= pace.lastMonthSameDays * 0.9) {
    add('below_last', 35, 'good', 'trend_down', { pct: pct(pace.lastMonthSameDays - spent, pace.lastMonthSameDays), saved: round2(pace.lastMonthSameDays - spent) });
  }
  if (!hasBudget) add('set_budget', 30, 'info', 'target');
  if (keptPct !== null && keptPct >= 30) add('keep_good', 30, 'good', 'wallet', { pct: keptPct });
  const invested = byCat.get('Investment') ?? 0;
  if (day >= 10 && invested === 0) add('invest_first', 25, 'info', 'piggy');
  if (invested > 0) add('invested', 20, 'good', 'piggy', { amount: invested });

  return tips.sort((a, b) => b.rank - a.rank).slice(0, max);
}
