import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('coupon')
export class Coupon {
  @PrimaryGeneratedColumn() id: number;
  @Column({ unique: true }) code: string;
  @Column({ type: 'enum', enum: ['percentage', 'fixed'] }) type: string;
  @Column('decimal', { precision: 10, scale: 2, transformer: { to: v => v, from: v => parseFloat(v) } }) value: number;
  @Column({ nullable: true, type: 'int' }) duration_months: number;
  @Column({ nullable: true, type: 'int' }) max_uses: number;
  @Column({ default: 0 }) used_count: number;
  @Column({ default: true }) is_active: boolean;
  @Column({ nullable: true, type: 'timestamp' }) expires_at: Date;
  @CreateDateColumn() created_at: Date;
}
