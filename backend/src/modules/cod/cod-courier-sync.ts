import type { CodOrderStatus } from '../../database/entities/cod-order.entity';

/**
 * What a courier's status means to KadeHub. An adapter must only return 'delivered' or 'returned' for statuses
 * it is certain about: they move stock and income. Anything unclear is 'unknown', which never changes an order.
 */
export type CourierState = 'processing' | 'in_transit' | 'delivered' | 'returned' | 'return_started' | 'failed_attempt' | 'unknown';

/** Why an order needs a person: it can't or shouldn't be decided automatically. */
export type CourierAttention = 'INSUFFICIENT_STOCK' | 'RETURN_STARTED' | 'DELIVERY_FAILED' | 'NOT_FOUND' | 'CHECK_STATUS';

/** What the sync does for a state it hasn't acted on yet. Pure, so the rules can be read and tested in one place. */
export function courierDecision(current: CodOrderStatus, state: CourierState): { status?: CodOrderStatus; attention: CourierAttention | null } {
  const open = current === 'pending' || current === 'confirmed' || current === 'ongoing';
  switch (state) {
    case 'in_transit':
      return { status: current === 'pending' || current === 'confirmed' ? 'ongoing' : undefined, attention: null };
    case 'delivered':
      return { status: open ? 'delivered' : undefined, attention: null };
    case 'returned':
      return { status: open || current === 'delivered' ? 'returned' : undefined, attention: null };
    case 'return_started':
      return { attention: 'RETURN_STARTED' };
    case 'failed_attempt':
      return { attention: 'DELIVERY_FAILED' };
    case 'unknown':
      return { attention: 'CHECK_STATUS' };
    default:
      return { attention: null };
  }
}
