import { Controller, Get, Injectable, Query, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ProductGuard, Product } from '../../common/guards/product.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CodOrder } from '../../database/entities/cod-order.entity';
import { CodOrderItem } from '../../database/entities/cod-order-item.entity';
import { CodItem } from '../../database/entities/cod-item.entity';
import { CodCap, CodCapabilityGuard } from './cod-capabilities';
import { CodExpensesService } from './cod-expenses.service';
import { isRangeKey, resolveRange, RangeKey } from './cod-analytics';
import { cashModel } from './cod-finance';

/** Builds the financial summary from live rows on every request — nothing derived is stored. */
@Injectable()
export class CodFinanceService {
  constructor(
    private expenses: CodExpensesService,
    @InjectRepository(CodOrder) private orderRepo: Repository<CodOrder>,
    @InjectRepository(CodOrderItem) private lineRepo: Repository<CodOrderItem>,
    @InjectRepository(CodItem) private itemRepo: Repository<CodItem>,
  ) {}

  async summary(tenantId: number, rangeKey: RangeKey) {
    const range = resolveRange(rangeKey);
    const [orders, lines, expenses, personal] = await Promise.all([
      this.orderRepo.find({ where: { tenant_id: tenantId }, select: ['id', 'status', 'total_amount', 'created_at'] }),
      this.lineRepo.find({ where: { tenant_id: tenantId }, select: ['order_id', 'item_id', 'quantity'] }),
      this.expenses.listExpenses(tenantId),
      this.expenses.listPersonal(tenantId),
    ]);
    // Unit landed cost from the catalogue; custom (off-catalogue) and deleted items cost 0
    const itemIds = [...new Set(lines.map(l => l.item_id).filter((v): v is number => v != null))];
    const items = itemIds.length ? await this.itemRepo.find({ where: { tenant_id: tenantId, id: In(itemIds) }, select: ['id', 'landed_cost'] }) : [];
    const cost = new Map(items.map(i => [i.id, Number(i.landed_cost) || 0]));

    const model = cashModel({
      orders: orders.map(o => ({ id: o.id, status: o.status, total_amount: Number(o.total_amount), created_at: o.created_at })),
      lines: lines.map(l => ({ order_id: l.order_id, quantity: l.quantity, landed_cost: l.item_id != null ? cost.get(l.item_id) ?? 0 : 0 })),
      expenses: expenses.map(e => ({ amount: Number(e.amount), category: e.category, expense_date: e.expense_date })),
      personal: personal.map(e => ({ amount: Number(e.amount), category: e.category, expense_date: e.expense_date })),
    }, range);

    const from = new Date(range.from.getTime() + 5.5 * 3600_000).toISOString().slice(0, 10);
    const to = new Date(range.to.getTime() + 5.5 * 3600_000).toISOString().slice(0, 10);
    return {
      range: rangeKey,
      ...model,
      // Compact personal list for the selected period (newest first) and all personal rows for the tips engine
      personalInRange: personal.filter(p => p.expense_date >= from && p.expense_date <= to).slice(0, 50),
      personalRows: personal.map(p => ({ category: p.category, amount: Number(p.amount), expense_date: p.expense_date, notes: p.notes ?? null })),
    };
  }
}

/** /api/cod/finance — the owner's "Personal & Cash" view (capability `personal_finance`, admin only). */
@Controller('cod')
@UseGuards(JwtAuthGuard, ProductGuard, CodCapabilityGuard)
@Product('cod')
export class CodFinanceController {
  constructor(private finance: CodFinanceService) {}

  @Get('finance')
  @CodCap('personal_finance')
  summary(@CurrentUser() u: any, @Query('range') range?: string) {
    return this.finance.summary(u.tenant_id, isRangeKey(range) ? range : 'this_month');
  }
}
