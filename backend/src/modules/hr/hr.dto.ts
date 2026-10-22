import { Type } from 'class-transformer';
import {
  IsString, IsOptional, IsNumber, IsInt, Min, Max, MaxLength, MinLength, IsBoolean, IsIn, IsArray, ArrayMaxSize,
  Matches, IsNotEmpty, IsEmail, ValidateNested, ArrayMinSize,
} from 'class-validator';
import { HR_EMPLOYMENT_TYPES, HR_PAY_TYPES } from '../../database/entities/hr-core.entity';
import { HR_APPLICANT_STAGES, HR_ASSET_CATEGORIES, HR_ASSET_STATUSES, HR_WARNING_LEVELS } from '../../database/entities/hr-talent.entity';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const HEX = /^#[0-9a-fA-F]{6}$/;
const OFF_DAYS = /^([0-6](,[0-6])*)?$/;
const MAX_MONEY = 100_000_000;

const list = (v: readonly string[]) => v as unknown as string[];

// ───────── Account and settings ─────────

export class SetupHrDto {
  @IsString() @IsNotEmpty() @MaxLength(150) business_name: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsString() @MaxLength(300) address?: string;
  @IsOptional() @IsString() @MaxLength(120) branch_name?: string;
  @IsOptional() @Matches(OFF_DAYS) weekly_off_days?: string;
  @IsOptional() @Matches(HEX) brand_color?: string;
}

export class SaveSettingsDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(150) business_name?: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsString() @MaxLength(300) address?: string;
  @IsOptional() @Matches(HEX) brand_color?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) @Max(16) work_hours_per_day?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(120) late_grace_minutes?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(240) overtime_min_minutes?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) @Max(5) overtime_multiplier?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(20) @Max(31) nopay_divisor?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(10) @Max(100) max_weekly_hours?: number;
  @IsOptional() @Matches(OFF_DAYS) weekly_off_days?: string;
  @IsOptional() @IsBoolean() deduct_absent?: boolean;
  @IsOptional() @IsBoolean() deduct_late?: boolean;
  @IsOptional() @IsBoolean() require_photo?: boolean;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(50) epf_employee_pct?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(50) epf_employer_pct?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(50) etf_employer_pct?: number;
  @IsOptional() @IsString() @MaxLength(300) payslip_footer?: string;
}

export class NewManagerFields {
  @IsString() @MinLength(2) @MaxLength(100) name: string;
  @IsEmail() email: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsString() @MinLength(8) @MaxLength(100)
  @Matches(/^(?=.*[A-Z])(?=.*\d)/, { message: 'Password must contain at least one uppercase letter and one number' })
  password: string;
}

export class CreateManagerDto extends NewManagerFields {
  @IsArray() @ArrayMaxSize(100) @Type(() => Number) @IsInt({ each: true }) branch_ids: number[];
}

/** Hand every branch of one manager to someone else: an existing user (user_id) or a new login (new_manager). */
export class ReplaceManagerDto {
  @IsOptional() @Type(() => Number) @IsInt() user_id?: number;
  @IsOptional() @ValidateNested() @Type(() => NewManagerFields) new_manager?: NewManagerFields;
  /** Also stop the old manager signing in to KadeHub at all (POS and COD too). */
  @IsOptional() @IsBoolean() block_login?: boolean;
}

export class RemoveManagerDto {
  @IsOptional() @IsBoolean() block_login?: boolean;
}

export class UpdateManagerDto {
  @IsArray() @ArrayMaxSize(100) @Type(() => Number) @IsInt({ each: true }) branch_ids: number[];
}

export class SaveBranchDto {
  @IsString() @IsNotEmpty() @MaxLength(120) name: string;
  @IsOptional() @IsString() @MaxLength(300) address?: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsBoolean() is_active?: boolean;
}

// ───────── Employees ─────────

