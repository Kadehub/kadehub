import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Not, Repository } from 'typeorm';
import { CodItem } from '../../database/entities/cod-item.entity';
import { CodBusiness } from '../../database/entities/cod-business.entity';
import { CodExpense } from '../../database/entities/cod-expense.entity';
import { CodOrder, CodOrderStatus } from '../../database/entities/cod-order.entity';
import { CodOrderItem } from '../../database/entities/cod-order-item.entity';
import { CodCreditPayment } from '../../database/entities/cod-credit-payment.entity';
import { CodAuditService } from './cod-audit.service';
import {
  computeOrderTotals, summariseCredit, dueBucket, deriveDueDate, nextInvoiceNumber, phoneKey, localDay, OrderRuleError, checkCustomerPhone,
} from './cod-orders-calc';
import { CodAccountService } from './cod-account.service';
import {
  buildDashboard, buildReport, buildUnits, lockUnitRows, colomboYear, resolveRange, round2,
  RangeKey, LineWithCost,
} from './cod-analytics';
import {
  SaveCodItemDto, CreateCodOrderDto, UpdateCodOrderDto, SaveCodOrderDto, AddCreditPaymentDto, SettleCreditDto,
} from './cod.dto';

/** The signed-in user as the JWT carries it. */
type Actor = { sub: number; tenant_id: number; role?: string };

const isDuplicate = (err: any) =>
  err?.code === 'ER_DUP_ENTRY' || err?.code === '23505' || err?.driverError?.code === 'ER_DUP_ENTRY' || err?.driverError?.code === '23505';

@Injectable()
export class CodService {
  constructor(
    private ds: DataSource,
    private account: CodAccountService,
    @InjectRepository(CodItem) private itemRepo: Repository<CodItem>,
    // Read-only here (dashboard/report totals); expense writes live in CodExpensesService
    @InjectRepository(CodExpense) private expenseRepo: Repository<CodExpense>,
    @InjectRepository(CodOrder) private orderRepo: Repository<CodOrder>,
    @InjectRepository(CodOrderItem) private lineRepo: Repository<CodOrderItem>,
    @InjectRepository(CodCreditPayment) private paymentRepo: Repository<CodCreditPayment>,
    private audit: CodAuditService,
  ) {}

  // ───────────── items ─────────────

