import type { CreditStatus, DueBucket, OrderStatus } from "@/lib/cod/types";

/**
 * Client mirror of the backend credit rules (backend/src/modules/cod/cod-orders-calc.ts) — used to
 * show live figures while typing a payment. The server stays the source of truth.
 */
const round2 = (n: number) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export function summariseCredit(total: number, paid: number) {
  const t = round2(total);
  const p = round2(paid);
  const outstanding = round2(Math.max(0, t - p));
  const status: CreditStatus = t > 0 && p >= t ? "paid" : p > 0 ? "partial" : "unpaid";
  return { total: t, paid: p, outstanding, status };
}

/** Last 9 digits of a phone number, '' when shorter (customers are grouped by this). */
export function phoneKey(phone: string | null | undefined) {
  const d = (phone ?? "").replace(/\D/g, "");
  return d.length >= 9 ? d.slice(-9) : "";
}

/** Badge colour per due bucket (meaning is always also written as text). */
export const BUCKET_TONE: Record<DueBucket, "red" | "amber" | "gray" | "green"> = {
  overdue: "red",
  due: "amber",
  upcoming: "gray",
  none: "gray",
};

/** The status-change messages that need a confirmation first (null = apply straight away). */
export function statusConfirmKey(from: OrderStatus, to: OrderStatus):
  | "confirm.toDelivered" | "confirm.toCancelled" | "confirm.toReturned" | "confirm.outOfDelivered" | null {
  if (from === to) return null;
  if (to === "delivered") return "confirm.toDelivered";
  if (to === "cancelled") return "confirm.toCancelled";
  if (to === "returned") return "confirm.toReturned";
  if (from === "delivered") return "confirm.outOfDelivered";
  return null;
}
