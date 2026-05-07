import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, UpdateDateColumn } from 'typeorm';
import { Product } from './product.entity';

@Entity('inventory')
export class Inventory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  product_id: number;

  @Column({ default: 0 })
  quantity: number;

  @Column({ default: 10 })
  reorder_level: number;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToOne(() => Product, (p) => p.inventory)
  @JoinColumn({ name: 'product_id' })
  product: Product;
}
