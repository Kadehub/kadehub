import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, MoreThan, Repository } from 'typeorm';
import { HrBranch, HrEmployee } from '../../database/entities/hr-core.entity';
import { HrAdvance, HrAdvanceRepayment, HrPayrollRun, HrPayslip } from '../../database/entities/hr-payroll.entity';
import { HrAssetAssignment } from '../../database/entities/hr-talent.entity';
import { HrAccountService } from './hr-account.service';
import { HrOrgService } from './hr-org.service';
import { HrTimeService } from './hr-time.service';
import type { HrCtx } from './hr-access';
import { computePayslip, employedFraction, localDate, periodRange, round2, type PayslipInputs } from './hr-calc';
import type { CreateRunDto, PayRunDto, RepayAdvanceDto, SaveAdvanceDto, UpdatePayslipDto } from './hr.dto';

/** Payroll is owner-only (the controller enforces it), so nothing here filters by branch scope. */
@Injectable()
export class HrPayrollService {
  constructor(
    private account: HrAccountService,
    private org: HrOrgService,
    private time: HrTimeService,
    @InjectRepository(HrEmployee) private employeeRepo: Repository<HrEmployee>,
    @InjectRepository(HrBranch) private branchRepo: Repository<HrBranch>,
    @InjectRepository(HrAdvance) private advanceRepo: Repository<HrAdvance>,
    @InjectRepository(HrAdvanceRepayment) private repayRepo: Repository<HrAdvanceRepayment>,
    @InjectRepository(HrPayrollRun) private runRepo: Repository<HrPayrollRun>,
    @InjectRepository(HrPayslip) private slipRepo: Repository<HrPayslip>,
    @InjectRepository(HrAssetAssignment) private assignmentRepo: Repository<HrAssetAssignment>,
  ) {}

  // ───────── Advances ─────────

  private async repaidByAdvance(tenantId: number, advanceIds: number[]) {
    if (!advanceIds.length) return new Map<number, number>();
    const rows = await this.repayRepo.find({ where: { tenant_id: tenantId, advance_id: In(advanceIds) } });
    const m = new Map<number, number>();
    for (const r of rows) m.set(r.advance_id, round2((m.get(r.advance_id) ?? 0) + r.amount));
    return m;
  }

  async listAdvances(ctx: HrCtx, q: { employee_id?: number; status?: string }) {
    const where: Record<string, unknown> = { tenant_id: ctx.tenantId };
    if (q.employee_id) where.employee_id = q.employee_id;
    if (q.status) where.status = q.status;
    const rows = await this.advanceRepo.find({ where, order: { given_date: 'DESC' } });
    const repaid = await this.repaidByAdvance(ctx.tenantId, rows.map(r => r.id));
    const people = await this.org.employeesByIds(ctx.tenantId, rows.map(r => r.employee_id));
    return rows.map(r => ({
      ...r, repaid: repaid.get(r.id) ?? 0, balance: round2(r.amount - (repaid.get(r.id) ?? 0)),
      employee_name: people.find(p => p.id === r.employee_id)?.full_name ?? '',
      emp_code: people.find(p => p.id === r.employee_id)?.emp_code ?? '',
    }));
  }

  async createAdvance(ctx: HrCtx, dto: SaveAdvanceDto) {
    const emp = await this.org.findEmployee(ctx, dto.employee_id);
    const a = await this.advanceRepo.save(this.advanceRepo.create({
      tenant_id: ctx.tenantId, employee_id: emp.id, amount: dto.amount, given_date: dto.given_date,
      monthly_deduction: Math.min(dto.monthly_deduction || dto.amount, dto.amount), note: dto.note?.trim() ?? '', status: 'open',
    }));
    await this.account.log(ctx, 'advance.create', 'hr_advance', a.id, { name: emp.full_name, amount: a.amount });
    return a;
  }

  private async findAdvance(ctx: HrCtx, id: number) {
    const a = await this.advanceRepo.findOne({ where: { id, tenant_id: ctx.tenantId } });
    if (!a) throw new NotFoundException('Advance not found');
    return a;
  }

  async updateAdvance(ctx: HrCtx, id: number, dto: SaveAdvanceDto) {
    const a = await this.findAdvance(ctx, id);
    const repaid = (await this.repaidByAdvance(ctx.tenantId, [a.id])).get(a.id) ?? 0;
    if (dto.amount < repaid) throw new BadRequestException('ADVANCE_BELOW_REPAID');
    a.amount = dto.amount;
    a.given_date = dto.given_date;
    a.monthly_deduction = Math.min(dto.monthly_deduction || dto.amount, dto.amount);
    a.note = dto.note?.trim() ?? a.note;
    a.status = repaid >= a.amount ? 'closed' : 'open';
    return this.advanceRepo.save(a);
  }

