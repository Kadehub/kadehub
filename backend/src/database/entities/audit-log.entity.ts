import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Tenant } from './tenant.entity';
import { User } from './user.entity';

@Entity('audit_log')
export class AuditLog {
  @PrimaryGeneratedColumn() id: number;
  @Column() tenant_id: number;
  @Column() user_id: number;
  @Column() action: string;
  @Column() entity: string;
  @Column({ nullable: true }) entity_id: number;
  @Column({ type: 'json', nullable: true }) details: any;
  @CreateDateColumn() created_at: Date;
  @ManyToOne(() => Tenant) @JoinColumn({ name: 'tenant_id' }) tenant: Tenant;
  @ManyToOne(() => User) @JoinColumn({ name: 'user_id' }) user: User;
}
