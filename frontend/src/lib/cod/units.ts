/** "Item units & revenue" — shapes of GET /api/cod/units. Built server-side; accounts without
 *  Premium only ever receive placeholder rows (stage totals stay real). */
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
