import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Subscription } from '../../database/entities/subscription.entity';
import { Package } from '../../database/entities/package.entity';
import { User } from '../../database/entities/user.entity';
import { AuditLog } from '../../database/entities/audit-log.entity';
import { HrBranch, HrBranchManager, HrEmployee, HrSettings } from '../../database/entities/hr-core.entity';
import { HrLeaveType, HrShiftTemplate } from '../../database/entities/hr-time.entity';
import { HR_FREE_PLAN, HR_PLANS, HR_TRIAL_PLAN, HrLimitException, hrPlanBySlug, type HrPlanDef } from './hr-plans';
import type { HrCtx } from './hr-access';
import { markUserDisabled } from '../../common/disabled-users';
import type { CreateManagerDto, RemoveManagerDto, ReplaceManagerDto, SaveSettingsDto, SetupHrDto, UpdateManagerDto } from './hr.dto';

/** trialing: the 14-day Pro trial. active: a paid plan. free: no trial or paid plan left, so the Free limits apply. */
export type HrSubStatus = 'trialing' | 'active' | 'free';

export interface HrPlanState {
  plan: HrPlanDef;
  status: HrSubStatus;
  trial_ends_at: Date | null;
  current_period_end: Date | null;
}

interface JwtUser { sub: number; tenant_id: number; role: string; name?: string }

const DEFAULT_LEAVE_TYPES: Array<Pick<HrLeaveType, 'name' | 'days_per_year' | 'paid' | 'color'>> = [
  { name: 'Annual', days_per_year: 14, paid: true, color: '#16a34a' },
  { name: 'Casual', days_per_year: 7, paid: true, color: '#0ea5e9' },
  { name: 'Sick', days_per_year: 7, paid: true, color: '#f59e0b' },
  { name: 'No-pay', days_per_year: 0, paid: false, color: '#64748b' },
];

const DEFAULT_SHIFTS: Array<Pick<HrShiftTemplate, 'name' | 'start_time' | 'end_time' | 'break_minutes' | 'color'>> = [
  { name: 'Morning', start_time: '08:00', end_time: '17:00', break_minutes: 60, color: '#7c3aed' },
  { name: 'Evening', start_time: '14:00', end_time: '22:00', break_minutes: 30, color: '#0ea5e9' },
];

@Injectable()
export class HrAccountService {
  constructor(
    @InjectRepository(Subscription) private subRepo: Repository<Subscription>,
    @InjectRepository(Package) private packageRepo: Repository<Package>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(AuditLog) private auditRepo: Repository<AuditLog>,
    @InjectRepository(HrSettings) private settingsRepo: Repository<HrSettings>,
    @InjectRepository(HrBranch) private branchRepo: Repository<HrBranch>,
    @InjectRepository(HrBranchManager) private managerRepo: Repository<HrBranchManager>,
    @InjectRepository(HrEmployee) private employeeRepo: Repository<HrEmployee>,
    @InjectRepository(HrLeaveType) private leaveTypeRepo: Repository<HrLeaveType>,
    @InjectRepository(HrShiftTemplate) private shiftRepo: Repository<HrShiftTemplate>,
  ) {}

  /** Null when the tenant never turned Staff on. */
  async getPlanState(tenantId: number): Promise<HrPlanState | null> {
    const subs = await this.subRepo.find({ where: { tenant_id: tenantId, product: 'hr' }, order: { started_at: 'DESC' } });
    if (!subs.length) return null;
    const now = Date.now();
    const valid = subs.filter(s => s.status === 'active' && (!s.expires_at || new Date(s.expires_at).getTime() > now));
    const paid = valid.find(s => s.payment_status === 'paid' && s.package_id);
    if (paid) {
      const pkg = await this.packageRepo.findOne({ where: { id: paid.package_id } });
      return { plan: hrPlanBySlug(pkg?.slug), status: 'active', trial_ends_at: null, current_period_end: paid.expires_at ?? null };
    }
    const trial = valid.find(s => s.payment_status === 'trial');
    if (trial) return { plan: HR_TRIAL_PLAN, status: 'trialing', trial_ends_at: trial.expires_at ?? null, current_period_end: trial.expires_at ?? null };
    return { plan: HR_FREE_PLAN, status: 'free', trial_ends_at: null, current_period_end: null };
  }

