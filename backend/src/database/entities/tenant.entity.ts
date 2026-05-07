import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('tenant')
export class Tenant {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column({ type: 'enum', enum: ['active', 'blocked', 'suspended'], default: 'active' })
  status: string;

  @Column({ nullable: true, type: 'text' })
  plan_note: string;

  @CreateDateColumn()
  created_at: Date;
}
