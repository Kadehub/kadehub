import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Tenant } from './tenant.entity';
import { Product } from './product.entity';

@Entity('batch')
export class Batch {
  @PrimaryGeneratedColumn() id: number;
  @Column() tenant_id: number;
  @Column() product_id: number;
  @Column() batch_number: string;
  @Column() quantity: number;
  @Column('decimal', { precision: 10, scale: 2, default: 0, transformer: { to: v => v, from: v => parseFloat(v) } }) cost: number;
  @Column({ type: 'date', nullable: true }) manufactured_date: string;
  @Column({ type: 'date', nullable: true }) expiry_date: string;
  @CreateDateColumn() created_at: Date;
  @ManyToOne(() => Tenant) @JoinColumn({ name: 'tenant_id' }) tenant: Tenant;
  @ManyToOne(() => Product) @JoinColumn({ name: 'product_id' }) product: Product;
}