  /** Cash paid back outside payroll. */
  async repayAdvance(ctx: HrCtx, id: number, dto: RepayAdvanceDto) {
    const a = await this.findAdvance(ctx, id);
    const repaid = (await this.repaidByAdvance(ctx.tenantId, [a.id])).get(a.id) ?? 0;
    const balance = round2(a.amount - repaid);
    if (dto.amount > balance) throw new BadRequestException('REPAY_MORE_THAN_BALANCE');
    await this.repayRepo.save(this.repayRepo.create({ tenant_id: ctx.tenantId, advance_id: a.id, payslip_id: null, amount: dto.amount, paid_date: dto.paid_date }));
    if (round2(balance - dto.amount) <= 0) { a.status = 'closed'; await this.advanceRepo.save(a); }
    return { ok: true, balance: round2(balance - dto.amount) };
  }

  async deleteAdvance(ctx: HrCtx, id: number) {
    const a = await this.findAdvance(ctx, id);
    if (await this.repayRepo.count({ where: { advance_id: a.id } })) throw new BadRequestException('ADVANCE_HAS_REPAYMENTS');
    await this.advanceRepo.delete({ id: a.id });
    return { ok: true };
  }

  /** What the next payslip should take back: each open advance's monthly amount, capped at its balance. */
  private async suggestedAdvanceDeduction(tenantId: number, employeeId: number) {
    const open = await this.advanceRepo.find({ where: { tenant_id: tenantId, employee_id: employeeId, status: 'open' } });
    const repaid = await this.repaidByAdvance(tenantId, open.map(a => a.id));
    return round2(open.reduce((s, a) => s + Math.min(a.monthly_deduction, Math.max(0, a.amount - (repaid.get(a.id) ?? 0))), 0));
  }

  /** Unreturned or damaged assets waiting to be charged. */
  private async pendingAssetCharges(tenantId: number, employeeId: number) {
    return this.assignmentRepo.find({ where: { tenant_id: tenantId, employee_id: employeeId, deduction_amount: MoreThan(0), deducted_payslip_id: IsNull() } });
  }

  // ───────── Runs ─────────

  /** People on the books at any point in the period, in the branch (or all branches). */
  private async eligible(tenantId: number, period: string, branchId: number | null) {
    const { from, to } = periodRange(period);
    const all = await this.employeeRepo.find({ where: { tenant_id: tenantId, ...(branchId ? { branch_id: branchId } : {}) }, order: { full_name: 'ASC' } });
    return all.filter(e =>
      (!e.join_date || e.join_date <= to) &&
      (e.status === 'active' || (e.leave_date !== null && e.leave_date >= from)));
  }

  private async figures(ctx: HrCtx, emp: HrEmployee, period: string, inputs: PayslipInputs) {
    const settings = await this.account.getSettings(ctx.tenantId);
    const { from, to } = periodRange(period);
    const act = (await this.time.periodActivity(ctx.tenantId, [emp], from, to)).get(emp.id)!;
    const joined = emp.join_date ?? localDate(new Date(emp.created_at));
    return computePayslip(emp, { ...act, employed_fraction: employedFraction(period, joined, emp.leave_date) }, settings, inputs);
  }

  private async refreshTotals(run: HrPayrollRun) {
    const slips = await this.slipRepo.find({ where: { run_id: run.id } });
    run.total_gross = round2(slips.reduce((s, p) => s + p.gross, 0));
    run.total_deductions = round2(slips.reduce((s, p) => s + p.total_deductions, 0));
    run.total_net = round2(slips.reduce((s, p) => s + p.net_pay, 0));
    run.total_employer = round2(slips.reduce((s, p) => s + p.epf_employer + p.etf_employer, 0));
    return this.runRepo.save(run);
  }

  async listRuns(ctx: HrCtx) {
    const runs = await this.runRepo.find({ where: { tenant_id: ctx.tenantId }, order: { period: 'DESC', id: 'DESC' } });
    const counts: Array<{ run_id: number; n: string; paid: string }> = runs.length
      ? await this.slipRepo.createQueryBuilder('p').select('p.run_id', 'run_id').addSelect('COUNT(*)', 'n')
        .addSelect('SUM(CASE WHEN p.paid_at IS NULL THEN 0 ELSE 1 END)', 'paid')
        .where('p.tenant_id = :t', { t: ctx.tenantId }).groupBy('p.run_id').getRawMany()
      : [];
    return runs.map(r => {
      const c = counts.find(x => Number(x.run_id) === r.id);
      return { ...r, payslip_count: Number(c?.n ?? 0), paid_count: Number(c?.paid ?? 0) };
    });
  }

