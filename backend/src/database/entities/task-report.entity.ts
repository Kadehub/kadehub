import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('task_report')
export class TaskReport {
  @PrimaryGeneratedColumn() id: number;
  @Column() reporter_id: number;
  @Column({ nullable: true }) task_id: number;
  @Column({ nullable: true }) reported_user_id: number;
  @Column() reason: string;
  @Column({ type: 'text', nullable: true }) details: string;
  @Column({ default: 'open' }) status: string;
  @CreateDateColumn() created_at: Date;
  @Column({ type: 'timestamp', nullable: true }) resolved_at: Date;
  @ManyToOne(() => User) @JoinColumn({ name: 'reporter_id' }) reporter: User;
}
