import { courierDecision } from './cod-courier-sync';
import { KoombiyoAdapter, koombiyoState } from './cod-courier-adapters';
import { decryptSecret, encryptSecret } from './cod-courier-secrets';
import { checkStatement, statementTotals, cashWithCouriers, normalizeTracking, OrderForMatching } from './cod-settlements-calc';
import { buildTrackingLink } from './cod-couriers.service';

describe('what a courier status does to an order', () => {
  it('moves an open order on, once the parcel is really moving', () => {
    expect(courierDecision('confirmed', 'in_transit').status).toBe('ongoing');
    expect(courierDecision('pending', 'in_transit').status).toBe('ongoing');
    expect(courierDecision('ongoing', 'delivered').status).toBe('delivered');
    expect(courierDecision('ongoing', 'returned').status).toBe('returned');
  });

  it('does not drag a finished order back', () => {
    expect(courierDecision('delivered', 'in_transit').status).toBeUndefined();
    expect(courierDecision('cancelled', 'delivered').status).toBeUndefined();
    expect(courierDecision('returned', 'delivered').status).toBeUndefined();
    expect(courierDecision('cancelled', 'returned').status).toBeUndefined();
  });

  it('lets a late return correct a delivered order', () => {
    expect(courierDecision('delivered', 'returned').status).toBe('returned');
  });

  it('asks a person rather than guessing', () => {
    for (const [state, attention] of [['return_started', 'RETURN_STARTED'], ['failed_attempt', 'DELIVERY_FAILED'], ['unknown', 'CHECK_STATUS']] as const) {
      expect(courierDecision('ongoing', state)).toEqual({ attention });
    }
  });

  it('waits while the courier has not collected the parcel', () => {
    expect(courierDecision('confirmed', 'processing')).toEqual({ attention: null });
  });
});

describe('Koombiyo statuses', () => {
  it('reads the published status ids', () => {
    expect(koombiyoState('1', 'Processing')).toBe('processing');
    for (const id of ['2', '14', '3', '4', '5']) expect(koombiyoState(id, 'x')).toBe('in_transit');
    expect(koombiyoState('6', 'Delivered')).toBe('delivered');
  });

  it('never treats the unclear "Client Received" or a new id as delivered', () => {
    expect(koombiyoState('15', 'Client Received')).toBe('unknown');
    expect(koombiyoState('99', 'Delivered')).toBe('unknown');
    expect(koombiyoState(undefined, undefined)).toBe('unknown');
  });

  it('lets the wording stop a wrong "delivered"', () => {
    expect(koombiyoState('6', 'Delivered - Returned to sender')).toBe('return_started');
    expect(koombiyoState('5', 'Delivery failed')).toBe('failed_attempt');
    expect(koombiyoState('5', 'Not delivered')).toBe('failed_attempt');
  });
});

describe('Koombiyo adapter', () => {
  const realFetch = global.fetch;
  afterEach(() => { global.fetch = realFetch; });
  const reply = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status }));

  it('ignores a reply about a different parcel', async () => {
    global.fetch = jest.fn(() => reply({ cust_orders: [{ waybill_id: 'OTHER', orderstatus: 'Delivered', deliverystatus: '6' }] })) as any;
    await expect(new KoombiyoAdapter().getTracking('MINE', 'key')).resolves.toBeNull();
  });

  it('returns the status and history for the right parcel', async () => {
    global.fetch = jest.fn((url: string) => (url.endsWith('Orderhistory/users')
      ? reply({ order_history: [{ status_id: '2', status: 'Collected by Koombiyo', date: '2026-11-01 10:00:00', comments: '' }] })
      : reply({ cust_orders: [{ waybill_id: 'MINE', orderstatus: 'Out for Delivery', deliverystatus: '5' }] }))) as any;
    const update = await new KoombiyoAdapter().getTracking('MINE', 'key');
    expect(update).toMatchObject({ status: 'Out for Delivery', state: 'in_transit' });
    expect(update!.events[0]).toMatchObject({ status: 'Collected by Koombiyo' });
    expect(update!.events[0].occurred_at!.toISOString()).toBe('2026-11-01T04:30:00.000Z');
  });

  it('still reports the status when the history call fails', async () => {
    global.fetch = jest.fn((url: string) => (url.endsWith('Orderhistory/users')
      ? reply({}, 500)
      : reply({ cust_orders: [{ waybill_id: 'MINE', orderstatus: 'Delivered', deliverystatus: '6' }] }))) as any;
    expect(await new KoombiyoAdapter().getTracking('MINE', 'key')).toMatchObject({ state: 'delivered', events: [] });
  });

  it('keeps the API key out of error messages', async () => {
    global.fetch = jest.fn(() => reply({}, 500)) as any;
    const err: Error = await new KoombiyoAdapter().getTracking('MINE', 'super-secret-key').catch(e => e);
    expect(err.message).not.toContain('super-secret-key');
  });

  it('tells a rejected key from an outage', async () => {
    global.fetch = jest.fn(() => reply({ status: 'error', message: 'Invalid' })) as any;
    await expect(new KoombiyoAdapter().verifyKey('bad')).rejects.toMatchObject({ rejectedKey: true });
    global.fetch = jest.fn(() => Promise.reject(new Error('down'))) as any;
    await expect(new KoombiyoAdapter().verifyKey('good')).rejects.toMatchObject({ rejectedKey: false });
  });
});

