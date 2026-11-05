import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

/** A plan a super admin gave a business. The owner is congratulated once, then `seen_at` is set. */
@Entity('plan_upgrade_notice')
export class PlanUpgradeNotice {
  @PrimaryGeneratedColumn() id: number;
  @Column() tenant_id: number;
  @Column() product: string;
  @Column() plan_name: string;
  @Column({ type: Date, nullable: true }) expires_at: Date | null;
  @Column({ type: Date, nullable: true }) seen_at: Date | null;
  @CreateDateColumn() created_at: Date;
}
