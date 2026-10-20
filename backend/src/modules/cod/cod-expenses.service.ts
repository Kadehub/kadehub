import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { CodExpense } from '../../database/entities/cod-expense.entity';
import { CodPersonalExpense } from '../../database/entities/cod-personal-expense.entity';
import { CodPersonalSettings } from '../../database/entities/cod-personal-settings.entity';
import { round2 } from './cod-analytics';
import { CodAuditService } from './cod-audit.service';
import { MAX_EXPENSE_AMOUNT, PersonalSettingsDto, SaveBusinessExpenseDto, SavePersonalExpenseDto } from './cod-expenses.dto';

type Actor = { sub: number; tenant_id: number };

const isDuplicateKey = (err: any) =>
  err?.code === 'ER_DUP_ENTRY' || err?.code === '23505' || err?.driverError?.code === 'ER_DUP_ENTRY' || err?.driverError?.code === '23505';

const norm = (s: string | null | undefined) => (s ?? '').trim().toLowerCase();
const lkr = (n: number) => `Rs ${round2(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Business expenses + the owner's personal expenses and budget. */
@Injectable()
export class CodExpensesService {
  constructor(
    @InjectRepository(CodExpense) private expenseRepo: Repository<CodExpense>,
    @InjectRepository(CodPersonalExpense) private personalRepo: Repository<CodPersonalExpense>,
    @InjectRepository(CodPersonalSettings) private settingsRepo: Repository<CodPersonalSettings>,
    private audit: CodAuditService,
  ) {}

  // ───────────── shared validation ─────────────

  /** yyyy-MM-dd, a real calendar day, not in the future. A day of slack covers time zones ahead of the server. */
  private checkDate(ymd: string) {
    const d = new Date(`${ymd}T00:00:00Z`);
    if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== ymd) throw new BadRequestException('EXPENSE_DATE');
    const latest = new Date(Date.now() + 24 * 3600_000).toISOString().slice(0, 10);
    if (ymd > latest) throw new BadRequestException('EXPENSE_DATE_FUTURE');
  }

  private checkAmount(amount: number) {
    if (!(amount > 0) || amount > MAX_EXPENSE_AMOUNT) throw new BadRequestException('EXPENSE_AMOUNT');
    return round2(amount);
  }

  private range<T>(from?: string, to?: string): FindOptionsWhere<T> {
    if (from && to) return { expense_date: Between(from, to) } as any;
    if (from) return { expense_date: MoreThanOrEqual(from) } as any;
    if (to) return { expense_date: LessThanOrEqual(to) } as any;
    return {};
  }

  // ───────────── business expenses ─────────────

  /** All business expense rows (optionally a yyyy-MM-dd range), newest first. Also used by the financial summary. */
  listExpenses(tenantId: number, from?: string, to?: string) {
    return this.expenseRepo.find({
      where: { tenant_id: tenantId, ...this.range<CodExpense>(from, to) },
      order: { expense_date: 'DESC', id: 'DESC' },
    });
  }

  private async businessLookalike(tenantId: number, row: { id?: number; title: string; category: string; amount: number; expense_date: string }) {
    const candidates = await this.expenseRepo.find({
      where: { tenant_id: tenantId, expense_date: row.expense_date, category: row.category },
    });
    return candidates.find(c => c.id !== row.id && round2(c.amount) === row.amount && norm(c.title) === norm(row.title));
  }

  private async saveBusiness(actor: Actor, dto: SaveBusinessExpenseDto, existing?: CodExpense) {
    const amount = this.checkAmount(dto.amount);
    this.checkDate(dto.expense_date);
    const category = dto.category.trim() || 'Misc';
    const title = dto.title?.trim() || category;

    if (!dto.allow_duplicate) {
      const twin = await this.businessLookalike(actor.tenant_id, { id: existing?.id, title, category, amount, expense_date: dto.expense_date });
      if (twin) {
        return { duplicate: true, error: `"${title}" for ${lkr(amount)} already exists on that date. Is this a separate expense?` };
      }
    }

    const e = existing ?? this.expenseRepo.create({ tenant_id: actor.tenant_id });
    e.title = title;
    e.category = category;
    e.amount = amount;
    e.expense_date = dto.expense_date;
    e.payment_method = dto.payment_method || null;
    e.vendor = dto.vendor?.trim() || null;
    e.reference = dto.reference?.trim() || null;
    e.notes = dto.notes?.trim() || null;
    const saved = await this.expenseRepo.save(e);
    await this.audit.log(actor, existing ? 'updated' : 'created', 'cod_expense', saved.id, `${category} ${lkr(amount)} — ${title}`);
    return { id: saved.id, expense: saved };
  }

  createExpense(actor: Actor, dto: SaveBusinessExpenseDto) {
    return this.saveBusiness(actor, dto);
  }

  async updateExpense(actor: Actor, id: number, dto: SaveBusinessExpenseDto) {
    const e = await this.expenseRepo.findOne({ where: { id, tenant_id: actor.tenant_id } });
    if (!e) throw new NotFoundException('Expense not found');
    return this.saveBusiness(actor, dto, e);
  }

  async deleteExpense(actor: Actor, id: number) {
    const e = await this.expenseRepo.findOne({ where: { id, tenant_id: actor.tenant_id } });
    if (!e) throw new NotFoundException('Expense not found');
    await this.expenseRepo.delete({ id, tenant_id: actor.tenant_id });
    await this.audit.log(actor, 'deleted', 'cod_expense', id, `${e.category} ${lkr(e.amount)} — ${e.title}`);
    return { ok: true };
  }

  // ───────────── personal expenses (admin only) ─────────────

  /** All personal expense rows (optionally a yyyy-MM-dd range), newest first. Also used by the financial summary. */
  listPersonal(tenantId: number, from?: string, to?: string) {
    return this.personalRepo.find({
      where: { tenant_id: tenantId, ...this.range<CodPersonalExpense>(from, to) },
      order: { expense_date: 'DESC', id: 'DESC' },
    });
  }

  private async personalLookalike(tenantId: number, row: { id?: number; category: string; amount: number; expense_date: string; notes: string | null }) {
    const candidates = await this.personalRepo.find({
      where: { tenant_id: tenantId, expense_date: row.expense_date, category: row.category },
    });
    return candidates.find(c => c.id !== row.id && round2(c.amount) === row.amount && norm(c.notes) === norm(row.notes));
  }

  private async byClientRef(tenantId: number, clientRef: string) {
    return this.personalRepo.findOne({ where: { tenant_id: tenantId, client_ref: clientRef } });
  }

  async createPersonal(actor: Actor, dto: SavePersonalExpenseDto) {
    // Hard double-submit protection: a retry with the same client_ref returns the row already saved
    if (dto.client_ref) {
      const prior = await this.byClientRef(actor.tenant_id, dto.client_ref);
      if (prior) return { id: prior.id, expense: prior, retried: true };
    }
    const amount = this.checkAmount(dto.amount);
    this.checkDate(dto.expense_date);
    const note = dto.note?.trim() || null;

    // Soft lookalike warning only: two rides at the same fare on one day are legitimate
    if (!dto.allow_duplicate) {
      const twin = await this.personalLookalike(actor.tenant_id, { category: dto.category, amount, expense_date: dto.expense_date, notes: note });
      if (twin) return { duplicate: true, error: `${dto.category} for ${lkr(amount)} is already logged on that date. Is this a separate expense?` };
    }

    const row = this.personalRepo.create({
      tenant_id: actor.tenant_id,
      user_id: actor.sub,
      title: note ? note.slice(0, 80) : dto.category,
      category: dto.category,
      amount,
      expense_date: dto.expense_date,
      payment_method: dto.payment_method || null,
      notes: note,
      client_ref: dto.client_ref ?? null,
    });
    try {
      const saved = await this.personalRepo.save(row);
      await this.audit.log(actor, 'created', 'cod_personal_expense', saved.id, `${dto.category} ${lkr(amount)}`);
      return { id: saved.id, expense: saved };
    } catch (err) {
      // Two identical requests raced past the check above: the unique index kept one, which counts as success
      if (dto.client_ref && isDuplicateKey(err)) {
        const prior = await this.byClientRef(actor.tenant_id, dto.client_ref);
        if (prior) return { id: prior.id, expense: prior, retried: true };
      }
      throw err;
    }
  }

  async updatePersonal(actor: Actor, id: number, dto: SavePersonalExpenseDto) {
    const e = await this.personalRepo.findOne({ where: { id, tenant_id: actor.tenant_id } });
    if (!e) throw new NotFoundException('Expense not found');
    const amount = this.checkAmount(dto.amount);
    this.checkDate(dto.expense_date);
    const note = dto.note?.trim() || null;
    if (!dto.allow_duplicate) {
      const twin = await this.personalLookalike(actor.tenant_id, { id, category: dto.category, amount, expense_date: dto.expense_date, notes: note });
      if (twin) return { duplicate: true, error: `${dto.category} for ${lkr(amount)} is already logged on that date. Is this a separate expense?` };
    }
    e.title = note ? note.slice(0, 80) : dto.category;
    e.category = dto.category;
    e.amount = amount;
    e.expense_date = dto.expense_date;
    e.payment_method = dto.payment_method || null;
    e.notes = note;
    const saved = await this.personalRepo.save(e);
    await this.audit.log(actor, 'updated', 'cod_personal_expense', id, `${dto.category} ${lkr(amount)}`);
    return { id: saved.id, expense: saved };
  }

  async deletePersonal(actor: Actor, id: number) {
    const e = await this.personalRepo.findOne({ where: { id, tenant_id: actor.tenant_id } });
    if (!e) throw new NotFoundException('Expense not found');
    await this.personalRepo.delete({ id, tenant_id: actor.tenant_id });
    await this.audit.log(actor, 'deleted', 'cod_personal_expense', id, `${e.category} ${lkr(e.amount)}`);
    return { ok: true };
  }

  async getSettings(tenantId: number) {
    const s = await this.settingsRepo.findOne({ where: { tenant_id: tenantId } });
    return { monthly_budget: s?.monthly_budget ?? null };
  }

  async saveSettings(actor: Actor, dto: PersonalSettingsDto) {
    const budget = dto.monthly_budget === null ? null : this.checkAmount(dto.monthly_budget);
    let s = await this.settingsRepo.findOne({ where: { tenant_id: actor.tenant_id } });
    if (!s) s = this.settingsRepo.create({ tenant_id: actor.tenant_id });
    s.monthly_budget = budget;
    await this.settingsRepo.save(s);
    await this.audit.log(actor, 'budget', 'cod_personal_settings', s.id, budget === null ? 'budget removed' : `budget ${lkr(budget)}`);
    return { monthly_budget: budget };
  }
}
