import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

/** Extra COD orders bought for one calendar month, on top of the plan's monthly limit. */
@Entity('cod_order_topup')
export class CodOrderTopup {
  @PrimaryGeneratedColumn() id: number;
  @Column() tenant_id: number;
  /** Colombo calendar month the orders count towards, 'YYYY-MM'. */
  @Column({ type: 'char', length: 7 }) month: string;
  @Column() orders: number;
  @Column({ default: '' }) payment_ref: string;
  @CreateDateColumn() created_at: Date;
}
