import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { HrBranch, HrBranchManager, HrEmployee, HrEmployeeDocument } from '../../database/entities/hr-core.entity';
import { HrAccountService } from './hr-account.service';
import { assertBranch, type HrCtx } from './hr-access';
import { localDate } from './hr-calc';
import type { EndEmploymentDto, SaveBranchDto, SaveEmployeeDto } from './hr.dto';

/** Fields only the owner sees or sets: pay and bank details. */
const PAY_FIELDS = ['pay_type', 'base_salary', 'fixed_allowance', 'epf_enabled', 'epf_number', 'bank_name', 'bank_account'] as const;

/** Employee as the caller may see it: branch managers get no pay or bank details. */
export function viewEmployee(e: HrEmployee, ctx: HrCtx) {
  const { pin_hash, ...rest } = e as HrEmployee & { pin_hash?: string | null };
  const out: Record<string, unknown> = { ...rest, has_pin: pin_hash === undefined ? undefined : !!pin_hash };
  if (!ctx.owner) for (const f of PAY_FIELDS) delete out[f];
  return out;
}

@Injectable()
export class HrOrgService {
  constructor(
    private account: HrAccountService,
    @InjectRepository(HrBranch) private branchRepo: Repository<HrBranch>,
    @InjectRepository(HrBranchManager) private managerRepo: Repository<HrBranchManager>,
    @InjectRepository(HrEmployee) private employeeRepo: Repository<HrEmployee>,
    @InjectRepository(HrEmployeeDocument) private docRepo: Repository<HrEmployeeDocument>,
  ) {}

  // ───────── Branches ─────────

  async listBranches(ctx: HrCtx, includeInactive = false) {
    const rows = await this.branchRepo.find({ where: { tenant_id: ctx.tenantId, ...(includeInactive ? {} : { is_active: true }) }, order: { id: 'ASC' } });
    const visible = ctx.branchIds === null ? rows : rows.filter(b => ctx.branchIds!.includes(b.id));
    const counts: Array<{ branch_id: number; n: string }> = visible.length
      ? await this.employeeRepo.createQueryBuilder('e').select('e.branch_id', 'branch_id').addSelect('COUNT(*)', 'n')
        .where('e.tenant_id = :t AND e.status = :s', { t: ctx.tenantId, s: 'active' }).groupBy('e.branch_id').getRawMany()
      : [];
    const managers = await this.managerRepo.find({ where: { tenant_id: ctx.tenantId } });
    return visible.map(b => ({
      ...b,
      employee_count: Number(counts.find(c => Number(c.branch_id) === b.id)?.n ?? 0),
      manager_ids: managers.filter(m => m.branch_id === b.id).map(m => m.user_id),
    }));
  }

  async getBranch(ctx: HrCtx, id: number) {
    const b = await this.branchRepo.findOne({ where: { id, tenant_id: ctx.tenantId } });
    if (!b) throw new NotFoundException('Branch not found');
    assertBranch(ctx, b.id);
    return b;
  }

  async createBranch(ctx: HrCtx, dto: SaveBranchDto) {
    await this.account.assertCanAddBranch(ctx);
    const b = await this.branchRepo.save(this.branchRepo.create({
      tenant_id: ctx.tenantId, name: dto.name.trim(), address: dto.address?.trim() ?? '', phone: dto.phone?.trim() ?? '',
    }));
    await this.account.log(ctx, 'branch.create', 'hr_branch', b.id, { name: b.name });
    return b;
  }

  async updateBranch(ctx: HrCtx, id: number, dto: SaveBranchDto) {
    const b = await this.getBranch(ctx, id);
    if (dto.is_active === true && !b.is_active) await this.account.assertCanAddBranch(ctx);
    if (dto.is_active === false && b.is_active) {
      const staff = await this.employeeRepo.count({ where: { tenant_id: ctx.tenantId, branch_id: id, status: 'active' } });
      if (staff) throw new BadRequestException('BRANCH_HAS_STAFF');
    }
    b.name = dto.name.trim();
    if (dto.address !== undefined) b.address = dto.address.trim();
    if (dto.phone !== undefined) b.phone = dto.phone.trim();
    if (dto.is_active !== undefined) b.is_active = dto.is_active;
    await this.account.log(ctx, 'branch.update', 'hr_branch', b.id, { name: b.name, is_active: b.is_active });
    return this.branchRepo.save(b);
  }

