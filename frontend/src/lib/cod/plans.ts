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
