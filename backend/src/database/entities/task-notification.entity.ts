import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('task_notification')
export class TaskNotification {
  @PrimaryGeneratedColumn() id: number;
  @Column() user_id: number;
  @Column({ nullable: true }) task_id: number;
  @Column() type: string;
  @Column() title: string;
  @Column({ type: 'text', nullable: true }) body: string;
  @Column({ type: 'timestamp', nullable: true }) read_at: Date;
  @CreateDateColumn() created_at: Date;
}
