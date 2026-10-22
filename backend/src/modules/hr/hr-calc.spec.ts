import {
  computeAttendance, computePayslip, employedFraction, instantOf, leaveDays, localDate, localTime, periodRange,
  shiftMinutes, shiftWindow, weekStart, type PayrollRules, type PeriodActivity,
} from './hr-calc';

const RULES = { late_grace_minutes: 10, overtime_min_minutes: 30, work_hours_per_day: 8 };
const PAY: PayrollRules = {
  work_hours_per_day: 8, overtime_multiplier: 1.5, nopay_divisor: 30, deduct_absent: true, deduct_late: false,
  epf_employee_pct: 8, epf_employer_pct: 12, etf_employer_pct: 3,
};
const NO_INPUTS = { bonus: 0, other_earnings: 0, other_deductions: 0, advance_deduction: 0, asset_deduction: 0 };
const fullMonth = (over: Partial<PeriodActivity> = {}): PeriodActivity => ({
  days_worked: 26, absent_days: 0, unpaid_leave_days: 0, paid_leave_days: 0,
  worked_minutes: 26 * 8 * 60, overtime_minutes: 0, late_minutes: 0, employed_fraction: 1, ...over,
});

describe('Colombo dates and times', () => {
  it('converts instants to local dates and times', () => {
    // 20:00 UTC is 01:30 the next day in Colombo
    const d = new Date('2026-03-01T20:00:00Z');
    expect(localDate(d)).toBe('2026-03-02');
    expect(localTime(d)).toBe('01:30');
    expect(instantOf('2026-03-02', '01:30').toISOString()).toBe('2026-03-01T20:00:00.000Z');
  });

  it('handles shifts that run past midnight', () => {
    const w = shiftWindow('2026-03-02', '22:00', '06:00');
    expect((w.end.getTime() - w.start.getTime()) / 3_600_000).toBe(8);
    expect(shiftMinutes('22:00', '06:00', 30)).toBe(450);
    expect(shiftMinutes('08:00', '17:00', 60)).toBe(480);
  });

  it('finds the Monday of a week and month bounds', () => {
    expect(weekStart('2026-10-22')).toBe('2026-10-19'); // Thursday
    expect(weekStart('2026-10-25')).toBe('2026-10-19'); // Sunday belongs to the week before
    expect(periodRange('2028-02')).toEqual({ from: '2028-02-01', to: '2028-02-29', days: 29 });
  });
});

describe('computeAttendance', () => {
  const shift = { work_date: '2026-03-02', start_time: '08:00', end_time: '17:00', break_minutes: 60 };

  it('is on time within the grace period', () => {
    const r = computeAttendance(instantOf('2026-03-02', '08:10'), instantOf('2026-03-02', '17:00'), shift, RULES);
    expect(r.late_minutes).toBe(0);
    expect(r.worked_minutes).toBe(470);
    expect(r.overtime_minutes).toBe(0);
  });

  it('counts late minutes from the shift start once past grace', () => {
    const r = computeAttendance(instantOf('2026-03-02', '08:25'), instantOf('2026-03-02', '17:00'), shift, RULES);
    expect(r.late_minutes).toBe(25);
  });

  it('flags leaving early and counts overtime only past the minimum', () => {
    const early = computeAttendance(instantOf('2026-03-02', '08:00'), instantOf('2026-03-02', '16:00'), shift, RULES);
    expect(early.early_leave_minutes).toBe(60);
    const short = computeAttendance(instantOf('2026-03-02', '08:00'), instantOf('2026-03-02', '17:20'), shift, RULES);
    expect(short.overtime_minutes).toBe(0);
    const ot = computeAttendance(instantOf('2026-03-02', '08:00'), instantOf('2026-03-02', '19:00'), shift, RULES);
    expect(ot.overtime_minutes).toBe(120);
  });

  it('uses the standard day when there is no roster entry', () => {
    const r = computeAttendance(instantOf('2026-03-02', '09:00'), instantOf('2026-03-02', '18:00'), null, RULES);
    expect(r.scheduled_minutes).toBe(480);
    expect(r.late_minutes).toBe(0);
    expect(r.overtime_minutes).toBe(60);
  });

  it('leaves worked time at zero while still clocked in', () => {
    const r = computeAttendance(instantOf('2026-03-02', '08:30'), null, shift, RULES);
    expect(r.worked_minutes).toBe(0);
    expect(r.late_minutes).toBe(30);
  });
});

