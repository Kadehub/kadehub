import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/** One business's link to one courier: its encrypted API key and how to read that courier's statements. */
@Entity('cod_courier_account')
export class CodCourierAccount {
  @PrimaryGeneratedColumn() id: number;
  @Column() tenant_id: number;
  @Column() courier_id: number;
  /** AES-256-GCM (cod-courier-secrets.ts). Never returned by the API. */
  @Column({ type: 'text', nullable: true }) api_key_enc: string | null;
  /** The user who connected it; status changes made by the sync are logged under them */
  @Column({ type: 'int', nullable: true }) connected_by: number | null;
  /** JSON { tracking, collected, fee }: the statement's column headings */
  @Column({ type: 'text', nullable: true }) statement_mapping: string | null;
  @Column({ type: Date, nullable: true }) last_ok_at: Date | null;
  @Column({ type: 'varchar', nullable: true }) last_error: string | null;
  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;
}
