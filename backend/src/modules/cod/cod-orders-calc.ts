/**
 * Pure order & credit rules for COD (no framework / database). Unit-tested in cod-orders-calc.spec.ts.
 */
import { round2 } from './cod-analytics';

export const MAX_AMOUNT = 100_000_000;

/** Error codes the API returns (the frontend translates them). */
export class OrderRuleError extends Error {
  constructor(public code: string, public detail?: Record<string, unknown>) { super(code); }
}

export interface LineInput { item_id?: number | null; custom_name?: string | null; quantity: number; unit_price: number }

/**
 * Subtotal / total worked out on the server. Lines with quantity ≤ 0 are dropped; negative prices,
 * delivery or discount are rejected; a custom line (no item_id) needs a name.
 */
export function computeOrderTotals(lines: LineInput[], deliveryCharge = 0, discount = 0) {
  const delivery = round2(deliveryCharge ?? 0);
  const disc = round2(discount ?? 0);
  if (delivery < 0 || disc < 0) throw new OrderRuleError('NEGATIVE_AMOUNT');
  const kept = lines
    .map(l => ({ ...l, quantity: Math.trunc(Number(l.quantity)), unit_price: round2(l.unit_price) }))
    .filter(l => l.quantity > 0);
  for (const l of kept) {
    if (l.unit_price < 0) throw new OrderRuleError('NEGATIVE_AMOUNT');
    if (l.item_id == null && !(l.custom_name ?? '').trim()) throw new OrderRuleError('CUSTOM_LINE_NAME');
  }
  if (!kept.length) throw new OrderRuleError('NO_LINES');
  const priced = kept.map(l => ({ ...l, line_total: round2(l.quantity * l.unit_price) }));
  const subtotal = round2(priced.reduce((s, l) => s + l.line_total, 0));
  const total = round2(subtotal + delivery - disc);
  if (total < 0) throw new OrderRuleError('DISCOUNT_TOO_LARGE');
  if (total > MAX_AMOUNT) throw new OrderRuleError('AMOUNT_TOO_LARGE');
  return { lines: priced, subtotal, delivery_charge: delivery, discount: disc, total_amount: total };
}

export type CreditStatus = 'paid' | 'partial' | 'unpaid';

/** Paid / outstanding / status for a credit order; everything rounded to 2 decimals. */
export function summariseCredit(total: number, paid: number) {
  const t = round2(total);
  const p = round2(paid);
  const outstanding = round2(Math.max(0, t - p));
  const status: CreditStatus = t > 0 && p >= t ? 'paid' : p > 0 ? 'partial' : 'unpaid';
  return { total: t, paid: p, outstanding, status };
}

export type DueBucket = 'overdue' | 'due' | 'upcoming' | 'none';
const DAY = 86_400_000;

/** yyyy-MM-dd of a date in UTC+5:30 (the business's calendar day). */
export function localDay(d: Date) {
  return new Date(d.getTime() + 5.5 * 3_600_000).toISOString().slice(0, 10);
}
const dayNumber = (ymd: string) => Math.floor(Date.parse(`${ymd}T00:00:00Z`) / DAY);

/**
 * Where an open balance sits: overdue (past due), due (within 7 days), upcoming (later) or none (no date).
 * Older orders without a due date count as overdue once they are 30 days old.
 */
export function dueBucket(o: { payment_due_date: string | null; created_at: Date | string; outstanding: number }, now = new Date()): DueBucket {
  if (o.outstanding <= 0) return 'none';
  const today = dayNumber(localDay(now));
  if (o.payment_due_date) {
    const due = dayNumber(String(o.payment_due_date).slice(0, 10));
    if (due < today) return 'overdue';
    if (due - today <= 7) return 'due';
    return 'upcoming';
  }
  const age = today - dayNumber(localDay(new Date(o.created_at)));
  return age > 30 ? 'overdue' : 'none';
}

/** Due date from the credit period when no explicit date was given. */
export function deriveDueDate(createdAt: Date, creditDays: number | null | undefined, explicit?: string | null): string | null {
  if (explicit) return explicit;
  if (creditDays == null || creditDays < 0) return null;
  return localDay(new Date(createdAt.getTime() + creditDays * DAY));
}

/** Next INV-YYYY-NNNN after the highest existing number for that year (per tenant). */
export function nextInvoiceNumber(year: number, lastInvoice: string | null | undefined) {
  const prefix = `INV-${year}-`;
  const last = lastInvoice && lastInvoice.startsWith(prefix) ? parseInt(lastInvoice.slice(prefix.length), 10) || 0 : 0;
  return `${prefix}${String(last + 1).padStart(4, '0')}`;
}

/** Last 9 digits of a phone number (formatting and country prefix ignored); '' when shorter. */
export function phoneKey(phone: string | null | undefined) {
  const digits = (phone ?? '').replace(/\D/g, '');
  return digits.length >= 9 ? digits.slice(-9) : '';
}
