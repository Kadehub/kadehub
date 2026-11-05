import { describe, expect, it } from 'vitest';
import { hasCodCapability } from './capabilities';

describe('cod capabilities', () => {
  it('admin has personal finance, cashier does not', () => {
    expect(hasCodCapability('ADMIN', 'personal_finance')).toBe(true);
    expect(hasCodCapability('CASHIER', 'personal_finance')).toBe(false);
    expect(hasCodCapability('CASHIER', 'credit')).toBe(true);
  });

  it('only the owner manages the business\'s own couriers', () => {
    expect(hasCodCapability('ADMIN', 'couriers')).toBe(true);
    expect(hasCodCapability('CASHIER', 'couriers')).toBe(false);
  });
});
