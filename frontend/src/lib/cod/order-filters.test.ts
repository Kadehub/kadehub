import { describe, expect, it } from "vitest";
import { applyStatus, orderCouriers, scopeOrders, statusChips, type OrderFilters } from "./order-filters";
import { phoneKey, statusConfirmKey, summariseCredit } from "./credit";
import type { Order } from "./types";

const base = (o: Partial<Order>): Order => ({
  id: 1, tenant_id: 1, invoice_number: "INV-2026-0001", customer_name: "Nimali", customer_phone: "0771234567",
  customer_address: "", city: "Galle", status: "pending", subtotal: 0, delivery_charge: 0, discount: 0, total_amount: 1000,
  notes: null, stock_deducted: false, payment_type: "cod", customer_type: "retail", customer_email: null, po_number: null,
  tracking_number: null, courier_id: null, confirmation_sent_at: null, created_by: null, reordered_from_order_id: null, credit_period_days: null,
  payment_due_date: null, credit_note: null, returned_at: null, created_at: "2026-10-10T08:00:00Z", updated_at: "", ...o,
});

const orders: Order[] = [
  base({ id: 1, status: "pending", total_amount: 1000 }),
  base({ id: 2, status: "delivered", total_amount: 2500.5, payment_type: "credit", customer_name: "Kasun", customer_phone: "+94 71 555 1234", city: "Kandy" }),
  base({ id: 3, status: "delivered", total_amount: 700, invoice_number: "INV-2026-0003", created_at: "2026-08-01T08:00:00Z" }),
];
const all: OrderFilters = { search: "", range: "all", payment: "all", status: "all" };

describe("courier filters", () => {
  const shipped = [
    base({ id: 1, courier_id: 5, courier_name: "Domex", tracking_number: "DX-9001" }),
    base({ id: 2, courier_id: 6, courier_name: "Citypak" }),
    base({ id: 3, courier_id: 5, courier_name: "Domex" }),
    base({ id: 4 }),
  ];
  const ids = (f: Partial<OrderFilters>) => scopeOrders(shipped, { ...all, ...f }).map(o => o.id);

  it("filters by courier, by no courier, or not at all", () => {
    expect(ids({ courier: 5 })).toEqual([1, 3]);
    expect(ids({ courier: "none" })).toEqual([4]);
    expect(ids({ courier: "all" })).toEqual([1, 2, 3, 4]);
    expect(ids({})).toEqual([1, 2, 3, 4]);
  });

  it("finds an order by tracking number", () => {
    expect(ids({ search: "dx-9001" })).toEqual([1]);
  });

  it("offers each courier on the orders once, by name", () => {
    expect(orderCouriers(shipped)).toEqual([{ id: 6, name: "Citypak" }, { id: 5, name: "Domex" }]);
  });
});

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
