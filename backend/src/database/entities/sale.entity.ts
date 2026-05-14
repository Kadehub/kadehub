import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Tenant } from './tenant.entity';
import { User } from './user.entity';
import { Customer } from './customer.entity';
import { SaleItem } from './sale-item.entity';

@Entity('sale')
export class Sale {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  tenant_id: number;

  @Column()
  user_id: number;

  @Column({ nullable: true })
  customer_id: number;

  @Column('decimal', { precision: 10, scale: 2, transformer: { to: (v) => v, from: (v) => parseFloat(v) } })
  total_amount: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0, transformer: { to: (v) => v, from: (v) => parseFloat(v) } })
  discount: number;

  @Column({ type: 'enum', enum: ['CASH', 'CARD', 'LANKAQR', 'CREDIT'] })
  payment_method: string;

  @Column({ type: 'enum', enum: ['completed', 'refunded', 'voided'], default: 'completed' })
  status: string;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @OneToMany(() => SaleItem, (item) => item.sale, { cascade: true })
  items: SaleItem[];
}
