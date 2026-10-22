import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/** DECIMAL columns come back as strings from both drivers. */
export const num = { to: (v: unknown) => v, from: (v: unknown) => (v === null || v === undefined ? v : Number(v)) };

/** KadeHub Staff settings, one row per tenant: business details, working rules and payroll rates. */
@Entity('hr_settings')
export class HrSettings {
  @PrimaryGeneratedColumn() id: number;
  @Column() tenant_id: number;
  @Column({ default: '' }) business_name: string;
  @Column({ default: '' }) phone: string;
  @Column({ default: '' }) address: string;
  @Column({ type: 'varchar', nullable: true }) logo_url: string | null;
  @Column({ default: '#7c3aed' }) brand_color: string;
  @Column('decimal', { precision: 8, scale: 2, default: 8, transformer: num }) work_hours_per_day: number;
  @Column({ default: 10 }) late_grace_minutes: number;
  @Column({ default: 30 }) overtime_min_minutes: number;
  @Column('decimal', { precision: 8, scale: 2, default: 1.5, transformer: num }) overtime_multiplier: number;
  /** Days a monthly salary is divided by for no-pay and overtime rates. */
  @Column({ default: 30 }) nopay_divisor: number;
  @Column({ default: 60 }) max_weekly_hours: number;
  /** Comma-separated weekdays off, 0 = Sunday. */
  @Column({ default: '0' }) weekly_off_days: string;
  @Column({ default: true }) deduct_absent: boolean;
  @Column({ default: false }) deduct_late: boolean;
  @Column({ default: false }) require_photo: boolean;
  @Column('decimal', { precision: 8, scale: 2, default: 8, transformer: num }) epf_employee_pct: number;
  @Column('decimal', { precision: 8, scale: 2, default: 12, transformer: num }) epf_employer_pct: number;
  @Column('decimal', { precision: 8, scale: 2, default: 3, transformer: num }) etf_employer_pct: number;
  @Column({ default: '' }) payslip_footer: string;
  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;
}

@Entity('hr_branch')
export class HrBranch {
  @PrimaryGeneratedColumn() id: number;
  @Column() tenant_id: number;
  @Column() name: string;
  @Column({ default: '' }) address: string;
  @Column({ default: '' }) phone: string;
  @Column({ default: true }) is_active: boolean;
  @CreateDateColumn() created_at: Date;
}

/** A tenant user (usually a POS cashier login) who manages a branch. */
@Entity('hr_branch_manager')
export class HrBranchManager {
  @PrimaryGeneratedColumn() id: number;
  @Column() tenant_id: number;
  @Column() user_id: number;
  @Column() branch_id: number;
  @CreateDateColumn() created_at: Date;
}

export const HR_EMPLOYMENT_TYPES = ['full_time', 'part_time', 'daily', 'contract'] as const;
export const HR_PAY_TYPES = ['monthly', 'daily', 'hourly'] as const;
export const HR_EMPLOYEE_STATUSES = ['active', 'resigned', 'terminated'] as const;
export type HrPayType = (typeof HR_PAY_TYPES)[number];

@Entity('hr_employee')
export class HrEmployee {
  @PrimaryGeneratedColumn() id: number;
  @Column() tenant_id: number;
  @Column({ type: 'int', nullable: true }) branch_id: number | null;
  @Column() emp_code: string;
  @Column() full_name: string;
  @Column({ default: '' }) phone: string;
  @Column({ default: '' }) email: string;
  @Column({ default: '' }) nic: string;
  @Column({ default: '' }) address: string;
  @Column({ type: 'date', nullable: true }) dob: string | null;
  @Column({ default: '' }) gender: string;
  @Column({ type: 'varchar', nullable: true }) photo_url: string | null;
  @Column({ default: '' }) emergency_name: string;
  @Column({ default: '' }) emergency_phone: string;
  @Column({ default: '' }) job_title: string;
  @Column({ default: '' }) department: string;
  @Column({ default: 'full_time' }) employment_type: string;
  @Column({ type: 'date', nullable: true }) join_date: string | null;
  @Column({ default: 'active' }) status: string;
  @Column({ type: 'date', nullable: true }) leave_date: string | null;
  @Column({ default: '' }) leave_reason: string;
  @Column({ type: 'varchar', default: 'monthly' }) pay_type: HrPayType;
  @Column('decimal', { precision: 14, scale: 2, default: 0, transformer: num }) base_salary: number;
  @Column('decimal', { precision: 14, scale: 2, default: 0, transformer: num }) fixed_allowance: number;
  @Column({ default: true }) epf_enabled: boolean;
  @Column({ default: '' }) epf_number: string;
  @Column({ default: '' }) bank_name: string;
  @Column({ default: '' }) bank_account: string;
  /** bcrypt hash of the 4-digit kiosk PIN. Never sent to the client. */
  @Column({ type: 'varchar', nullable: true, select: false }) pin_hash: string | null;
  @Column({ type: 'text', nullable: true }) notes: string | null;
  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;
}

@Entity('hr_employee_document')
export class HrEmployeeDocument {
  @PrimaryGeneratedColumn() id: number;
  @Column() tenant_id: number;
  @Column() employee_id: number;
  @Column() title: string;
  @Column() url: string;
  @CreateDateColumn() created_at: Date;
}
