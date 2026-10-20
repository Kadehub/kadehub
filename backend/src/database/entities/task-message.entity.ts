import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('task_message')
export class TaskMessage {
  @PrimaryGeneratedColumn() id: number;
  @Column() task_id: number;
  @Column() sender_id: number;
  @Column('text') body: string;
  @Column({ type: 'timestamp', nullable: true }) read_at: Date;
  @CreateDateColumn() created_at: Date;
}
