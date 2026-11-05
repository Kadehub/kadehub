import { createHash } from 'crypto';
import type { CourierState } from './cod-courier-sync';

export interface ShipmentEvent { key: string; status: string; occurred_at: Date | null; note: string | null }
export interface ShipmentUpdate { status: string; state: CourierState; events: ShipmentEvent[] }

/** A courier's API rejected the key or failed. The message goes to the business, so it never contains the key. */
export class CourierApiError extends Error {
  constructor(message: string, readonly rejectedKey = false) { super(message); }
}

/** One courier's API. Add a class here and set `cod_courier.adapter` to its code to connect another courier. */
export interface CourierAdapter {
  /** Throws CourierApiError when the key doesn't work. */
  verifyKey(apiKey: string): Promise<void>;
  /** The parcel's latest status, or null when the courier doesn't know this waybill. */
  getTracking(waybill: string, apiKey: string): Promise<ShipmentUpdate | null>;
}

const REQUEST_TIMEOUT_MS = 15_000;

export const eventKey = (...parts: Array<string | null | undefined>) =>
  createHash('sha256').update(parts.map(p => p ?? '').join('|')).digest('hex').slice(0, 64);

function parseDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  // Koombiyo's dates carry no time zone; they are Colombo time
  const iso = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/.test(value.trim()) ? `${value.trim().replace(' ', 'T')}+05:30` : value;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Status ids published in the Koombiyo Node SDK (koombiyo-sdk, not an official Koombiyo document).
 * 15 "Client Received" is left out on purpose: it isn't clear which client received what, so it's flagged for a person.
 */
const KOOMBIYO_STATES: Record<string, CourierState> = {
  1: 'processing', // Processing
  2: 'in_transit', // Collected by Koombiyo
  14: 'in_transit', // Received at Warehouse
  3: 'in_transit', // Dispatch to Destination
  4: 'in_transit', // Received at Destination
  5: 'in_transit', // Out for Delivery
  6: 'delivered', // Delivered
};

export function koombiyoState(statusId: unknown, text: unknown): CourierState {
  const id = String(statusId ?? '').trim();
  // Words outrank the id, so a new "Delivered - returned" style status can't count as delivered
  const words = String(text ?? '').toLowerCase();
  if (/return|reject|refus|cancel/.test(words)) return 'return_started';
  if (/fail|reschedul|attempt|not deliver|undeliver/.test(words)) return 'failed_attempt';
  return KOOMBIYO_STATES[id] ?? 'unknown';
}

export class KoombiyoAdapter implements CourierAdapter {
  private get host() {
    return (process.env.KOOMBIYO_API_URL || 'https://application.koombiyodelivery.lk/api').replace(/\/+$/, '');
  }

  private async post(endpoint: string, apiKey: string, body: Record<string, string>): Promise<any> {
    let res: Response;
    try {
      res = await fetch(`${this.host}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ ...body, apikey: apiKey }).toString(),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch {
      throw new CourierApiError('Could not reach the courier');
    }
    if (res.status === 401 || res.status === 403) throw new CourierApiError('The courier rejected this API key', true);
    if (!res.ok) throw new CourierApiError(`The courier replied with an error (${res.status})`);
    const data = await res.json().catch(() => {
      throw new CourierApiError('The courier sent a reply KadeHub could not read');
    });
    if (data?.status === 'error') throw new CourierApiError('The courier rejected this request', true);
    return data;
  }

  async verifyKey(apiKey: string) {
    const data = await this.post('Allorders/users', apiKey, { offset: '0', limit: '1' });
    if (!Array.isArray(data?.cust_orders)) throw new CourierApiError('The courier rejected this API key', true);
  }

  async getTracking(waybill: string, apiKey: string): Promise<ShipmentUpdate | null> {
    const data = await this.post('Allorders/users', apiKey, { waybillid: waybill, offset: '0', limit: '1' });
    const order = data?.cust_orders?.[0];
    // If the filter were ignored this would be some other parcel, and its status would land on the wrong order
    if (!order || String(order.waybill_id ?? '').trim() !== waybill.trim()) return null;

    const history = await this.post('Orderhistory/users', apiKey, { waybillid: waybill }).catch(() => null);
    const steps: any[] = Array.isArray(history?.order_history) ? history.order_history : [];
    const events = steps.map(step => {
      const status = String(step.status ?? '').trim();
      return {
        key: eventKey(status, String(step.status_id ?? ''), String(step.date ?? '')),
        status: status.slice(0, 120),
        occurred_at: parseDate(step.date),
        note: String(step.remark ?? step.comments ?? '').trim().slice(0, 300) || null,
      };
    }).filter(e => e.status);

    const status = String(order.orderstatus ?? '').trim();
    return { status: status.slice(0, 120), state: koombiyoState(order.deliverystatus, status), events };
  }
}

const ADAPTERS: Record<string, CourierAdapter> = { koombiyo: new KoombiyoAdapter() };

export const courierAdapter = (code: string | null | undefined): CourierAdapter | null => (code && ADAPTERS[code]) || null;
