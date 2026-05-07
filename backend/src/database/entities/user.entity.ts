import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Tenant } from './tenant.entity';

@Entity('user')
export class User {
  @PrimaryGeneratedColumn() id: number;
  @Column() tenant_id: number;
  @Column() name: string;
  @Column() email: string;
  @Column() password_hash: string;
  @Column({ type: 'enum', enum: ['SUPER_ADMIN', 'ADMIN', 'CASHIER'], default: 'CASHIER' }) role: string;
  @Column({ nullable: true }) phone: string;
  @Column({ nullable: true }) emp_no: string;
  @Column({ nullable: true }) photo_url: string;
  @CreateDateColumn() created_at: Date;
  @ManyToOne(() => Tenant) @JoinColumn({ name: 'tenant_id' }) tenant: Tenant;
}
