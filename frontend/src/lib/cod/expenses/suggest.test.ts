import { describe, expect, it } from 'vitest';
import { findLookalike, lastMethod, oneTapRepeats, quickAmounts } from './suggest';
import { businessKpis, byCategory, groupByDay, monthlySeries } from './stats';
import { newClientRef } from './client-ref';
import type { SpendRow } from './types';

const r = (expense_date: string, category: string, amount: number, extra: Partial<SpendRow> = {}): SpendRow => ({ expense_date, category, amount, ...extra });
const NOW = new Date(2026, 9, 15, 12);

describe('quickAmounts', () => {
  it('puts the 3 most-used amounts first, then defaults, max 6', () => {
    const rows = [r('2026-10-01', 'PickMe', 450), r('2026-10-02', 'PickMe', 450), r('2026-10-03', 'PickMe', 600), r('2026-10-04', 'PickMe', 300), r('2026-10-04', 'Fuel', 999)];
    // 600 and 300 are used once each: the more recent (300) comes first
    expect(quickAmounts(rows, 'PickMe', [300, 500, 800, 1200, 2000])).toEqual([450, 300, 600, 500, 800, 1200]);
  });
  it('falls back to defaults with no history', () => {
    expect(quickAmounts([], 'Fuel', [1000, 2000])).toEqual([1000, 2000]);
  });
});

describe('oneTapRepeats', () => {
  it('keeps pairs used twice in the last 90 days, most used first', () => {
    const rows = [
      r('2026-10-01', 'PickMe', 500), r('2026-10-05', 'PickMe', 500), r('2026-10-06', 'PickMe', 500),
      r('2026-09-01', 'Fuel', 3000), r('2026-10-01', 'Fuel', 3000),
      r('2026-10-01', 'Sports', 1000),
      r('2026-01-01', 'Alcohol', 2000), r('2026-01-02', 'Alcohol', 2000), // too old
    ];
    expect(oneTapRepeats(rows, NOW)).toEqual([
      { category: 'PickMe', amount: 500, count: 3 },
      { category: 'Fuel', amount: 3000, count: 2 },
    ]);
  });
});

describe('findLookalike', () => {
  const rows = [{ id: 1, ...r('2026-10-14', 'Rent', 25000, { title: 'Shop rent ' }) }];
  it('matches same date, category, amount and text (trimmed, case-insensitive)', () => {
    expect(findLookalike(rows, r('2026-10-14', 'Rent', 25000, { title: 'shop RENT' }), 'title')?.id).toBe(1);
  });
  it('ignores the row being edited and different amounts', () => {
    expect(findLookalike(rows, r('2026-10-14', 'Rent', 25000, { title: 'Shop rent' }), 'title', 1)).toBeUndefined();
    expect(findLookalike(rows, r('2026-10-14', 'Rent', 25001, { title: 'Shop rent' }), 'title')).toBeUndefined();
  });
  it('treats an empty note and null as the same', () => {
    const p = [{ id: 2, ...r('2026-10-14', 'PickMe', 500, { notes: null }) }];
    expect(findLookalike(p, r('2026-10-14', 'PickMe', 500, { notes: '' }), 'notes')?.id).toBe(2);
  });
});

describe('stats', () => {
  const rows = [
    r('2026-10-01', 'Business Tour', 5000), r('2026-10-10', 'Rent', 25000),
    r('2026-09-10', 'Rent', 20000),
  ];
  it('business KPIs include Business Tour and the change vs the previous period', () => {
    const k = businessKpis(rows, { from: '2026-10-01', to: '2026-10-31' }, NOW);
    expect(k.total).toBe(30000);
    expect(k.tour).toBe(5000);
    expect(k.entries).toBe(2);
    expect(k.perDay).toBe(2000); // 15 days elapsed
    expect(k.change).toBe(50); // 30000 vs 20000 in the previous 31 days
  });
  it('groups by category with percentages', () => {
    expect(byCategory(rows.slice(0, 2))).toEqual([
      { category: 'Rent', amount: 25000, count: 1, pct: 83.3 },
      { category: 'Business Tour', amount: 5000, count: 1, pct: 16.7 },
    ]);
  });
  it('builds 6 monthly buckets and day groups', () => {
    const m = monthlySeries(rows, 6, NOW);
    expect(m.map(x => x.key)).toEqual(['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10']);
    expect(m[5].total).toBe(30000);
    expect(groupByDay(rows)[0]).toMatchObject({ date: '2026-10-10', total: 25000 });
  });
});

describe('misc', () => {
  it('lastMethod picks the newest method', () => {
    expect(lastMethod([{ payment_method: null }, { payment_method: 'bank' }])).toBe('bank');
    expect(lastMethod([])).toBe('cash');
  });
  it('client refs look like UUIDs and differ', () => {
    const a = newClientRef();
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(newClientRef()).not.toBe(a);
  });
});
