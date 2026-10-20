import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';

/** One row per tenant: the owner's monthly personal budget. */
@Entity('cod_personal_settings')
export class CodPersonalSettings {
  @PrimaryGeneratedColumn() id: number;
  @Column() tenant_id: number;
  @Column('decimal', { precision: 14, scale: 2, nullable: true, transformer: { to: v => v, from: v => (v === null || v === undefined ? null : Number(v)) } })
  monthly_budget: number | null;
  @UpdateDateColumn() updated_at: Date;
}
