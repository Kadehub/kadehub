import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Task } from './task.entity';

export type OfferStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn';

@Entity('task_offer')
export class TaskOffer {
  @PrimaryGeneratedColumn() id: number;
  @Column() task_id: number;
  @Column() tasker_id: number;
  @Column('decimal', { precision: 12, scale: 2, transformer: { to: (v: number) => v, from: (v: string) => parseFloat(v) } }) amount: number;
  @Column('text') message: string;
  @Column({ default: 'pending' }) status: string;
  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;
  @ManyToOne(() => User) @JoinColumn({ name: 'tasker_id' }) tasker: User;
  @ManyToOne(() => Task) @JoinColumn({ name: 'task_id' }) task: Task;
}
