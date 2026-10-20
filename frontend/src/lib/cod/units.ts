/** "Item units & revenue" — units sold and revenue per item, grouped by order
 *  stage. Pure, so it's unit-tested and the page can decide what to send to the
 *  client (locked accounts only ever receive placeholder rows). */

import { isWithinInterval, parseISO } from "date-fns";
import { round2 } from "@/lib/cod/calc";
import type { DateRange } from "@/lib/cod/dates";
import type { OrderStatus } from "@/lib/cod/types";

export const UNIT_STAGES = ["pending", "confirmed", "ongoing", "delivered"] as const satisfies readonly OrderStatus[];
export type UnitStage = (typeof UNIT_STAGES)[number];

export interface UnitRow {
  key: string;
  name: string;
  sku: string;
  units: number;
  revenue: number;
}

export interface StageUnits {
  status: UnitStage;
  revenue: number;
  units: number;
  products: number;
  rows: UnitRow[];
}

export interface UnitsInput {
  orders: { id: string; status: string; created_at: string }[];
  orderItems: { order_id: string; item_id: string; item_name: string; quantity: number; line_total: number }[];
  items: { id: string; sku: string }[];
}

/** Totals and per-item rows for each stage. `range` filters on the order date;
 *  `query` matches item name or SKU (and narrows the totals to what matches). */
export function buildUnits(input: UnitsInput, range: DateRange | null, query = ""): StageUnits[] {
  const q = query.trim().toLowerCase();
  const skuById = new Map(input.items.map((i) => [i.id, i.sku]));

  const stageByOrder = new Map<string, UnitStage>();
  for (const o of input.orders) {
    if (!(UNIT_STAGES as readonly string[]).includes(o.status)) continue;
    if (range && !isWithinInterval(parseISO(o.created_at), { start: range.from, end: range.to })) continue;
    stageByOrder.set(o.id, o.status as UnitStage);
  }

  const acc = new Map<UnitStage, Map<string, UnitRow>>(UNIT_STAGES.map((s) => [s, new Map()]));
  for (const li of input.orderItems) {
    const stage = stageByOrder.get(li.order_id);
    if (!stage) continue;
    const sku = skuById.get(li.item_id) ?? "";
    if (q && !li.item_name.toLowerCase().includes(q) && !sku.toLowerCase().includes(q)) continue;

    const rows = acc.get(stage)!;
    const row = rows.get(li.item_id) ?? { key: li.item_id, name: li.item_name, sku, units: 0, revenue: 0 };
    row.units += li.quantity;
    row.revenue += Number(li.line_total);
    rows.set(li.item_id, row);
  }

  return UNIT_STAGES.map((status) => {
    const rows = Array.from(acc.get(status)!.values())
      .map((r) => ({ ...r, revenue: round2(r.revenue) }))
      .sort((a, b) => b.revenue - a.revenue);
    return {
      status,
      revenue: round2(rows.reduce((s, r) => s + r.revenue, 0)),
      units: rows.reduce((s, r) => s + r.units, 0),
      products: rows.length,
      rows,
    };
  });
}

/** Stand-in rows shown (blurred) instead of real data to accounts without Premium.
 *  Deterministic, obviously generic, and carries nothing from the business. */
export function placeholderRows(count: number): UnitRow[] {
  return Array.from({ length: count }, (_, i) => ({
    key: `placeholder-${i}`,
    name: "Sample item name",
    sku: "SKU-000",
    units: 120 - i * 13,
    revenue: 48000 - i * 5200,
  }));
}

/** Locks the per-item detail of every stage while keeping its real totals. */
export function lockRows(stages: StageUnits[], maxPlaceholders = 6): StageUnits[] {
  return stages.map((s) => ({ ...s, rows: placeholderRows(Math.min(s.rows.length, maxPlaceholders)) }));
}
