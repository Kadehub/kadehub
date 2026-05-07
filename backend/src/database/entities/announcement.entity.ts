import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('announcement')
export class Announcement {
  @PrimaryGeneratedColumn() id: number;
  @Column() title: string;
  @Column({ type: 'text' }) message: string;
  @Column({ type: 'enum', enum: ['info', 'warning', 'success', 'error'], default: 'info' }) type: string;
  @Column({ default: true }) is_active: boolean;
  @Column({ nullable: true, type: 'timestamp' }) expires_at: Date;
  @CreateDateColumn() created_at: Date;
}
