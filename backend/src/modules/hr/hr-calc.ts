/**
 * Pure KadeHub Staff maths: Colombo dates, shift times, attendance flags, leave days and payslips.
 * No database access, so every rule here is unit-tested in hr-calc.spec.ts.
 *
 * Wall-clock times follow UTC+5:30 (no DST) regardless of where the server runs.
 */

const OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_MS = 60 * 1000;

export const round2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;

/** "YYYY-MM-DD" of the Colombo calendar day an instant falls on. */
export function localDate(d: Date = new Date()): string {
  return new Date(d.getTime() + OFFSET_MS).toISOString().slice(0, 10);
}

/** "HH:MM" Colombo wall-clock time of an instant. */
export function localTime(d: Date): string {
  return new Date(d.getTime() + OFFSET_MS).toISOString().slice(11, 16);
}

export function isDate(v: unknown): v is string {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));
}

export function isTime(v: unknown): v is string {
  return typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
}

export function isPeriod(v: unknown): v is string {
  return typeof v === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
}

/** Instant of a Colombo wall-clock date + "HH:MM". */
export function instantOf(date: string, time: string): Date {
  return new Date(Date.parse(`${date}T${time}:00Z`) - OFFSET_MS);
}

export function addDays(date: string, n: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
}

/** 0 = Sunday … 6 = Saturday. */
export function weekday(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

/** Every date from `from` to `to`, both included. */
export function dateRange(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to && out.length < 400; d = addDays(d, 1)) out.push(d);
  return out;
}

