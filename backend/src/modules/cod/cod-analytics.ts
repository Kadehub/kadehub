/**
 * Pure COD analytics (dashboard KPIs, item units by stage, reports), ported from CODPlatform's
 * lib/dashboard.ts, lib/units.ts and reports page. Computed on the server so accounts without
 * Premium only ever receive placeholder numbers for the locked sections.
 *
 * Dates follow Sri Lanka time (UTC+5:30, no DST) regardless of where the server runs.
 */
import type { CodItem } from '../../database/entities/cod-item.entity';
import type { CodExpense } from '../../database/entities/cod-expense.entity';
import { COD_ORDER_STATUSES, type CodOrder } from '../../database/entities/cod-order.entity';
import type { CodOrderItem } from '../../database/entities/cod-order-item.entity';

export const RANGE_KEYS = ['today', 'yesterday', 'this_month', 'last_month', 'last_3_months', 'this_year', 'all'] as const;
export type RangeKey = (typeof RANGE_KEYS)[number];
export interface DateRange { from: Date; to: Date }

const OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Colombo wall-clock parts of an instant. */
function parts(d: Date) {
  const s = new Date(d.getTime() + OFFSET_MS);
  return { y: s.getUTCFullYear(), m: s.getUTCMonth(), d: s.getUTCDate() };
}
/** Instant of Colombo midnight on y-m-d (month may overflow, Date.UTC normalises it). */
const colomboMidnight = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d) - OFFSET_MS);
const endBefore = (next: Date) => new Date(next.getTime() - 1);

function monthRange(y: number, m: number): DateRange {
  return { from: colomboMidnight(y, m, 1), to: endBefore(colomboMidnight(y, m + 1, 1)) };
}

export function isRangeKey(v: unknown): v is RangeKey {
  return typeof v === 'string' && (RANGE_KEYS as readonly string[]).includes(v);
}

export function resolveRange(key: RangeKey, now = new Date()): DateRange {
  const { y, m, d } = parts(now);
  switch (key) {
    case 'today': return { from: colomboMidnight(y, m, d), to: endBefore(colomboMidnight(y, m, d + 1)) };
    case 'yesterday': return { from: colomboMidnight(y, m, d - 1), to: endBefore(colomboMidnight(y, m, d)) };
    case 'last_month': return monthRange(y, m - 1);
    case 'last_3_months': return { from: colomboMidnight(y, m - 2, 1), to: endBefore(colomboMidnight(y, m + 1, 1)) };
    case 'this_year': return { from: colomboMidnight(y, 0, 1), to: endBefore(colomboMidnight(y, m, d + 1)) };
    case 'all': return { from: new Date(Date.UTC(2000, 0, 1)), to: endBefore(colomboMidnight(y, m, d + 1)) };
    case 'this_month':
    default: return monthRange(y, m);
  }
}

/** Last N month buckets (oldest → newest), keyed `yyyy-MM`. */
export function lastNMonths(n: number, now = new Date()) {
  const { y, m } = parts(now);
  const out: { key: string; label: string; from: Date; to: Date }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const r = monthRange(y, m - i);
    const p = parts(r.from);
    out.push({ key: `${p.y}-${String(p.m + 1).padStart(2, '0')}`, label: MONTHS[p.m], ...r });
  }
  return out;
}

/** Colombo calendar year, e.g. for invoice numbers. */
export const colomboYear = (now = new Date()) => parts(now).y;
export const startOfColomboMonth = (now = new Date()) => { const { y, m } = parts(now); return colomboMidnight(y, m, 1); };
/** Colombo calendar month key, `yyyy-MM` (the month a COD order top-up counts towards). */
export const colomboMonthKey = (now = new Date()) => { const { y, m } = parts(now); return `${y}-${String(m + 1).padStart(2, '0')}`; };

const toTime = (v: Date | string) => (typeof v === 'string'
  // DATE columns come back as 'YYYY-MM-DD' — that's a Colombo calendar day
  ? (/^\d{4}-\d{2}-\d{2}$/.test(v) ? Date.parse(`${v}T00:00:00+05:30`) : Date.parse(v))
  : v.getTime());
export const within = (v: Date | string, r: DateRange) => { const t = toTime(v); return t >= r.from.getTime() && t <= r.to.getTime(); };

export function round2(v: number): number {
  const x = Number(v);
  return Math.round(((Number.isFinite(x) ? x : 0) + Number.EPSILON) * 100) / 100;
}
const sumBy = <T>(arr: T[], f: (t: T) => number) => arr.reduce((s, x) => s + f(x), 0);