  // ───────── Employees ─────────

  /** Employees the caller can see; `status` 'all' includes people who have left. */
  async listEmployees(ctx: HrCtx, q: { branch_id?: number; status?: string; search?: string }) {
    const qb = this.employeeRepo.createQueryBuilder('e').where('e.tenant_id = :t', { t: ctx.tenantId });
    if (q.status !== 'all') qb.andWhere('e.status = :s', { s: q.status || 'active' });
    if (q.branch_id) {
      assertBranch(ctx, q.branch_id);
      qb.andWhere('e.branch_id = :b', { b: q.branch_id });
    } else if (ctx.branchIds !== null) {
      qb.andWhere('e.branch_id IN (:...ids)', { ids: ctx.branchIds });
    }
    if (q.search?.trim()) {
      const s = `%${q.search.trim().toLowerCase()}%`;
      qb.andWhere(new Brackets(w => w
        .where('LOWER(e.full_name) LIKE :s', { s }).orWhere('LOWER(e.emp_code) LIKE :s', { s })
        .orWhere('e.phone LIKE :s', { s }).orWhere('LOWER(e.job_title) LIKE :s', { s })));
    }
    const rows = await qb.addSelect('e.pin_hash').orderBy('e.full_name', 'ASC').getMany();
    return rows.map(e => viewEmployee(e, ctx));
  }

  /** Loads an employee the caller is allowed to see (403 for another branch, 404 for another account). */
  async findEmployee(ctx: HrCtx, id: number, withPin = false): Promise<HrEmployee> {
    const qb = this.employeeRepo.createQueryBuilder('e').where('e.id = :id AND e.tenant_id = :t', { id, t: ctx.tenantId });
    if (withPin) qb.addSelect('e.pin_hash');
    const e = await qb.getOne();
    if (!e) throw new NotFoundException('Employee not found');
    assertBranch(ctx, e.branch_id);
    return e;
  }

  async employeesByIds(tenantId: number, ids: number[]) {
    if (!ids.length) return [];
    return this.employeeRepo.find({ where: { tenant_id: tenantId, id: In([...new Set(ids)]) } });
  }

  private async nextCode(tenantId: number): Promise<string> {
    const rows: Array<{ emp_code: string }> = await this.employeeRepo.createQueryBuilder('e')
      .select('e.emp_code', 'emp_code').where('e.tenant_id = :t', { t: tenantId }).getRawMany();
    const max = rows.reduce((m, r) => {
      const n = /^EMP-(\d+)$/.exec(r.emp_code)?.[1];
      return n ? Math.max(m, Number(n)) : m;
    }, 0);
    return `EMP-${String(max + 1).padStart(3, '0')}`;
  }

  private apply(e: HrEmployee, dto: SaveEmployeeDto, ctx: HrCtx) {
    const str = (v: string | undefined | null) => (v === undefined || v === null ? undefined : v.trim());
    const set = <K extends keyof HrEmployee>(k: K, v: HrEmployee[K] | undefined) => { if (v !== undefined) e[k] = v; };
    set('full_name', str(dto.full_name));
    set('phone', str(dto.phone));
    set('email', str(dto.email));
    set('nic', str(dto.nic)?.toUpperCase());
    set('address', str(dto.address));
    if (dto.dob !== undefined) e.dob = dto.dob || null;
    set('gender', dto.gender);
    set('emergency_name', str(dto.emergency_name));
    set('emergency_phone', str(dto.emergency_phone));
    set('job_title', str(dto.job_title));
    set('department', str(dto.department));
    set('employment_type', dto.employment_type);
    if (dto.join_date !== undefined) e.join_date = dto.join_date || null;
    if (dto.notes !== undefined) e.notes = dto.notes.trim() || null;
    if (ctx.owner) {
      set('pay_type', dto.pay_type);
      set('base_salary', dto.base_salary);
      set('fixed_allowance', dto.fixed_allowance);
      set('epf_enabled', dto.epf_enabled);
      set('epf_number', str(dto.epf_number));
      set('bank_name', str(dto.bank_name));
      set('bank_account', str(dto.bank_account));
    }
  }

