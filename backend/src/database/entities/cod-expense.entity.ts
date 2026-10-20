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
  @CreateDateColumn() created_at: Date;
}
