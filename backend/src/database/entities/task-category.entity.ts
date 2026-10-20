import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('task_category')
export class TaskCategory {
  @PrimaryGeneratedColumn() id: number;
  @Column({ unique: true }) slug: string;
  @Column() name: string;
  @Column({ nullable: true }) icon: string;
  @Column({ default: 0 }) sort_order: number;
  @Column({ default: true }) is_active: boolean;
}
