import { cashFigures, cashModel, FinanceInput } from './cod-finance';
import { resolveRange } from './cod-analytics';

const NOW = new Date('2026-10-20T06:00:00Z'); // 20 Oct 2026, 11:30 in Colombo

function input(): FinanceInput {
  return {
    orders: [
      { id: 1, status: 'delivered', total_amount: 10000, created_at: '2026-10-05T05:00:00Z' },
      { id: 2, status: 'pending', total_amount: 5000, created_at: '2026-10-06T05:00:00Z' },     // not income
      { id: 3, status: 'delivered', total_amount: 8000, created_at: '2026-09-10T05:00:00Z' },   // last month
      { id: 4, status: 'returned', total_amount: 3000, created_at: '2026-10-07T05:00:00Z' },    // not income
    ],
    lines: [
      { order_id: 1, quantity: 2, landed_cost: 2000 },  // 4000
      { order_id: 1, quantity: 1, landed_cost: 0 },     // custom line
      { order_id: 2, quantity: 5, landed_cost: 500 },   // pending → excluded
      { order_id: 3, quantity: 4, landed_cost: 1000 },  // 4000 (September)
    ],
    expenses: [
      { amount: 1500, category: 'Advertising', expense_date: '2026-10-02' },
      { amount: 2500, category: 'Business Tour', expense_date: '2026-10-08' },
      { amount: 700, category: 'Rent', expense_date: '2026-09-15' },
    ],
    personal: [
      { amount: 1000, category: 'Fuel', expense_date: '2026-10-03' },
      { amount: 300, category: 'PickMe', expense_date: '2026-10-04' },
      { amount: 9999, category: 'Investment', expense_date: '2026-08-01' },
    ],
  };
}

describe('cashFigures', () => {
  const october = resolveRange('this_month', NOW);

  it('counts only delivered orders as income and their lines as COGS', () => {
    const f = cashFigures(input(), october);
    expect(f.income).toBe(10000);
    expect(f.cogs).toBe(4000);
  });

  it('includes Business Tour in business expenses and shows it separately', () => {
    const f = cashFigures(input(), october);
    expect(f.businessExpenses).toBe(4000);
    expect(f.businessTourExpenses).toBe(2500);
    expect(f.businessNetProfit).toBe(10000 - 4000 - 4000);
  });

  it('personal expenses reduce only remaining cash', () => {
    const withPersonal = cashFigures(input(), october);
    const without = cashFigures({ ...input(), personal: [] }, october);
    expect(withPersonal.businessNetProfit).toBe(without.businessNetProfit);
    expect(withPersonal.personalExpenses).toBe(1300);
    expect(withPersonal.netRemainingCash).toBe(2000 - 1300);
    expect(withPersonal.keptPct).toBe(35);
  });

  it('all-time totals cover every month', () => {
    const f = cashFigures(input());
    expect(f.income).toBe(18000);
    expect(f.cogs).toBe(8000);
    expect(f.businessExpenses).toBe(4700);
    expect(f.personalExpenses).toBe(11299);
    expect(f.netRemainingCash).toBe(18000 - 8000 - 4700 - 11299);
  });

  it('keptPct is null without business profit, and negative cash is allowed', () => {
    const f = cashFigures({ ...input(), orders: [] }, october);
    expect(f.businessNetProfit).toBe(-4000);
    expect(f.keptPct).toBeNull();
    expect(f.netRemainingCash).toBe(-5300);
  });

  it('rounds to 2 decimals', () => {
    const f = cashFigures({
      orders: [{ id: 1, status: 'delivered', total_amount: 0.1 + 0.2, created_at: '2026-10-01T05:00:00Z' }],
      lines: [], expenses: [{ amount: 0.105, category: 'Misc', expense_date: '2026-10-01' }], personal: [],
    });
    expect(f.income).toBe(0.3);
    expect(f.businessExpenses).toBe(0.11);
  });
});

describe('cashModel', () => {
  it('buckets the last 6 months and breaks down categories for the period', () => {
    const m = cashModel(input(), resolveRange('this_month', NOW), NOW);
    expect(m.months).toHaveLength(6);
    const sep = m.months.find(x => x.key === '2026-09')!;
    const oct = m.months.find(x => x.key === '2026-10')!;
    expect(sep.income).toBe(8000);
    expect(sep.businessNetProfit).toBe(8000 - 4000 - 700);
    expect(oct.netRemainingCash).toBe(m.period.netRemainingCash);
    expect(m.businessByCategory[0]).toEqual({ category: 'Business Tour', amount: 2500, count: 1 });
    expect(m.personalByCategory.map(c => c.category)).toEqual(['Fuel', 'PickMe']);
  });
});
