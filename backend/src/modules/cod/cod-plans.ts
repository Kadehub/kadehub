/**
 * COD plans (from CODPlatform's 0005_plans_seed.sql). Prices are seeded into the shared
 * `package` table (product = 'cod'); limits and feature bullets live here, keyed by package slug.
 * The 14-day trial runs on cod-free, so Free is effectively the trial plan.
 */
export interface CodPlanDef {
  slug: 'cod-free' | 'cod-pro' | 'cod-business';
  /** Plan id used by the COD frontend for translations (plan.free, plan.pro…). */
  key: 'free' | 'pro' | 'business';
  name: string;
  description: string;
  monthly_price_lkr: number;
  max_items: number | null;
  max_orders_per_month: number | null;
  features: string[];
  sort_order: number;
}

export const COD_PLANS: CodPlanDef[] = [
  {
    slug: 'cod-free', key: 'free', name: 'COD Free', description: 'KadeHub COD — Free (trial) plan',
    monthly_price_lkr: 0, max_items: 20, max_orders_per_month: 30, sort_order: 101,
    features: ['Up to 20 items', 'Up to 30 COD orders / month', 'Printable invoices', 'Basic dashboard'],
  },
  {
    slug: 'cod-pro', key: 'pro', name: 'COD Pro', description: 'KadeHub COD — Pro plan',
    monthly_price_lkr: 3500, max_items: 300, max_orders_per_month: 500, sort_order: 102,
    features: ['Up to 300 items', 'Up to 500 COD orders / month', 'Expenses & reports', 'Priority support'],
  },
  {
    slug: 'cod-business', key: 'business', name: 'COD Business', description: 'KadeHub COD — Business plan',
    monthly_price_lkr: 9500, max_items: null, max_orders_per_month: null, sort_order: 103,
    features: ['Unlimited items', 'Unlimited COD orders', 'Expenses & reports', 'Priority support'],
  },
];

export function codPlanBySlug(slug: string | null | undefined): CodPlanDef {
  return COD_PLANS.find(p => p.slug === slug) ?? COD_PLANS[0];
}
