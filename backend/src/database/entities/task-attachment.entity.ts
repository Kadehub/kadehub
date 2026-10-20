import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Task } from './task.entity';

@Entity('task_attachment')
export class TaskAttachment {
  @PrimaryGeneratedColumn() id: number;
  @Column() task_id: number;
  @Column() url: string;
  @CreateDateColumn() created_at: Date;
  @ManyToOne(() => Task, t => t.attachments) @JoinColumn({ name: 'task_id' }) task: Task;
}
