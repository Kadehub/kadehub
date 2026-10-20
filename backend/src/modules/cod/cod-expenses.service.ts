import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CodExpense } from '../../database/entities/cod-expense.entity';
import { round2 } from './cod-analytics';
import { SaveCodExpenseDto } from './cod.dto';

/** COD business expenses (and, later, the owner's personal expenses). Split out of CodService. */
@Injectable()
export class CodExpensesService {
  constructor(@InjectRepository(CodExpense) private expenseRepo: Repository<CodExpense>) {}

  listExpenses(tenantId: number) {
    return this.expenseRepo.find({ where: { tenant_id: tenantId }, order: { expense_date: 'DESC', id: 'DESC' } });
  }

  private applyExpense(e: CodExpense, dto: SaveCodExpenseDto) {
    e.title = dto.title.trim();
    e.category = dto.category?.trim() || 'Misc';
    e.amount = round2(dto.amount);
    e.expense_date = dto.expense_date ?? new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);
    e.notes = dto.notes?.trim() || null;
  }

  createExpense(tenantId: number, dto: SaveCodExpenseDto) {
    const e = this.expenseRepo.create({ tenant_id: tenantId });
    this.applyExpense(e, dto);
    return this.expenseRepo.save(e);
  }

  async updateExpense(tenantId: number, id: number, dto: SaveCodExpenseDto) {
    const e = await this.expenseRepo.findOne({ where: { id, tenant_id: tenantId } });
    if (!e) throw new NotFoundException('Expense not found');
    this.applyExpense(e, dto);
    return this.expenseRepo.save(e);
  }

  async deleteExpense(tenantId: number, id: number) {
    const res = await this.expenseRepo.delete({ id, tenant_id: tenantId });
    if (!res.affected) throw new NotFoundException('Expense not found');
    return { ok: true };
  }
}
