import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { CodOrder } from './cod-order.entity';

const num = { to: (v: number) => v, from: (v: string | number) => Number(v) };

@Entity('cod_order_item')
export class CodOrderItem {
  @PrimaryGeneratedColumn() id: number;
  @Column() tenant_id: number;
  @Column() order_id: number;
  /** Null once the item itself was deleted; the name/price snapshot keeps the invoice intact */
  @Column({ type: 'int', nullable: true }) item_id: number | null;
  @Column() item_name: string;
  @Column() quantity: number;
  @Column('decimal', { precision: 14, scale: 2, default: 0, transformer: num }) unit_price: number;
  @Column('decimal', { precision: 14, scale: 2, default: 0, transformer: num }) line_total: number;
  @ManyToOne(() => CodOrder, o => o.order_items, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'order_id' }) order: CodOrder;
}
