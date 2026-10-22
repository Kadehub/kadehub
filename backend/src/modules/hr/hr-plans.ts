import { ForbiddenException } from '@nestjs/common';

/**
 * KadeHub Staff plans. Prices are seeded into the shared `package` table (product = 'hr');
 * limits and feature bullets live here, keyed by package slug.
 *
 * New accounts get a 14-day trial on Pro. After the trial (or a lapsed paid plan) the account
 * falls back to Free instead of being locked out, so a small shop can keep using it for 3 staff.
 */
export type HrPlanKey = 'free' | 'starter' | 'business' | 'pro';

export interface HrPlanDef {
  slug: 'hr-free' | 'hr-starter' | 'hr-business' | 'hr-pro';
  key: HrPlanKey;
  name: string;
  description: string;
  monthly_price_lkr: number;
  /** Active employees; null means unlimited. */
  max_employees: number | null;
  max_branches: number | null;
  features: string[];
  sort_order: number;
}

export const HR_TRIAL_DAYS = 14;

export const HR_PLANS: HrPlanDef[] = [
  {
    slug: 'hr-free', key: 'free', name: 'Staff Free', description: 'KadeHub Staff — Free plan',
    monthly_price_lkr: 0, max_employees: 3, max_branches: 1, sort_order: 301,
    features: ['Up to 3 staff', '1 branch', 'Attendance, leave and payroll', 'Payslips on WhatsApp'],
  },
  {
    slug: 'hr-starter', key: 'starter', name: 'Staff Starter', description: 'KadeHub Staff — Starter plan',
    monthly_price_lkr: 1500, max_employees: 10, max_branches: 1, sort_order: 302,
    features: ['Up to 10 staff', '1 branch', 'Rosters and shift swaps', 'Hiring, reviews and assets'],
  },
  {
    slug: 'hr-business', key: 'business', name: 'Staff Business', description: 'KadeHub Staff — Business plan',
    monthly_price_lkr: 4500, max_employees: 50, max_branches: 3, sort_order: 303,
    features: ['Up to 50 staff', 'Up to 3 branches', 'Branch managers', 'Everything in Starter'],
  },
  {
    slug: 'hr-pro', key: 'pro', name: 'Staff Pro', description: 'KadeHub Staff — Pro plan',
    monthly_price_lkr: 9500, max_employees: null, max_branches: null, sort_order: 304,
    features: ['Unlimited staff', 'Unlimited branches', 'Priority support', 'Everything in Business'],
  },
];

export const HR_FREE_PLAN = HR_PLANS[0];
export const HR_TRIAL_PLAN = HR_PLANS[3];

export function hrPlanBySlug(slug: string | null | undefined): HrPlanDef {
  return HR_PLANS.find(p => p.slug === slug) ?? HR_FREE_PLAN;
}

/** Thrown with a stable code so the frontend can show a translated upgrade prompt. */
export class HrLimitException extends ForbiddenException {
  constructor(code: 'PLAN_LIMIT_EMPLOYEES' | 'PLAN_LIMIT_BRANCHES', limit: number) {
    super({ statusCode: 403, code, limit, message: code });
  }
}