  /** Request context for HrGuard; null when Staff is off for the account. */
  async context(user: JwtUser): Promise<HrCtx | null> {
    const plan = await this.getPlanState(user.tenant_id);
    if (!plan) {
      // The super admin can look inside any account that has Staff; nobody gets a context without it
      return null;
    }
    const owner = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
    let branchIds: number[] | null = null;
    if (!owner) {
      const rows = await this.managerRepo.find({ where: { tenant_id: user.tenant_id, user_id: user.sub } });
      branchIds = rows.map(r => r.branch_id);
    }
    return { tenantId: user.tenant_id, userId: user.sub, userName: user.name ?? '', owner, branchIds, plan };
  }

  /** Everything the Staff shell needs in one call. Works before setup and for users without a role. */
  async me(user: JwtUser) {
    const [ctx, account] = await Promise.all([this.context(user), this.userRepo.findOne({ where: { id: user.sub } })]);
    const base = { email: account?.email ?? null, name: account?.name ?? null };
    if (!ctx) return { ...base, enabled: false };

    const settings = await this.settingsRepo.findOne({ where: { tenant_id: user.tenant_id } });
    const allBranches = await this.branchRepo.find({ where: { tenant_id: user.tenant_id, is_active: true }, order: { id: 'ASC' } });
    const branches = ctx.branchIds === null ? allBranches : allBranches.filter(b => ctx.branchIds!.includes(b.id));
    const employees = await this.employeeRepo.count({ where: { tenant_id: user.tenant_id, status: 'active' } });
    return {
      ...base,
      enabled: true,
      setup_done: !!settings,
      role: ctx.owner ? 'owner' : ctx.branchIds!.length ? 'manager' : 'none',
      settings,
      branches,
      plan: this.planView(ctx.plan.plan),
      subscription: { status: ctx.plan.status, trial_ends_at: ctx.plan.trial_ends_at, current_period_end: ctx.plan.current_period_end },
      usage: { employees, branches: allBranches.length },
    };
  }

  private planView(p: HrPlanDef) {
    const { description, ...rest } = p;
    return rest;
  }

  /** Plans with the package ids the shared checkout needs; prices come from the package table. */
  async plans() {
    const packages = await this.packageRepo.find({ where: { product: 'hr', is_active: true }, order: { sort_order: 'ASC' } });
    return HR_PLANS.map(p => {
      const pkg = packages.find(x => x.slug === p.slug);
      return {
        ...this.planView(p),
        package_id: pkg?.id ?? null,
        monthly_price_lkr: pkg ? Number(pkg.price_monthly) : p.monthly_price_lkr,
        yearly_price_lkr: pkg ? Number(pkg.price_yearly) : p.monthly_price_lkr * 10,
      };
    });
  }

  /** First-run wizard: business details, the first branch, default leave types and shifts. */
  async setup(user: JwtUser, dto: SetupHrDto) {
    if (!(await this.getPlanState(user.tenant_id))) throw new BadRequestException('Turn on KadeHub Staff first');
    let settings = await this.settingsRepo.findOne({ where: { tenant_id: user.tenant_id } });
    if (!settings) settings = this.settingsRepo.create({ tenant_id: user.tenant_id });
    settings.business_name = dto.business_name.trim();
    settings.phone = dto.phone?.trim() ?? '';
    settings.address = dto.address?.trim() ?? '';
    if (dto.weekly_off_days !== undefined) settings.weekly_off_days = dto.weekly_off_days;
    if (dto.brand_color) settings.brand_color = dto.brand_color.toLowerCase();
    await this.settingsRepo.save(settings);

    if (!(await this.branchRepo.count({ where: { tenant_id: user.tenant_id } }))) {
      await this.branchRepo.save(this.branchRepo.create({
        tenant_id: user.tenant_id, name: dto.branch_name?.trim() || 'Main branch', address: settings.address, phone: settings.phone,
      }));
    }
    if (!(await this.leaveTypeRepo.count({ where: { tenant_id: user.tenant_id } }))) {
      await this.leaveTypeRepo.save(DEFAULT_LEAVE_TYPES.map(l => this.leaveTypeRepo.create({ ...l, tenant_id: user.tenant_id })));
    }
    if (!(await this.shiftRepo.count({ where: { tenant_id: user.tenant_id } }))) {
      await this.shiftRepo.save(DEFAULT_SHIFTS.map(s => this.shiftRepo.create({ ...s, tenant_id: user.tenant_id, branch_id: null })));
    }
    return settings;
  }

