import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Tenant } from './tenant.entity';
import { Package } from './package.entity';

@Entity('payment_transaction')
export class PaymentTransaction {
  @PrimaryGeneratedColumn() id: number;
  @Column() tenant_id: number;
  @Column() package_id: number;
  @Column('decimal', { precision: 10, scale: 2, transformer: { to: v => v, from: v => parseFloat(v) } }) amount: number;
  @Column({ default: 'LKR' }) currency: string;
  @Column({ type: 'enum', enum: ['monthly', 'yearly'] }) billing_cycle: string;
  @Column({ type: 'enum', enum: ['paypal', 'card', 'bank'] }) gateway: string;
  @Column({ nullable: true }) gateway_ref: string;
  @Column({ type: 'enum', enum: ['pending', 'completed', 'failed', 'refunded'], default: 'pending' }) status: string;
  @Column({ type: 'json', nullable: true }) metadata: any;
  @CreateDateColumn() created_at: Date;
  @ManyToOne(() => Tenant) @JoinColumn({ name: 'tenant_id' }) tenant: Tenant;
  @ManyToOne(() => Package) @JoinColumn({ name: 'package_id' }) package: Package;
}
