import type { Business, SubscriptionStatus } from "@/lib/cod/types";
import type { Translator } from "@/lib/cod/i18n/translator";
import { planLabel } from "@/lib/cod/plans";

/** Plan as sent by the API (limits + feature bullets; `key` is free | growth | scale, or a legacy pro | business). */
export interface CodPlanView {
  slug: string;
  key: "free" | "growth" | "scale" | "pro" | "business";
  name: string;
  monthly_price_lkr: number;
  max_orders_per_month: number | null;
  features: string[];
  sort_order: number;
}

/** GET /api/cod/plans entry — adds the package id the shared checkout needs. */
export interface CodPlanOffer extends CodPlanView {
  package_id: number | null;
  yearly_price_lkr: number;
}

/** GET /api/cod/me */
export interface CodMe {
  enabled: boolean;
  email: string | null;
  name: string | null;
  business?: Business | null;
  plan?: CodPlanView;
  subscription?: { status: SubscriptionStatus; trial_ends_at: string | null; current_period_end: string | null };
  active?: boolean;
  premium?: boolean;
  /** `orders_limit` includes this month's top-ups (null = unlimited); `orders_grace` more are allowed past it. */
  usage?: { orders_this_month: number; orders_limit: number | null; topup_orders: number; orders_grace: number };
  /** Extra orders for the rest of the month — only offered on a paid Scale plan. */
  topup?: CodTopupOffer | null;
}

export interface CodTopupOffer {
  package_id: number;
  orders: number;
  price_lkr: number;
}

/** Readable, translated message for an API error (stable `code`s from the COD backend). */
export function apiError(err: unknown, t: Translator, me?: CodMe | null): string {
  const data = (err as { response?: { data?: { code?: string; message?: unknown; limit?: number } } })?.response?.data;
  const code = data?.code ?? (typeof data?.message === "string" ? data.message : undefined);
  const plan = me?.plan ? planLabel(t, { id: me.plan.key, name: me.plan.name }) : "";
  switch (code) {
    case "PLAN_LIMIT_ORDERS":
      // On the top plan there's nothing to upgrade to — point to the top-up instead
      return me?.topup
        ? t("err.limitOrdersTopup", { limit: data?.limit ?? "", grace: me.usage?.orders_grace ?? 0, orders: me.topup.orders })
        : t("err.limitOrders", { plan, limit: data?.limit ?? "", grace: me?.usage?.orders_grace ?? 0 });
    case "DUPLICATE_SKU": return t("err.duplicateSku");
    case "NO_LINES": return t("err.addOneItem");
    case "PREMIUM_REQUIRED": return t("err.premiumRequired");
    case "CURRENT_PASSWORD_WRONG": return t("err.currentPasswordWrong");
  }
  const msg = data?.message;
  if (Array.isArray(msg) && typeof msg[0] === "string") return msg[0];
  if (typeof msg === "string" && msg) return msg;
  return t("err.generic");
}
