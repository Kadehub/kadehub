/** Decorative stand-in numbers for locked (non-Premium) charts, so the blurred
 *  preview looks like a real chart without exposing the business's figures. */

const REVENUE = [42000, 58000, 51000, 76000, 69000, 91000];
const EXPENSES = [21000, 26000, 24000, 31000, 28000, 36000];

export function sampleMonthly<T extends { key: string; label: string }>(
  months: T[],
): (T & { revenue: number; expenses: number; net: number })[] {
  return months.map((m, i) => {
    const revenue = REVENUE[i % REVENUE.length];
    const expenses = EXPENSES[i % EXPENSES.length];
    return { ...m, revenue, expenses, net: revenue - expenses };
  });
}
