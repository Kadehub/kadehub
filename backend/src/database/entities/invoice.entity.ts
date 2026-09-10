import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Tenant } from './tenant.entity';
import { PaymentTransaction } from './payment-transaction.entity';
import { Package } from './package.entity';

@Entity('invoice')
export class Invoice {
  @PrimaryGeneratedColumn() id: number;
  @Column({ unique: true }) invoice_number: string;
  @Column() tenant_id: number;
  @Column({ nullable: true }) payment_transaction_id: number;
  @Column({ nullable: true }) package_id: number;
  @Column({ type: 'enum', enum: ['registration_fee', 'subscription', 'renewal'] }) type: string;
  @Column('decimal', { precision: 10, scale: 2, transformer: { to: v => v, from: v => parseFloat(v) } }) amount: number;
  @Column({ default: 'LKR' }) currency: string;
  @Column({ type: 'enum', enum: ['pending', 'paid', 'cancelled', 'overdue'], default: 'pending' }) status: string;
  @Column({ nullable: true }) description: string;
  @Column({ type: 'json', nullable: true }) line_items: any;
  @Column({ nullable: true }) bill_to_name: string;
  @Column({ nullable: true }) bill_to_email: string;
  @Column({ type: 'datetime', nullable: true }) issued_at: Date;
  @Column({ type: 'datetime', nullable: true }) due_at: Date;
  @Column({ type: 'datetime', nullable: true }) paid_at: Date;
  @Column({ type: 'text', nullable: true }) notes: string;
  @CreateDateColumn() created_at: Date;
  @ManyToOne(() => Tenant) @JoinColumn({ name: 'tenant_id' }) tenant: Tenant;
  @ManyToOne(() => PaymentTransaction) @JoinColumn({ name: 'payment_transaction_id' }) payment_transaction: PaymentTransaction;
  @ManyToOne(() => Package) @JoinColumn({ name: 'package_id' }) package: Package;
}
