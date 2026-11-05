import { round2 } from './cod-analytics';

/**
 * Checks a courier's statement against KadeHub's orders. Pure, so the money rules can be read and tested in one place.
 *
 *   matched / short / over  the courier's amount equals, is below or is above what the order should have collected
 *   not_delivered           the courier reports cash on an order KadeHub doesn't have as delivered
 *   unmatched, duplicate, ambiguous, already_settled, wrong_courier   shown to the user, never applied
 */
export type LineOutcome = 'matched' | 'short' | 'over' | 'not_delivered' | 'unmatched' | 'duplicate' | 'ambiguous' | 'already_settled' | 'wrong_courier';

const APPLIED: LineOutcome[] = ['matched', 'short', 'over', 'not_delivered'];
export const isApplied = (o: LineOutcome) => APPLIED.includes(o);

/** How long after delivery a courier's unpaid cash is shown as overdue. */
export const OVERDUE_AFTER_DAYS = 14;

export interface StatementRow { order_id?: number | null; tracking_number?: string | null; collected: number; fee: number }

export interface OrderForMatching {
  id: number; invoice_number: string; customer_name: string; tracking_number: string | null; courier_id: number | null;
  status: string; payment_type: string; total_amount: number; remittance_id: number | null;
}

export interface CheckedLine {
  row: number; order_id: number | null; invoice_number: string | null; customer_name: string | null;
  tracking_number: string; collected: number; fee: number; expected: number; difference: number; outcome: LineOutcome;
}

/** "ab 12-3 " and "AB12-3" are the same waybill: statements and staff type them differently. */
export const normalizeTracking = (value: string | null | undefined) => (value ?? '').replace(/\s+/g, '').toUpperCase();

/** A delivered COD order owes this business its total. Nothing else should have collected any cash. */
export function expectedCash(o: Pick<OrderForMatching, 'status' | 'payment_type' | 'total_amount'>): number {
  return o.status === 'delivered' && o.payment_type === 'cod' ? round2(Number(o.total_amount)) : 0;
}

export function checkStatement(rows: StatementRow[], orders: OrderForMatching[], courierId: number): CheckedLine[] {
  const byId = new Map(orders.map(o => [o.id, o]));
  const byTracking = new Map<string, OrderForMatching[]>();
  for (const o of orders) {
    const key = normalizeTracking(o.tracking_number);
    if (key) byTracking.set(key, [...(byTracking.get(key) ?? []), o]);
  }
  const seen = new Set<number>();

  return rows.map((row, index) => {
    const tracking = (row.tracking_number ?? '').trim();
    const candidates = row.order_id ? [byId.get(row.order_id)].filter((o): o is OrderForMatching => !!o) : byTracking.get(normalizeTracking(tracking)) ?? [];
    const order = candidates.length === 1 ? candidates[0] : null;
    const collected = round2(row.collected);
    const fee = round2(row.fee);
    const expected = order ? expectedCash(order) : 0;

    const outcome = ((): LineOutcome => {
      if (candidates.length > 1) return 'ambiguous';
      if (!order) return 'unmatched';
      if (seen.has(order.id)) return 'duplicate';
      seen.add(order.id);
      if (order.remittance_id) return 'already_settled';
      if (order.courier_id && order.courier_id !== courierId) return 'wrong_courier';
      if (collected > 0 && order.status !== 'delivered') return 'not_delivered';
      if (collected === expected) return 'matched';
      return collected < expected ? 'short' : 'over';
    })();

    return {
      row: index + 1, order_id: order?.id ?? null, invoice_number: order?.invoice_number ?? null, customer_name: order?.customer_name ?? null,
      tracking_number: tracking || order?.tracking_number || '', collected, fee, expected, difference: round2(collected - expected), outcome,
    };
  });
}

export function statementTotals(lines: CheckedLine[]) {
  const applied = lines.filter(l => isApplied(l.outcome));
  const collected = round2(applied.reduce((s, l) => s + l.collected, 0));
  const fees = round2(applied.reduce((s, l) => s + l.fee, 0));
  return {
    collected, fees, net: round2(collected - fees),
    applied: applied.length, skipped: lines.length - applied.length,
    problems: lines.filter(l => l.outcome !== 'matched').length,
  };
}

const DAY_MS = 86_400_000;

/** Delivered COD orders whose cash the courier still holds, per courier, with what's past the overdue line. */
export function cashWithCouriers(
  orders: { courier_id: number; total_amount: number; delivered_at: Date | string | null }[],
  now = new Date(),
) {
  const byCourier = new Map<number, { courier_id: number; count: number; amount: number; overdue_count: number; overdue_amount: number; oldest: string | null }>();
  for (const o of orders) {
    const cur = byCourier.get(o.courier_id) ?? { courier_id: o.courier_id, count: 0, amount: 0, overdue_count: 0, overdue_amount: 0, oldest: null };
    const amount = Number(o.total_amount);
    cur.count++;
    cur.amount = round2(cur.amount + amount);
    const at = o.delivered_at ? new Date(o.delivered_at) : null;
    if (at && now.getTime() - at.getTime() > OVERDUE_AFTER_DAYS * DAY_MS) {
      cur.overdue_count++;
      cur.overdue_amount = round2(cur.overdue_amount + amount);
    }
    if (at && (!cur.oldest || at.toISOString() < cur.oldest)) cur.oldest = at.toISOString();
    byCourier.set(o.courier_id, cur);
  }
  return [...byCourier.values()].sort((a, b) => b.amount - a.amount);
}