// ---------- premium placeholders ----------

const SAMPLE_REVENUE = [42000, 58000, 51000, 76000, 69000, 91000];
const SAMPLE_EXPENSES = [21000, 26000, 24000, 31000, 28000, 36000];

/** Decorative numbers for locked charts — nothing from the business. */
export function sampleMonthly<T extends { key: string; label: string }>(months: T[]) {
  return months.map((m, i) => {
    const revenue = SAMPLE_REVENUE[i % SAMPLE_REVENUE.length];
    const expenses = SAMPLE_EXPENSES[i % SAMPLE_EXPENSES.length];
    return { ...m, revenue, expenses, net: revenue - expenses };
  });
}

// ---------- dashboard ----------

export type LineWithCost = Pick<CodOrderItem, 'order_id' | 'item_id' | 'item_name' | 'quantity' | 'line_total'> & { landed_cost: number };

export function buildDashboard(
  input: { orders: CodOrder[]; orderItems: LineWithCost[]; items: CodItem[]; expenses: CodExpense[] },
  range: DateRange,
  premium: boolean,
) {
  const { orders, orderItems, items, expenses } = input;
  const periodOrders = orders.filter(o => within(o.created_at, range));
  const delivered = periodOrders.filter(o => o.status === 'delivered');
  const deliveredIds = new Set(delivered.map(o => o.id));

  const revenue = sumBy(delivered, o => Number(o.total_amount));
  const cogs = sumBy(orderItems.filter(oi => deliveredIds.has(oi.order_id)), oi => oi.quantity * Number(oi.landed_cost));
  const expensesTotal = sumBy(expenses.filter(e => within(e.expense_date, range)), e => Number(e.amount));

  const pipeline = orders.filter(o => o.status === 'pending' || o.status === 'confirmed' || o.status === 'ongoing');
  const lowStockItems = items.filter(i => i.stock_quantity <= i.low_stock_threshold).sort((a, b) => a.stock_quantity - b.stock_quantity);

  const months = lastNMonths(6).map(m => ({
    key: m.key,
    label: m.label,
    revenue: round2(sumBy(orders.filter(o => o.status === 'delivered' && within(o.created_at, m)), o => Number(o.total_amount))),
    expenses: round2(sumBy(expenses.filter(e => within(e.expense_date, m)), e => Number(e.amount))),
  }));

  const itemAgg = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const oi of orderItems) {
    if (!deliveredIds.has(oi.order_id)) continue;
    const key = oi.item_id != null ? `i${oi.item_id}` : `n${oi.item_name}`;
    const cur = itemAgg.get(key) ?? { name: oi.item_name, qty: 0, revenue: 0 };
    cur.qty += oi.quantity;
    cur.revenue += Number(oi.line_total);
    itemAgg.set(key, cur);
  }

  return {
    revenue: round2(revenue),
    cogs: round2(cogs),
    expensesTotal: round2(expensesTotal),
    netProfit: round2(revenue - cogs - expensesTotal),
    codPipelineValue: round2(sumBy(pipeline, o => Number(o.total_amount))),
    codPipelineCount: pipeline.length,
    inventoryValue: round2(sumBy(items, i => Number(i.landed_cost) * i.stock_quantity)),
    lowStockCount: lowStockItems.length,
    ordersByStatus: COD_ORDER_STATUSES.map(status => ({ status, count: periodOrders.filter(o => o.status === status).length })),
    // Free accounts get decorative numbers for the locked revenue-vs-expenses chart
    monthly: premium ? months : sampleMonthly(months).map(({ net, ...m }) => m),
    topItems: Array.from(itemAgg.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5),
    recentOrders: orders.slice().sort((a, b) => toTime(b.created_at) - toTime(a.created_at)).slice(0, 8),
    lowStockItems: lowStockItems.slice(0, 5),
  };
}

// ---------- reports ----------

