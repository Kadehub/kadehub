import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

const num = { to: (v: number) => v, from: (v: string | number) => Number(v) };

export const COD_PAYMENT_METHODS = ['cash', 'bank', 'card', 'cheque', 'other'] as const;
export type CodPaymentMethod = (typeof COD_PAYMENT_METHODS)[number];

/** A payment received against a credit (pay-later) COD order. */
@Entity('cod_credit_payment')
export class CodCreditPayment {
  @PrimaryGeneratedColumn() id: number;
  @Column() tenant_id: number;
  @Column() order_id: number;
  @Column('decimal', { precision: 14, scale: 2, transformer: num }) amount: number;
  @Column({ type: 'date' }) payment_date: string;
  @Column({ type: 'varchar', default: 'cash' }) method: CodPaymentMethod;
  @Column({ type: 'text', nullable: true }) notes: string | null;
  @Column({ type: 'int', nullable: true }) created_by: number | null;
  @CreateDateColumn() created_at: Date;
}
