import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * A courier a COD order can ship with. `tenant_id` null: on the shared list every business sees, managed
 * by super admins. Otherwise it's that business's own "Other" courier, private to them.
 * Rows are archived (`is_active` false), never deleted, so past orders keep their courier's name.
 */
@Entity('cod_courier')
export class CodCourier {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'int', nullable: true }) tenant_id: number | null;
  @Column() name: string;
  /** Tracking page; `{tracking}` is replaced with the order's tracking number */
  @Column({ type: 'varchar', nullable: true }) tracking_url: string | null;
  /** Set when KadeHub can talk to this courier's API (cod-courier-adapters.ts) */
  @Column({ type: 'varchar', nullable: true }) adapter: string | null;
  @Column({ default: true }) is_active: boolean;
  @Column({ type: 'int', default: 0 }) sort_order: number;
  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;
}