describe('stored API keys', () => {
  const saved = process.env.COD_COURIER_SECRET;
  afterEach(() => { process.env.COD_COURIER_SECRET = saved; });

  it('round-trips without storing the key in clear', () => {
    process.env.COD_COURIER_SECRET = 'x'.repeat(32);
    const stored = encryptSecret('my-api-key');
    expect(stored).not.toContain('my-api-key');
    expect(decryptSecret(stored)).toBe('my-api-key');
    expect(encryptSecret('my-api-key')).not.toBe(stored);
  });

  it('refuses a missing or short secret, and a key tampered with', () => {
    process.env.COD_COURIER_SECRET = 'short';
    expect(() => encryptSecret('k')).toThrow('COD_COURIER_SECRET');
    process.env.COD_COURIER_SECRET = 'x'.repeat(32);
    const [v, iv, tag] = encryptSecret('k').split('.');
    expect(() => decryptSecret([v, iv, tag, 'AAAA'].join('.'))).toThrow();
  });
});

describe('checking a courier statement', () => {
  const COURIER = 5;
  const order = (o: Partial<OrderForMatching>): OrderForMatching => ({
    id: 1, invoice_number: 'INV-1', customer_name: 'N', tracking_number: 'W1', courier_id: COURIER,
    status: 'delivered', payment_type: 'cod', total_amount: 1000, remittance_id: null, ...o,
  });
  const check = (orders: OrderForMatching[], ...rows: any[]) => checkStatement(rows, orders, COURIER);

  it('matches however the waybill is typed', () => {
    expect(normalizeTracking(' w 1 ')).toBe('W1');
    expect(check([order({})], { tracking_number: ' w 1 ', collected: 1000, fee: 100 })[0]).toMatchObject({ outcome: 'matched', order_id: 1, expected: 1000 });
  });

  it('flags short and over payments, and keeps the difference', () => {
    expect(check([order({})], { tracking_number: 'W1', collected: 900, fee: 0 })[0]).toMatchObject({ outcome: 'short', difference: -100 });
    expect(check([order({})], { tracking_number: 'W1', collected: 1100, fee: 0 })[0]).toMatchObject({ outcome: 'over', difference: 100 });
  });

  it('expects nothing from a returned parcel but still takes the return fee', () => {
    const [line] = check([order({ status: 'returned' })], { tracking_number: 'W1', collected: 0, fee: 300 });
    expect(line).toMatchObject({ outcome: 'matched', expected: 0, fee: 300 });
    expect(statementTotals([line])).toMatchObject({ collected: 0, fees: 300, net: -300, applied: 1 });
  });

  it('flags cash on an order that is not delivered', () => {
    expect(check([order({ status: 'ongoing' })], { tracking_number: 'W1', collected: 1000, fee: 0 })[0].outcome).toBe('not_delivered');
    expect(check([order({ status: 'returned' })], { tracking_number: 'W1', collected: 1000, fee: 0 })[0].outcome).toBe('not_delivered');
  });

  it('expects no cash on an order already paid for', () => {
    expect(check([order({ payment_type: 'pay_now' })], { tracking_number: 'W1', collected: 1000, fee: 0 })[0]).toMatchObject({ outcome: 'over', expected: 0 });
  });

  it('never pays the same order twice', () => {
    const lines = check([order({})], { tracking_number: 'W1', collected: 1000, fee: 0 }, { tracking_number: 'w1', collected: 1000, fee: 0 });
    expect(lines.map(l => l.outcome)).toEqual(['matched', 'duplicate']);
    expect(statementTotals(lines).collected).toBe(1000);
    expect(check([order({ remittance_id: 9 })], { tracking_number: 'W1', collected: 1000, fee: 0 })[0].outcome).toBe('already_settled');
  });

  it('leaves what it cannot place out of the totals', () => {
    const lines = check(
      [order({ id: 1, tracking_number: 'SAME' }), order({ id: 2, tracking_number: 'SAME' }), order({ id: 3, tracking_number: 'OTHER', courier_id: 6 })],
      { tracking_number: 'NOPE', collected: 500, fee: 0 }, { tracking_number: 'SAME', collected: 500, fee: 0 }, { tracking_number: 'OTHER', collected: 500, fee: 0 },
    );
    expect(lines.map(l => l.outcome)).toEqual(['unmatched', 'ambiguous', 'wrong_courier']);
    expect(statementTotals(lines)).toMatchObject({ collected: 0, applied: 0, skipped: 3 });
  });

  it('accepts an order with no courier yet, and one picked by hand', () => {
    expect(check([order({ courier_id: null })], { tracking_number: 'W1', collected: 1000, fee: 0 })[0].outcome).toBe('matched');
    expect(check([order({ tracking_number: null })], { order_id: 1, collected: 1000, fee: 0 })[0].outcome).toBe('matched');
    expect(check([order({})], { order_id: 77, collected: 1000, fee: 0 })[0].outcome).toBe('unmatched');
  });
});

describe('cash with couriers', () => {
  const NOW = new Date('2026-11-05T00:00:00Z');
  it('totals per courier and marks what is overdue', () => {
    const [a, b] = cashWithCouriers([
      { courier_id: 1, total_amount: 1000, delivered_at: '2026-11-01T00:00:00Z' },
      { courier_id: 1, total_amount: 2000, delivered_at: '2026-10-01T00:00:00Z' },
      { courier_id: 2, total_amount: 500, delivered_at: null },
    ], NOW);
    expect(a).toMatchObject({ courier_id: 1, count: 2, amount: 3000, overdue_count: 1, overdue_amount: 2000, oldest: '2026-10-01T00:00:00.000Z' });
    expect(b).toMatchObject({ courier_id: 2, amount: 500, overdue_amount: 0, oldest: null });
  });
});

describe('tracking links with a phone number', () => {
  it('fills in both, encoded', () => {
    expect(buildTrackingLink('https://c.example/t?id={tracking}&phone={phone}', 'A1', '+94 77')).toBe('https://c.example/t?id=A1&phone=%2B94%2077');
  });
});
