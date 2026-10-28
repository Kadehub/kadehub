import { describe, expect, it } from 'vitest';
import { orderAllowance } from './plans';

const free = (used: number) => ({ orders_this_month: used, orders_limit: 50, orders_grace: 5 });

describe('orderAllowance', () => {
  it('is quiet below 80% and on unlimited plans', () => {
    expect(orderAllowance(free(39))).toEqual({ state: 'ok' });
    expect(orderAllowance({ orders_this_month: 900, orders_limit: null, orders_grace: 0 })).toEqual({ state: 'ok' });
    expect(orderAllowance(undefined)).toEqual({ state: 'ok' });
  });

  it('warns from 80% with the plan orders left', () => {
    expect(orderAllowance(free(40))).toEqual({ state: 'warn', left: 10, limit: 50 });
    expect(orderAllowance(free(49))).toEqual({ state: 'warn', left: 1, limit: 50 });
  });

  it('counts down the 5 grace orders, then blocks', () => {
    expect(orderAllowance(free(50))).toEqual({ state: 'grace', left: 5, limit: 50 });
    expect(orderAllowance(free(54))).toEqual({ state: 'grace', left: 1, limit: 50 });
    expect(orderAllowance(free(55))).toEqual({ state: 'blocked', limit: 50 });
  });

  it('looks ahead after creating an order', () => {
    expect(orderAllowance(free(49), 1)).toEqual({ state: 'grace', left: 5, limit: 50 });
    expect(orderAllowance(free(54), 1)).toEqual({ state: 'blocked', limit: 50 });
  });
});
