/** Dashboard KPI engine — a pure pass over a business's data for the
 *  selected period. Framework-free so it's easy to test and reuse. */

import { isWithinInterval, parseISO } from "date-fns";
import { round2 } from "@/lib/cod/calc";
import { lastNMonths, type DateRange } from "@/lib/cod/dates";
import { ORDER_STATUSES, type Expense, type Item, type Order, type OrderItem } from "@/lib/cod/types";

export interface DashboardInput {
  orders: Order[];
  orderItems: (OrderItem & { landed_cost: number })[];
  items: Item[];
  expenses: Expense[];
}

export interface DashboardModel {
  revenue: number;
  cogs: number;
  expensesTotal: number;
  netProfit: number;
  codPipelineValue: number;
  codPipelineCount: number;
  inventoryValue: number;
  lowStockCount: number;
  ordersByStatus: { status: string; count: number }[];
  monthly: { key: string; label: string; revenue: number; expenses: number }[];
  topItems: { name: string; qty: number; revenue: number }[];
  recentOrders: Order[];
  lowStockItems: Item[];
}

const within = (iso: string, r: DateRange) =>
  isWithinInterval(parseISO(iso), { start: r.from, end: r.to });
const sumBy = <T,>(arr: T[], f: (t: T) => number) => arr.reduce((s, x) => s + f(x), 0);

export function buildDashboard(input: DashboardInput, range: DateRange): DashboardModel {
  const { orders, orderItems, items, expenses } = input;

  const periodOrders = orders.filter((o) => within(o.created_at, range));
  const deliveredInPeriod = periodOrders.filter((o) => o.status === "delivered");
  const deliveredIds = new Set(deliveredInPeriod.map((o) => o.id));

  const revenue = sumBy(deliveredInPeriod, (o) => Number(o.total_amount));
  const cogs = sumBy(
    orderItems.filter((oi) => deliveredIds.has(oi.order_id)),
    (oi) => oi.quantity * Number(oi.landed_cost),
  );
  const expensesTotal = sumBy(
    expenses.filter((e) => within(e.expense_date, range)),
    (e) => Number(e.amount),
  );
  const netProfit = revenue - cogs - expensesTotal;

  const pipeline = orders.filter(
    (o) => o.status === "pending" || o.status === "confirmed" || o.status === "ongoing",
  );
  const codPipelineValue = sumBy(pipeline, (o) => Number(o.total_amount));

  const inventoryValue = sumBy(items, (i) => Number(i.landed_cost) * i.stock_quantity);
  const lowStockItems = items
    .filter((i) => i.stock_quantity <= i.low_stock_threshold)
    .sort((a, b) => a.stock_quantity - b.stock_quantity);

  const ordersByStatus = ORDER_STATUSES.map((status) => ({
    status,
    count: periodOrders.filter((o) => o.status === status).length,
  }));

  const monthly = lastNMonths(6).map((m) => {
    const r = sumBy(
      orders.filter((o) => o.status === "delivered" && within(o.created_at, m)),
      (o) => Number(o.total_amount),
    );
    const e = sumBy(
      expenses.filter((ex) => within(ex.expense_date, m)),
      (ex) => Number(ex.amount),
    );
    return { key: m.key, label: m.label, revenue: round2(r), expenses: round2(e) };
  });

  const itemAgg = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const oi of orderItems) {
    if (!deliveredIds.has(oi.order_id)) continue;
    const cur = itemAgg.get(oi.item_id) ?? { name: oi.item_name, qty: 0, revenue: 0 };
    cur.qty += oi.quantity;
    cur.revenue += Number(oi.line_total);
    itemAgg.set(oi.item_id, cur);
  }
  const topItems = Array.from(itemAgg.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const recentOrders = orders
    .slice()
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, 8);

  return {
    revenue: round2(revenue),
    cogs: round2(cogs),
    expensesTotal: round2(expensesTotal),
    netProfit: round2(netProfit),
    codPipelineValue: round2(codPipelineValue),
    codPipelineCount: pipeline.length,
    inventoryValue: round2(inventoryValue),
    lowStockCount: lowStockItems.length,
    ordersByStatus,
    monthly,
    topItems,
    recentOrders,
    lowStockItems: lowStockItems.slice(0, 5),
  };
}
