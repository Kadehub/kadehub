import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

const num = { to: (v: number) => v, from: (v: string | number) => Number(v) };

/** One payment from a courier to the business, covering the orders on its lines. */
@Entity('cod_remittance')
export class CodRemittance {
  @PrimaryGeneratedColumn() id: number;
  @Column() tenant_id: number;
  @Column() courier_id: number;
  /** The courier's statement or payment reference */
  @Column({ default: '' }) reference: string;
  @Column({ type: 'date' }) paid_on: string;
  /** Cash the courier says it collected, the fees it kept, and what actually reached the business */
  @Column('decimal', { precision: 14, scale: 2, default: 0, transformer: num }) collected: number;
  @Column('decimal', { precision: 14, scale: 2, default: 0, transformer: num }) fees: number;
  @Column('decimal', { precision: 14, scale: 2, default: 0, transformer: num }) received: number;
  /** The cod_expense row holding the fees, so every profit figure includes them */
  @Column({ type: 'int', nullable: true }) expense_id: number | null;
  @Column({ type: 'text', nullable: true }) notes: string | null;
  @Column({ type: 'int', nullable: true }) created_by: number | null;
  @CreateDateColumn() created_at: Date;
}

export const REMITTANCE_OUTCOMES = ['matched', 'short', 'over', 'not_delivered'] as const;
export type RemittanceOutcome = (typeof REMITTANCE_OUTCOMES)[number];

/** One order on a payment. Lines that couldn't be applied are shown in the preview and not stored. */
@Entity('cod_remittance_line')
export class CodRemittanceLine {
  @PrimaryGeneratedColumn() id: number;
  @Column() tenant_id: number;
  @Column() remittance_id: number;
  @Column({ type: 'int', nullable: true }) order_id: number | null;
  @Column({ default: '' }) tracking_number: string;
  @Column('decimal', { precision: 14, scale: 2, default: 0, transformer: num }) collected: number;
  @Column('decimal', { precision: 14, scale: 2, default: 0, transformer: num }) fee: number;
  /** What KadeHub expected the courier to collect for this order */
  @Column('decimal', { precision: 14, scale: 2, default: 0, transformer: num }) expected: number;
  @Column({ type: 'varchar' }) outcome: RemittanceOutcome;
}