  /** Items for the catalogue and the order picker. Without the `costs` capability the cost/profit fields are left out. */
  async listItems(tenantId: number, withCosts = true) {
    const items = await this.itemRepo.find({ where: { tenant_id: tenantId }, order: { name: 'ASC' } });
    if (withCosts) return items;
    return items.map(({ buying_price, exchange_rate, shipping_cost, customs_price, other_cost, landed_cost, profit_per_unit, cost_currency, ...rest }) => rest);
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
    item.exchange_rate = item.cost_currency === 'LKR' ? 1 : n(dto.exchange_rate, item.exchange_rate ?? 1);
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

  // ───────────── orders ─────────────

  /** All orders, newest first, each with `paid` (sum of credit payments). */
  async listOrders(tenantId: number) {
    const orders = await this.orderRepo.find({ where: { tenant_id: tenantId }, order: { created_at: 'DESC', id: 'DESC' } });
    const paid = await this.paidByOrder(tenantId);
    return orders.map(o => ({ ...o, paid: paid.get(o.id) ?? 0 }));
  }

  async getOrder(tenantId: number, id: number) {
    const order = await this.orderRepo.findOne({ where: { id, tenant_id: tenantId } });
    if (!order) throw new NotFoundException('Order not found');
    const [order_items, payments, trust] = await Promise.all([
      this.lineRepo.find({ where: { order_id: id, tenant_id: tenantId }, order: { id: 'ASC' } }),
      this.paymentRepo.find({ where: { order_id: id, tenant_id: tenantId }, order: { payment_date: 'ASC', id: 'ASC' } }),
      this.customerTrustStats(tenantId, order.customer_phone, id),
    ]);
    const credit = summariseCredit(order.total_amount, payments.reduce((s, p) => s + Number(p.amount), 0));
    return {
      ...order, order_items, payments, trust,
      credit: { ...credit, bucket: dueBucket({ payment_due_date: order.payment_due_date, created_at: order.created_at, outstanding: credit.outstanding }) },
    };
  }

  /** INV-YYYY-NNNN, next number for this tenant and (Colombo) year. */
  private async nextInvoiceNumber(manager: EntityManager, tenantId: number) {
    // Serialise numbering per tenant: lock the tenant's single cod_business row (SELECT … FOR UPDATE, works on
    // MySQL and Postgres) so concurrent creates wait instead of reading the same "latest" number.
    await manager.getRepository(CodBusiness).createQueryBuilder('b')
      .setLock('pessimistic_write')
      .where('b.tenant_id = :tenantId', { tenantId })
      .getOne();
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
    return nextInvoiceNumber(yr, last?.invoice_number);
  }

  /** Validates lines/totals and snapshots catalogue names; custom lines keep their typed name. */
  private async priceLines(tenantId: number, dto: SaveCodOrderDto) {
    let totals: ReturnType<typeof computeOrderTotals>;
    try {
      totals = computeOrderTotals(
        dto.lines.map(l => ({ item_id: l.item_id ?? null, custom_name: l.custom_name, quantity: l.quantity, unit_price: l.unit_price })),
        dto.delivery_charge ?? 0, dto.discount ?? 0,
      );
    } catch (e) {
      throw this.ruleError(e);
    }
    const ids = totals.lines.filter(l => l.item_id != null).map(l => l.item_id as number);
    const items = ids.length ? await this.itemRepo.find({ where: { tenant_id: tenantId, id: In(ids) } }) : [];
    const byId = new Map(items.map(i => [i.id, i]));
    const lines = totals.lines.map(l => {
      if (l.item_id == null) return { item_id: null, item_name: (l.custom_name ?? '').trim().slice(0, 255), quantity: l.quantity, unit_price: l.unit_price, line_total: l.line_total };
      const item = byId.get(l.item_id);
      if (!item) throw new BadRequestException({ statusCode: 400, code: 'ITEM_NOT_FOUND', message: 'ITEM_NOT_FOUND' });
      return { item_id: item.id, item_name: item.name, quantity: l.quantity, unit_price: l.unit_price, line_total: l.line_total };
    });
    return { ...totals, lines };
  }

  private ruleError(e: unknown) {
    if (e instanceof OrderRuleError) return new BadRequestException({ statusCode: 400, code: e.code, message: e.code });
    return e as Error;
  }

  /** Customer, payment and credit fields from the form; credit terms are cleared on non-credit orders. */
  private applyOrderFields(order: CodOrder, dto: SaveCodOrderDto) {
    try {
      checkCustomerPhone(dto.customer_phone, dto.payment_type ?? order.payment_type ?? 'cod');
    } catch (e) {
      throw this.ruleError(e);
    }
    order.customer_name = dto.customer_name.trim();
    order.customer_phone = dto.customer_phone?.trim() ?? '';
    order.customer_email = dto.customer_email?.trim() || null;
    order.customer_address = dto.customer_address?.trim() ?? '';
    order.city = dto.city?.trim() ?? '';
    order.notes = dto.notes?.trim() || null;
    order.payment_type = dto.payment_type ?? order.payment_type ?? 'cod';
    order.customer_type = dto.customer_type ?? order.customer_type ?? 'retail';
    order.po_number = dto.po_number?.trim() || null;
    if (dto.tracking_number !== undefined) order.tracking_number = dto.tracking_number?.trim() || null;
    if (order.payment_type === 'credit') {
      order.credit_period_days = dto.credit_period_days ?? null;
      order.payment_due_date = deriveDueDate(order.created_at ?? new Date(), order.credit_period_days, dto.payment_due_date || null);
      order.credit_note = dto.credit_note?.trim() || null;
    } else {
      order.credit_period_days = null;
      order.payment_due_date = null;
      order.credit_note = null;
    }
  }

  private lineRows(manager: EntityManager, order: CodOrder, lines: Awaited<ReturnType<CodService['priceLines']>>['lines']) {
    const repo = manager.getRepository(CodOrderItem);
    return repo.save(lines.map(l => repo.create({ tenant_id: order.tenant_id, order_id: order.id, ...l })));
  }

  /**
   * Creates an order. It is always inserted as pending (lines in the same transaction, so a failure
   * leaves no half-made invoice); a requested non-pending status is applied afterwards so the stock
   * rule runs. If delivered fails for lack of stock, the order stays pending and `warning` says so.
   */
  async createOrder(actor: Actor, dto: CreateCodOrderDto) {
    const tenantId = actor.tenant_id;
    await this.account.assertCanAddOrder(tenantId);
    const priced = await this.priceLines(tenantId, dto);
    const isCredit = (dto.payment_type ?? 'cod') === 'credit';
    const initial = isCredit ? round2(dto.initial_payment ?? 0) : 0;
    if (initial > priced.total_amount) throw new BadRequestException({ statusCode: 400, code: 'PAYMENT_TOO_LARGE', message: 'PAYMENT_TOO_LARGE' });

    let created: CodOrder | undefined;
    // The (tenant_id, invoice_number) unique key settles a race between two simultaneous orders; retry then.
    for (let attempt = 0; attempt < 5 && !created; attempt++) {
      try {
        created = await this.ds.transaction(async manager => {
          const repo = manager.getRepository(CodOrder);
          const order = repo.create({
            tenant_id: tenantId,
            invoice_number: await this.nextInvoiceNumber(manager, tenantId),
            status: 'pending',
            subtotal: priced.subtotal,
            delivery_charge: priced.delivery_charge,
            discount: priced.discount,
            total_amount: priced.total_amount,
            stock_deducted: false,
            created_by: actor.sub,
            reordered_from_order_id: dto.reordered_from_order_id ?? null,
            created_at: new Date(),
          });
          this.applyOrderFields(order, dto);
          const saved = await repo.save(order);
          await this.lineRows(manager, saved, priced.lines);
          if (initial > 0) {
            await manager.getRepository(CodCreditPayment).save(manager.getRepository(CodCreditPayment).create({
              tenant_id: tenantId, order_id: saved.id, amount: initial, payment_date: localDay(new Date()),
              method: dto.initial_payment_method ?? 'cash', notes: null, created_by: actor.sub,
            }));
          }
          return saved;
        });
      } catch (err) {
        if (!isDuplicate(err) || attempt === 4) throw err;
      }
    }
    const order = created!;
    await this.audit.log(actor, 'created', 'cod_order', order.id, `${order.invoice_number} ${order.customer_name} Rs ${order.total_amount}`);

    const target = dto.status ?? 'pending';
    let warning: string | undefined;
    if (target !== 'pending') {
      try {
        await this.updateOrderStatus(actor, order.id, target);
      } catch (err) {
        if (!(err instanceof ConflictException)) throw err;
        warning = 'SAVED_PENDING_NO_STOCK';
      }
    }
    const fresh = await this.orderRepo.findOne({ where: { id: order.id, tenant_id: tenantId } });
    return { ...fresh!, ...(warning ? { warning } : {}) };
  }

  /**
   * Replaces an order's lines and details. A delivered order (stock already taken out) has its old
   * quantities put back and the new ones taken out in the same transaction, so stock is never lost or
   * doubled; if the new lines don't fit in stock nothing changes.
   */
  async updateOrder(actor: Actor, id: number, dto: UpdateCodOrderDto) {
    const tenantId = actor.tenant_id;
    const priced = await this.priceLines(tenantId, dto);
    const saved = await this.ds.transaction(async manager => {
      const repo = manager.getRepository(CodOrder);
      const order = await repo.findOne({ where: { id, tenant_id: tenantId } });
      if (!order) throw new NotFoundException('Order not found');
      const payments = await manager.getRepository(CodCreditPayment).find({ where: { order_id: id, tenant_id: tenantId } });
      const paid = round2(payments.reduce((s, p) => s + Number(p.amount), 0));
      const newType = dto.payment_type ?? order.payment_type;
      if (payments.length && newType !== 'credit') throw new BadRequestException({ statusCode: 400, code: 'CREDIT_HAS_PAYMENTS', message: 'CREDIT_HAS_PAYMENTS' });
      if (paid > priced.total_amount) throw new BadRequestException({ statusCode: 400, code: 'TOTAL_BELOW_PAID', message: 'TOTAL_BELOW_PAID' });

      if (order.stock_deducted) await this.moveStock(manager, order, 1);
      await manager.getRepository(CodOrderItem).delete({ order_id: id, tenant_id: tenantId });
      await this.lineRows(manager, order, priced.lines);
      if (order.stock_deducted) await this.moveStock(manager, order, -1);

      this.applyOrderFields(order, dto);
      order.subtotal = priced.subtotal;
      order.delivery_charge = priced.delivery_charge;
      order.discount = priced.discount;
      order.total_amount = priced.total_amount;
      return repo.save(order);
    });
    await this.audit.log(actor, 'updated', 'cod_order', id, `${saved.invoice_number} edited, total Rs ${saved.total_amount}`);
    return saved;
  }

  /**
   * Moves one order to a status, keeping stock in step (the original's sync_stock_on_status trigger):
   * entering 'delivered' deducts each catalogue line's quantity, leaving it puts the stock back.
   * `stock_deducted` guards against moving stock twice.
   */
  private async applyStatus(manager: EntityManager, order: CodOrder, status: CodOrderStatus) {
    if (order.status === status) return false;
    const deduct = status === 'delivered' && !order.stock_deducted;
    const restore = status !== 'delivered' && order.stock_deducted;
    if (deduct || restore) {
      await this.moveStock(manager, order, deduct ? -1 : 1);
      order.stock_deducted = deduct;
    }
    if (status === 'returned') order.returned_at = new Date();
    order.status = status;
    await manager.getRepository(CodOrder).save(order);
    return true;
  }

  /**
   * Adds (+1) or takes out (-1) the order's catalogue quantities. Custom lines and lines whose item
   * was deleted are skipped. Taking out more than is in stock throws INSUFFICIENT_STOCK (409).
   */
  private async moveStock(manager: EntityManager, order: CodOrder, sign: 1 | -1) {
    const lines = await manager.getRepository(CodOrderItem).find({ where: { order_id: order.id, tenant_id: order.tenant_id } });
    const qty = new Map<number, { quantity: number; name: string }>();
    for (const l of lines) {
      if (l.item_id === null) continue;
      const cur = qty.get(l.item_id) ?? { quantity: 0, name: l.item_name };
      cur.quantity += l.quantity;
      qty.set(l.item_id, cur);
    }
    const items = manager.getRepository(CodItem);
    for (const [itemId, { quantity, name }] of qty) {
      if (sign > 0) {
        await items.increment({ id: itemId, tenant_id: order.tenant_id }, 'stock_quantity', quantity);
        continue;
      }
      const exists = await items.findOne({ where: { id: itemId, tenant_id: order.tenant_id }, select: ['id', 'stock_quantity'] });
      if (!exists) continue;
      const res = await items.createQueryBuilder()
        .update(CodItem)
        .set({ stock_quantity: () => `stock_quantity - ${Math.trunc(quantity)}` })
        .where('id = :id AND tenant_id = :t AND stock_quantity >= :q', { id: itemId, t: order.tenant_id, q: quantity })
        .execute();
      if (!res.affected) {
        throw new ConflictException({ statusCode: 409, code: 'INSUFFICIENT_STOCK', message: 'INSUFFICIENT_STOCK', item: name, available: exists.stock_quantity, needed: quantity });
      }
    }
  }

  async updateOrderStatus(actor: Actor, id: number, status: CodOrderStatus) {
    const tenantId = actor.tenant_id;
    const { order, changed, from } = await this.ds.transaction(async manager => {
      const o = await manager.getRepository(CodOrder).findOne({ where: { id, tenant_id: tenantId } });
      if (!o) throw new NotFoundException('Order not found');
      const prev = o.status;
      const did = await this.applyStatus(manager, o, status);
      return { order: o, changed: did, from: prev };
    });
    if (changed) await this.audit.log(actor, 'status', 'cod_order', id, `${order.invoice_number} ${from} → ${status}`);
    return order;
  }

  /**
   * Moves many orders to one status, each in its own transaction so one failure (e.g. not enough
   * stock) doesn't stop the rest. Orders already there are skipped. Premium only.
   */
  async bulkUpdateStatus(actor: Actor, ids: number[], status: CodOrderStatus) {
    const tenantId = actor.tenant_id;
    if (!(await this.account.isPremium(tenantId))) {
      throw new BadRequestException({ statusCode: 400, code: 'PREMIUM_REQUIRED', message: 'PREMIUM_REQUIRED' });
    }
    const unique = Array.from(new Set(ids)).slice(0, 2000);
    const found = unique.length
      ? await this.orderRepo.find({ where: { tenant_id: tenantId, id: In(unique) }, select: ['id', 'invoice_number', 'status'] })
      : [];
    const orders = found.filter(o => o.status !== status);
    const unchanged = found.length - orders.length;
    let updated = 0;
    const failed: { id: number; invoice_number: string | null; reason: string; item?: string }[] = [];
    // Ids that aren't this tenant's orders are reported, not silently dropped
    const foundIds = new Set(found.map(o => o.id));
    for (const id of unique) if (!foundIds.has(id)) failed.push({ id, invoice_number: null, reason: 'NOT_FOUND' });
    for (const o of orders) {
      try {
        await this.updateOrderStatus(actor, o.id, status);
        updated++;
      } catch (err: any) {
        const res = err?.getResponse?.();
        failed.push({ id: o.id, invoice_number: o.invoice_number, reason: res?.code ?? 'ERROR', item: res?.item });
      }
    }
    return { updated, unchanged, failed };
  }

  /** Deleting a delivered order puts its stock back, so inventory stays consistent; payments go with it. */
  async deleteOrder(actor: Actor, id: number) {
    const tenantId = actor.tenant_id;
    const order = await this.ds.transaction(async manager => {
      const o = await manager.getRepository(CodOrder).findOne({ where: { id, tenant_id: tenantId } });
      if (!o) throw new NotFoundException('Order not found');
      if (o.stock_deducted) await this.moveStock(manager, o, 1);
      await manager.getRepository(CodCreditPayment).delete({ order_id: id, tenant_id: tenantId });
      await manager.getRepository(CodOrderItem).delete({ order_id: id, tenant_id: tenantId });
      await manager.getRepository(CodOrder).delete({ id, tenant_id: tenantId });
      return o;
    });
    await this.audit.log(actor, 'deleted', 'cod_order', id, `${order.invoice_number} ${order.customer_name}`);
    return { ok: true };
  }

  async setTracking(actor: Actor, id: number, tracking: string | null | undefined) {
    const order = await this.orderRepo.findOne({ where: { id, tenant_id: actor.tenant_id } });
    if (!order) throw new NotFoundException('Order not found');
    order.tracking_number = tracking?.trim() || null;
    const saved = await this.orderRepo.save(order);
    await this.audit.log(actor, 'updated', 'cod_order', id, `${order.invoice_number} tracking ${order.tracking_number ?? '—'}`);
    return saved;
  }

  /** Stamps when staff sent the WhatsApp order confirmation. */
  async markConfirmationSent(actor: Actor, id: number) {
    const order = await this.orderRepo.findOne({ where: { id, tenant_id: actor.tenant_id } });
    if (!order) throw new NotFoundException('Order not found');
    order.confirmation_sent_at = new Date();
    return this.orderRepo.save(order);
  }

  /** Delivered / returned orders for a phone (last 9 digits, formatting ignored) — the customer trust badge. */
  async customerTrustStats(tenantId: number, phone: string | null | undefined, excludeOrderId?: number) {
    const key = phoneKey(phone);
    if (!key) return null;
    const rows = await this.orderRepo.find({ where: { tenant_id: tenantId }, select: ['id', 'customer_phone', 'status'] });
    let delivered = 0;
    let returned = 0;
    for (const r of rows) {
      if (r.id === excludeOrderId || phoneKey(r.customer_phone) !== key) continue;
      if (r.status === 'delivered') delivered++;
      else if (r.status === 'returned') returned++;
    }
    return { delivered, returned };
  }

  // ───────────── credit ─────────────

  private async paidByOrder(tenantId: number, orderIds?: number[]) {
    const where: any = { tenant_id: tenantId };
    if (orderIds) where.order_id = In(orderIds.length ? orderIds : [0]);
    const payments = await this.paymentRepo.find({ where, select: ['order_id', 'amount'] });
    const map = new Map<number, number>();
    for (const p of payments) map.set(p.order_id, round2((map.get(p.order_id) ?? 0) + Number(p.amount)));
    return map;
  }

  /** Open and settled credit orders (cancelled / returned ones are not owed) with their balances. */
  private async creditRows(tenantId: number) {
    const orders = await this.orderRepo.find({
      where: { tenant_id: tenantId, payment_type: 'credit', status: Not(In(['cancelled', 'returned'])) },
      order: { created_at: 'DESC', id: 'DESC' },
    });
    const paid = await this.paidByOrder(tenantId, orders.map(o => o.id));
    const now = new Date();
    return orders.map(o => {
      const c = summariseCredit(o.total_amount, paid.get(o.id) ?? 0);
      return {
        order_id: o.id, invoice_number: o.invoice_number, customer_name: o.customer_name, customer_phone: o.customer_phone,
        status: o.status, created_at: o.created_at, payment_due_date: o.payment_due_date,
        total: c.total, paid: c.paid, outstanding: c.outstanding, credit_status: c.status,
        bucket: dueBucket({ payment_due_date: o.payment_due_date, created_at: o.created_at, outstanding: c.outstanding }, now),
        customer_key: phoneKey(o.customer_phone) || `name:${o.customer_name.trim().toLowerCase()}`,
      };
    });
  }

  /** Credit summary per customer (grouped by the last 9 phone digits, or the name when there is no phone). */
  async creditOverview(tenantId: number) {
    const rows = await this.creditRows(tenantId);
    const groups = new Map<string, typeof rows>();
    for (const r of rows) groups.set(r.customer_key, [...(groups.get(r.customer_key) ?? []), r]);
    const rank = { overdue: 0, due: 1, upcoming: 2, none: 3 } as const;
    const customers = Array.from(groups, ([key, list]) => {
      const open = list.filter(r => r.outstanding > 0);
      const dues = open.map(r => r.payment_due_date).filter(Boolean).sort() as string[];
      const worst = open.reduce<keyof typeof rank>((w, r) => (rank[r.bucket] < rank[w] ? r.bucket : w), 'none');
      return {
        key, name: list[0].customer_name, phone: list[0].customer_phone,
        invoices: list.length, open_invoices: open.length,
        billed: round2(list.reduce((s, r) => s + r.total, 0)),
        collected: round2(list.reduce((s, r) => s + r.paid, 0)),
        outstanding: round2(list.reduce((s, r) => s + r.outstanding, 0)),
        overdue: round2(open.filter(r => r.bucket === 'overdue').reduce((s, r) => s + r.outstanding, 0)),
        next_due: dues[0] ?? null,
        bucket: worst,
        // For the WhatsApp reminder: each open invoice with its balance and due date
        open: open.map(r => ({ order_id: r.order_id, invoice_number: r.invoice_number, outstanding: r.outstanding, payment_due_date: r.payment_due_date })),
      };
    }).sort((a, b) => b.outstanding - a.outstanding);
    const sum = (f: (c: (typeof customers)[number]) => number) => round2(customers.reduce((s, c) => s + f(c), 0));
    return {
      customers,
      totals: {
        billed: sum(c => c.billed), collected: sum(c => c.collected), outstanding: sum(c => c.outstanding), overdue: sum(c => c.overdue),
        due_soon: round2(rows.filter(r => r.bucket === 'due').reduce((s, r) => s + r.outstanding, 0)),
      },
    };
  }

  /** One customer's credit invoices. */
  async creditCustomer(tenantId: number, key: string) {
    const rows = (await this.creditRows(tenantId)).filter(r => r.customer_key === key);
    if (!rows.length) throw new NotFoundException('Customer not found');
    return {
      key, name: rows[0].customer_name, phone: rows[0].customer_phone,
      billed: round2(rows.reduce((s, r) => s + r.total, 0)),
      collected: round2(rows.reduce((s, r) => s + r.paid, 0)),
      outstanding: round2(rows.reduce((s, r) => s + r.outstanding, 0)),
      invoices: rows,
    };
  }

  private async creditOrder(tenantId: number, orderId: number) {
    const order = await this.orderRepo.findOne({ where: { id: orderId, tenant_id: tenantId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.payment_type !== 'credit') throw new BadRequestException({ statusCode: 400, code: 'CREDIT_ONLY', message: 'CREDIT_ONLY' });
    const paid = (await this.paidByOrder(tenantId, [orderId])).get(orderId) ?? 0;
    return { order, credit: summariseCredit(order.total_amount, paid) };
  }

  async addPayment(actor: Actor, orderId: number, dto: AddCreditPaymentDto) {
    const { order, credit } = await this.creditOrder(actor.tenant_id, orderId);
    const amount = round2(dto.amount);
    if (!(amount > 0)) throw new BadRequestException({ statusCode: 400, code: 'PAYMENT_AMOUNT', message: 'PAYMENT_AMOUNT' });
    if (amount > credit.outstanding) {
      throw new BadRequestException({ statusCode: 400, code: 'PAYMENT_TOO_LARGE', message: 'PAYMENT_TOO_LARGE', outstanding: credit.outstanding });
    }
    const saved = await this.paymentRepo.save(this.paymentRepo.create({
      tenant_id: actor.tenant_id, order_id: orderId, amount,
      payment_date: dto.payment_date ?? localDay(new Date()), method: dto.method ?? 'cash',
      notes: dto.notes?.trim() || null, created_by: actor.sub,
    }));
    await this.audit.log(actor, 'payment', 'cod_credit', orderId, `${order.invoice_number} paid Rs ${amount}`);
    return saved;
  }

  /** One payment for the whole outstanding balance. */
  async settle(actor: Actor, orderId: number, dto: SettleCreditDto) {
    const { credit } = await this.creditOrder(actor.tenant_id, orderId);
    if (credit.outstanding <= 0) throw new BadRequestException({ statusCode: 400, code: 'NOTHING_OUTSTANDING', message: 'NOTHING_OUTSTANDING' });
    return this.addPayment(actor, orderId, { amount: credit.outstanding, payment_date: dto.payment_date, method: dto.method, notes: null });
  }

  async deletePayment(actor: Actor, orderId: number, paymentId: number) {
    const p = await this.paymentRepo.findOne({ where: { id: paymentId, order_id: orderId, tenant_id: actor.tenant_id } });
    if (!p) throw new NotFoundException('Payment not found');
    await this.paymentRepo.delete({ id: paymentId, tenant_id: actor.tenant_id });
    await this.audit.log(actor, 'deleted', 'cod_credit', orderId, `payment of Rs ${p.amount} removed`);
    return { ok: true };
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
      this.itemRepo.find({ where: { tenant_id: tenantId }, order: { name: 'ASC' } }),
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
