import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Tenant } from './tenant.entity';
import { User } from './user.entity';

@Entity('expense')
export class Expense {
  @PrimaryGeneratedColumn() id: number;
  @Column() tenant_id: number;
  @Column() user_id: number;
  @Column() category: string;
  @Column() description: string;
  @Column('decimal', { precision: 10, scale: 2, transformer: { to: v => v, from: v => parseFloat(v) } }) amount: number;
  @Column({ type: 'date' }) expense_date: string;
  @CreateDateColumn() created_at: Date;
  @ManyToOne(() => Tenant) @JoinColumn({ name: 'tenant_id' }) tenant: Tenant;
  @ManyToOne(() => User) @JoinColumn({ name: 'user_id' }) user: User;
}