export class SaveEmployeeDto {
  @IsOptional() @Type(() => Number) @IsInt() branch_id?: number | null;
  @IsOptional() @IsString() @MaxLength(20) emp_code?: string;
  @IsString() @IsNotEmpty() @MaxLength(150) full_name: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsString() @MaxLength(150) email?: string;
  @IsOptional() @IsString() @MaxLength(20) nic?: string;
  @IsOptional() @IsString() @MaxLength(300) address?: string;
  @IsOptional() @Matches(DATE) dob?: string | null;
  @IsOptional() @IsIn(['', 'male', 'female', 'other']) gender?: string;
  @IsOptional() @IsString() @MaxLength(150) emergency_name?: string;
  @IsOptional() @IsString() @MaxLength(40) emergency_phone?: string;
  @IsOptional() @IsString() @MaxLength(100) job_title?: string;
  @IsOptional() @IsString() @MaxLength(100) department?: string;
  @IsOptional() @IsIn(list(HR_EMPLOYMENT_TYPES)) employment_type?: string;
  @IsOptional() @Matches(DATE) join_date?: string | null;
  // Pay — owner only; ignored when a branch manager saves
  @IsOptional() @IsIn(list(HR_PAY_TYPES)) pay_type?: 'monthly' | 'daily' | 'hourly';
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(MAX_MONEY) base_salary?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(MAX_MONEY) fixed_allowance?: number;
  @IsOptional() @IsBoolean() epf_enabled?: boolean;
  @IsOptional() @IsString() @MaxLength(40) epf_number?: string;
  @IsOptional() @IsString() @MaxLength(100) bank_name?: string;
  @IsOptional() @IsString() @MaxLength(60) bank_account?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  /** Set on create only; use POST /:id/pin to change it later. */
  @IsOptional() @Matches(/^\d{4}$/) pin?: string;
}

export class SetPinDto {
  @Matches(/^\d{4}$/) pin: string;
}

export class EndEmploymentDto {
  @IsIn(['resigned', 'terminated']) status: 'resigned' | 'terminated';
  @Matches(DATE) leave_date: string;
  @IsOptional() @IsString() @MaxLength(300) reason?: string;
}

export class AddDocumentDto {
  @IsString() @IsNotEmpty() @MaxLength(150) title: string;
}

// ───────── Shifts and roster ─────────

export class SaveShiftTemplateDto {
  @IsOptional() @Type(() => Number) @IsInt() branch_id?: number | null;
  @IsString() @IsNotEmpty() @MaxLength(60) name: string;
  @Matches(TIME) start_time: string;
  @Matches(TIME) end_time: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(480) break_minutes?: number;
  @IsOptional() @Matches(HEX) color?: string;
}

export class SaveRosterEntryDto {
  @Type(() => Number) @IsInt() branch_id: number;
  @Type(() => Number) @IsInt() employee_id: number;
  @Matches(DATE) work_date: string;
  @Matches(TIME) start_time: string;
  @Matches(TIME) end_time: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(480) break_minutes?: number;
  @IsOptional() @Type(() => Number) @IsInt() shift_template_id?: number | null;
  @IsOptional() @IsString() @MaxLength(200) note?: string;
}

export class BulkRosterDto {
  @Type(() => Number) @IsInt() branch_id: number;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(200) @Type(() => Number) @IsInt({ each: true }) employee_ids: number[];
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(31) @Matches(DATE, { each: true }) dates: string[];
  @Type(() => Number) @IsInt() shift_template_id: number;
  /** Replace shifts already on those days (otherwise they are kept). */
  @IsOptional() @IsBoolean() overwrite?: boolean;
}

export class CopyWeekDto {
  @Type(() => Number) @IsInt() branch_id: number;
  @Matches(DATE) from_week: string;
  @Matches(DATE) to_week: string;
  @IsOptional() @IsBoolean() overwrite?: boolean;
}

export class CreateSwapDto {
  @Type(() => Number) @IsInt() entry_id: number;
  @Type(() => Number) @IsInt() target_id: number;
  @IsOptional() @Type(() => Number) @IsInt() target_entry_id?: number | null;
  @IsOptional() @IsString() @MaxLength(300) reason?: string;
}

// ───────── Attendance and kiosk ─────────

export class ManualAttendanceDto {
  @Type(() => Number) @IsInt() employee_id: number;
  @Matches(DATE) work_date: string;
  @Matches(TIME) clock_in: string;
  @IsOptional() @Matches(TIME) clock_out?: string | null;
  @IsOptional() @IsString() @MaxLength(300) note?: string;
}

export class UpdateAttendanceDto {
  @IsOptional() @Matches(TIME) clock_in?: string;
  @IsOptional() @Matches(TIME) clock_out?: string | null;
  @IsOptional() @IsString() @MaxLength(300) note?: string;
}

