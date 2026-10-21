import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Tenant } from './tenant.entity';

@Entity('user')
export class User {
  @PrimaryGeneratedColumn() id: number;
  @Column() tenant_id: number;
  @Column() name: string;
  @Column() email: string;
  @Column() password_hash: string;
  @Column({ type: 'enum', enum: ['SUPER_ADMIN', 'ADMIN', 'CASHIER'], default: 'CASHIER' }) role: string;
  @Column({ nullable: true }) phone: string;
  @Column({ nullable: true }) emp_no: string;
  @Column({ nullable: true }) photo_url: string;
  @Column({ nullable: true }) pin: string;
  /** Set by the super admin: this person can't sign in (their shop is unaffected). */
  @Column({ type: Date, nullable: true }) disabled_at: Date | null;
  /** Set by the super admin: banned from posting, offering and messaging on KadeHub Tasks. */
  @Column({ type: Date, nullable: true }) tasks_banned_at: Date | null;
  @Column({ type: 'varchar', nullable: true }) tasks_ban_reason: string | null;
  @CreateDateColumn() created_at: Date;
  @ManyToOne(() => Tenant) @JoinColumn({ name: 'tenant_id' }) tenant: Tenant;
}
