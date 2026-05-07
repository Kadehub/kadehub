import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Tenant } from './tenant.entity';
import { Supplier } from './supplier.entity';
import { User } from './user.entity';
import { PurchaseOrderItem } from './purchase-order-item.entity';

@Entity('purchase_order')
export class PurchaseOrder {
  @PrimaryGeneratedColumn() id: number;
  @Column() tenant_id: number;
  @Column() supplier_id: number;
  @Column() user_id: number;
  @Column({ type: 'enum', enum: ['pending', 'received', 'cancelled'], default: 'pending' }) status: string;
  @Column('decimal', { precision: 10, scale: 2, default: 0, transformer: { to: v => v, from: v => parseFloat(v) } }) total_amount: number;
  @Column({ type: 'text', nullable: true }) notes: string;
  @CreateDateColumn() created_at: Date;
  @Column({ type: 'timestamp', nullable: true }) received_at: Date;
  @ManyToOne(() => Tenant) @JoinColumn({ name: 'tenant_id' }) tenant: Tenant;
  @ManyToOne(() => Supplier) @JoinColumn({ name: 'supplier_id' }) supplier: Supplier;
  @ManyToOne(() => User) @JoinColumn({ name: 'user_id' }) user: User;
  @OneToMany(() => PurchaseOrderItem, i => i.order, { cascade: true }) items: PurchaseOrderItem[];
}
