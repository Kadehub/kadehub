import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { PurchaseOrder } from './purchase-order.entity';
import { Product } from './product.entity';

@Entity('purchase_order_item')
export class PurchaseOrderItem {
  @PrimaryGeneratedColumn() id: number;
  @Column() order_id: number;
  @Column() product_id: number;
  @Column() quantity: number;
  @Column('decimal', { precision: 10, scale: 2, transformer: { to: v => v, from: v => parseFloat(v) } }) cost: number;
  @Column({ default: 0 }) received_qty: number;
  @ManyToOne(() => PurchaseOrder, o => o.items) @JoinColumn({ name: 'order_id' }) order: PurchaseOrder;
  @ManyToOne(() => Product) @JoinColumn({ name: 'product_id' }) product: Product;
}
