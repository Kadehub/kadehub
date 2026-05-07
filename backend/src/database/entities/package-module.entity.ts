import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Package } from './package.entity';

@Entity('package_module')
export class PackageModule {
  @PrimaryGeneratedColumn() id: number;
  @Column() package_id: number;
  @Column() module_name: string;
  @ManyToOne(() => Package, p => p.modules) @JoinColumn({ name: 'package_id' }) package: Package;
}
