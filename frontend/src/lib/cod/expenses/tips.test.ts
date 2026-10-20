import { describe, expect, it } from 'vitest';
import { buildTips, monthPace } from './tips';
import type { SpendRow } from './types';

const r = (expense_date: string, category: string, amount: number): SpendRow => ({ expense_date, category, amount });
// 15 Oct 2026, noon local time (31-day month, last month has 30 days)
const NOW = new Date(2026, 9, 15, 12);

describe('monthPace', () => {
  const rows = [r('2026-10-01', 'Personal', 3000), r('2026-10-10', 'Fuel', 3000), r('2026-09-05', 'Personal', 2000), r('2026-09-20', 'Personal', 9000)];
  it('projects month-to-date spend in a straight line', () => {
    const p = monthPace(rows, 30000, NOW);
    expect(p.spent).toBe(6000);
    expect(p.daysElapsed).toBe(15);
    expect(p.daysInMonth).toBe(31);
    expect(p.daysLeft).toBe(16);
    expect(p.projected).toBe(12400);
    expect(p.left).toBe(24000);
    expect(p.safePerDay).toBe(Math.round((24000 / 17) * 100) / 100);
  });
  it('compares with last month up to the same day number', () => {
    expect(monthPace(rows, null, NOW).lastMonthSameDays).toBe(2000);
  });
  it('has no budget numbers without a budget', () => {
    const p = monthPace(rows, null, NOW);
    expect(p.left).toBeNull();
    expect(p.safePerDay).toBeNull();
  });
  it('ignores future-dated rows in the month', () => {
    expect(monthPace([r('2026-10-20', 'Fuel', 999)], null, NOW).spent).toBe(0);
  });
});

describe('buildTips', () => {
  const ids = (rows: SpendRow[], opts = {}) => buildTips(rows, { now: NOW, max: 20, ...opts }).map(t => t.id);

  it('returns nothing for an empty history', () => {
    expect(buildTips([], { budget: 50000, now: NOW, remainingCash: -5 })).toEqual([]);
  });
  it('puts negative remaining cash first after over-budget, then sorts by rank', () => {
    const tips = buildTips([r('2026-10-14', 'Personal', 60000)], { budget: 50000, now: NOW, businessNet: 10000, remainingCash: -50000, max: 4 });
    expect(tips[0].id).toBe('over_budget');
    expect(tips[1].id).toBe('cash_negative');
    expect(tips[1].params.amount).toBe(50000);
    expect(tips.map(t => t.rank)).toEqual([...tips.map(t => t.rank)].sort((a, b) => b - a));
  });
  it('warns about pace when the projection beats the budget', () => {
    expect(ids([r('2026-10-14', 'Personal', 30000)], { budget: 40000 })).toContain('pace');
  });
  it('says on track when well within budget', () => {
    const tips = buildTips([r('2026-10-14', 'Personal', 5000)], { budget: 40000, now: NOW, max: 20 });
    expect(tips.map(t => t.id)).toContain('on_track');
    expect(tips.map(t => t.id)).not.toContain('pace');
  });
  it('suggests a budget when none is set', () => {
    expect(ids([r('2026-10-14', 'Personal', 5000)])).toContain('set_budget');
  });
  it('flags lifestyle spending at 30% or more', () => {
    expect(ids([r('2026-10-14', 'Alcohol', 4000), r('2026-10-14', 'Personal', 6000)])).toContain('lifestyle');
  });
  it('flags a dominant non-investment category', () => {
    const tips = buildTips([r('2026-10-14', 'Fuel', 8000), r('2026-10-14', 'Personal', 2000)], { now: NOW, max: 20 });
    const top = tips.find(t => t.id === 'top_category')!;
    expect(top.params.category).toBe('Fuel');
    expect(top.params.save).toBe(1600);
  });
  it('nudges to invest when nothing is invested by day 10, and praises investing', () => {
    expect(ids([r('2026-10-14', 'Personal', 500)])).toContain('invest_first');
    expect(ids([r('2026-10-14', 'Investment', 5000)])).toContain('invested');
  });
  it('notices quiet logging and many small spends / rides', () => {
    expect(ids([r('2026-10-09', 'Personal', 500)])).toContain('quiet');
    const rides = Array.from({ length: 8 }, (_, i) => r(`2026-10-${String(i + 1).padStart(2, '0')}`, 'PickMe', 400));
    expect(ids(rides)).toContain('pickme');
    const small = Array.from({ length: 12 }, () => r('2026-10-14', 'Personal', 200));
    expect(ids(small)).toContain('small_spends');
  });
  it('compares with last month same-days both ways', () => {
    expect(ids([r('2026-10-05', 'Personal', 13000), r('2026-09-05', 'Personal', 10000)])).toContain('up_vs_last');
    expect(ids([r('2026-10-05', 'Personal', 8000), r('2026-09-05', 'Personal', 10000)])).toContain('below_last');
  });
  it('reports how much business profit is kept', () => {
    expect(ids([r('2026-10-14', 'Personal', 5000)], { businessNet: 100000, remainingCash: 10000 })).toContain('keep_low');
    expect(ids([r('2026-10-14', 'Personal', 5000)], { businessNet: 100000, remainingCash: 95000 })).toContain('keep_good');
  });
  it('limits to max tips', () => {
    expect(buildTips([r('2026-10-14', 'Alcohol', 9000)], { now: NOW }).length).toBeLessThanOrEqual(4);
  });
});
