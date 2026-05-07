import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Tenant } from './tenant.entity';
import { User } from './user.entity';

@Entity('shift')
export class Shift {
  @PrimaryGeneratedColumn() id: number;
  @Column() tenant_id: number;
  @Column() user_id: number;
  @CreateDateColumn() opened_at: Date;
  @Column({ type: 'timestamp', nullable: true }) closed_at: Date;
  @Column('decimal', { precision: 10, scale: 2, default: 0, transformer: { to: v => v, from: v => parseFloat(v) } }) opening_cash: number;
  @Column('decimal', { precision: 10, scale: 2, nullable: true, transformer: { to: v => v, from: v => v != null ? parseFloat(v) : null } }) closing_cash: number;
  @Column({ type: 'text', nullable: true }) notes: string;
  @ManyToOne(() => Tenant) @JoinColumn({ name: 'tenant_id' }) tenant: Tenant;
  @ManyToOne(() => User) @JoinColumn({ name: 'user_id' }) user: User;
}