export class KioskPinDto {
  @Type(() => Number) @IsInt() employee_id: number;
  @Matches(/^\d{4}$/) pin: string;
}

export class KioskClockDto extends KioskPinDto {
  @Type(() => Number) @IsInt() branch_id: number;
}

export class LeaveRequestFields {
  @Type(() => Number) @IsInt() leave_type_id: number;
  @Matches(DATE) start_date: string;
  @Matches(DATE) end_date: string;
  @IsOptional() @IsBoolean() half_day?: boolean;
  @IsOptional() @IsString() @MaxLength(300) reason?: string;
}

export class KioskLeaveDto extends LeaveRequestFields {
  @Type(() => Number) @IsInt() employee_id: number;
  @Matches(/^\d{4}$/) pin: string;
}

export class KioskSwapDto extends CreateSwapDto {
  @Type(() => Number) @IsInt() employee_id: number;
  @Matches(/^\d{4}$/) pin: string;
}

export class KioskRespondDto extends KioskPinDto {
  @IsBoolean() accept: boolean;
}

export class KioskAcknowledgeDto extends KioskPinDto {
  @IsIn(['review', 'warning']) kind: 'review' | 'warning';
  @Type(() => Number) @IsInt() id: number;
}

// ───────── Leave ─────────

export class SaveLeaveTypeDto {
  @IsString() @IsNotEmpty() @MaxLength(60) name: string;
  @Type(() => Number) @IsNumber() @Min(0) @Max(366) days_per_year: number;
  @IsOptional() @IsBoolean() paid?: boolean;
  @IsOptional() @Matches(HEX) color?: string;
  @IsOptional() @IsBoolean() is_active?: boolean;
}

export class CreateLeaveDto extends LeaveRequestFields {
  @Type(() => Number) @IsInt() employee_id: number;
  /** Managers may record leave that is already agreed. */
  @IsOptional() @IsBoolean() approve?: boolean;
}

export class DecideDto {
  @IsOptional() @IsString() @MaxLength(300) note?: string;
}

export class SaveHolidayDto {
  @Matches(DATE) holiday_date: string;
  @IsString() @IsNotEmpty() @MaxLength(100) name: string;
}

// ───────── Payroll ─────────

export class SaveAdvanceDto {
  @Type(() => Number) @IsInt() employee_id: number;
  @Type(() => Number) @IsNumber() @Min(1) @Max(MAX_MONEY) amount: number;
  @Matches(DATE) given_date: string;
  @Type(() => Number) @IsNumber() @Min(0) @Max(MAX_MONEY) monthly_deduction: number;
  @IsOptional() @IsString() @MaxLength(300) note?: string;
}

export class RepayAdvanceDto {
  @Type(() => Number) @IsNumber() @Min(1) @Max(MAX_MONEY) amount: number;
  @Matches(DATE) paid_date: string;
}

export class CreateRunDto {
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/) period: string;
  @IsOptional() @Type(() => Number) @IsInt() branch_id?: number | null;
}

export class UpdatePayslipDto {
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(MAX_MONEY) bonus?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(MAX_MONEY) other_earnings?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(MAX_MONEY) other_deductions?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(MAX_MONEY) advance_deduction?: number;
  @IsOptional() @IsString() @MaxLength(300) note?: string;
}

export class PayRunDto {
  @IsIn(['cash', 'bank', 'cheque', 'other']) payment_method: string;
  /** Only these payslips; all unpaid payslips when left out. */
  @IsOptional() @IsArray() @ArrayMaxSize(1000) @Type(() => Number) @IsInt({ each: true }) payslip_ids?: number[];
}

// ───────── Hiring ─────────

export class SaveJobDto {
  @IsOptional() @Type(() => Number) @IsInt() branch_id?: number | null;
  @IsString() @IsNotEmpty() @MaxLength(150) title: string;
  @IsOptional() @IsString() @MaxLength(5000) description?: string;
  @IsOptional() @IsIn(list(HR_EMPLOYMENT_TYPES)) employment_type?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(MAX_MONEY) salary_min?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(MAX_MONEY) salary_max?: number;
  @IsOptional() @IsIn(['open', 'closed']) status?: string;
  @IsOptional() @Matches(DATE) closes_at?: string | null;
}

