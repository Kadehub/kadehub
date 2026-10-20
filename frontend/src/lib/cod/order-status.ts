import type { OrderStatus } from "@/lib/cod/types";

/** One visual identity per order stage, shared by pills, cards and charts.
 *  Class names are written out in full so Tailwind can see them. */
export const STATUS_STYLE: Record<
  OrderStatus,
  { dot: string; badge: string; card: string; color: string }
> = {
  pending: {
    dot: "bg-amber-500",
    badge: "bg-amber-100 text-amber-800",
    card: "border-amber-300 bg-amber-50",
    color: "#f59e0b",
  },
  confirmed: {
    dot: "bg-cyan-500",
    badge: "bg-cyan-100 text-cyan-800",
    card: "border-cyan-300 bg-cyan-50",
    color: "#06b6d4",
  },
  ongoing: {
    dot: "bg-blue-500",
    badge: "bg-blue-100 text-blue-800",
    card: "border-blue-300 bg-blue-50",
    color: "#3b82f6",
  },
  delivered: {
    dot: "bg-emerald-500",
    badge: "bg-emerald-100 text-emerald-800",
    card: "border-emerald-300 bg-emerald-50",
    color: "#10b981",
  },
  returned: {
    dot: "bg-rose-500",
    badge: "bg-rose-100 text-rose-800",
    card: "border-rose-300 bg-rose-50",
    color: "#f43f5e",
  },
  cancelled: {
    dot: "bg-slate-400",
    badge: "bg-slate-100 text-slate-700",
    card: "border-slate-300 bg-slate-50",
    color: "#94a3b8",
  },
};

/** Stock is deducted while an order is delivered (see sync_stock_on_status in 0002). */
export const STOCK_STATUS: OrderStatus = "delivered";
