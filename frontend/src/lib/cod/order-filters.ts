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
  /** A courier's id, or "none" for orders without one. Left out: every order. */
  courier?: "all" | "none" | number;
}

/** The couriers actually on these orders, for the filter (includes removed ones that past orders still show). */
export function orderCouriers(orders: Pick<Order, "courier_id" | "courier_name">[]) {
  const byId = new Map<number, string>();
  for (const o of orders) if (o.courier_id != null && o.courier_name) byId.set(o.courier_id, o.courier_name);
  return Array.from(byId, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
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

/** Search (invoice, customer, phone, city, tracking no.), date, payment and courier — everything except the status chip. */
export function scopeOrders<T extends Order>(orders: T[], f: OrderFilters, now = new Date()): T[] {
  const q = f.search.trim().toLowerCase();
  const digits = q.replace(/\D/g, "");
  return orders.filter(o => {
    if (!inRange(o, f, now)) return false;
    if (f.payment !== "all" && (o.payment_type ?? "cod") !== f.payment) return false;
    if (f.courier === "none" && o.courier_id != null) return false;
    if (typeof f.courier === "number" && o.courier_id !== f.courier) return false;
    if (!q) return true;
    return o.invoice_number.toLowerCase().includes(q)
      || o.customer_name.toLowerCase().includes(q)
      || (o.city ?? "").toLowerCase().includes(q)
      || (o.tracking_number ?? "").toLowerCase().includes(q)
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
