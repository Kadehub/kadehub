import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/** The account owner's personal spending — admin only, never mixed into business figures. */
@Entity('cod_personal_expense')
export class CodPersonalExpense {
  @PrimaryGeneratedColumn() id: number;
  @Column() tenant_id: number;
  @Column({ type: 'int', nullable: true }) user_id: number | null;
  @Column() title: string;
  @Column({ default: 'Other' }) category: string;
  @Column('decimal', { precision: 14, scale: 2, default: 0, transformer: { to: v => v, from: v => Number(v) } }) amount: number;
  @Column({ type: 'date' }) expense_date: string;
  @Column({ type: 'varchar', length: 20, nullable: true }) payment_method: string | null;
  @Column({ type: 'text', nullable: true }) notes: string | null;
  /** Per-submission id from the browser; unique per tenant so a double tap saves once. */
  @Column({ type: 'varchar', length: 36, nullable: true }) client_ref: string | null;
  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;
}