  private async assertCodeFree(tenantId: number, code: string, exceptId?: number) {
    const clash = await this.employeeRepo.findOne({ where: { tenant_id: tenantId, emp_code: code } });
    if (clash && clash.id !== exceptId) throw new ConflictException('EMP_CODE_TAKEN');
  }

  async createEmployee(ctx: HrCtx, dto: SaveEmployeeDto) {
    await this.account.assertCanAddEmployee(ctx);
    const branchId = dto.branch_id ?? (ctx.branchIds?.length === 1 ? ctx.branchIds[0] : null);
    assertBranch(ctx, branchId);
    if (branchId) await this.getBranch(ctx, branchId);
    const code = dto.emp_code?.trim().toUpperCase() || await this.nextCode(ctx.tenantId);
    await this.assertCodeFree(ctx.tenantId, code);

    const e = this.employeeRepo.create({ tenant_id: ctx.tenantId, branch_id: branchId, emp_code: code, status: 'active' });
    this.apply(e, dto, ctx);
    // Payroll pro-rates from the join date, so it is never left empty
    if (!e.join_date) e.join_date = localDate();
    if (dto.pin) e.pin_hash = await bcrypt.hash(dto.pin, 8);
    const saved = await this.employeeRepo.save(e);
    await this.account.log(ctx, 'employee.create', 'hr_employee', saved.id, { name: saved.full_name, code });
    return viewEmployee(await this.findEmployee(ctx, saved.id, true), ctx);
  }

  async updateEmployee(ctx: HrCtx, id: number, dto: SaveEmployeeDto) {
    const e = await this.findEmployee(ctx, id);
    const before = { base_salary: e.base_salary, fixed_allowance: e.fixed_allowance, pay_type: e.pay_type, branch_id: e.branch_id };
    if (dto.branch_id !== undefined && dto.branch_id !== e.branch_id) {
      assertBranch(ctx, dto.branch_id);
      if (dto.branch_id) await this.getBranch(ctx, dto.branch_id);
      e.branch_id = dto.branch_id;
    }
    if (dto.emp_code?.trim() && dto.emp_code.trim().toUpperCase() !== e.emp_code) {
      const code = dto.emp_code.trim().toUpperCase();
      await this.assertCodeFree(ctx.tenantId, code, e.id);
      e.emp_code = code;
    }
    this.apply(e, dto, ctx);
    await this.employeeRepo.save(e);
    // Salary changes are the ones owners most want an audit trail for
    if (before.base_salary !== e.base_salary || before.fixed_allowance !== e.fixed_allowance || before.pay_type !== e.pay_type) {
      await this.account.log(ctx, 'employee.salary', 'hr_employee', e.id, {
        name: e.full_name, from: { pay_type: before.pay_type, base_salary: before.base_salary, fixed_allowance: before.fixed_allowance },
        to: { pay_type: e.pay_type, base_salary: e.base_salary, fixed_allowance: e.fixed_allowance },
      });
    } else {
      await this.account.log(ctx, 'employee.update', 'hr_employee', e.id, { name: e.full_name });
    }
    return viewEmployee(await this.findEmployee(ctx, id, true), ctx);
  }

  async setPhoto(ctx: HrCtx, id: number, url: string) {
    const e = await this.findEmployee(ctx, id);
    e.photo_url = url;
    await this.employeeRepo.save(e);
    return { photo_url: url };
  }

  async setPin(ctx: HrCtx, id: number, pin: string) {
    const e = await this.findEmployee(ctx, id);
    await this.employeeRepo.update({ id: e.id }, { pin_hash: await bcrypt.hash(pin, 8) });
    await this.account.log(ctx, 'employee.pin', 'hr_employee', e.id, { name: e.full_name });
    return { ok: true };
  }

