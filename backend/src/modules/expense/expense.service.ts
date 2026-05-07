import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Expense } from '../../database/entities/expense.entity';
import { CreateExpenseDto } from './expense.dto';

@Injectable()
export class ExpenseService {
  constructor(@InjectRepository(Expense) private repo: Repository<Expense>) {}

  getExpenses(tenantId: number, from: string, to: string) {
    return this.repo.createQueryBuilder('e')
      .leftJoin('e.user', 'u')
      .where('e.tenant_id = :tenantId', { tenantId })
      .andWhere('e.expense_date BETWEEN :from AND :to', { from, to })
      .select(['e.id', 'e.category', 'e.description', 'e.amount', 'e.expense_date', 'e.created_at', 'u.name'])
      .orderBy('e.expense_date', 'DESC')
      .getRawMany();
  }

  getSummary(tenantId: number, from: string, to: string) {
    return this.repo.createQueryBuilder('e')
      .where('e.tenant_id = :tenantId', { tenantId })
      .andWhere('e.expense_date BETWEEN :from AND :to', { from, to })
      .groupBy('e.category')
      .select(['e.category as category', 'SUM(e.amount) as total', 'COUNT(e.id) as count'])
      .orderBy('total', 'DESC')
      .getRawMany();
  }

  create(tenantId: number, userId: number, dto: CreateExpenseDto) {
    return this.repo.save(this.repo.create({ tenant_id: tenantId, user_id: userId, ...dto }));
  }

  delete(id: number, tenantId: number) {
    return this.repo.delete({ id, tenant_id: tenantId });
  }
}
