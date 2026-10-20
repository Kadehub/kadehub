import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('cod_expense')
export class CodExpense {
  @PrimaryGeneratedColumn() id: number;
  @Column() tenant_id: number;
  @Column() title: string;
  @Column({ default: 'Misc' }) category: string;
  @Column('decimal', { precision: 14, scale: 2, default: 0, transformer: { to: v => v, from: v => Number(v) } }) amount: number;
  @Column({ type: 'date' }) expense_date: string;
  @Column({ type: 'text', nullable: true }) notes: string | null;
  // Added by migration 140_cod_expense_details
  @Column({ type: 'varchar', length: 20, nullable: true }) payment_method: string | null;
  @Column({ type: 'varchar', length: 150, nullable: true }) vendor: string | null;
  @Column({ type: 'varchar', length: 100, nullable: true }) reference: string | null;
  @CreateDateColumn() created_at: Date;
}
