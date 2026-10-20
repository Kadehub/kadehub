/** Business + personal expense types and fixed category lists for COD. Keep categories in sync with backend cod-expenses.dto.ts. */

export const BUSINESS_CATEGORIES = [
  'Supplier', 'Shipping', 'Customs', 'Advertising', 'Salary', 'Rent', 'Packaging', 'Utilities', 'Business Tour', 'Misc', 'Other',
] as const;
export type BusinessCategory = (typeof BUSINESS_CATEGORIES)[number];
export const BUSINESS_TOUR = 'Business Tour';

export const PERSONAL_CATEGORIES = ['Personal', 'Investment', 'Alcohol', 'Sports', 'Outings', 'PickMe', 'Fuel', 'Other'] as const;
export type PersonalCategory = (typeof PERSONAL_CATEGORIES)[number];

export const PAYMENT_METHODS = ['cash', 'bank', 'card', 'cheque', 'other'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface BusinessExpense {
  id: number;
  title: string;
  category: string;
  amount: number;
  expense_date: string; // yyyy-MM-dd
  payment_method: string | null;
  vendor: string | null;
  reference: string | null;
  notes: string | null;
  created_at: string;
}

export interface PersonalExpense {
  id: number;
  title: string;
  category: PersonalCategory | string;
  amount: number;
  expense_date: string; // yyyy-MM-dd
  payment_method: string | null;
  notes: string | null;
  client_ref: string | null;
  created_at: string;
}

/** Minimal row shape the pure helpers work on. */
export interface SpendRow {
  category: string;
  amount: number;
  expense_date: string;
  title?: string | null;
  notes?: string | null;
}

/** Fixed colour per personal category: follows the entity, never its rank. "Other" is deliberately neutral. */
export const PERSONAL_COLORS: Record<PersonalCategory, string> = {
  Personal: '#6366f1', Investment: '#059669', Alcohol: '#8b5cf6', Sports: '#e11d48',
  Outings: '#d97706', PickMe: '#0284c7', Fuel: '#ea580c', Other: '#64748b',
};

/** Fixed colour per business category (Business Tour gets its own so it reads as travel). */
export const BUSINESS_COLORS: Record<BusinessCategory, string> = {
  Supplier: '#2563eb', Shipping: '#0891b2', Customs: '#7c3aed', Advertising: '#db2777', Salary: '#16a34a',
  Rent: '#ca8a04', Packaging: '#9333ea', Utilities: '#f59e0b', 'Business Tour': '#0ea5e9', Misc: '#475569', Other: '#94a3b8',
};

export function categoryColor(category: string): string {
  return (PERSONAL_COLORS as Record<string, string>)[category]
    ?? (BUSINESS_COLORS as Record<string, string>)[category]
    ?? '#64748b';
}

/** Suggested amounts when the user has no history for a category yet. */
export const PERSONAL_DEFAULT_AMOUNTS: Record<string, number[]> = {
  PickMe: [300, 500, 800, 1200, 2000],
  Fuel: [1000, 2000, 3000, 5000, 10000],
  Alcohol: [1500, 3000, 5000, 8000],
  Investment: [5000, 10000, 25000, 50000],
  Sports: [500, 1000, 2500, 5000],
  Outings: [2000, 5000, 10000, 20000],
};
export const PERSONAL_FALLBACK_AMOUNTS = [500, 1000, 2000, 5000, 10000];

export const BUSINESS_DEFAULT_AMOUNTS: Record<string, number[]> = {
  Supplier: [5000, 10000, 25000, 50000, 100000],
  Shipping: [500, 1000, 2500, 5000, 10000],
  Customs: [2000, 5000, 10000, 25000],
  Advertising: [1000, 2500, 5000, 10000, 20000],
  Salary: [15000, 25000, 40000, 60000],
  Rent: [15000, 25000, 50000, 75000],
  Packaging: [500, 1000, 2500, 5000],
  Utilities: [1000, 2500, 5000, 10000],
  'Business Tour': [1000, 2500, 5000, 10000, 25000],
};
export const BUSINESS_FALLBACK_AMOUNTS = [500, 1000, 2500, 5000, 10000];
