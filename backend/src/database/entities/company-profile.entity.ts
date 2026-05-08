import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Tenant } from './tenant.entity';

@Entity('company_profile')
export class CompanyProfile {
  @PrimaryGeneratedColumn() id: number;
  @Column() tenant_id: number;
  @Column({ nullable: true }) logo_url: string;
  @Column({ nullable: true, type: 'text' }) address: string;
  @Column({ nullable: true }) city: string;
  @Column({ nullable: true }) country: string;
  @Column({ nullable: true }) phone: string;
  @Column({ nullable: true }) email: string;
  @Column({ nullable: true }) website: string;
  @Column({ nullable: true }) tax_number: string;
  @Column({ default: 'LKR' }) currency: string;
  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;
  @ManyToOne(() => Tenant) @JoinColumn({ name: 'tenant_id' }) tenant: Tenant;
}