export function buildReport(
  input: { orders: CodOrder[]; orderItems: LineWithCost[]; expenses: CodExpense[] },
  rangeKey: RangeKey,
  premium: boolean,
) {
  const { orders, orderItems, expenses } = input;
  const range = resolveRange(rangeKey);
  const inRange = (v: Date | string) => rangeKey === 'all' || within(v, range);

  const delivered = orders.filter(o => o.status === 'delivered' && inRange(o.created_at));
  const deliveredIds = new Set(delivered.map(o => o.id));
  const expensesInRange = expenses.filter(e => inRange(e.expense_date));

  const revenue = round2(sumBy(delivered, o => Number(o.total_amount)));
  const cogs = round2(sumBy(orderItems.filter(oi => deliveredIds.has(oi.order_id)), oi => oi.quantity * Number(oi.landed_cost)));
  const expensesTotal = round2(sumBy(expensesInRange, e => Number(e.amount)));
  const grossProfit = round2(revenue - cogs);

  const statusMap = new Map<string, number>();
  for (const o of orders.filter(o => inRange(o.created_at))) statusMap.set(o.status, (statusMap.get(o.status) ?? 0) + 1);
  const catMap = new Map<string, number>();
  for (const e of expensesInRange) catMap.set(e.category, (catMap.get(e.category) ?? 0) + Number(e.amount));

  const monthly = lastNMonths(6).map(m => {
    const rev = round2(sumBy(orders.filter(o => o.status === 'delivered' && within(o.created_at, m)), o => Number(o.total_amount)));
    const exp = round2(sumBy(expenses.filter(e => within(e.expense_date, m)), e => Number(e.amount)));
    return { key: m.key, label: m.label, revenue: rev, expenses: exp, net: round2(rev - exp) };
  });

  return {
    revenue, cogs, grossProfit, expensesTotal,
    netProfit: round2(grossProfit - expensesTotal),
    statusCounts: Array.from(statusMap, ([status, count]) => ({ status, count })),
    expenseByCategory: Array.from(catMap, ([category, amount]) => ({ category, amount: round2(amount) })).sort((a, b) => b.amount - a.amount),
    monthly: premium ? monthly : sampleMonthly(monthly),
  };
}

// ---------- item units by stage ----------

export const UNIT_STAGES = ['pending', 'confirmed', 'ongoing', 'delivered'] as const;
type UnitStage = (typeof UNIT_STAGES)[number];
export interface UnitRow { key: string; name: string; sku: string; units: number; revenue: number }

export function buildUnits(
  input: {
    orders: Pick<CodOrder, 'id' | 'status' | 'created_at'>[];
    orderItems: Pick<CodOrderItem, 'order_id' | 'item_id' | 'item_name' | 'quantity' | 'line_total'>[];
    items: Pick<CodItem, 'id' | 'sku'>[];
  },
  range: DateRange | null,
  query = '',
) {
  const q = query.trim().toLowerCase();
  const skuById = new Map(input.items.map(i => [i.id, i.sku]));
  const stageByOrder = new Map<number, UnitStage>();
  for (const o of input.orders) {
    if (!(UNIT_STAGES as readonly string[]).includes(o.status)) continue;
    if (range && !within(o.created_at, range)) continue;
    stageByOrder.set(o.id, o.status as UnitStage);
  }

  const acc = new Map<UnitStage, Map<string, UnitRow>>(UNIT_STAGES.map(s => [s, new Map()]));
  for (const li of input.orderItems) {
    const stage = stageByOrder.get(li.order_id);
    if (!stage) continue;
    const sku = (li.item_id != null && skuById.get(li.item_id)) || '';
    if (q && !li.item_name.toLowerCase().includes(q) && !sku.toLowerCase().includes(q)) continue;
    const key = li.item_id != null ? String(li.item_id) : `name:${li.item_name}`;
    const rows = acc.get(stage)!;
    const row = rows.get(key) ?? { key, name: li.item_name, sku, units: 0, revenue: 0 };
    row.units += li.quantity;
    row.revenue += Number(li.line_total);
    rows.set(key, row);
  }

  return UNIT_STAGES.map(status => {
    const rows = Array.from(acc.get(status)!.values())
      .map(r => ({ ...r, revenue: round2(r.revenue) }))
      .sort((a, b) => b.revenue - a.revenue);
    return { status, revenue: round2(sumBy(rows, r => r.revenue)), units: sumBy(rows, r => r.units), products: rows.length, rows };
  });
}

/** Keeps each stage's real totals but swaps the per-item rows for generic placeholders. */
export function lockUnitRows(stages: ReturnType<typeof buildUnits>, max = 6) {
  return stages.map(s => ({
    ...s,
    rows: Array.from({ length: Math.min(s.rows.length, max) }, (_, i): UnitRow => ({
      key: `placeholder-${i}`, name: 'Sample item name', sku: 'SKU-000', units: 120 - i * 13, revenue: 48000 - i * 5200,
    })),
  }));
}
