import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { PackageModule } from './package-module.entity';

@Entity('package')
export class Package {
  @PrimaryGeneratedColumn() id: number;
  @Column() name: string;
  @Column({ unique: true }) slug: string;
  @Column({ nullable: true, type: 'text' }) description: string;
  @Column('decimal', { precision: 10, scale: 2, transformer: { to: v => v, from: v => parseFloat(v) } }) price_monthly: number;
  @Column('decimal', { precision: 10, scale: 2, transformer: { to: v => v, from: v => parseFloat(v) } }) price_yearly: number;
  @Column({ default: true }) is_active: boolean;
  @Column({ default: false }) is_popular: boolean;
  @Column({ default: 0 }) sort_order: number;
  @Column({ nullable: true, type: 'int' }) employee_limit: number | null;
  @OneToMany(() => PackageModule, m => m.package) modules: PackageModule[];
}
