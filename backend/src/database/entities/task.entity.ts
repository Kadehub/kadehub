import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from './user.entity';
import { TaskCategory } from './task-category.entity';
import { TaskAttachment } from './task-attachment.entity';

const money = { to: (v: number) => v, from: (v: string | null) => (v === null ? null : parseFloat(v)) };

export type TaskStatus = 'open' | 'assigned' | 'completed' | 'closed' | 'cancelled';

@Entity('task')
export class Task {
  @PrimaryGeneratedColumn() id: number;
  @Column() poster_id: number;
  @Column() category_id: number;
  @Column() title: string;
  @Column('text') description: string;
  @Column({ default: 'in_person' }) location_type: string;
  @Column({ nullable: true }) district: string;
  @Column({ nullable: true }) city: string;
  @Column({ type: 'date', nullable: true }) due_date: string;
  @Column({ default: false }) flexible: boolean;
  @Column('decimal', { precision: 12, scale: 2, transformer: money }) budget: number;
  @Column({ default: 'open' }) status: string;
  @Column({ nullable: true }) assigned_offer_id: number;
  @Column({ nullable: true }) assigned_tasker_id: number;
  @Column('decimal', { precision: 12, scale: 2, nullable: true, transformer: money }) agreed_amount: number;
  @Column({ default: 0 }) offers_count: number;
  @Column({ default: false }) hidden: boolean;
  @Column({ type: 'timestamp', nullable: true }) completed_at: Date;
  @Column({ type: 'timestamp', nullable: true }) closed_at: Date;
  @Column({ type: 'timestamp', nullable: true }) cancelled_at: Date;
  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;

  @ManyToOne(() => User) @JoinColumn({ name: 'poster_id' }) poster: User;
  @ManyToOne(() => User) @JoinColumn({ name: 'assigned_tasker_id' }) assigned_tasker: User;
  @ManyToOne(() => TaskCategory) @JoinColumn({ name: 'category_id' }) category: TaskCategory;
  @OneToMany(() => TaskAttachment, a => a.task) attachments: TaskAttachment[];
}