  async createRun(ctx: HrCtx, dto: CreateRunDto) {
    const branchId = dto.branch_id ?? null;
    if (branchId && !(await this.branchRepo.findOne({ where: { id: branchId, tenant_id: ctx.tenantId } }))) throw new NotFoundException('Branch not found');
    if (dto.period > localDate().slice(0, 7)) throw new BadRequestException('FUTURE_PERIOD');
    const clash = await this.runRepo.findOne({ where: { tenant_id: ctx.tenantId, period: dto.period, branch_id: branchId ?? IsNull() } });
    if (clash) throw new ConflictException({ statusCode: 409, code: 'RUN_EXISTS', run_id: clash.id, message: 'RUN_EXISTS' });

    const run = await this.runRepo.save(this.runRepo.create({ tenant_id: ctx.tenantId, branch_id: branchId, period: dto.period, status: 'draft', created_by: ctx.userId }));
    const skipped = await this.fillRun(ctx, run);
    await this.account.log(ctx, 'payroll.create', 'hr_payroll_run', run.id, { period: run.period, branch_id: branchId });
    return { ...(await this.getRun(ctx, run.id)), skipped };
  }

  /** Adds a payslip for every eligible employee not yet paid for this period in another run. */
  private async fillRun(ctx: HrCtx, run: HrPayrollRun) {
    const emps = await this.eligible(ctx.tenantId, run.period, run.branch_id);
    const otherRuns = (await this.runRepo.find({ where: { tenant_id: ctx.tenantId, period: run.period } })).filter(r => r.id !== run.id).map(r => r.id);
    const taken = new Set(otherRuns.length ? (await this.slipRepo.find({ where: { run_id: In(otherRuns) } })).map(s => s.employee_id) : []);
    const existing = new Set((await this.slipRepo.find({ where: { run_id: run.id } })).map(s => s.employee_id));
    const skipped: Array<{ employee_id: number; full_name: string }> = [];

    for (const emp of emps) {
      if (existing.has(emp.id)) continue;
      if (taken.has(emp.id)) { skipped.push({ employee_id: emp.id, full_name: emp.full_name }); continue; }
      const assets = await this.pendingAssetCharges(ctx.tenantId, emp.id);
      const inputs: PayslipInputs = {
        bonus: 0, other_earnings: 0, other_deductions: 0,
        advance_deduction: await this.suggestedAdvanceDeduction(ctx.tenantId, emp.id),
        asset_deduction: round2(assets.reduce((s, a) => s + a.deduction_amount, 0)),
      };
      const fig = await this.figures(ctx, emp, run.period, inputs);
      await this.slipRepo.save(this.slipRepo.create({ tenant_id: ctx.tenantId, run_id: run.id, employee_id: emp.id, pay_type: emp.pay_type, ...fig }));
    }
    await this.refreshTotals(run);
    return skipped;
  }

  private async findRun(ctx: HrCtx, id: number) {
    const run = await this.runRepo.findOne({ where: { id, tenant_id: ctx.tenantId } });
    if (!run) throw new NotFoundException('Payroll run not found');
    return run;
  }

  async getRun(ctx: HrCtx, id: number) {
    const run = await this.findRun(ctx, id);
    const slips = await this.slipRepo.find({ where: { run_id: run.id } });
    const people = await this.org.employeesByIds(ctx.tenantId, slips.map(s => s.employee_id));
    return {
      ...run,
      payslips: slips
        .map(s => {
          const e = people.find(p => p.id === s.employee_id);
          return { ...s, employee_name: e?.full_name ?? '', emp_code: e?.emp_code ?? '', job_title: e?.job_title ?? '', phone: e?.phone ?? '', branch_id: e?.branch_id ?? null, bank_name: e?.bank_name ?? '', bank_account: e?.bank_account ?? '' };
        })
        .sort((a, b) => a.employee_name.localeCompare(b.employee_name)),
    };
  }

  private assertDraft(run: HrPayrollRun) {
    if (run.status !== 'draft') throw new BadRequestException('RUN_NOT_DRAFT');
  }

