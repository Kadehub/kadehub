import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('api_log')
@Index(['tenant_id', 'created_at'])
export class ApiLog {
  @PrimaryGeneratedColumn() id: number;
  @Column({ nullable: true }) tenant_id: number;
  @Column() method: string;
  @Column() path: string;
  @Column({ default: 200 }) status_code: number;
  @Column({ default: 0 }) response_ms: number;
  @CreateDateColumn() created_at: Date;
}
