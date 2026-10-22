import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { num } from './hr-core.entity';

/** Hiring, performance reviews, warnings and company assets for KadeHub Staff. */

@Entity('hr_job_post')
export class HrJobPost {
  @PrimaryGeneratedColumn() id: number;
  @Column() tenant_id: number;
  @Column({ type: 'int', nullable: true }) branch_id: number | null;
  @Column() title: string;
  @Column({ type: 'text', nullable: true }) description: string | null;
  @Column({ default: 'full_time' }) employment_type: string;
  @Column('decimal', { precision: 14, scale: 2, default: 0, transformer: num }) salary_min: number;
  @Column('decimal', { precision: 14, scale: 2, default: 0, transformer: num }) salary_max: number;
  /** open | closed */
  @Column({ default: 'open' }) status: string;
  /** Random id for the public job page (staff.kadehub.com/jobs/<token>). */
  @Column() token: string;
  @Column({ type: 'date', nullable: true }) closes_at: string | null;
  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;
}

export const HR_APPLICANT_STAGES = ['new', 'shortlisted', 'interview', 'offered', 'hired', 'rejected'] as const;

@Entity('hr_applicant')
export class HrApplicant {
  @PrimaryGeneratedColumn() id: number;
  @Column() tenant_id: number;
  @Column() job_id: number;
  @Column() name: string;
  @Column({ default: '' }) phone: string;
  @Column({ default: '' }) email: string;
  @Column({ type: 'varchar', nullable: true }) cv_url: string | null;
  @Column({ type: 'text', nullable: true }) cover_note: string | null;
  @Column({ default: 'new' }) stage: string;
  /** 0 = not rated, else 1-5. */
  @Column({ default: 0 }) rating: number;
  /** manual | public (applied through the job page) */
  @Column({ default: 'manual' }) source: string;
  @Column({ type: 'timestamp', nullable: true }) interview_at: Date | null;
  @Column({ type: 'int', nullable: true }) employee_id: number | null;
  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;
}

@Entity('hr_interview_note')
export class HrInterviewNote {
  @PrimaryGeneratedColumn() id: number;
  @Column() tenant_id: number;
  @Column() applicant_id: number;
  @Column() author_id: number;
  @Column({ default: '' }) author_name: string;
  @Column({ type: 'text', nullable: true }) note: string | null;
  @Column({ default: 0 }) rating: number;
  @CreateDateColumn() created_at: Date;
}

export const HR_REVIEW_AREAS = ['punctuality', 'quality', 'teamwork', 'customer_service', 'initiative'] as const;

@Entity('hr_review')
export class HrReview {
  @PrimaryGeneratedColumn() id: number;
  @Column() tenant_id: number;
  @Column() employee_id: number;
  /** Free text, e.g. "Q1 2026" or "Probation". */
  @Column({ default: '' }) period: string;
  @Column({ type: 'date' }) review_date: string;
  @Column() reviewer_id: number;
  @Column({ default: '' }) reviewer_name: string;
  /** JSON object: area → 1-5. */
  @Column({ type: 'text', nullable: true }) ratings: string | null;
  @Column('decimal', { precision: 8, scale: 2, default: 0, transformer: num }) overall: number;
  @Column({ type: 'text', nullable: true }) strengths: string | null;
  @Column({ type: 'text', nullable: true }) improvements: string | null;
  @Column({ type: 'text', nullable: true }) goals: string | null;
  @Column({ type: 'timestamp', nullable: true }) acknowledged_at: Date | null;
  @CreateDateColumn() created_at: Date;
}

export const HR_WARNING_LEVELS = ['verbal', 'written', 'final'] as const;

@Entity('hr_warning')
export class HrWarning {
  @PrimaryGeneratedColumn() id: number;
  @Column() tenant_id: number;
  @Column() employee_id: number;
  @Column({ default: 'verbal' }) level: string;
  @Column({ type: 'date' }) warning_date: string;
  @Column() reason: string;
  @Column({ type: 'text', nullable: true }) details: string | null;
  @Column() issued_by: number;
  @Column({ default: '' }) issued_by_name: string;
  @Column({ type: 'timestamp', nullable: true }) acknowledged_at: Date | null;
  @CreateDateColumn() created_at: Date;
}

export const HR_ASSET_CATEGORIES = ['uniform', 'key', 'phone', 'tool', 'laptop', 'vehicle', 'other'] as const;
export const HR_ASSET_STATUSES = ['available', 'issued', 'lost', 'retired'] as const;

@Entity('hr_asset')
export class HrAsset {
  @PrimaryGeneratedColumn() id: number;
  @Column() tenant_id: number;
  @Column({ type: 'int', nullable: true }) branch_id: number | null;
  @Column() code: string;
  @Column() name: string;
  @Column({ default: 'other' }) category: string;
  @Column('decimal', { precision: 14, scale: 2, default: 0, transformer: num }) value: number;
  @Column({ default: 'available' }) status: string;
  @Column({ default: '' }) notes: string;
  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;
}

@Entity('hr_asset_assignment')
export class HrAssetAssignment {
  @PrimaryGeneratedColumn() id: number;
  @Column() tenant_id: number;
  @Column() asset_id: number;
  @Column() employee_id: number;
  @Column({ type: 'date' }) issued_date: string;
  @Column({ type: 'date', nullable: true }) returned_date: string | null;
  @Column({ default: '' }) condition_out: string;
  @Column({ default: '' }) condition_in: string;
  /** Charged to the employee's next payslip when the item isn't returned. */
  @Column('decimal', { precision: 14, scale: 2, default: 0, transformer: num }) deduction_amount: number;
  @Column({ type: 'int', nullable: true }) deducted_payslip_id: number | null;
  @Column({ default: '' }) notes: string;
  @CreateDateColumn() created_at: Date;
}
