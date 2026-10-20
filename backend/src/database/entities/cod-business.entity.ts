import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/** COD business profile — one per tenant (name, contact, branding, business type). */
@Entity('cod_business')
export class CodBusiness {
  @PrimaryGeneratedColumn() id: number;
  @Column() tenant_id: number;
  @Column({ default: '' }) name: string;
  @Column({ default: '' }) phone: string;
  @Column({ default: '' }) address: string;
  @Column({ default: '' }) city: string;
  @Column({ type: 'varchar', nullable: true }) logo_url: string | null;
  @Column({ default: 'general' }) business_type: string;
  @Column({ default: '' }) tagline: string;
  @Column({ default: '#0f172a' }) brand_color: string;
  @Column({ default: '' }) invoice_footer: string;
  @Column({ default: true }) imports_goods: boolean;
  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;
}