  async endEmployment(ctx: HrCtx, id: number, dto: EndEmploymentDto) {
    const e = await this.findEmployee(ctx, id);
    e.status = dto.status;
    e.leave_date = dto.leave_date;
    e.leave_reason = dto.reason?.trim() ?? '';
    await this.employeeRepo.save(e);
    await this.account.log(ctx, `employee.${dto.status}`, 'hr_employee', e.id, { name: e.full_name, date: dto.leave_date });
    return viewEmployee(e, ctx);
  }

  async reactivate(ctx: HrCtx, id: number) {
    const e = await this.findEmployee(ctx, id);
    if (e.status === 'active') return viewEmployee(e, ctx);
    await this.account.assertCanAddEmployee(ctx);
    e.status = 'active';
    e.leave_date = null;
    e.leave_reason = '';
    await this.employeeRepo.save(e);
    await this.account.log(ctx, 'employee.reactivate', 'hr_employee', e.id, { name: e.full_name });
    return viewEmployee(e, ctx);
  }

  /** Owner only. Removes the employee with all their records (attendance, payslips…). */
  async deleteEmployee(ctx: HrCtx, id: number) {
    const e = await this.findEmployee(ctx, id);
    await this.employeeRepo.delete({ id: e.id, tenant_id: ctx.tenantId });
    await this.account.log(ctx, 'employee.delete', 'hr_employee', e.id, { name: e.full_name, code: e.emp_code });
    return { ok: true };
  }

  // ───────── Documents ─────────

  async listDocuments(ctx: HrCtx, employeeId: number) {
    await this.findEmployee(ctx, employeeId);
    return this.docRepo.find({ where: { tenant_id: ctx.tenantId, employee_id: employeeId }, order: { created_at: 'DESC' } });
  }

  async addDocument(ctx: HrCtx, employeeId: number, title: string, url: string) {
    const e = await this.findEmployee(ctx, employeeId);
    const doc = await this.docRepo.save(this.docRepo.create({ tenant_id: ctx.tenantId, employee_id: e.id, title: title.trim(), url }));
    await this.account.log(ctx, 'document.add', 'hr_employee', e.id, { name: e.full_name, title: doc.title });
    return doc;
  }

  async deleteDocument(ctx: HrCtx, docId: number) {
    const doc = await this.docRepo.findOne({ where: { id: docId, tenant_id: ctx.tenantId } });
    if (!doc) throw new NotFoundException('Document not found');
    await this.findEmployee(ctx, doc.employee_id);
    await this.docRepo.delete({ id: doc.id });
    return { ok: true };
  }

  // ───────── Kiosk PIN check ─────────

  /** Which of these employees have a kiosk PIN. */
  async withPin(tenantId: number, ids: number[]) {
    if (!ids.length) return new Set<number>();
    const rows = await this.employeeRepo.createQueryBuilder('e').select('e.id', 'id').addSelect('e.pin_hash', 'pin_hash')
      .where('e.tenant_id = :t AND e.id IN (:...ids)', { t: tenantId, ids }).getRawMany();
    return new Set(rows.filter(r => r.pin_hash).map(r => Number(r.id)));
  }

  private failures = new Map<number, { count: number; until: number }>();

  /**
   * Employee behind a kiosk action, after checking their PIN. Five wrong PINs lock that
   * employee out of the kiosk for five minutes.
   */
  async verifyPin(ctx: HrCtx, employeeId: number, pin: string): Promise<HrEmployee> {
    const lock = this.failures.get(employeeId);
    if (lock && lock.until > Date.now()) throw new BadRequestException('PIN_LOCKED');
    const e = await this.findEmployee(ctx, employeeId, true);
    if (e.status !== 'active') throw new BadRequestException('EMPLOYEE_INACTIVE');
    if (!e.pin_hash) throw new BadRequestException('PIN_NOT_SET');
    if (!(await bcrypt.compare(pin, e.pin_hash))) {
      // A lock that has run out starts the count again
      const count = (lock && !lock.until ? lock.count : 0) + 1;
      const locked = count >= 5;
      this.failures.set(employeeId, { count: locked ? 0 : count, until: locked ? Date.now() + 5 * 60_000 : 0 });
      throw new BadRequestException(locked ? 'PIN_LOCKED' : 'PIN_WRONG');
    }
    this.failures.delete(employeeId);
    return e;
  }
}
