import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('tasker_profile')
export class TaskerProfile {
  @PrimaryGeneratedColumn() id: number;
  @Column({ unique: true }) user_id: number;
  @Column({ nullable: true }) headline: string;
  @Column({ type: 'text', nullable: true }) bio: string;
  /** Comma-separated list. */
  @Column({ type: 'text', nullable: true }) skills: string;
  @Column({ nullable: true }) district: string;
  @Column({ default: false }) phone_verified: boolean;
  @Column('decimal', { precision: 3, scale: 2, default: 0, transformer: { to: (v: number) => v, from: (v: string) => parseFloat(v) } }) rating_avg: number;
  @Column({ default: 0 }) rating_count: number;
  @Column({ default: 0 }) completed_count: number;
  @UpdateDateColumn() updated_at: Date;
}
