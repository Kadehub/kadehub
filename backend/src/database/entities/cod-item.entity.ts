import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

const num = { to: (v: number) => v, from: (v: string | number) => Number(v) };

@Entity('cod_item')
export class CodItem {
  @PrimaryGeneratedColumn() id: number;
  @Column() tenant_id: number;
  @Column() name: string;
  @Column() sku: string;
  @Column({ default: 'Uncategorized' }) category: string;
  @Column({ type: 'varchar', nullable: true }) image_url: string | null;
  @Column({ default: 'LKR' }) cost_currency: string;
  @Column('decimal', { precision: 14, scale: 4, default: 0, transformer: num }) buying_price: number;
  @Column('decimal', { precision: 14, scale: 6, default: 1, transformer: num }) exchange_rate: number;
  @Column('decimal', { precision: 14, scale: 2, default: 0, transformer: num }) shipping_cost: number;
  @Column('decimal', { precision: 14, scale: 2, default: 0, transformer: num }) customs_price: number;
  @Column('decimal', { precision: 14, scale: 2, default: 0, transformer: num }) other_cost: number;
  @Column('decimal', { precision: 14, scale: 2, default: 0, transformer: num }) selling_price: number;
  @Column({ default: 0 }) stock_quantity: number;
  @Column({ default: 5 }) low_stock_threshold: number;
  /** Derived on every save: (buying × rate) + shipping + customs + other */
  @Column('decimal', { precision: 14, scale: 2, default: 0, transformer: num }) landed_cost: number;
  @Column('decimal', { precision: 14, scale: 2, default: 0, transformer: num }) profit_per_unit: number;
  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;
}
