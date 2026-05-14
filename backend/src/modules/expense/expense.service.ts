import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Expense } from '../../database/entities/expense.entity';
import { ExpenseCategory } from '../../database/entities/expense-category.entity';
import { CreateExpenseDto } from './expense.dto';

const DEFAULT_CATEGORIES = ['Rent', 'Utilities', 'Salaries', 'Transport', 'Maintenance', 'Marketing', 'Other'];

@Injectable()
export class ExpenseService {
  constructor(
    @InjectRepository(Expense) private repo: Repository<Expense>,
    @InjectRepository(ExpenseCategory) private catRepo: Repository<ExpenseCategory>,
  ) {}

  async getCategories(tenantId: number) {
    const cats = await this.catRepo.find({ where: { tenant_id: tenantId, is_active: true }, order: { name: 'ASC' } });
    if (cats.length === 0) {
      // Seed defaults on first access
      const seeds = DEFAULT_CATEGORIES.map(name => this.catRepo.create({ tenant_id: tenantId, name }));
      await this.catRepo.save(seeds);
      return seeds;
    }
    return cats;
  }

  async addCategory(tenantId: number, name: string) {
    return this.catRepo.save(this.catRepo.create({ tenant_id: tenantId, name }));
  }

  async deleteCategory(id: number, tenantId: number) {
    return this.catRepo.update({ id, tenant_id: tenantId }, { is_active: false });
  }

  getExpenses(tenantId: number, from: string, to: string) {
    return this.repo.createQueryBuilder('e')
      .leftJoin('e.user', 'u')
      .where('e.tenant_id = :tenantId', { tenantId })
      .andWhere('e.expense_date BETWEEN :from AND :to', { from, to })
      .select([
        'e.id AS id', 'e.category AS category', 'e.description AS description',
        'e.amount AS amount', 'e.expense_date AS expense_date',
        'e.created_at AS created_at', 'u.name AS user_name',
      ])
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
