import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Tenant } from './tenant.entity';
import { Sale } from './sale.entity';
import { Customer } from './customer.entity';
import { CreditPayment } from './credit-payment.entity';

@Entity('credit_sale')
export class CreditSale {
  @PrimaryGeneratedColumn() id: number;
  @Column() tenant_id: number;
  @Column() sale_id: number;
  @Column() customer_id: number;
  @Column('decimal', { precision: 10, scale: 2, transformer: { to: v => v, from: v => parseFloat(v) } }) amount_due: number;
  @Column('decimal', { precision: 10, scale: 2, default: 0, transformer: { to: v => v, from: v => parseFloat(v) } }) amount_paid: number;
  @Column({ type: 'date', nullable: true }) due_date: string;
  @Column({ type: 'enum', enum: ['outstanding', 'partial', 'paid'], default: 'outstanding' }) status: string;
  @CreateDateColumn() created_at: Date;
  @ManyToOne(() => Tenant) @JoinColumn({ name: 'tenant_id' }) tenant: Tenant;
  @ManyToOne(() => Sale) @JoinColumn({ name: 'sale_id' }) sale: Sale;
  @ManyToOne(() => Customer) @JoinColumn({ name: 'customer_id' }) customer: Customer;
  @OneToMany(() => CreditPayment, p => p.creditSale, { cascade: true }) payments: CreditPayment[];
}
