import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { CodOrderItem } from './cod-order-item.entity';

const num = { to: (v: number) => v, from: (v: string | number) => Number(v) };

export const COD_ORDER_STATUSES = ['pending', 'confirmed', 'ongoing', 'delivered', 'returned', 'cancelled'] as const;
export type CodOrderStatus = (typeof COD_ORDER_STATUSES)[number];
export const COD_PAYMENT_TYPES = ['cod', 'pay_now', 'credit'] as const;
export type CodPaymentType = (typeof COD_PAYMENT_TYPES)[number];
export const COD_CUSTOMER_TYPES = ['retail', 'wholesale'] as const;
export type CodCustomerType = (typeof COD_CUSTOMER_TYPES)[number];

@Entity('cod_order')
export class CodOrder {
  @PrimaryGeneratedColumn() id: number;
  @Column() tenant_id: number;
  /** INV-YYYY-NNNN, sequential per tenant per year */
  @Column() invoice_number: string;
  @Column() customer_name: string;
  @Column({ default: '' }) customer_phone: string;
  @Column({ default: '' }) customer_address: string;
  @Column({ default: '' }) city: string;
  @Column({ type: 'varchar', default: 'pending' }) status: CodOrderStatus;
  @Column('decimal', { precision: 14, scale: 2, default: 0, transformer: num }) subtotal: number;
  @Column('decimal', { precision: 14, scale: 2, default: 0, transformer: num }) delivery_charge: number;
  @Column('decimal', { precision: 14, scale: 2, default: 0, transformer: num }) discount: number;
  @Column('decimal', { precision: 14, scale: 2, default: 0, transformer: num }) total_amount: number;
  @Column({ type: 'text', nullable: true }) notes: string | null;
  /** True while the order's quantities are taken out of stock (i.e. while delivered) */
  @Column({ default: false }) stock_deducted: boolean;
  /** cod (pay on delivery) | pay_now (paid at sale) | credit (pay later) */
  @Column({ type: 'varchar', default: 'cod' }) payment_type: CodPaymentType;
  @Column({ type: 'varchar', default: 'retail' }) customer_type: CodCustomerType;
  @Column({ type: 'varchar', nullable: true }) customer_email: string | null;
  /** Customer's purchase-order reference */
  @Column({ type: 'varchar', nullable: true }) po_number: string | null;
  @Column({ type: 'varchar', nullable: true }) tracking_number: string | null;
  @Column({ type: Date, nullable: true }) confirmation_sent_at: Date | null;
  @Column({ type: 'int', nullable: true }) created_by: number | null;
  @Column({ type: 'int', nullable: true }) reordered_from_order_id: number | null;
  // Credit terms (only meaningful when payment_type = 'credit')
  @Column({ type: 'int', nullable: true }) credit_period_days: number | null;
  @Column({ type: 'date', nullable: true }) payment_due_date: string | null;
  @Column({ type: 'text', nullable: true }) credit_note: string | null;
  @Column({ type: Date, nullable: true }) returned_at: Date | null;
  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;
  @OneToMany(() => CodOrderItem, l => l.order) order_items: CodOrderItem[];
}
