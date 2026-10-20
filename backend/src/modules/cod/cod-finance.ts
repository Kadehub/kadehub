import { DateRange, lastNMonths, round2, within } from './cod-analytics';

/**
 * Financial summary for COD (spec §8). The ONLY place these formulas live:
 *
 *   income               = Σ total_amount of delivered orders (dated by created_at)
 *   cogs                 = Σ quantity × landed_cost of lines on those orders (custom lines cost 0)
 *   businessExpenses     = Σ business expenses (all categories, incl. Business Tour)
 *   businessTourExpenses = Σ business expenses in 'Business Tour' (already inside businessExpenses)
 *   businessNetProfit    = income − cogs − businessExpenses
 *   personalExpenses     = Σ personal expenses
 *   netRemainingCash     = businessNetProfit − personalExpenses
 *
 * Personal expenses never change any business figure. Everything is recomputed from live rows.
 */

export const BUSINESS_TOUR = 'Business Tour';

export interface FinanceInput {
  orders: { id: number; status: string; total_amount: number; created_at: Date | string }[];
  /** Order lines with the unit landed cost (0 for custom, off-catalogue lines). */
  lines: { order_id: number; quantity: number; landed_cost: number }[];
  expenses: { amount: number; category: string; expense_date: string }[];
  personal: { amount: number; category: string; expense_date: string }[];
}

export interface CashFigures {
  income: number;
  cogs: number;
  businessExpenses: number;
  businessTourExpenses: number;
  businessNetProfit: number;
  personalExpenses: number;
  netRemainingCash: number;
  /** Share of business profit kept after personal spending, in %; null when there is no profit. */
  keptPct: number | null;
}

const sum = <T>(rows: T[], f: (r: T) => number) => rows.reduce((s, r) => s + (Number(f(r)) || 0), 0);

/** Figures for one period; omit `range` for all time. */
export function cashFigures(input: FinanceInput, range?: DateRange): CashFigures {
  const inRange = (d: Date | string) => !range || within(d, range);
  const delivered = input.orders.filter(o => o.status === 'delivered' && inRange(o.created_at));
  const deliveredIds = new Set(delivered.map(o => o.id));
  const expenses = input.expenses.filter(e => inRange(e.expense_date));
  const personal = input.personal.filter(e => inRange(e.expense_date));

  const income = round2(sum(delivered, o => o.total_amount));
  const cogs = round2(sum(input.lines.filter(l => deliveredIds.has(l.order_id)), l => l.quantity * l.landed_cost));
  const businessExpenses = round2(sum(expenses, e => e.amount));
  const businessTourExpenses = round2(sum(expenses.filter(e => e.category === BUSINESS_TOUR), e => e.amount));
  const businessNetProfit = round2(income - cogs - businessExpenses);
  const personalExpenses = round2(sum(personal, e => e.amount));
  const netRemainingCash = round2(businessNetProfit - personalExpenses);
  const keptPct = businessNetProfit > 0 ? Math.round((netRemainingCash / businessNetProfit) * 1000) / 10 : null;

  return { income, cogs, businessExpenses, businessTourExpenses, businessNetProfit, personalExpenses, netRemainingCash, keptPct };
}

function byCategory(rows: { amount: number; category: string }[]) {
  const map = new Map<string, { category: string; amount: number; count: number }>();
  for (const r of rows) {
    const k = r.category || 'Other';
    const cur = map.get(k) ?? { category: k, amount: 0, count: 0 };
    cur.amount = round2(cur.amount + Number(r.amount));
    cur.count += 1;
    map.set(k, cur);
  }
  return [...map.values()].sort((a, b) => b.amount - a.amount);
}

/** The "Personal & Cash" model: the selected period, all time, the last 6 months and category breakdowns. */
export function cashModel(input: FinanceInput, range: DateRange, now = new Date()) {
  const months = lastNMonths(6, now).map(m => ({
    key: m.key,
    label: m.label,
    ...cashFigures(input, { from: m.from, to: m.to }),
  }));
  return {
    period: cashFigures(input, range),
    allTime: cashFigures(input),
    months,
    businessByCategory: byCategory(input.expenses.filter(e => within(e.expense_date, range))),
    personalByCategory: byCategory(input.personal.filter(e => within(e.expense_date, range))),
  };
}
