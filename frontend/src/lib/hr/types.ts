/** Shapes returned by the KadeHub Staff API (backend/src/modules/hr). Dates are "YYYY-MM-DD", times "HH:MM" (Colombo). */

export type HrRole = 'owner' | 'manager' | 'none';
export type HrPlanKey = 'free' | 'starter' | 'business' | 'pro';
export type HrSubStatus = 'trialing' | 'active' | 'free';
export type PayType = 'monthly' | 'daily' | 'hourly';
export type EmploymentType = 'full_time' | 'part_time' | 'daily' | 'contract';
export type EmployeeStatus = 'active' | 'resigned' | 'terminated';

export interface HrSettings {
  id: number;
  business_name: string;
  phone: string;
  address: string;
  logo_url: string | null;
  brand_color: string;
  work_hours_per_day: number;
  late_grace_minutes: number;
  overtime_min_minutes: number;
  overtime_multiplier: number;
  nopay_divisor: number;
  max_weekly_hours: number;
  /** Comma-separated weekdays off, 0 = Sunday. */
  weekly_off_days: string;
  deduct_absent: boolean;
  deduct_late: boolean;
  require_photo: boolean;
  epf_employee_pct: number;
  epf_employer_pct: number;
  etf_employer_pct: number;
  payslip_footer: string;
}

export interface Branch {
  id: number;
  name: string;
  address: string;
  phone: string;
  is_active: boolean;
  employee_count?: number;
  manager_ids?: number[];
}

export interface HrPlan {
  slug: string;
  key: HrPlanKey;
  name: string;
  monthly_price_lkr: number;
  max_employees: number | null;
  max_branches: number | null;
  features: string[];
  sort_order: number;
}

export interface HrPlanOffer extends HrPlan {
  package_id: number | null;
  yearly_price_lkr: number;
}

export interface HrMe {
  enabled: boolean;
  email: string | null;
  name: string | null;
  setup_done?: boolean;
  role?: HrRole;
  settings?: HrSettings | null;
  branches?: Branch[];
  plan?: HrPlan;
  subscription?: { status: HrSubStatus; trial_ends_at: string | null; current_period_end: string | null };
  usage?: { employees: number; branches: number };
}

export interface Employee {
  id: number;
  branch_id: number | null;
  emp_code: string;
  full_name: string;
  phone: string;
  email: string;
  nic: string;
  address: string;
  dob: string | null;
  gender: string;
  photo_url: string | null;
  emergency_name: string;
  emergency_phone: string;
  job_title: string;
  department: string;
  employment_type: EmploymentType;
  join_date: string | null;
  status: EmployeeStatus;
  leave_date: string | null;
  leave_reason: string;
  notes: string | null;
  has_pin?: boolean;
  created_at: string;
  // Owner only — absent for branch managers
  pay_type?: PayType;
  base_salary?: number;
  fixed_allowance?: number;
  epf_enabled?: boolean;
  epf_number?: string;
  bank_name?: string;
  bank_account?: string;
}

export interface EmployeeDocument { id: number; employee_id: number; title: string; url: string; created_at: string }

export interface LeaveBalance {
  leave_type_id: number;
  name: string;
  paid: boolean;
  color: string;
  /** null = no yearly limit. */
  entitled: number | null;
  used: number;
  pending: number;
  remaining: number | null;
}

export interface ShiftTemplate {
  id: number;
  branch_id: number | null;
  name: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  color: string;
}

export interface RosterEntry {
  id: number;
  branch_id: number;
  employee_id: number;
  work_date: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  shift_template_id: number | null;
  note: string;
}

export type SwapStatus = 'pending_colleague' | 'pending_manager' | 'approved' | 'rejected' | 'cancelled';

export interface ShiftSwap {
  id: number;
  entry_id: number;
  requester_id: number;
  target_id: number;
  target_entry_id: number | null;
  status: SwapStatus;
  reason: string;
  created_at: string;
  decided_at: string | null;
  entry: RosterEntry | null;
  target_entry: RosterEntry | null;
  requester_name: string;
  target_name: string;
}

export interface Holiday { id: number; holiday_date: string; name: string }

export interface LeaveType { id: number; name: string; days_per_year: number; paid: boolean; color: string; is_active: boolean }

export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface LeaveRequest {
  id: number;
  employee_id: number;
  leave_type_id: number;
  start_date: string;
  end_date: string;
  half_day: boolean;
  days: number;
  reason: string;
  status: LeaveStatus;
  decided_at: string | null;
  decision_note: string;
  created_at: string;
  type_name: string;
  type_color: string;
  paid: boolean;
  employee_name: string;
  emp_code: string;
  branch_id: number | null;
  photo_url: string | null;
}

