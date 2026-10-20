import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Not, Repository } from 'typeorm';
import { CodItem } from '../../database/entities/cod-item.entity';
import { CodExpense } from '../../database/entities/cod-expense.entity';
import { CodOrder, CodOrderStatus } from '../../database/entities/cod-order.entity';
import { CodOrderItem } from '../../database/entities/cod-order-item.entity';
import { CodAccountService } from './cod-account.service';
import {
  buildDashboard, buildReport, buildUnits, lockUnitRows, colomboYear, resolveRange, round2,
  RangeKey, LineWithCost,
} from './cod-analytics';
import { SaveCodItemDto, SaveCodExpenseDto, CreateCodOrderDto } from './cod.dto';

const isDuplicate = (err: any) =>
  err?.code === 'ER_DUP_ENTRY' || err?.code === '23505' || err?.driverError?.code === 'ER_DUP_ENTRY' || err?.driverError?.code === '23505';

@Injectable()
export class CodService {
  constructor(
    private ds: DataSource,
    private account: CodAccountService,
    @InjectRepository(CodItem) private itemRepo: Repository<CodItem>,
    @InjectRepository(CodExpense) private expenseRepo: Repository<CodExpense>,
    @InjectRepository(CodOrder) private orderRepo: Repository<CodOrder>,
    @InjectRepository(CodOrderItem) private lineRepo: Repository<CodOrderItem>,
  ) {}

  // ───────────── items ─────────────

  listItems(tenantId: number) {
    return this.itemRepo.find({ where: { tenant_id: tenantId }, order: { name: 'ASC' } });
  }

  /** landed_cost / profit_per_unit were generated columns in the original schema. */
  private applyItem(item: CodItem, dto: SaveCodItemDto) {
    const n = (v: unknown, d: number) => (v === undefined || v === null || !Number.isFinite(Number(v)) ? d : Number(v));
    item.name = dto.name.trim();
    item.sku = dto.sku.trim();
    item.category = dto.category?.trim() || 'Uncategorized';
    if (dto.image_url !== undefined) item.image_url = dto.image_url || null;
    item.cost_currency = dto.cost_currency ?? item.cost_currency ?? 'LKR';
    item.buying_price = n(dto.buying_price, item.buying_price ?? 0);
    item.exchange_rate = n(dto.exchange_rate, item.exchange_rate ?? 1);
    item.shipping_cost = n(dto.shipping_cost, item.shipping_cost ?? 0);
    item.customs_price = n(dto.customs_price, item.customs_price ?? 0);
    item.other_cost = n(dto.other_cost, item.other_cost ?? 0);
    item.selling_price = n(dto.selling_price, item.selling_price ?? 0);
    item.stock_quantity = Math.max(0, Math.trunc(n(dto.stock_quantity, item.stock_quantity ?? 0)));
    item.low_stock_threshold = Math.max(0, Math.trunc(n(dto.low_stock_threshold, item.low_stock_threshold ?? 5)));
    const landed = item.buying_price * item.exchange_rate + item.shipping_cost + item.customs_price + item.other_cost;
    item.landed_cost = round2(landed);
    item.profit_per_unit = round2(item.selling_price - landed);
  }

  private async saveItemRow(item: CodItem) {
    try {
      return await this.itemRepo.save(item);
    } catch (err) {
      if (isDuplicate(err)) throw new ConflictException({ statusCode: 409, code: 'DUPLICATE_SKU', message: 'DUPLICATE_SKU' });
      throw err;
    }
  }

  async createItem(tenantId: number, dto: SaveCodItemDto) {
    await this.account.assertCanAddItem(tenantId);
    const item = this.itemRepo.create({ tenant_id: tenantId });
    this.applyItem(item, dto);
    return this.saveItemRow(item);
  }

  async updateItem(tenantId: number, id: number, dto: SaveCodItemDto) {
    const item = await this.itemRepo.findOne({ where: { id, tenant_id: tenantId } });
    if (!item) throw new NotFoundException('Item not found');
    this.applyItem(item, dto);
    return this.saveItemRow(item);
  }

  async deleteItem(tenantId: number, id: number) {
    const res = await this.itemRepo.delete({ id, tenant_id: tenantId });
    if (!res.affected) throw new NotFoundException('Item not found');
    return { ok: true };
  }

  // ───────────── expenses ─────────────

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

  // ───────────── orders ─────────────

  listOrders(tenantId: number) {
    return this.orderRepo.find({ where: { tenant_id: tenantId }, order: { created_at: 'DESC', id: 'DESC' } });
  }

