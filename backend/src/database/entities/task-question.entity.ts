import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('task_question')
export class TaskQuestion {
  @PrimaryGeneratedColumn() id: number;
  @Column() task_id: number;
  @Column() user_id: number;
  @Column({ nullable: true }) parent_id: number;
  @Column('text') body: string;
  @CreateDateColumn() created_at: Date;
  @ManyToOne(() => User) @JoinColumn({ name: 'user_id' }) user: User;
}
