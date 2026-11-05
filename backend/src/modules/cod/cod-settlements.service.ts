import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, Not, Repository } from 'typeorm';
import { CodCourier } from '../../database/entities/cod-courier.entity';
import { CodCourierAccount } from '../../database/entities/cod-courier-account.entity';
import { CodExpense } from '../../database/entities/cod-expense.entity';
import { CodOrder } from '../../database/entities/cod-order.entity';
import { CodRemittance, CodRemittanceLine, RemittanceOutcome } from '../../database/entities/cod-remittance.entity';
import { round2 } from './cod-analytics';
import { CodAuditService } from './cod-audit.service';
import { CodCouriersService } from './cod-couriers.service';
import { OVERDUE_AFTER_DAYS, OrderForMatching, StatementRow, cashWithCouriers, checkStatement, isApplied, statementTotals } from './cod-settlements-calc';
import { localDay } from './cod-orders-calc';
import { RecordSettlementDto } from './cod.dto';

type Actor = { sub: number; tenant_id: number };

const coded = (code: string) => ({ statusCode: 400, code, message: code });
/** Fees are a shipping cost, so they count in every profit figure without those figures changing. */
const FEE_CATEGORY = 'Shipping';

/** What each courier owes the business, and the payments that settled it. */
@Injectable()
export class CodSettlementsService {
  constructor(
    private ds: DataSource,
    @InjectRepository(CodOrder) private orderRepo: Repository<CodOrder>,
    @InjectRepository(CodCourier) private courierRepo: Repository<CodCourier>,
    @InjectRepository(CodCourierAccount) private accountRepo: Repository<CodCourierAccount>,
    @InjectRepository(CodRemittance) private remittanceRepo: Repository<CodRemittance>,
    @InjectRepository(CodRemittanceLine) private lineRepo: Repository<CodRemittanceLine>,
    private couriers: CodCouriersService,
    private audit: CodAuditService,
  ) {}

  async overview(tenantId: number) {
    const unsettled = await this.orderRepo.find({
      where: { tenant_id: tenantId, status: 'delivered', payment_type: 'cod', remittance_id: IsNull(), courier_id: Not(IsNull()) },
      order: { delivered_at: 'ASC', id: 'ASC' },
    });
    const noCourier = await this.orderRepo.count({ where: { tenant_id: tenantId, status: 'delivered', payment_type: 'cod', remittance_id: IsNull(), courier_id: IsNull() } });
    const remittances = await this.remittanceRepo.find({ where: { tenant_id: tenantId }, order: { paid_on: 'DESC', id: 'DESC' } });
    const names = await this.couriers.byIds([...unsettled.map(o => o.courier_id), ...remittances.map(r => r.courier_id)]);
    const name = (id: number | null) => names.get(id as number)?.name ?? '';

    const month = localDay(new Date()).slice(0, 7);
    const thisMonth = remittances.filter(r => String(r.paid_on).slice(0, 7) === month);
    const perCourier = cashWithCouriers(unsettled.map(o => ({ courier_id: o.courier_id as number, total_amount: o.total_amount, delivered_at: o.delivered_at })));
    return {
      overdue_after_days: OVERDUE_AFTER_DAYS,
      totals: {
        with_couriers: round2(perCourier.reduce((s, c) => s + c.amount, 0)),
        orders: unsettled.length,
        overdue: round2(perCourier.reduce((s, c) => s + c.overdue_amount, 0)),
        received_this_month: round2(thisMonth.reduce((s, r) => s + r.received, 0)),
        fees_this_month: round2(thisMonth.reduce((s, r) => s + r.fees, 0)),
        delivered_without_courier: noCourier,
      },
      couriers: perCourier.map(c => ({ ...c, name: name(c.courier_id) })),
      orders: unsettled.slice(0, 500).map(o => ({
        id: o.id, invoice_number: o.invoice_number, customer_name: o.customer_name, tracking_number: o.tracking_number,
        courier_id: o.courier_id, courier_name: name(o.courier_id), total_amount: o.total_amount, delivered_at: o.delivered_at,
      })),
      remittances: remittances.slice(0, 50).map(r => ({
        id: r.id, courier_id: r.courier_id, courier_name: name(r.courier_id), reference: r.reference, paid_on: r.paid_on,
        collected: r.collected, fees: r.fees, received: r.received, notes: r.notes,
      })),
    };
  }

  private async ordersForMatching(tenantId: number, repo = this.orderRepo): Promise<OrderForMatching[]> {
    return repo.find({
      where: { tenant_id: tenantId },
      select: ['id', 'invoice_number', 'customer_name', 'tracking_number', 'courier_id', 'status', 'payment_type', 'total_amount', 'remittance_id'],
    });
  }

  async preview(tenantId: number, courierId: number, rows: StatementRow[]) {
    await this.couriers.assertUsable(tenantId, courierId);
    const lines = checkStatement(rows, await this.ordersForMatching(tenantId), courierId);
    return { lines, totals: statementTotals(lines) };
  }