  async getSettings(tenantId: number) {
    const s = await this.settingsRepo.findOne({ where: { tenant_id: tenantId } });
    if (!s) throw new NotFoundException('Finish setting up KadeHub Staff first');
    return s;
  }

  async saveSettings(ctx: HrCtx, dto: SaveSettingsDto) {
    const s = await this.getSettings(ctx.tenantId);
    const before = { ...s };
    for (const [k, v] of Object.entries(dto)) {
      if (v === undefined) continue;
      (s as any)[k] = typeof v === 'string' ? v.trim() : v;
    }
    if (dto.brand_color) s.brand_color = dto.brand_color.toLowerCase();
    const saved = await this.settingsRepo.save(s);
    const changed = Object.keys(dto).filter(k => (before as any)[k] !== (saved as any)[k]);
    if (changed.length) await this.log(ctx, 'settings.update', 'hr_settings', s.id, { changed });
    return saved;
  }

  async setLogo(ctx: HrCtx, url: string) {
    const s = await this.getSettings(ctx.tenantId);
    s.logo_url = url;
    return this.settingsRepo.save(s);
  }

  // ───────── Branch managers ─────────

  /** Every user of the account except owners, with the branches they manage. */
  async listManagers(tenantId: number) {
    const users = await this.userRepo.find({ where: { tenant_id: tenantId, role: Not(In(['ADMIN', 'SUPER_ADMIN'])) }, order: { name: 'ASC' } });
    const rows = await this.managerRepo.find({ where: { tenant_id: tenantId } });
    return users.map(u => ({
      id: u.id, name: u.name, email: u.email, phone: u.phone ?? '', disabled: !!u.disabled_at,
      branch_ids: rows.filter(r => r.user_id === u.id).map(r => r.branch_id),
    }));
  }

