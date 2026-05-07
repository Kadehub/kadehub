import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { CreditSale } from './credit-sale.entity';

@Entity('credit_payment')
export class CreditPayment {
  @PrimaryGeneratedColumn() id: number;
  @Column() credit_sale_id: number;
  @Column('decimal', { precision: 10, scale: 2, transformer: { to: v => v, from: v => parseFloat(v) } }) amount: number;
  @Column({ type: 'enum', enum: ['CASH', 'CARD', 'LANKAQR'] }) payment_method: string;
  @CreateDateColumn() paid_at: Date;
  @ManyToOne(() => CreditSale, cs => cs.payments) @JoinColumn({ name: 'credit_sale_id' }) creditSale: CreditSale;
}
