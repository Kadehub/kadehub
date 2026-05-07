import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Tenant } from './tenant.entity';

@Entity('discount')
export class Discount {
  @PrimaryGeneratedColumn() id: number;
  @Column() tenant_id: number;
  @Column() name: string;
  @Column({ type: 'enum', enum: ['percentage', 'fixed'] }) type: string;
  @Column('decimal', { precision: 10, scale: 2, transformer: { to: v => v, from: v => parseFloat(v) } }) value: number;
  @Column('decimal', { precision: 10, scale: 2, default: 0, transformer: { to: v => v, from: v => parseFloat(v) } }) min_purchase: number;
  @Column({ default: true }) is_active: boolean;
  @Column({ type: 'date', nullable: true }) valid_from: string;
  @Column({ type: 'date', nullable: true }) valid_to: string;
  @CreateDateColumn() created_at: Date;
  @ManyToOne(() => Tenant) @JoinColumn({ name: 'tenant_id' }) tenant: Tenant;
}
