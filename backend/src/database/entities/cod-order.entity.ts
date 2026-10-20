import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { CodOrderItem } from './cod-order-item.entity';

const num = { to: (v: number) => v, from: (v: string | number) => Number(v) };

export const COD_ORDER_STATUSES = ['pending', 'confirmed', 'ongoing', 'delivered', 'returned', 'cancelled'] as const;
export type CodOrderStatus = (typeof COD_ORDER_STATUSES)[number];

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
  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;
  @OneToMany(() => CodOrderItem, l => l.order) order_items: CodOrderItem[];
}
