import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Tenant } from './tenant.entity';

@Entity('subscription')
export class Subscription {
  @PrimaryGeneratedColumn() id: number;
  @Column() tenant_id: number;
  @Column() module_name: string;
  @Column({ type: 'enum', enum: ['active', 'inactive'], default: 'active' }) status: string;
  @Column({ nullable: true }) package_id: number;
  @Column({ type: 'enum', enum: ['monthly', 'yearly'], nullable: true }) billing_cycle: string;
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) started_at: Date;
  @Column({ nullable: true, type: 'timestamp' }) expires_at: Date;
  @Column({ type: 'enum', enum: ['pending', 'paid', 'failed'], default: 'pending' }) payment_status: string;
  @Column({ nullable: true }) payment_ref: string;
  @ManyToOne(() => Tenant) @JoinColumn({ name: 'tenant_id' }) tenant: Tenant;
}