  async record(actor: Actor, dto: RecordSettlementDto) {
    const tenantId = actor.tenant_id;
    await this.couriers.assertUsable(tenantId, dto.courier_id);
    const courier = await this.courierRepo.findOneOrFail({ where: { id: dto.courier_id } });

    const saved = await this.ds.transaction(async manager => {
      const orders = manager.getRepository(CodOrder);
      const checked = checkStatement(dto.rows, await this.ordersForMatching(tenantId, orders), dto.courier_id);
      const ids = checked.filter(l => isApplied(l.outcome)).map(l => l.order_id as number);
      // Two people saving overlapping statements: the second one waits here, then finds those orders already settled
      const locked = ids.length ? await orders.find({ where: { id: In(ids), tenant_id: tenantId }, lock: { mode: 'pessimistic_write' } }) : [];
      const settled = new Set(locked.filter(o => o.remittance_id).map(o => o.id));
      const lines = checked.map(l => (l.order_id && settled.has(l.order_id) ? { ...l, outcome: 'already_settled' as const } : l));
      const applied = lines.filter(l => isApplied(l.outcome));
      if (!applied.length) throw new BadRequestException(coded('SETTLEMENT_EMPTY'));

      const totals = statementTotals(lines);
      const reference = dto.reference?.trim() ?? '';
      let expenseId: number | null = null;
      if (totals.fees > 0) {
        const expenses = manager.getRepository(CodExpense);
        const expense = await expenses.save(expenses.create({
          tenant_id: tenantId, title: `Courier fees: ${courier.name}`, category: FEE_CATEGORY, amount: totals.fees,
          expense_date: dto.paid_on, vendor: courier.name.slice(0, 150), reference: reference.slice(0, 100) || null, notes: null,
        }));
        expenseId = expense.id;
      }
      const remittances = manager.getRepository(CodRemittance);
      const remittance = await remittances.save(remittances.create({
        tenant_id: tenantId, courier_id: dto.courier_id, reference, paid_on: dto.paid_on, collected: totals.collected, fees: totals.fees,
        received: dto.received ?? totals.net, expense_id: expenseId, notes: dto.notes?.trim() || null, created_by: actor.sub,
      }));
      const lineRepo = manager.getRepository(CodRemittanceLine);
      await lineRepo.save(applied.map(l => lineRepo.create({
        tenant_id: tenantId, remittance_id: remittance.id, order_id: l.order_id, tracking_number: l.tracking_number.slice(0, 100),
        collected: l.collected, fee: l.fee, expected: l.expected, outcome: l.outcome as RemittanceOutcome,
      })));
      await orders.update({ id: In(applied.map(l => l.order_id as number)), tenant_id: tenantId }, { remittance_id: remittance.id });
      // A statement also tells us the courier of orders nobody had filled in
      await orders.update({ id: In(applied.map(l => l.order_id as number)), tenant_id: tenantId, courier_id: IsNull() }, { courier_id: dto.courier_id });
      return { remittance, lines, totals };
    });

    if (dto.mapping) await this.saveMapping(tenantId, dto.courier_id, dto.mapping);
    await this.audit.log(actor, 'payment', 'cod_courier', saved.remittance.id, `${courier.name} payment Rs ${saved.remittance.received}, ${saved.totals.applied} orders`);
    return saved;
  }

  async detail(tenantId: number, id: number) {
    const remittance = await this.remittanceRepo.findOne({ where: { id, tenant_id: tenantId } });
    if (!remittance) throw new NotFoundException('Payment not found');
    const lines = await this.lineRepo.find({ where: { remittance_id: id, tenant_id: tenantId }, order: { id: 'ASC' } });
    const orderIds = lines.map(l => l.order_id).filter((v): v is number => v != null);
    const orders = orderIds.length
      ? await this.orderRepo.find({ where: { id: In(orderIds), tenant_id: tenantId }, select: ['id', 'invoice_number', 'customer_name'] })
      : [];
    const byId = new Map(orders.map(o => [o.id, o]));
    return {
      ...remittance,
      courier_name: (await this.couriers.byIds([remittance.courier_id])).get(remittance.courier_id)?.name ?? '',
      lines: lines.map(l => ({ ...l, invoice_number: byId.get(l.order_id as number)?.invoice_number ?? null, customer_name: byId.get(l.order_id as number)?.customer_name ?? null })),
    };
  }

  /** Undoes a payment entered by mistake: its orders go back to "with the courier" and its fee expense is removed. */
  async remove(actor: Actor, id: number) {
    const remittance = await this.ds.transaction(async manager => {
      const row = await manager.getRepository(CodRemittance).findOne({ where: { id, tenant_id: actor.tenant_id } });
      if (!row) throw new NotFoundException('Payment not found');
      await manager.getRepository(CodOrder).update({ remittance_id: id, tenant_id: actor.tenant_id }, { remittance_id: null });
      if (row.expense_id) await manager.getRepository(CodExpense).delete({ id: row.expense_id, tenant_id: actor.tenant_id });
      await manager.getRepository(CodRemittance).delete({ id, tenant_id: actor.tenant_id });
      return row;
    });
    await this.audit.log(actor, 'deleted', 'cod_courier', id, `payment Rs ${remittance.received} undone`);
    return { ok: true };
  }

  async mapping(tenantId: number, courierId: number) {
    const row = await this.accountRepo.findOne({ where: { tenant_id: tenantId, courier_id: courierId } });
    if (!row?.statement_mapping) return { mapping: null };
    try {
      return { mapping: JSON.parse(row.statement_mapping) };
    } catch {
      return { mapping: null };
    }
  }

  private async saveMapping(tenantId: number, courierId: number, mapping: { tracking: string; collected: string; fee?: string }) {
    const row = await this.accountRepo.findOne({ where: { tenant_id: tenantId, courier_id: courierId } })
      ?? this.accountRepo.create({ tenant_id: tenantId, courier_id: courierId });
    row.statement_mapping = JSON.stringify({ tracking: mapping.tracking, collected: mapping.collected, fee: mapping.fee ?? '' });
    await this.accountRepo.save(row);
  }
}
