import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreditSale } from '../../database/entities/credit-sale.entity';
import { CreditPayment } from '../../database/entities/credit-payment.entity';
import { CreateCreditSaleDto, RecordPaymentDto } from './credit.dto';

@Injectable()
export class CreditService {
  constructor(
    @InjectRepository(CreditSale) private creditRepo: Repository<CreditSale>,
    @InjectRepository(CreditPayment) private paymentRepo: Repository<CreditPayment>,
  ) {}

  getAll(tenantId: number) {
    return this.creditRepo.find({
      where: { tenant_id: tenantId },
      relations: ['customer', 'sale', 'payments'],
      order: { created_at: 'DESC' },
    });
  }

  getOutstanding(tenantId: number) {
    return this.creditRepo.find({
      where: [
        { tenant_id: tenantId, status: 'outstanding' },
        { tenant_id: tenantId, status: 'partial' },
      ],
      relations: ['customer', 'payments'],
      order: { due_date: 'ASC' },
    });
  }

  getSummary(tenantId: number) {
    return this.creditRepo.createQueryBuilder('c')
      .where('c.tenant_id = :tenantId', { tenantId })
      .select([
        'COUNT(c.id) as total_credits',
        'SUM(c.amount_due) as total_due',
        'SUM(c.amount_paid) as total_paid',
        'SUM(c.amount_due - c.amount_paid) as total_outstanding',
        'SUM(CASE WHEN c.status = "outstanding" THEN 1 ELSE 0 END) as outstanding_count',
        'SUM(CASE WHEN c.status = "partial" THEN 1 ELSE 0 END) as partial_count',
      ])
      .getRawOne();
  }

  create(tenantId: number, dto: CreateCreditSaleDto) {
    return this.creditRepo.save(this.creditRepo.create({ tenant_id: tenantId, ...dto }));
  }

  async recordPayment(creditId: number, tenantId: number, dto: RecordPaymentDto) {
    const credit = await this.creditRepo.findOne({ where: { id: creditId, tenant_id: tenantId } });
    if (!credit) throw new NotFoundException('Credit sale not found');

    await this.paymentRepo.save(this.paymentRepo.create({ credit_sale_id: creditId, ...dto }));

    credit.amount_paid = Number(credit.amount_paid) + dto.amount;
    if (credit.amount_paid >= credit.amount_due) credit.status = 'paid';
    else credit.status = 'partial';

    return this.creditRepo.save(credit);
  }
}