/** First and last day of a "YYYY-MM" period. */
export function periodRange(period: string): { from: string; to: string; days: number } {
  const [y, m] = period.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${period}-01`, to: `${period}-${String(last).padStart(2, '0')}`, days: last };
}

/** Monday of the week a date falls in. */
export function weekStart(date: string): string {
  const wd = weekday(date);
  return addDays(date, wd === 0 ? -6 : 1 - wd);
}

/** Start and end instants of a shift; an end at or before the start runs into the next day. */
export function shiftWindow(date: string, start: string, end: string): { start: Date; end: Date } {
  const s = instantOf(date, start);
  let e = instantOf(date, end);
  if (e.getTime() <= s.getTime()) e = new Date(e.getTime() + DAY_MS);
  return { start: s, end: e };
}

/** Paid minutes of a shift (length minus break, never negative). */
export function shiftMinutes(start: string, end: string, breakMinutes = 0): number {
  const w = shiftWindow('2000-01-01', start, end);
  return Math.max(0, Math.round((w.end.getTime() - w.start.getTime()) / MIN_MS) - breakMinutes);
}

export function parseOffDays(v: string | null | undefined): number[] {
  return (v ?? '').split(',').map(s => Number(s.trim())).filter(n => Number.isInteger(n) && n >= 0 && n <= 6);
}

// ───────────────────────── Attendance ─────────────────────────

export interface ShiftPlan { work_date: string; start_time: string; end_time: string; break_minutes: number }

export interface AttendanceRules {
  late_grace_minutes: number;
  overtime_min_minutes: number;
  work_hours_per_day: number;
}

export interface AttendanceFigures {
  scheduled_minutes: number;
  worked_minutes: number;
  late_minutes: number;
  early_leave_minutes: number;
  overtime_minutes: number;
}

/**
 * Late / early / overtime for one clock-in and clock-out against the roster.
 *  - Late counts from the shift start once past the grace period (10 min late with 10 min grace = on time).
 *  - Without a roster entry the day is measured against the standard working day and nobody is late.
 *  - Overtime is time worked beyond the scheduled minutes, counted only from the minimum (30 min by default).
 */
export function computeAttendance(clockIn: Date, clockOut: Date | null, shift: ShiftPlan | null, rules: AttendanceRules): AttendanceFigures {
  const scheduled = shift ? shiftMinutes(shift.start_time, shift.end_time, shift.break_minutes) : Math.round(rules.work_hours_per_day * 60);
  let late = 0;
  let early = 0;
  if (shift) {
    const w = shiftWindow(shift.work_date, shift.start_time, shift.end_time);
    const lateBy = Math.floor((clockIn.getTime() - w.start.getTime()) / MIN_MS);
    if (lateBy > rules.late_grace_minutes) late = lateBy;
    if (clockOut) {
      const earlyBy = Math.floor((w.end.getTime() - clockOut.getTime()) / MIN_MS);
      if (earlyBy > 0) early = earlyBy;
    }
  }
  if (!clockOut) return { scheduled_minutes: scheduled, worked_minutes: 0, late_minutes: late, early_leave_minutes: 0, overtime_minutes: 0 };

  const breakMinutes = shift?.break_minutes ?? 0;
  const span = Math.max(0, Math.floor((clockOut.getTime() - clockIn.getTime()) / MIN_MS));
  // A break is only taken out of a stay long enough to include it
  const worked = span > breakMinutes ? span - breakMinutes : span;
  const extra = worked - scheduled;
  const overtime = extra >= Math.max(1, rules.overtime_min_minutes) ? extra : 0;
  return { scheduled_minutes: scheduled, worked_minutes: worked, late_minutes: late, early_leave_minutes: early, overtime_minutes: overtime };
}

// ───────────────────────── Leave ─────────────────────────

/** Working days a leave request takes: weekly days off and holidays are not counted; a half day is 0.5. */
export function leaveDays(from: string, to: string, halfDay: boolean, offDays: number[], holidays: Set<string>): number {
  if (to < from) return 0;
  const days = dateRange(from, to).filter(d => !offDays.includes(weekday(d)) && !holidays.has(d)).length;
  if (halfDay) return days > 0 ? 0.5 : 0;
  return days;
}

// ───────────────────────── Payroll ─────────────────────────

export interface PayrollRules {
  work_hours_per_day: number;
  overtime_multiplier: number;
  nopay_divisor: number;
  deduct_absent: boolean;
  deduct_late: boolean;
  epf_employee_pct: number;
  epf_employer_pct: number;
  etf_employer_pct: number;
}

export interface PayrollEmployee {
  pay_type: 'monthly' | 'daily' | 'hourly';
  base_salary: number;
  fixed_allowance: number;
  epf_enabled: boolean;
}

/** What the employee did in the period, gathered from attendance, roster and leave. */
export interface PeriodActivity {
  days_worked: number;
  /** Rostered days with no attendance and no leave. */
  absent_days: number;
  unpaid_leave_days: number;
  paid_leave_days: number;
  worked_minutes: number;
  overtime_minutes: number;
  late_minutes: number;
  /** Fraction of the month employed (joined or left mid-month), 0-1. */
  employed_fraction: number;
}

/** Amounts the owner sets on a draft payslip. */
export interface PayslipInputs {
  bonus: number;
  other_earnings: number;
  other_deductions: number;
  advance_deduction: number;
  asset_deduction: number;
}

export interface PayslipFigures {
  rate: number;
  days_worked: number;
  absent_days: number;
  nopay_days: number;
  paid_leave_days: number;
  hours_worked: number;
  overtime_hours: number;
  late_minutes: number;
  base_pay: number;
  nopay_deduction: number;
  overtime_pay: number;
  allowances: number;
  bonus: number;
  other_earnings: number;
  gross: number;
  epf_employee: number;
  late_deduction: number;
  advance_deduction: number;
  asset_deduction: number;
  other_deductions: number;
  total_deductions: number;
  net_pay: number;
  epf_employer: number;
  etf_employer: number;
}

/** Hourly rate behind overtime and late deductions. */
export function hourlyRate(emp: PayrollEmployee, rules: PayrollRules): number {
  const hours = rules.work_hours_per_day > 0 ? rules.work_hours_per_day : 8;
  if (emp.pay_type === 'hourly') return emp.base_salary;
  if (emp.pay_type === 'daily') return emp.base_salary / hours;
  return emp.base_salary / (Math.max(1, rules.nopay_divisor) * hours);
}

/**
 * One payslip.
 *  - Monthly: salary (pro-rated for a mid-month join or leave) minus no-pay days at salary ÷ divisor.
 *    No-pay days are unpaid leave plus, when the setting is on, absent rostered days.
 *  - Daily: rate × days worked, plus paid leave days.  Hourly: rate × hours worked (overtime paid separately).
 *  - EPF is worked out on basic pay after no-pay; allowances, overtime and bonuses are not EPF-liable.
 *  - Net pay never goes below zero: deductions are capped at gross pay.
 */
export function computePayslip(emp: PayrollEmployee, act: PeriodActivity, rules: PayrollRules, inputs: PayslipInputs): PayslipFigures {
  const hr = hourlyRate(emp, rules);
  const overtimeHours = round2(act.overtime_minutes / 60);
  const hoursWorked = round2(act.worked_minutes / 60);
  const nopayDays = round2(act.unpaid_leave_days + (rules.deduct_absent ? act.absent_days : 0));

  let base = 0;
  let nopay = 0;
  if (emp.pay_type === 'monthly') {
    base = round2(emp.base_salary * Math.min(1, Math.max(0, act.employed_fraction)));
    nopay = round2(Math.min(base, (emp.base_salary / Math.max(1, rules.nopay_divisor)) * nopayDays));
  } else if (emp.pay_type === 'daily') {
    base = round2(emp.base_salary * (act.days_worked + act.paid_leave_days));
  } else {
    // Overtime hours are paid at the overtime rate, so they come out of the regular hours
    base = round2(emp.base_salary * Math.max(0, hoursWorked - overtimeHours));
  }

  const overtimePay = round2(hr * rules.overtime_multiplier * overtimeHours);
  const allowances = round2(emp.fixed_allowance * (emp.pay_type === 'monthly' ? Math.min(1, Math.max(0, act.employed_fraction)) : 1));
  const bonus = round2(Math.max(0, inputs.bonus));
  const otherEarnings = round2(Math.max(0, inputs.other_earnings));
  const gross = round2(base - nopay + overtimePay + allowances + bonus + otherEarnings);

  const epfBase = Math.max(0, base - nopay);
  const epfEmployee = emp.epf_enabled ? round2(epfBase * rules.epf_employee_pct / 100) : 0;
  const epfEmployer = emp.epf_enabled ? round2(epfBase * rules.epf_employer_pct / 100) : 0;
  const etfEmployer = emp.epf_enabled ? round2(epfBase * rules.etf_employer_pct / 100) : 0;
  const lateDeduction = rules.deduct_late ? round2((hr / 60) * act.late_minutes) : 0;

  // Deductions in priority order, each capped by what is left of gross pay
  let left = gross;
  const take = (v: number) => { const x = round2(Math.min(Math.max(0, v), Math.max(0, left))); left = round2(left - x); return x; };
  const epfTaken = take(epfEmployee);
  const lateTaken = take(lateDeduction);
  const assetTaken = take(inputs.asset_deduction);
  const advanceTaken = take(inputs.advance_deduction);
  const otherTaken = take(inputs.other_deductions);
  const totalDeductions = round2(epfTaken + lateTaken + assetTaken + advanceTaken + otherTaken);

  return {
    rate: emp.base_salary,
    days_worked: round2(act.days_worked),
    absent_days: round2(act.absent_days),
    nopay_days: nopayDays,
    paid_leave_days: round2(act.paid_leave_days),
    hours_worked: hoursWorked,
    overtime_hours: overtimeHours,
    late_minutes: act.late_minutes,
    base_pay: base,
    nopay_deduction: nopay,
    overtime_pay: overtimePay,
    allowances,
    bonus,
    other_earnings: otherEarnings,
    gross,
    epf_employee: epfTaken,
    late_deduction: lateTaken,
    advance_deduction: advanceTaken,
    asset_deduction: assetTaken,
    other_deductions: otherTaken,
    total_deductions: totalDeductions,
    net_pay: round2(gross - totalDeductions),
    epf_employer: epfEmployer,
    etf_employer: etfEmployer,
  };
}

/** Share of a month an employee was on the books, from join and leave dates. */
export function employedFraction(period: string, joinDate: string | null, leaveDate: string | null): number {
  const { from, to, days } = periodRange(period);
  const start = joinDate && joinDate > from ? joinDate : from;
  const end = leaveDate && leaveDate < to ? leaveDate : to;
  if (end < start) return 0;
  return dateRange(start, end).length / days;
}
