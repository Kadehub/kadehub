import type { Plan, SubscriptionStatus } from "@/lib/cod/types";
import type { Translator } from "@/lib/cod/i18n/translator";

/** Subscription statuses that still grant full access to the app. */
export const ACTIVE_STATUSES: SubscriptionStatus[] = ["trialing", "active"];

export function isSubscriptionActive(
  status: SubscriptionStatus | null | undefined,
  currentPeriodEnd: string | null | undefined,
): boolean {
  if (!status || !ACTIVE_STATUSES.includes(status)) return false;
  if (!currentPeriodEnd) return true;
  return new Date(currentPeriodEnd).getTime() >= Date.now();
}

export function daysRemaining(currentPeriodEnd: string | null | undefined): number | null {
  if (!currentPeriodEnd) return null;
  const ms = new Date(currentPeriodEnd).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

/** A plan's name in the active language (falls back to the name stored in the database). */
export function planLabel(t: Translator, plan: Pick<Plan, "id" | "name">): string {
  const key = `plan.${plan.id}`;
  return t.has(key) ? t(key as Parameters<Translator>[0]) : plan.name;
}

/** Premium = an active paid plan (anything but Free). The free trial runs on the
 *  Free plan, so it does not unlock Premium features. */
export function hasPremium(
  plan: Pick<Plan, "id">,
  subscription: { status: SubscriptionStatus; current_period_end: string | null },
): boolean {
  return plan.id !== "free" && isSubscriptionActive(subscription.status, subscription.current_period_end);
}

/** Where the month's orders stand. `left` counts plan orders while warning, grace orders after. */
export type OrderAllowance =
  | { state: "ok" }
  | { state: "warn" | "grace"; left: number; limit: number }
  | { state: "blocked"; limit: number };

/** Share of the monthly limit at which the app starts warning. */
export const ORDER_WARN_AT = 0.8;

/** `extra` previews the state after that many more orders (e.g. 1 right after creating one). */
export function orderAllowance(
  usage: { orders_this_month: number; orders_limit: number | null; orders_grace: number } | undefined,
  extra = 0,
): OrderAllowance {
  if (!usage || usage.orders_limit === null) return { state: "ok" };
  const used = usage.orders_this_month + extra;
  const limit = usage.orders_limit;
  if (used >= limit + usage.orders_grace) return { state: "blocked", limit };
  if (used >= limit) return { state: "grace", left: limit + usage.orders_grace - used, limit };
  if (used >= limit * ORDER_WARN_AT) return { state: "warn", left: limit - used, limit };
  return { state: "ok" };
}
