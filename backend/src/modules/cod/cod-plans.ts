/**
 * COD plans. Prices are seeded into the shared `package` table (product = 'cod'); limits and
 * feature bullets live here, keyed by package slug.
 *
 * Pricing is by monthly order volume: 50 orders free every month, then Rs 5,000 per 100 orders.
 * Items are unlimited on every plan. Free never expires — a lapsed trial or paid plan carries on
 * as Free. Past the top plan's 200 orders, sellers buy top-ups of 100 orders (COD_TOPUP) for the
 * rest of the month.
 */
export interface CodPlanDef {
  slug: 'cod-free' | 'cod-growth' | 'cod-scale' | 'cod-pro' | 'cod-business';
  /** Plan id used by the COD frontend for translations (plan.free, plan.growth…). */
  key: 'free' | 'growth' | 'scale' | 'pro' | 'business';
  name: string;
  description: string;
  monthly_price_lkr: number;
  max_orders_per_month: number | null;
  features: string[];
  sort_order: number;
  /** Old plans: honoured until the subscription expires, but no longer sold or renewed. */
  legacy?: boolean;
}

export const COD_PLANS: CodPlanDef[] = [
  {
    slug: 'cod-free', key: 'free', name: 'COD Free', description: 'KadeHub COD — Free plan',
    monthly_price_lkr: 0, max_orders_per_month: 50, sort_order: 101,
    features: ['Unlimited items', 'Up to 50 COD orders / month', 'Printable invoices', 'Basic dashboard'],
  },
  {
    slug: 'cod-growth', key: 'growth', name: 'COD Growth', description: 'KadeHub COD — Growth plan',
    monthly_price_lkr: 5000, max_orders_per_month: 100, sort_order: 104,
    features: ['Unlimited items', 'Up to 100 COD orders / month', 'Expenses & reports', 'Priority support'],
  },
  {
    slug: 'cod-scale', key: 'scale', name: 'COD Scale', description: 'KadeHub COD — Scale plan',
    monthly_price_lkr: 10000, max_orders_per_month: 200, sort_order: 105,
    features: ['Unlimited items', 'Up to 200 COD orders / month', 'Expenses & reports', 'Priority support'],
  },
  {
    slug: 'cod-pro', key: 'pro', name: 'COD Pro', description: 'KadeHub COD — Pro plan',
    monthly_price_lkr: 3500, max_orders_per_month: 500, sort_order: 102, legacy: true,
    features: ['Unlimited items', 'Up to 500 COD orders / month', 'Expenses & reports', 'Priority support'],
  },
  {
    slug: 'cod-business', key: 'business', name: 'COD Business', description: 'KadeHub COD — Business plan',
    monthly_price_lkr: 9500, max_orders_per_month: null, sort_order: 103, legacy: true,
    features: ['Unlimited items', 'Unlimited COD orders', 'Expenses & reports', 'Priority support'],
  },
];

export const COD_FREE_PLAN = COD_PLANS[0];

/** Orders allowed past the monthly limit, so a seller isn't stopped mid-rush; blocked after these. */
export const COD_ORDER_GRACE = 5;

/** Plan that can buy top-ups once its monthly orders run out. */
export const COD_TOPUP_PLAN_SLUG = 'cod-scale';

/** Extra orders for the rest of the calendar month (Rs 50 an order). Sold as a hidden package. */
export const COD_TOPUP = {
  slug: 'cod-topup-100', name: 'COD +100 orders', description: 'KadeHub COD — 100 extra orders this month',
  orders: 100, price_lkr: 5000, sort_order: 199,
} as const;

export function codPlanBySlug(slug: string | null | undefined): CodPlanDef {
  return COD_PLANS.find(p => p.slug === slug) ?? COD_FREE_PLAN;
}