describe('leaveDays', () => {
  it('skips weekly days off and holidays', () => {
    // Mon 2 Mar – Sun 8 Mar 2026, Sunday off, Wednesday a holiday
    expect(leaveDays('2026-03-02', '2026-03-08', false, [0], new Set(['2026-03-04']))).toBe(5);
  });
  it('counts a half day as 0.5', () => {
    expect(leaveDays('2026-03-02', '2026-03-02', true, [0], new Set())).toBe(0.5);
    expect(leaveDays('2026-03-08', '2026-03-08', true, [0], new Set())).toBe(0);
  });
});

describe('computePayslip', () => {
  const monthly = { pay_type: 'monthly' as const, base_salary: 60000, fixed_allowance: 5000, epf_enabled: true };

  it('pays a full month with EPF on basic pay only', () => {
    const p = computePayslip(monthly, fullMonth(), PAY, NO_INPUTS);
    expect(p.base_pay).toBe(60000);
    expect(p.gross).toBe(65000);
    expect(p.epf_employee).toBe(4800);
    expect(p.epf_employer).toBe(7200);
    expect(p.etf_employer).toBe(1800);
    expect(p.net_pay).toBe(60200);
  });

  it('deducts no-pay for unpaid leave and absent days', () => {
    const p = computePayslip(monthly, fullMonth({ absent_days: 1, unpaid_leave_days: 2 }), PAY, NO_INPUTS);
    expect(p.nopay_days).toBe(3);
    expect(p.nopay_deduction).toBe(6000);
    expect(p.epf_employee).toBe(4320);
    const lenient = computePayslip(monthly, fullMonth({ absent_days: 1 }), { ...PAY, deduct_absent: false }, NO_INPUTS);
    expect(lenient.nopay_deduction).toBe(0);
  });

  it('pays overtime at the multiplier of the hourly rate', () => {
    // 60,000 / (30 × 8) = 250 an hour, × 1.5 × 4 h
    const p = computePayslip(monthly, fullMonth({ overtime_minutes: 240 }), PAY, NO_INPUTS);
    expect(p.overtime_pay).toBe(1500);
  });

  it('pro-rates a mid-month join', () => {
    expect(employedFraction('2026-04', '2026-04-16', null)).toBe(0.5);
    const p = computePayslip(monthly, fullMonth({ employed_fraction: 0.5 }), PAY, NO_INPUTS);
    expect(p.base_pay).toBe(30000);
    expect(p.allowances).toBe(2500);
  });

  it('pays daily and hourly staff for what they worked', () => {
    const daily = computePayslip({ pay_type: 'daily', base_salary: 2500, fixed_allowance: 0, epf_enabled: false },
      fullMonth({ days_worked: 20, paid_leave_days: 1 }), PAY, NO_INPUTS);
    expect(daily.base_pay).toBe(52500);
    expect(daily.epf_employee).toBe(0);
    const hourly = computePayslip({ pay_type: 'hourly', base_salary: 400, fixed_allowance: 0, epf_enabled: false },
      fullMonth({ worked_minutes: 100 * 60, overtime_minutes: 10 * 60 }), PAY, NO_INPUTS);
    expect(hourly.base_pay).toBe(36000);
    expect(hourly.overtime_pay).toBe(6000);
  });

  it('deducts late minutes when the setting is on', () => {
    const p = computePayslip(monthly, fullMonth({ late_minutes: 60 }), { ...PAY, deduct_late: true }, NO_INPUTS);
    expect(p.late_deduction).toBe(250);
  });

  it('never lets deductions take net pay below zero', () => {
    const p = computePayslip(monthly, fullMonth(), PAY, { ...NO_INPUTS, advance_deduction: 100000 });
    expect(p.net_pay).toBe(0);
    expect(p.advance_deduction).toBe(65000 - 4800);
  });
});