export interface RosterWeek {
  branch_id: number;
  from: string;
  to: string;
  days: string[];
  employees: Array<{ id: number; full_name: string; emp_code: string; job_title: string; phone: string; photo_url: string | null; lent: boolean }>;
  entries: RosterEntry[];
  /** The same people's shifts in other branches that week. */
  elsewhere: Array<{ id: number; employee_id: number; work_date: string; branch_id: number; start_time: string; end_time: string }>;
  leave: Array<LeaveRequest & { type_name: string; color: string }>;
  holidays: Holiday[];
  templates: ShiftTemplate[];
  warnings: Array<{ employee_id: number; date?: string; code: 'TOO_MANY_HOURS' | 'ON_LEAVE'; value?: number }>;
}

export interface Attendance {
  id: number;
  employee_id: number;
  branch_id: number | null;
  work_date: string;
  clock_in: string;
  clock_out: string | null;
  in_time: string;
  out_time: string | null;
  photo_in_url: string | null;
  photo_out_url: string | null;
  source: 'kiosk' | 'manual';
  scheduled_minutes: number;
  worked_minutes: number;
  late_minutes: number;
  early_leave_minutes: number;
  overtime_minutes: number;
  note: string;
}

export type DayStatus = 'present' | 'late' | 'absent' | 'not_in' | 'leave' | 'holiday' | 'off' | 'upcoming';

export interface ShiftPlan { work_date: string; start_time: string; end_time: string; break_minutes: number }

export interface DaySheet {
  date: string;
  rows: Array<{
    employee: { id: number; full_name: string; emp_code: string; photo_url: string | null; branch_id: number | null; job_title: string };
    status: DayStatus;
    shift: ShiftPlan | null;
    leave: { type: string; paid: boolean; half: boolean; color: string } | null;
    holiday: string | null;
    clocked_in: boolean;
    attendance: Attendance[];
  }>;
  summary: { present: number; late: number; absent: number; leave: number; off: number; upcoming: number };
}

/** P present, L late, A absent, V leave, H holiday, O off, - expected (today or later). */
export type MonthCode = 'P' | 'L' | 'A' | 'V' | 'H' | 'O' | '-';

export interface MonthSheet {
  from: string;
  to: string;
  days: string[];
  rows: Array<{
    employee: { id: number; full_name: string; emp_code: string; branch_id: number | null };
    days: Array<{ date: string; code: MonthCode; worked: number }>;
    totals: { present: number; late: number; absent: number; leave: number; worked_hours: number; overtime_hours: number; late_minutes: number };
  }>;
}

export interface Advance {
  id: number;
  employee_id: number;
  amount: number;
  given_date: string;
  monthly_deduction: number;
  note: string;
  status: 'open' | 'closed';
  repaid: number;
  balance: number;
  employee_name: string;
  emp_code: string;
}

export type RunStatus = 'draft' | 'finalized' | 'paid';

export interface PayrollRun {
  id: number;
  branch_id: number | null;
  period: string;
  status: RunStatus;
  total_gross: number;
  total_deductions: number;
  total_net: number;
  total_employer: number;
  finalized_at: string | null;
  created_at: string;
  payslip_count?: number;
  paid_count?: number;
}

export interface Payslip {
  id: number;
  run_id: number;
  employee_id: number;
  pay_type: PayType;
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
  note: string;
  paid_at: string | null;
  payment_method: string;
}

export interface RunPayslip extends Payslip {
  employee_name: string;
  emp_code: string;
  job_title: string;
  phone: string;
  branch_id: number | null;
  bank_name: string;
  bank_account: string;
}

export interface PayrollRunDetail extends PayrollRun {
  payslips: RunPayslip[];
  /** People left out because another run already pays them this month. */
  skipped?: Array<{ employee_id: number; full_name: string }>;
}

export interface PayslipDetail {
  payslip: Payslip;
  period: string;
  run_status: RunStatus;
  employee: {
    id: number; full_name: string; emp_code: string; job_title: string; department: string; phone: string; nic: string;
    epf_number: string; bank_name: string; bank_account: string; branch_name: string;
  };
  business: {
    name: string; phone: string; address: string; logo_url: string | null; brand_color: string; footer: string;
    epf_employee_pct: number; epf_employer_pct: number; etf_employer_pct: number;
  };
}

export type ApplicantStage = 'new' | 'shortlisted' | 'interview' | 'offered' | 'hired' | 'rejected';

export interface JobPost {
  id: number;
  branch_id: number | null;
  title: string;
  description: string | null;
  employment_type: EmploymentType;
  salary_min: number;
  salary_max: number;
  status: 'open' | 'closed';
  token: string;
  closes_at: string | null;
  created_at: string;
  applicant_count?: number;
  by_stage?: Partial<Record<ApplicantStage, number>>;
}

export interface Applicant {
  id: number;
  job_id: number;
  name: string;
  phone: string;
  email: string;
  cv_url: string | null;
  cover_note: string | null;
  stage: ApplicantStage;
  rating: number;
  source: 'manual' | 'public';
  interview_at: string | null;
  employee_id: number | null;
  created_at: string;
  job_title: string;
}