  async getOrder(tenantId: number, id: number) {
    const order = await this.orderRepo.findOne({ where: { id, tenant_id: tenantId } });
    if (!order) throw new NotFoundException('Order not found');
    const order_items = await this.lineRepo.find({ where: { order_id: id, tenant_id: tenantId }, order: { id: 'ASC' } });
    return { ...order, order_items };
  }

  /** INV-YYYY-NNNN, next number for this tenant and (Colombo) year. */
  private async nextInvoiceNumber(manager: EntityManager, tenantId: number) {
    const yr = colomboYear();
    const last = await manager.getRepository(CodOrder)
      .createQueryBuilder('o')
      .select('o.invoice_number', 'invoice_number')
      .where('o.tenant_id = :tenantId', { tenantId })
      .andWhere('o.invoice_number LIKE :prefix', { prefix: `INV-${yr}-%` })
      .orderBy('LENGTH(o.invoice_number)', 'DESC')
      .addOrderBy('o.invoice_number', 'DESC')
      .limit(1)
      .getRawOne<{ invoice_number: string }>();
    const next = (last ? parseInt(last.invoice_number.slice(9), 10) || 0 : 0) + 1;
    return `INV-${yr}-${String(next).padStart(4, '0')}`;
  }

  async createOrder(tenantId: number, dto: CreateCodOrderDto) {
    const lines = dto.lines.filter(l => l.quantity > 0);
    if (!lines.length) throw new BadRequestException({ statusCode: 400, code: 'NO_LINES', message: 'NO_LINES' });
    await this.account.assertCanAddOrder(tenantId);

    const items = await this.itemRepo.find({ where: { tenant_id: tenantId, id: In(lines.map(l => l.item_id)) } });
    const byId = new Map(items.map(i => [i.id, i]));
    const valid = lines.filter(l => byId.has(l.item_id));
    if (!valid.length) throw new BadRequestException({ statusCode: 400, code: 'NO_LINES', message: 'NO_LINES' });

    const subtotal = round2(valid.reduce((s, l) => s + Math.trunc(l.quantity) * round2(l.unit_price), 0));
    const delivery = round2(dto.delivery_charge ?? 0);
    const discount = round2(dto.discount ?? 0);

    // The (tenant_id, invoice_number) unique key settles a race between two simultaneous orders; retry then.
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await this.ds.transaction(async manager => {
          const order = await manager.getRepository(CodOrder).save(manager.getRepository(CodOrder).create({
            tenant_id: tenantId,
            invoice_number: await this.nextInvoiceNumber(manager, tenantId),
            customer_name: dto.customer_name.trim(),
            customer_phone: dto.customer_phone?.trim() ?? '',
            customer_address: dto.customer_address?.trim() ?? '',
            city: dto.city?.trim() ?? '',
            status: 'pending',
            subtotal,
            delivery_charge: delivery,
            discount,
            total_amount: round2(subtotal + delivery - discount),
            notes: dto.notes?.trim() || null,
            stock_deducted: false,
          }));
          await manager.getRepository(CodOrderItem).save(valid.map(l => manager.getRepository(CodOrderItem).create({
            tenant_id: tenantId,
            order_id: order.id,
            item_id: l.item_id,
            item_name: byId.get(l.item_id)!.name,
            quantity: Math.trunc(l.quantity),
            unit_price: round2(l.unit_price),
            line_total: round2(Math.trunc(l.quantity) * round2(l.unit_price)),
          })));
          return order;
        });
      } catch (err) {
        if (!isDuplicate(err) || attempt === 2) throw err;
      }
    }
  }

  /**
   * Moves one order to a status, keeping stock in step (the original's sync_stock_on_status trigger):
   * entering 'delivered' deducts each line's quantity, leaving it puts the stock back.
   */
  private async applyStatus(manager: EntityManager, order: CodOrder, status: CodOrderStatus) {
    if (order.status === status) return false;
    const deduct = status === 'delivered' && !order.stock_deducted;
    const restore = status !== 'delivered' && order.stock_deducted;
    if (deduct || restore) {
      await this.moveStock(manager, order, deduct ? -1 : 1);
      order.stock_deducted = deduct;
    }
    order.status = status;
    await manager.getRepository(CodOrder).save(order);
    return true;
  }

  private async moveStock(manager: EntityManager, order: CodOrder, sign: 1 | -1) {
    const lines = await manager.getRepository(CodOrderItem).find({ where: { order_id: order.id, tenant_id: order.tenant_id } });
    const items = manager.getRepository(CodItem);
    for (const l of lines) {
      if (l.item_id === null) continue;
      const where = { id: l.item_id, tenant_id: order.tenant_id };
      if (sign < 0) await items.decrement(where, 'stock_quantity', l.quantity);
      else await items.increment(where, 'stock_quantity', l.quantity);
    }
  }

  async updateOrderStatus(tenantId: number, id: number, status: CodOrderStatus) {
    return this.ds.transaction(async manager => {
      const order = await manager.getRepository(CodOrder).findOne({ where: { id, tenant_id: tenantId } });
      if (!order) throw new NotFoundException('Order not found');
      await this.applyStatus(manager, order, status);
      return order;
    });
  }

  /** Moves many orders to one status; orders already there are left alone. Premium only. */
  async bulkUpdateStatus(tenantId: number, ids: number[], status: CodOrderStatus) {
    if (!(await this.account.isPremium(tenantId))) {
      throw new BadRequestException({ statusCode: 400, code: 'PREMIUM_REQUIRED', message: 'PREMIUM_REQUIRED' });
    }
    const unique = Array.from(new Set(ids)).slice(0, 2000);
    if (!unique.length) return { updated: 0 };
    return this.ds.transaction(async manager => {
      const orders = await manager.getRepository(CodOrder).find({ where: { tenant_id: tenantId, id: In(unique), status: Not(status) } });
      let updated = 0;
      for (const o of orders) if (await this.applyStatus(manager, o, status)) updated++;
      return { updated };
    });
  }

  /** Deleting a delivered order puts its stock back, so inventory stays consistent. */
  async deleteOrder(tenantId: number, id: number) {
    return this.ds.transaction(async manager => {
      const order = await manager.getRepository(CodOrder).findOne({ where: { id, tenant_id: tenantId } });
      if (!order) throw new NotFoundException('Order not found');
      if (order.stock_deducted) await this.moveStock(manager, order, 1);
      await manager.getRepository(CodOrderItem).delete({ order_id: id, tenant_id: tenantId });
      await manager.getRepository(CodOrder).delete({ id, tenant_id: tenantId });
      return { ok: true };
    });
  }

  // ───────────── insights ─────────────

  /** Order lines with their item's current landed cost (COGS), like the original's items(landed_cost) join. */
  private async linesWithCost(tenantId: number): Promise<LineWithCost[]> {
    const [lines, items] = await Promise.all([
      this.lineRepo.find({ where: { tenant_id: tenantId } }),
      this.itemRepo.find({ where: { tenant_id: tenantId }, select: ['id', 'landed_cost'] }),
    ]);
    const cost = new Map(items.map(i => [i.id, Number(i.landed_cost)]));
    return lines.map(l => ({ ...l, landed_cost: l.item_id !== null ? cost.get(l.item_id) ?? 0 : 0 }));
  }

  async dashboard(tenantId: number) {
    const [premium, orders, orderItems, items, expenses] = await Promise.all([
      this.account.isPremium(tenantId),
      this.listOrders(tenantId),
      this.linesWithCost(tenantId),
      this.listItems(tenantId),
      this.expenseRepo.find({ where: { tenant_id: tenantId } }),
    ]);
    return { premium, model: buildDashboard({ orders, orderItems, items, expenses }, resolveRange('this_month'), premium) };
  }

  async report(tenantId: number, rangeKey: RangeKey) {
    const [premium, orders, orderItems, expenses] = await Promise.all([
      this.account.isPremium(tenantId),
      this.orderRepo.find({ where: { tenant_id: tenantId } }),
      this.linesWithCost(tenantId),
      this.expenseRepo.find({ where: { tenant_id: tenantId } }),
    ]);
    return { premium, report: buildReport({ orders, orderItems, expenses }, rangeKey, premium) };
  }

  async units(tenantId: number, rangeKey: RangeKey, q: string) {
    const premium = await this.account.isPremium(tenantId);
    const [orders, orderItems, items] = await Promise.all([
      this.orderRepo.find({ where: { tenant_id: tenantId }, select: ['id', 'status', 'created_at'] }),
      this.lineRepo.find({ where: { tenant_id: tenantId }, select: ['order_id', 'item_id', 'item_name', 'quantity', 'line_total'] }),
      this.itemRepo.find({ where: { tenant_id: tenantId }, select: ['id', 'sku'] }),
    ]);
    // Item search is part of Premium; free accounts get unfiltered totals and placeholder rows only
    const query = premium ? (q ?? '').slice(0, 100) : '';
    const stages = buildUnits({ orders, orderItems, items }, rangeKey === 'all' ? null : resolveRange(rangeKey), query);
    return { premium, query, stages: premium ? stages : lockUnitRows(stages) };
  }
}
