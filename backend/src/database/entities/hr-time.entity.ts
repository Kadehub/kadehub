import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { num } from './hr-core.entity';

@Entity('hr_shift_template')
export class HrShiftTemplate {
  @PrimaryGeneratedColumn() id: number;
  @Column() tenant_id: number;
  /** Null = available in every branch. */
  @Column({ type: 'int', nullable: true }) branch_id: number | null;
  @Column() name: string;
  /** "HH:MM", Colombo time. An end before the start means the shift ends the next day. */
  @Column() start_time: string;
  @Column() end_time: string;
  @Column({ default: 0 }) break_minutes: number;
  @Column({ default: '#7c3aed' }) color: string;
  @CreateDateColumn() created_at: Date;
}

/** One shift for one employee on one day (at most one per employee per day). */
@Entity('hr_roster_entry')
export class HrRosterEntry {
  @PrimaryGeneratedColumn() id: number;
  @Column() tenant_id: number;
  @Column() branch_id: number;
  @Column() employee_id: number;
  @Column({ type: 'date' }) work_date: string;
  @Column() start_time: string;
  @Column() end_time: string;
  @Column({ default: 0 }) break_minutes: number;
  @Column({ type: 'int', nullable: true }) shift_template_id: number | null;
  @Column({ default: '' }) note: string;
  @CreateDateColumn() created_at: Date;
}

/** pending_colleague → pending_manager → approved; rejected / cancelled end it at any step. */
export const HR_SWAP_STATUSES = ['pending_colleague', 'pending_manager', 'approved', 'rejected', 'cancelled'] as const;

@Entity('hr_shift_swap')
export class HrShiftSwap {
  @PrimaryGeneratedColumn() id: number;
  @Column() tenant_id: number;
  @Column() entry_id: number;
  @Column() requester_id: number;
  @Column() target_id: number;
  /** Null: the requester gives the shift away. Set: the two trade shifts. */
  @Column({ type: 'int', nullable: true }) target_entry_id: number | null;
  @Column({ default: 'pending_colleague' }) status: string;
  @Column({ default: '' }) reason: string;
  @Column({ type: 'int', nullable: true }) decided_by: number | null;
  @Column({ type: 'timestamp', nullable: true }) decided_at: Date | null;
  @CreateDateColumn() created_at: Date;
}

@Entity('hr_attendance')
export class HrAttendance {
  @PrimaryGeneratedColumn() id: number;
  @Column() tenant_id: number;
  @Column() employee_id: number;
  @Column({ type: 'int', nullable: true }) branch_id: number | null;
  @Column({ type: 'date' }) work_date: string;
  @Column({ type: 'timestamp' }) clock_in: Date;
  @Column({ type: 'timestamp', nullable: true }) clock_out: Date | null;
  @Column({ type: 'varchar', nullable: true }) photo_in_url: string | null;
  @Column({ type: 'varchar', nullable: true }) photo_out_url: string | null;
  /** kiosk | manual */
  @Column({ default: 'kiosk' }) source: string;
  @Column({ default: 0 }) scheduled_minutes: number;
  @Column({ default: 0 }) worked_minutes: number;
  @Column({ default: 0 }) late_minutes: number;
  @Column({ default: 0 }) early_leave_minutes: number;
  @Column({ default: 0 }) overtime_minutes: number;
  @Column({ default: '' }) note: string;
  @Column({ type: 'int', nullable: true }) edited_by: number | null;
  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;
}

@Entity('hr_leave_type')
export class HrLeaveType {
  @PrimaryGeneratedColumn() id: number;
  @Column() tenant_id: number;
  @Column() name: string;
  @Column('decimal', { precision: 8, scale: 2, default: 0, transformer: num }) days_per_year: number;
  @Column({ default: true }) paid: boolean;
  @Column({ default: '#16a34a' }) color: string;
  @Column({ default: true }) is_active: boolean;
  @CreateDateColumn() created_at: Date;
}

export const HR_LEAVE_STATUSES = ['pending', 'approved', 'rejected', 'cancelled'] as const;

@Entity('hr_leave_request')
export class HrLeaveRequest {
  @PrimaryGeneratedColumn() id: number;
  @Column() tenant_id: number;
  @Column() employee_id: number;
  @Column() leave_type_id: number;
  @Column({ type: 'date' }) start_date: string;
  @Column({ type: 'date' }) end_date: string;
  @Column({ default: false }) half_day: boolean;
  /** Working days taken, worked out when the request is saved. */
  @Column('decimal', { precision: 8, scale: 2, default: 0, transformer: num }) days: number;
  @Column({ default: '' }) reason: string;
  @Column({ default: 'pending' }) status: string;
  @Column({ type: 'int', nullable: true }) decided_by: number | null;
  @Column({ type: 'timestamp', nullable: true }) decided_at: Date | null;
  @Column({ default: '' }) decision_note: string;
  @CreateDateColumn() created_at: Date;
}

@Entity('hr_holiday')
export class HrHoliday {
  @PrimaryGeneratedColumn() id: number;
  @Column() tenant_id: number;
  @Column({ type: 'date' }) holiday_date: string;
  @Column() name: string;
  @CreateDateColumn() created_at: Date;
}