  /** Re-read attendance, leave and salaries; owner-entered amounts on each payslip are kept. */
  async regenerate(ctx: HrCtx, id: number) {
    const run = await this.findRun(ctx, id);
    this.assertDraft(run);
    const slips = await this.slipRepo.find({ where: { run_id: run.id } });
    const people = await this.org.employeesByIds(ctx.tenantId, slips.map(s => s.employee_id));
    for (const slip of slips) {
      const emp = people.find(p => p.id === slip.employee_id);
      if (!emp) continue;
      const assets = await this.pendingAssetCharges(ctx.tenantId, emp.id);
      const fig = await this.figures(ctx, emp, run.period, {
        bonus: slip.bonus, other_earnings: slip.other_earnings, other_deductions: slip.other_deductions,
        advance_deduction: slip.advance_deduction, asset_deduction: round2(assets.reduce((s, a) => s + a.deduction_amount, 0)),
      });
      Object.assign(slip, fig, { pay_type: emp.pay_type });
      await this.slipRepo.save(slip);
    }
    const skipped = await this.fillRun(ctx, run);
    return { ...(await this.getRun(ctx, run.id)), skipped };
  }

  async updatePayslip(ctx: HrCtx, id: number, dto: UpdatePayslipDto) {
    const slip = await this.slipRepo.findOne({ where: { id, tenant_id: ctx.tenantId } });
    if (!slip) throw new NotFoundException('Payslip not found');
    const run = await this.findRun(ctx, slip.run_id);
    this.assertDraft(run);
    const emp = await this.org.findEmployee(ctx, slip.employee_id);
    const fig = await this.figures(ctx, emp, run.period, {
      bonus: dto.bonus ?? slip.bonus,
      other_earnings: dto.other_earnings ?? slip.other_earnings,
      other_deductions: dto.other_deductions ?? slip.other_deductions,
      advance_deduction: dto.advance_deduction ?? slip.advance_deduction,
      asset_deduction: slip.asset_deduction,
    });
    Object.assign(slip, fig);
    if (dto.note !== undefined) slip.note = dto.note.trim();
    const saved = await this.slipRepo.save(slip);
    await this.refreshTotals(run);
    return saved;
  }

  async removePayslip(ctx: HrCtx, id: number) {
    const slip = await this.slipRepo.findOne({ where: { id, tenant_id: ctx.tenantId } });
    if (!slip) throw new NotFoundException('Payslip not found');
    const run = await this.findRun(ctx, slip.run_id);
    this.assertDraft(run);
    await this.slipRepo.delete({ id: slip.id });
    await this.refreshTotals(run);
    return { ok: true };
  }

  /** Locks the run and books advance repayments and asset charges against each payslip. */
  async finalize(ctx: HrCtx, id: number) {
    const run = await this.findRun(ctx, id);
    this.assertDraft(run);
    const slips = await this.slipRepo.find({ where: { run_id: run.id } });
    if (!slips.length) throw new BadRequestException('RUN_EMPTY');
    const paidDate = periodRange(run.period).to;

    for (const slip of slips) {
      let left = slip.advance_deduction;
      if (left > 0) {
        const open = await this.advanceRepo.find({ where: { tenant_id: ctx.tenantId, employee_id: slip.employee_id, status: 'open' }, order: { given_date: 'ASC', id: 'ASC' } });
        const repaid = await this.repaidByAdvance(ctx.tenantId, open.map(a => a.id));
        for (const adv of open) {
          if (left <= 0) break;
          const balance = round2(adv.amount - (repaid.get(adv.id) ?? 0));
          const amount = round2(Math.min(balance, left));
          if (amount <= 0) continue;
          await this.repayRepo.save(this.repayRepo.create({ tenant_id: ctx.tenantId, advance_id: adv.id, payslip_id: slip.id, amount, paid_date: paidDate }));
          left = round2(left - amount);
          if (amount >= balance) { adv.status = 'closed'; await this.advanceRepo.save(adv); }
        }
      }
      if (slip.asset_deduction > 0) {
        for (const a of await this.pendingAssetCharges(ctx.tenantId, slip.employee_id)) {
          a.deducted_payslip_id = slip.id;
          await this.assignmentRepo.save(a);
        }
      }
    }
    run.status = 'finalized';
    run.finalized_at = new Date();
    await this.runRepo.save(run);
    await this.account.log(ctx, 'payroll.finalize', 'hr_payroll_run', run.id, { period: run.period, total_net: run.total_net });
    return this.getRun(ctx, run.id);
  }

