import {
  computeOrderTotals, summariseCredit, dueBucket, deriveDueDate, nextInvoiceNumber, phoneKey, OrderRuleError,
} from './cod-orders-calc';

const code = (fn: () => unknown) => { try { fn(); return null; } catch (e) { return (e as OrderRuleError).code; } };

describe('summariseCredit', () => {
  it('unpaid', () => expect(summariseCredit(1000, 0)).toEqual({ total: 1000, paid: 0, outstanding: 1000, status: 'unpaid' }));
  it('partial', () => expect(summariseCredit(1000, 400.005)).toMatchObject({ paid: 400.01, outstanding: 599.99, status: 'partial' }));
  it('paid', () => expect(summariseCredit(1000, 1000)).toMatchObject({ outstanding: 0, status: 'paid' }));
  it('overpaid never goes negative', () => expect(summariseCredit(1000, 1200)).toMatchObject({ outstanding: 0, status: 'paid' }));
  it('zero total is unpaid, not paid', () => expect(summariseCredit(0, 0)).toMatchObject({ outstanding: 0, status: 'unpaid' }));
});

describe('dueBucket', () => {
  const now = new Date('2026-10-20T06:00:00Z'); // 20 Oct, 11:30 local
  const base = { created_at: '2026-10-01T00:00:00Z', outstanding: 500 };
  it('overdue when the due date has passed', () => expect(dueBucket({ ...base, payment_due_date: '2026-10-19' }, now)).toBe('overdue'));
  it('due today counts as due', () => expect(dueBucket({ ...base, payment_due_date: '2026-10-20' }, now)).toBe('due'));
  it('due within 7 days', () => expect(dueBucket({ ...base, payment_due_date: '2026-10-27' }, now)).toBe('due'));
  it('upcoming beyond 7 days', () => expect(dueBucket({ ...base, payment_due_date: '2026-10-28' }, now)).toBe('upcoming'));
  it('no date and young → none', () => expect(dueBucket({ ...base, payment_due_date: null }, now)).toBe('none'));
  it('no date and older than 30 days → overdue', () =>
    expect(dueBucket({ created_at: '2026-09-10T00:00:00Z', outstanding: 500, payment_due_date: null }, now)).toBe('overdue'));
  it('settled balances are never overdue', () => expect(dueBucket({ ...base, outstanding: 0, payment_due_date: '2026-01-01' }, now)).toBe('none'));
});

describe('deriveDueDate', () => {
  it('uses the explicit date first', () => expect(deriveDueDate(new Date('2026-10-01T00:00:00Z'), 30, '2026-11-15')).toBe('2026-11-15'));
  it('adds the credit period', () => expect(deriveDueDate(new Date('2026-10-01T00:00:00Z'), 30)).toBe('2026-10-31'));
  it('no period → no date', () => expect(deriveDueDate(new Date(), null)).toBeNull());
});

describe('nextInvoiceNumber', () => {
  it('starts each year at 0001', () => expect(nextInvoiceNumber(2026, null)).toBe('INV-2026-0001'));
  it('increments', () => expect(nextInvoiceNumber(2026, 'INV-2026-0041')).toBe('INV-2026-0042'));
  it('past 9999 keeps counting', () => expect(nextInvoiceNumber(2026, 'INV-2026-9999')).toBe('INV-2026-10000'));
  it("ignores last year's numbers", () => expect(nextInvoiceNumber(2027, 'INV-2026-0500')).toBe('INV-2027-0001'));
});

describe('computeOrderTotals', () => {
  it('sums lines, delivery and discount with 2-decimal rounding', () => {
    const r = computeOrderTotals([{ item_id: 1, quantity: 3, unit_price: 33.335 }, { custom_name: 'Gift wrap', quantity: 1, unit_price: 150 }], 350.004, 20);
    expect(r.subtotal).toBe(250.02);
    expect(r.delivery_charge).toBe(350);
    expect(r.total_amount).toBe(580.02);
    expect(r.lines).toHaveLength(2);
  });
  it('drops zero-quantity lines and needs at least one line', () => {
    expect(code(() => computeOrderTotals([{ item_id: 1, quantity: 0, unit_price: 10 }]))).toBe('NO_LINES');
  });
  it('rejects negatives', () => {
    expect(code(() => computeOrderTotals([{ item_id: 1, quantity: 1, unit_price: -1 }]))).toBe('NEGATIVE_AMOUNT');
    expect(code(() => computeOrderTotals([{ item_id: 1, quantity: 1, unit_price: 1 }], -5))).toBe('NEGATIVE_AMOUNT');
    expect(code(() => computeOrderTotals([{ item_id: 1, quantity: 1, unit_price: 1 }], 0, -5))).toBe('NEGATIVE_AMOUNT');
  });
  it('custom lines need a name', () => {
    expect(code(() => computeOrderTotals([{ item_id: null, custom_name: '  ', quantity: 1, unit_price: 5 }]))).toBe('CUSTOM_LINE_NAME');
  });
  it('discount larger than the order is rejected', () => {
    expect(code(() => computeOrderTotals([{ item_id: 1, quantity: 1, unit_price: 100 }], 0, 150))).toBe('DISCOUNT_TOO_LARGE');
  });
});

describe('phoneKey', () => {
  it('matches local and international forms', () => {
    expect(phoneKey('077 123 4567')).toBe('771234567');
    expect(phoneKey('+94 77-123-4567')).toBe('771234567');
  });
  it('short numbers have no key', () => expect(phoneKey('12345')).toBe(''));
});

describe('isValidPhone / checkCustomerPhone', () => {
  const { isValidPhone, checkCustomerPhone } = require('./cod-orders-calc');
  it.each([
    ['0771234567', true], ['077 123 4567', true], ['077-123-4567', true], ['(011) 234 5678', true],
    ['771234567', true], ['94771234567', true], ['+94 77 123 4567', true], ['+44 20 7946 0958', true], ['0094771234567', true],
    ['077123456', false], ['07712345678', false], ['12345', false], ['abc0771234567', false], ['077+1234567', false],
    ['+12345', false], ['', false], ['9477123456', false],
  ])('%s → %s', (input, ok) => {
    expect(isValidPhone(input)).toBe(ok);
  });
  it('requires a phone for COD and credit, not for pay-now', () => {
    expect(() => checkCustomerPhone('', 'cod')).toThrow('PHONE_REQUIRED');
    expect(() => checkCustomerPhone('  ', 'credit')).toThrow('PHONE_REQUIRED');
    expect(() => checkCustomerPhone('', 'pay_now')).not.toThrow();
    expect(() => checkCustomerPhone('0771', 'pay_now')).toThrow('INVALID_PHONE');
    expect(() => checkCustomerPhone('0771234567', 'cod')).not.toThrow();
  });
});

describe('order limits are the storage limits', () => {
  const { computeOrderTotals } = require('./cod-orders-calc');
  it('accepts quantities above 100,000', () => {
    expect(computeOrderTotals([{ custom_name: 'Screws', quantity: 250000, unit_price: 2 }]).total_amount).toBe(500000);
  });
  it('rejects what the columns cannot hold, with codes', () => {
    expect(() => computeOrderTotals([{ custom_name: 'X', quantity: 3_000_000_000, unit_price: 1 }])).toThrow('QUANTITY_TOO_LARGE');
    expect(() => computeOrderTotals([{ custom_name: 'X', quantity: 1_000_000_000, unit_price: 20_000 }])).toThrow('AMOUNT_TOO_LARGE');
  });
});