export class SaveApplicantDto {
  @Type(() => Number) @IsInt() job_id: number;
  @IsString() @IsNotEmpty() @MaxLength(150) name: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsString() @MaxLength(150) email?: string;
  @IsOptional() @IsString() @MaxLength(3000) cover_note?: string;
}

export class PublicApplyDto {
  @IsString() @IsNotEmpty() @MaxLength(150) name: string;
  @IsString() @IsNotEmpty() @MaxLength(40) phone: string;
  @IsOptional() @IsString() @MaxLength(150) email?: string;
  @IsOptional() @IsString() @MaxLength(3000) cover_note?: string;
  /** Honeypot: real people never fill this hidden field. */
  @IsOptional() @IsString() @MaxLength(200) website?: string;
}

export class UpdateApplicantDto {
  @IsOptional() @IsIn(list(HR_APPLICANT_STAGES)) stage?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(5) rating?: number;
  @IsOptional() @IsString() interview_at?: string | null;
  @IsOptional() @IsString() @MaxLength(150) name?: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsString() @MaxLength(150) email?: string;
}

export class InterviewNoteDto {
  @IsString() @IsNotEmpty() @MaxLength(3000) note: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(5) rating?: number;
}

export class HireApplicantDto {
  @IsOptional() @Type(() => Number) @IsInt() branch_id?: number | null;
  @IsOptional() @Matches(DATE) join_date?: string;
  @IsOptional() @IsString() @MaxLength(100) job_title?: string;
  @IsOptional() @IsIn(list(HR_PAY_TYPES)) pay_type?: 'monthly' | 'daily' | 'hourly';
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(MAX_MONEY) base_salary?: number;
}

// ───────── Performance and discipline ─────────

class RatingsDto {
  @Type(() => Number) @IsInt() @Min(1) @Max(5) punctuality: number;
  @Type(() => Number) @IsInt() @Min(1) @Max(5) quality: number;
  @Type(() => Number) @IsInt() @Min(1) @Max(5) teamwork: number;
  @Type(() => Number) @IsInt() @Min(1) @Max(5) customer_service: number;
  @Type(() => Number) @IsInt() @Min(1) @Max(5) initiative: number;
}

export class SaveReviewDto {
  @Type(() => Number) @IsInt() employee_id: number;
  @IsOptional() @IsString() @MaxLength(60) period?: string;
  @Matches(DATE) review_date: string;
  @ValidateNested() @Type(() => RatingsDto) ratings: RatingsDto;
  @IsOptional() @IsString() @MaxLength(3000) strengths?: string;
  @IsOptional() @IsString() @MaxLength(3000) improvements?: string;
  @IsOptional() @IsString() @MaxLength(3000) goals?: string;
}

export class SaveWarningDto {
  @Type(() => Number) @IsInt() employee_id: number;
  @IsIn(list(HR_WARNING_LEVELS)) level: string;
  @Matches(DATE) warning_date: string;
  @IsString() @IsNotEmpty() @MaxLength(200) reason: string;
  @IsOptional() @IsString() @MaxLength(5000) details?: string;
}

// ───────── Assets ─────────

export class SaveAssetDto {
  @IsOptional() @Type(() => Number) @IsInt() branch_id?: number | null;
  @IsOptional() @IsString() @MaxLength(40) code?: string;
  @IsString() @IsNotEmpty() @MaxLength(150) name: string;
  @IsOptional() @IsIn(list(HR_ASSET_CATEGORIES)) category?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(MAX_MONEY) value?: number;
  @IsOptional() @IsIn(['available', 'lost', 'retired']) status?: (typeof HR_ASSET_STATUSES)[number];
  @IsOptional() @IsString() @MaxLength(300) notes?: string;
}

export class IssueAssetDto {
  @Type(() => Number) @IsInt() employee_id: number;
  @Matches(DATE) issued_date: string;
  @IsOptional() @IsString() @MaxLength(100) condition_out?: string;
  @IsOptional() @IsString() @MaxLength(300) notes?: string;
}

export class ReturnAssetDto {
  @Matches(DATE) returned_date: string;
  @IsOptional() @IsString() @MaxLength(100) condition_in?: string;
  /** Not coming back: the asset is marked lost. */
  @IsOptional() @IsBoolean() lost?: boolean;
  /** Charged on the employee's next payslip. */
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(MAX_MONEY) deduction_amount?: number;
  @IsOptional() @IsString() @MaxLength(300) notes?: string;
}