  /** Back to draft (only before anything is paid): undoes the repayments and asset charges. */
  async reopen(ctx: HrCtx, id: number) {
    const run = await this.findRun(ctx, id);
    if (run.status !== 'finalized') throw new BadRequestException('RUN_NOT_FINALIZED');
    const slips = await this.slipRepo.find({ where: { run_id: run.id } });
    if (slips.some(s => s.paid_at)) throw new BadRequestException('RUN_HAS_PAYMENTS');
    const slipIds = slips.map(s => s.id);
    if (slipIds.length) {
      const reps = await this.repayRepo.find({ where: { payslip_id: In(slipIds) } });
      await this.repayRepo.delete({ payslip_id: In(slipIds) });
      const advIds = [...new Set(reps.map(r => r.advance_id))];
      if (advIds.length) await this.advanceRepo.update({ id: In(advIds) }, { status: 'open' });
      await this.assignmentRepo.update({ deducted_payslip_id: In(slipIds) }, { deducted_payslip_id: null });
    }
    run.status = 'draft';
    run.finalized_at = null;
    await this.runRepo.save(run);
    await this.account.log(ctx, 'payroll.reopen', 'hr_payroll_run', run.id, { period: run.period });
    return this.getRun(ctx, run.id);
  }

  async pay(ctx: HrCtx, id: number, dto: PayRunDto) {
    const run = await this.findRun(ctx, id);
    if (run.status === 'draft') throw new BadRequestException('RUN_NOT_FINALIZED');
    const slips = await this.slipRepo.find({ where: { run_id: run.id } });
    const now = new Date();
    for (const s of slips) {
      if (s.paid_at || (dto.payslip_ids && !dto.payslip_ids.includes(s.id))) continue;
      s.paid_at = now;
      s.payment_method = dto.payment_method;
      await this.slipRepo.save(s);
    }
    if (slips.every(s => s.paid_at)) { run.status = 'paid'; await this.runRepo.save(run); }
    await this.account.log(ctx, 'payroll.pay', 'hr_payroll_run', run.id, { period: run.period, method: dto.payment_method, count: dto.payslip_ids?.length ?? slips.length });
    return this.getRun(ctx, run.id);
  }

  async deleteRun(ctx: HrCtx, id: number) {
    const run = await this.findRun(ctx, id);
    this.assertDraft(run);
    await this.runRepo.delete({ id: run.id });
    await this.account.log(ctx, 'payroll.delete', 'hr_payroll_run', run.id, { period: run.period });
    return { ok: true };
  }

  /** One payslip with what the printed copy needs (business, employee, period). */
  async payslipDetail(ctx: HrCtx, id: number) {
    const slip = await this.slipRepo.findOne({ where: { id, tenant_id: ctx.tenantId } });
    if (!slip) throw new NotFoundException('Payslip not found');
    const [run, emp, settings] = await Promise.all([
      this.findRun(ctx, slip.run_id), this.org.findEmployee(ctx, slip.employee_id), this.account.getSettings(ctx.tenantId),
    ]);
    const branch = emp.branch_id ? await this.branchRepo.findOne({ where: { id: emp.branch_id } }) : null;
    return {
      payslip: slip,
      period: run.period, run_status: run.status,
      employee: {
        id: emp.id, full_name: emp.full_name, emp_code: emp.emp_code, job_title: emp.job_title, department: emp.department,
        phone: emp.phone, nic: emp.nic, epf_number: emp.epf_number, bank_name: emp.bank_name, bank_account: emp.bank_account,
        branch_name: branch?.name ?? '',
      },
      business: {
        name: settings.business_name, phone: settings.phone, address: settings.address, logo_url: settings.logo_url,
        brand_color: settings.brand_color, footer: settings.payslip_footer,
        epf_employee_pct: settings.epf_employee_pct, epf_employer_pct: settings.epf_employer_pct, etf_employer_pct: settings.etf_employer_pct,
      },
    };
  }

  async employeePayslips(ctx: HrCtx, employeeId: number) {
    await this.org.findEmployee(ctx, employeeId);
    const slips = await this.slipRepo.find({ where: { tenant_id: ctx.tenantId, employee_id: employeeId }, order: { id: 'DESC' }, take: 36 });
    const runs = slips.length ? await this.runRepo.find({ where: { id: In(slips.map(s => s.run_id)) } }) : [];
    return slips.map(s => ({ ...s, period: runs.find(r => r.id === s.run_id)?.period ?? '', run_status: runs.find(r => r.id === s.run_id)?.status ?? '' }));
  }
}