  /** New login for a manager (a CASHIER user in this account), then their branches. */
  async createManager(ctx: HrCtx, dto: CreateManagerDto) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.userRepo.createQueryBuilder('u').where('LOWER(u.email) = :email', { email }).getOne();
    if (existing) throw new ConflictException('EMAIL_TAKEN');
    const user = await this.userRepo.save(this.userRepo.create({
      tenant_id: ctx.tenantId, name: dto.name.trim(), email, phone: dto.phone?.trim() || undefined,
      password_hash: await bcrypt.hash(dto.password, 10), role: 'CASHIER',
    }));
    await this.setManagerBranches(ctx, user.id, dto.branch_ids);
    await this.log(ctx, 'manager.create', 'user', user.id, { name: user.name, branch_ids: dto.branch_ids });
    return { id: user.id };
  }

  /** A non-owner user of this account (owners can't be managed, replaced or blocked from here). */
  private async managerUser(ctx: HrCtx, userId: number) {
    const user = await this.userRepo.findOne({ where: { id: userId, tenant_id: ctx.tenantId } });
    if (!user || user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') throw new NotFoundException('User not found');
    return user;
  }

  private async managedBranches(ctx: HrCtx, userId: number) {
    return (await this.managerRepo.find({ where: { tenant_id: ctx.tenantId, user_id: userId } })).map(r => r.branch_id);
  }

  /** Block or unblock a login. Takes effect at once: the JWT guard checks the disabled set on every request. */
  private async setBlocked(userId: number, blocked: boolean) {
    await this.userRepo.update({ id: userId }, { disabled_at: blocked ? new Date() : null });
    markUserDisabled(userId, blocked);
  }

  async updateManager(ctx: HrCtx, userId: number, dto: UpdateManagerDto) {
    const user = await this.managerUser(ctx, userId);
    await this.setManagerBranches(ctx, userId, dto.branch_ids);
    await this.log(ctx, 'manager.branches', 'user', userId, { name: user.name, branch_ids: dto.branch_ids });
    return { ok: true };
  }

  /**
   * Someone takes over a manager's branches (keeping any they already run). The old manager loses
   * Staff access, and their KadeHub login is blocked too when asked.
   */
  async replaceManager(ctx: HrCtx, oldId: number, dto: ReplaceManagerDto) {
    const old = await this.managerUser(ctx, oldId);
    const branches = await this.managedBranches(ctx, oldId);
    if (!branches.length) throw new BadRequestException('MANAGER_NO_BRANCHES');
    if (!dto.user_id === !dto.new_manager) throw new BadRequestException('PICK_NEW_MANAGER');

    let newId: number;
    let newName: string;
    if (dto.user_id) {
      if (dto.user_id === oldId) throw new BadRequestException('SAME_MANAGER');
      const next = await this.managerUser(ctx, dto.user_id);
      if (next.disabled_at) throw new BadRequestException('MANAGER_BLOCKED');
      newId = next.id;
      newName = next.name;
      await this.setManagerBranches(ctx, newId, [...new Set([...(await this.managedBranches(ctx, newId)), ...branches])]);
    } else {
      newId = (await this.createManager(ctx, { ...dto.new_manager!, branch_ids: branches })).id;
      newName = dto.new_manager!.name.trim();
    }
    await this.setManagerBranches(ctx, oldId, []);
    if (dto.block_login) await this.setBlocked(oldId, true);
    await this.log(ctx, 'manager.replace', 'user', oldId, { name: old.name, to: newName, to_id: newId, branch_ids: branches, blocked: !!dto.block_login });
    return { ok: true, new_manager_id: newId };
  }

  /** Off Staff (no branches); optionally can't sign in to KadeHub any more. */
  async removeManager(ctx: HrCtx, userId: number, dto: RemoveManagerDto) {
    const user = await this.managerUser(ctx, userId);
    await this.setManagerBranches(ctx, userId, []);
    if (dto.block_login) await this.setBlocked(userId, true);
    await this.log(ctx, 'manager.remove', 'user', userId, { name: user.name, blocked: !!dto.block_login });
    return { ok: true };
  }

  async unblockManager(ctx: HrCtx, userId: number) {
    const user = await this.managerUser(ctx, userId);
    await this.setBlocked(userId, false);
    await this.log(ctx, 'manager.unblock', 'user', userId, { name: user.name });
    return { ok: true };
  }

  private async setManagerBranches(ctx: HrCtx, userId: number, branchIds: number[]) {
    const valid = branchIds.length
      ? (await this.branchRepo.find({ where: { tenant_id: ctx.tenantId, id: In(branchIds) } })).map(b => b.id)
      : [];
    await this.managerRepo.delete({ tenant_id: ctx.tenantId, user_id: userId });
    if (valid.length) await this.managerRepo.save(valid.map(branch_id => this.managerRepo.create({ tenant_id: ctx.tenantId, user_id: userId, branch_id })));
  }

  // ───────── Plan limits ─────────

  async assertCanAddEmployee(ctx: HrCtx) {
    const max = ctx.plan.plan.max_employees;
    if (max === null) return;
    const count = await this.employeeRepo.count({ where: { tenant_id: ctx.tenantId, status: 'active' } });
    if (count >= max) throw new HrLimitException('PLAN_LIMIT_EMPLOYEES', max);
  }

  async assertCanAddBranch(ctx: HrCtx) {
    const max = ctx.plan.plan.max_branches;
    if (max === null) return;
    const count = await this.branchRepo.count({ where: { tenant_id: ctx.tenantId, is_active: true } });
    if (count >= max) throw new HrLimitException('PLAN_LIMIT_BRANCHES', max);
  }

  // ───────── Activity log ─────────

  /** Shared audit_log table; entity names start with hr_ so the Staff activity page can filter them. */
  async log(ctx: HrCtx, action: string, entity: string, entityId: number | null, details?: Record<string, unknown>) {
    await this.auditRepo.save(this.auditRepo.create({
      tenant_id: ctx.tenantId, user_id: ctx.userId, action: `hr.${action}`, entity, entity_id: entityId ?? undefined, details: details ?? null,
    })).catch(() => {});
  }

  async activity(tenantId: number, page = 1) {
    const take = 50;
    const [rows, total] = await this.auditRepo.createQueryBuilder('a')
      .leftJoin('a.user', 'u').addSelect(['u.id', 'u.name'])
      .where('a.tenant_id = :tenantId', { tenantId })
      .andWhere('a.action LIKE :p', { p: 'hr.%' })
      .orderBy('a.created_at', 'DESC')
      .skip((Math.max(1, page) - 1) * take).take(take)
      .getManyAndCount();
    return {
      total, page,
      items: rows.map(r => ({
        id: r.id, action: r.action.slice(3), entity: r.entity, entity_id: r.entity_id, details: r.details,
        user_name: r.user?.name ?? '', created_at: r.created_at,
      })),
    };
  }
}
