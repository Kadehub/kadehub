import { describe, expect, it } from "vitest";
import { applyStatus, scopeOrders, statusChips, type OrderFilters } from "./order-filters";
import { phoneKey, statusConfirmKey, summariseCredit } from "./credit";
import type { Order } from "./types";

const base = (o: Partial<Order>): Order => ({
  id: 1, tenant_id: 1, invoice_number: "INV-2026-0001", customer_name: "Nimali", customer_phone: "0771234567",
  customer_address: "", city: "Galle", status: "pending", subtotal: 0, delivery_charge: 0, discount: 0, total_amount: 1000,
  notes: null, stock_deducted: false, payment_type: "cod", customer_type: "retail", customer_email: null, po_number: null,
  tracking_number: null, confirmation_sent_at: null, created_by: null, reordered_from_order_id: null, credit_period_days: null,
  payment_due_date: null, credit_note: null, returned_at: null, created_at: "2026-10-10T08:00:00Z", updated_at: "", ...o,
});

const orders: Order[] = [
  base({ id: 1, status: "pending", total_amount: 1000 }),
  base({ id: 2, status: "delivered", total_amount: 2500.5, payment_type: "credit", customer_name: "Kasun", customer_phone: "+94 71 555 1234", city: "Kandy" }),
  base({ id: 3, status: "delivered", total_amount: 700, invoice_number: "INV-2026-0003", created_at: "2026-08-01T08:00:00Z" }),
];
const all: OrderFilters = { search: "", range: "all", payment: "all", status: "all" };

describe("order filters", () => {
  it("chip counts ignore only the status chip", () => {
    const scoped = scopeOrders(orders, { ...all, status: "pending" });
    const chips = statusChips(scoped);
    expect(chips.find(c => c.key === "all")).toEqual({ key: "all", count: 3, total: 4200.5 });
    expect(chips.find(c => c.key === "delivered")).toMatchObject({ count: 2, total: 3200.5 });
    expect(applyStatus(scoped, "pending")).toHaveLength(1);
  });
  it("combines search, payment and date", () => {
    expect(scopeOrders(orders, { ...all, payment: "credit" }).map(o => o.id)).toEqual([2]);
    expect(scopeOrders(orders, { ...all, search: "kandy" }).map(o => o.id)).toEqual([2]);
    expect(scopeOrders(orders, { ...all, search: "555 12" }).map(o => o.id)).toEqual([2]);
    expect(scopeOrders(orders, { ...all, range: "custom", from: "2026-10-01", to: "2026-10-31" }).map(o => o.id)).toEqual([1, 2]);
    expect(scopeOrders(orders, { ...all, range: "this_month" }, new Date("2026-08-15T00:00:00Z")).map(o => o.id)).toEqual([3]);
  });
});

describe("credit helpers", () => {
  it("summariseCredit", () => {
    expect(summariseCredit(1000, 0).status).toBe("unpaid");
    expect(summariseCredit(1000, 250).status).toBe("partial");
    expect(summariseCredit(1000, 1500)).toMatchObject({ outstanding: 0, status: "paid" });
  });
  it("phoneKey matches local and international forms", () => {
    expect(phoneKey("077 123 4567")).toBe(phoneKey("+94771234567"));
    expect(phoneKey("123")).toBe("");
  });
  it("status confirmations", () => {
    expect(statusConfirmKey("pending", "delivered")).toBe("confirm.toDelivered");
    expect(statusConfirmKey("delivered", "ongoing")).toBe("confirm.outOfDelivered");
    expect(statusConfirmKey("delivered", "returned")).toBe("confirm.toReturned");
    expect(statusConfirmKey("pending", "confirmed")).toBeNull();
  });
});
