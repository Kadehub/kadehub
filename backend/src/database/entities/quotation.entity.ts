import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Package } from './package.entity';

@Entity('quotation')
export class Quotation {
  @PrimaryGeneratedColumn() id: number;
  @Column({ unique: true }) quote_number: string;
  @Column() contact_name: string;
  @Column() email: string;
  @Column({ nullable: true }) business_type: string;
  @Column({ nullable: true }) country: string;
  @Column({ type: 'text', nullable: true }) description: string;
  @Column({ nullable: true }) budget_range: string;
  @Column({ type: 'enum', enum: ['new', 'sent', 'accepted', 'rejected', 'converted'], default: 'new' }) status: string;
  @Column({ nullable: true }) package_id: number;
  @Column('decimal', { precision: 10, scale: 2, nullable: true, transformer: { to: v => v, from: v => v == null ? null : parseFloat(v) } }) quoted_amount: number;
  @Column({ type: 'datetime', nullable: true }) valid_until: Date;
  @Column({ type: 'text', nullable: true }) notes: string;
  @Column({ type: 'json', nullable: true }) line_items: any;
  @Column({ type: 'enum', enum: ['monthly', 'yearly'], nullable: true }) billing_cycle: string;
  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;
  @ManyToOne(() => Package) @JoinColumn({ name: 'package_id' }) package: Package;
}
