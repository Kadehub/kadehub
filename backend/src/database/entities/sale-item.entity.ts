import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Sale } from './sale.entity';
import { Product } from './product.entity';

@Entity('sale_item')
export class SaleItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  sale_id: number;

  @Column()
  product_id: number;

  @Column()
  quantity: number;

  @Column('decimal', { precision: 10, scale: 2, transformer: { to: (v) => v, from: (v) => parseFloat(v) } })
  price: number;

  @ManyToOne(() => Sale, (sale) => sale.items)
  @JoinColumn({ name: 'sale_id' })
  sale: Sale;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;
}
