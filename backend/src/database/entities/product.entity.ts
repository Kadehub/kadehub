import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, OneToOne } from 'typeorm';
import { Tenant } from './tenant.entity';
import { Inventory } from './inventory.entity';

@Entity('product')
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  tenant_id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  barcode: string;

  @Column('decimal', { precision: 10, scale: 2, transformer: { to: (v) => v, from: (v) => parseFloat(v) } })
  price: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0, transformer: { to: (v) => v, from: (v) => parseFloat(v) } })
  cost: number;

  @Column({ nullable: true })
  category: string;

  @Column({ nullable: true })
  image_url: string;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @OneToOne(() => Inventory, (inv) => inv.product)
  inventory: Inventory;
}
