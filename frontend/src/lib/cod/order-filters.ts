import { endOfDay, startOfDay } from "date-fns";
import { resolveRange, type RangeKey } from "@/lib/cod/dates";
import { ORDER_STATUSES, type Order, type OrderStatus, type PaymentType } from "@/lib/cod/types";

/** Orders-list filters. `payment: 'paid'` is the "Pay now" type. Mirrored to the URL (?payment=…). */
export interface OrderFilters {
  search: string;
  range: RangeKey | "custom";
  from?: string; // yyyy-MM-dd, custom range
  to?: string;
  payment: "all" | PaymentType;
  status: "all" | OrderStatus;
}

export function inRange(o: Pick<Order, "created_at">, f: Pick<OrderFilters, "range" | "from" | "to">, now = new Date()) {
  if (f.range === "all") return true;
  const t = new Date(o.created_at).getTime();
  if (f.range === "custom") {
    const from = f.from ? startOfDay(new Date(`${f.from}T00:00:00`)).getTime() : -Infinity;
    const to = f.to ? endOfDay(new Date(`${f.to}T00:00:00`)).getTime() : Infinity;
    return t >= from && t <= to;
  }
  const r = resolveRange(f.range, now);
  return t >= r.from.getTime() && t <= r.to.getTime();
}

/** Search (invoice, customer, phone, city), date and payment — everything except the status chip. */
export function scopeOrders<T extends Order>(orders: T[], f: OrderFilters, now = new Date()): T[] {
  const q = f.search.trim().toLowerCase();
  const digits = q.replace(/\D/g, "");
  return orders.filter(o => {
    if (!inRange(o, f, now)) return false;
    if (f.payment !== "all" && (o.payment_type ?? "cod") !== f.payment) return false;
    if (!q) return true;
    return o.invoice_number.toLowerCase().includes(q)
      || o.customer_name.toLowerCase().includes(q)
      || (o.city ?? "").toLowerCase().includes(q)
      || (digits.length >= 3 && o.customer_phone.replace(/\D/g, "").includes(digits));
  });
}

export function applyStatus<T extends Order>(scoped: T[], status: OrderFilters["status"]): T[] {
  return status === "all" ? scoped : scoped.filter(o => o.status === status);
}

/** Status chips: count + value per status (and "all"), from the scoped list so they ignore only the status chip. */
export function statusChips(scoped: Pick<Order, "status" | "total_amount">[]) {
  const by = new Map<OrderStatus, { count: number; total: number }>(ORDER_STATUSES.map(s => [s, { count: 0, total: 0 }]));
  for (const o of scoped) {
    const c = by.get(o.status);
    if (!c) continue;
    c.count++;
    c.total += Number(o.total_amount);
  }
  const round = (n: number) => Math.round(n * 100) / 100;
  return [
    { key: "all" as const, count: scoped.length, total: round(scoped.reduce((s, o) => s + Number(o.total_amount), 0)) },
    ...ORDER_STATUSES.map(s => ({ key: s, count: by.get(s)!.count, total: round(by.get(s)!.total) })),
  ];
}
