import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Tenant } from './tenant.entity';

@Entity('supplier')
export class Supplier {
  @PrimaryGeneratedColumn() id: number;
  @Column() tenant_id: number;
  @Column() name: string;
  @Column({ nullable: true }) contact_person: string;
  @Column({ nullable: true }) phone: string;
  @Column({ nullable: true }) email: string;
  @Column({ type: 'text', nullable: true }) address: string;
  @Column({ type: 'text', nullable: true }) notes: string;
  @Column({ default: true }) is_active: boolean;
  @CreateDateColumn() created_at: Date;
  @ManyToOne(() => Tenant) @JoinColumn({ name: 'tenant_id' }) tenant: Tenant;
}