export interface InterviewNote { id: number; applicant_id: number; author_name: string; note: string | null; rating: number; created_at: string }

export interface PublicJob {
  title: string;
  description: string | null;
  employment_type: EmploymentType;
  salary_min: number;
  salary_max: number;
  closes_at: string | null;
  posted_at: string;
  business: { name: string; logo_url: string | null; brand_color: string; address: string };
}

export const REVIEW_AREAS = ['punctuality', 'quality', 'teamwork', 'customer_service', 'initiative'] as const;
export type ReviewArea = (typeof REVIEW_AREAS)[number];

export interface Review {
  id: number;
  employee_id: number;
  period: string;
  review_date: string;
  reviewer_name: string;
  ratings: Record<ReviewArea, number>;
  overall: number;
  strengths: string | null;
  improvements: string | null;
  goals: string | null;
  acknowledged_at: string | null;
  created_at: string;
  employee_name?: string;
}

export type WarningLevel = 'verbal' | 'written' | 'final';

export interface Warning {
  id: number;
  employee_id: number;
  level: WarningLevel;
  warning_date: string;
  reason: string;
  details: string | null;
  issued_by_name: string;
  acknowledged_at: string | null;
  created_at: string;
  employee_name?: string;
}

export const ASSET_CATEGORIES = ['uniform', 'key', 'phone', 'tool', 'laptop', 'vehicle', 'other'] as const;
export type AssetCategory = (typeof ASSET_CATEGORIES)[number];
export type AssetStatus = 'available' | 'issued' | 'lost' | 'retired';

export interface Asset {
  id: number;
  branch_id: number | null;
  code: string;
  name: string;
  category: AssetCategory;
  value: number;
  status: AssetStatus;
  notes: string;
  holder: { assignment_id: number; employee_id: number; name: string; issued_date: string } | null;
}

export interface AssetAssignment {
  id: number;
  asset_id: number;
  employee_id: number;
  issued_date: string;
  returned_date: string | null;
  condition_out: string;
  condition_in: string;
  deduction_amount: number;
  deducted_payslip_id: number | null;
  notes: string;
  employee_name?: string;
  // On an employee's list
  asset_name?: string;
  asset_code?: string;
  category?: AssetCategory;
  value?: number;
  outstanding?: boolean;
}

export interface EmployeeProfile {
  employee: Employee;
  documents: EmployeeDocument[];
  balances: LeaveBalance[];
  assets: AssetAssignment[];
  reviews: Review[];
  warnings: Warning[];
  /** Owner only. */
  advances: Advance[] | null;
  payslips: Array<Payslip & { period: string; run_status: RunStatus }> | null;
  attendance: Attendance[];
}

export interface Manager { id: number; name: string; email: string; phone: string; disabled: boolean; branch_ids: number[] }

export interface ActivityItem {
  id: number;
  action: string;
  entity: string;
  entity_id: number | null;
  details: Record<string, unknown> | null;
  user_name: string;
  created_at: string;
}

export interface Dashboard {
  date: string;
  employees: number;
  today: DaySheet['summary'];
  not_in: Array<{ id: number; full_name: string; photo_url: string | null; shift: ShiftPlan | null }>;
  on_leave: Array<{ id: number; full_name: string; photo_url: string | null; leave: DaySheet['rows'][number]['leave'] }>;
  late: Array<{ id: number; full_name: string; photo_url: string | null; late_minutes: number }>;
  pending: { leave: number; swaps: number; new_applicants: number };
  open_jobs: number;
  assets_out: number;
  birthdays: Array<{ id: number; full_name: string; photo_url: string | null; date: string; in_days: number }>;
  anniversaries: Array<{ id: number; full_name: string; years: number; in_days: number }>;
  last_run: { id: number; period: string; status: RunStatus; total_net: number } | null;
}

export type ReportKey = 'payroll' | 'attendance' | 'leave' | 'roster' | 'hiring' | 'assets';

export interface ReportData {
  columns: string[];
  /** Column keys holding money (formatted as LKR, summed in exports). */
  money: string[];
  /** Display names for generated columns (leave types). */
  labels?: Record<string, string>;
  rows: Array<Record<string, string | number>>;
  totals: Record<string, number>;
}

export interface KioskStaff {
  id: number;
  full_name: string;
  photo_url: string | null;
  job_title: string;
  clocked_in: boolean;
  status: DayStatus;
  shift: ShiftPlan | null;
  has_pin: boolean;
}

export interface KioskSession {
  employee: { id: number; full_name: string; emp_code: string; photo_url: string | null; job_title: string; branch_id: number | null };
  clocked_in: boolean;
  open_since: string | null;
  shifts: RosterEntry[];
  balances: LeaveBalance[];
  leave_types: LeaveType[];
  colleagues: Array<{ id: number; full_name: string }>;
  colleague_shifts: RosterEntry[];
  swaps: ShiftSwap[];
  acknowledgements: { reviews: Review[]; warnings: Warning[] };
}
