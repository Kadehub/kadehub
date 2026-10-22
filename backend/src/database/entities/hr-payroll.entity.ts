import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { num } from './hr-core.entity';

const money = { precision: 14, scale: 2, default: 0, transformer: num } as const;
const qty = { precision: 8, scale: 2, default: 0, transformer: num } as const;

/** A salary advance, repaid from later payslips. */
@Entity('hr_advance')
export class HrAdvance {
  @PrimaryGeneratedColumn() id: number;
  @Column() tenant_id: number;
  @Column() employee_id: number;
  @Column('decimal', money) amount: number;
  @Column({ type: 'date' }) given_date: string;
  @Column('decimal', money) monthly_deduction: number;
  @Column({ default: '' }) note: string;
  /** open | closed */
  @Column({ default: 'open' }) status: string;
  @CreateDateColumn() created_at: Date;
}

@Entity('hr_advance_repayment')
export class HrAdvanceRepayment {
  @PrimaryGeneratedColumn() id: number;
  @Column() tenant_id: number;
  @Column() advance_id: number;
  /** Null for a repayment made outside payroll (cash back). */
  @Column({ type: 'int', nullable: true }) payslip_id: number | null;
  @Column('decimal', money) amount: number;
  @Column({ type: 'date' }) paid_date: string;
  @CreateDateColumn() created_at: Date;
}

/** draft → finalized → paid. Drafts can be regenerated and edited; finalizing books advance repayments. */
export const HR_RUN_STATUSES = ['draft', 'finalized', 'paid'] as const;

@Entity('hr_payroll_run')
export class HrPayrollRun {
  @PrimaryGeneratedColumn() id: number;
  @Column() tenant_id: number;
  /** Null = every branch. */
  @Column({ type: 'int', nullable: true }) branch_id: number | null;
  /** "YYYY-MM" */
  @Column() period: string;
  @Column({ default: 'draft' }) status: string;
  @Column('decimal', money) total_gross: number;
  @Column('decimal', money) total_deductions: number;
  @Column('decimal', money) total_net: number;
  @Column('decimal', money) total_employer: number;
  @Column({ type: 'int', nullable: true }) created_by: number | null;
  @Column({ type: 'timestamp', nullable: true }) finalized_at: Date | null;
  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;
}

@Entity('hr_payslip')
export class HrPayslip {
  @PrimaryGeneratedColumn() id: number;
  @Column() tenant_id: number;
  @Column() run_id: number;
  @Column() employee_id: number;
  @Column({ default: 'monthly' }) pay_type: string;
  /** Monthly salary, daily rate or hourly rate, depending on pay_type. */
  @Column('decimal', money) rate: number;
  @Column('decimal', qty) days_worked: number;
  @Column('decimal', qty) absent_days: number;
  @Column('decimal', qty) nopay_days: number;
  @Column('decimal', qty) paid_leave_days: number;
  @Column('decimal', qty) hours_worked: number;
  @Column('decimal', qty) overtime_hours: number;
  @Column({ default: 0 }) late_minutes: number;
  @Column('decimal', money) base_pay: number;
  @Column('decimal', money) nopay_deduction: number;
  @Column('decimal', money) overtime_pay: number;
  @Column('decimal', money) allowances: number;
  @Column('decimal', money) bonus: number;
  @Column('decimal', money) other_earnings: number;
  @Column('decimal', money) gross: number;
  @Column('decimal', money) epf_employee: number;
  @Column('decimal', money) late_deduction: number;
  @Column('decimal', money) advance_deduction: number;
  @Column('decimal', money) asset_deduction: number;
  @Column('decimal', money) other_deductions: number;
  @Column('decimal', money) total_deductions: number;
  @Column('decimal', money) net_pay: number;
  @Column('decimal', money) epf_employer: number;
  @Column('decimal', money) etf_employer: number;
  @Column({ default: '' }) note: string;
  @Column({ type: 'timestamp', nullable: true }) paid_at: Date | null;
  @Column({ default: '' }) payment_method: string;
  @CreateDateColumn() created_at: Date;
}
