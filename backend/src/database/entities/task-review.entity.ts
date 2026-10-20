import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Task } from './task.entity';

@Entity('task_review')
export class TaskReview {
  @PrimaryGeneratedColumn() id: number;
  @Column() task_id: number;
  @Column() reviewer_id: number;
  @Column() reviewee_id: number;
  /** Role of the person being reviewed on this task: tasker or poster. */
  @Column() role: string;
  @Column() rating: number;
  @Column({ type: 'text', nullable: true }) comment: string;
  @CreateDateColumn() created_at: Date;
  @ManyToOne(() => User) @JoinColumn({ name: 'reviewer_id' }) reviewer: User;
  @ManyToOne(() => Task) @JoinColumn({ name: 'task_id' }) task: Task;
}
