import { Injectable, ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Subscription } from '../../database/entities/subscription.entity';
import { Package } from '../../database/entities/package.entity';
import { User } from '../../database/entities/user.entity';
import { Tenant } from '../../database/entities/tenant.entity';
import { CodBusiness } from '../../database/entities/cod-business.entity';
import { CodItem } from '../../database/entities/cod-item.entity';
import { CodOrder } from '../../database/entities/cod-order.entity';
import { COD_PLANS, codPlanBySlug, CodPlanDef } from './cod-plans';
import { startOfColomboMonth } from './cod-analytics';
import { UpdateCodBusinessDto, ChangePasswordDto } from './cod.dto';

/** CODPlatform's subscription vocabulary, derived from the shared subscription row. */
export type CodSubStatus = 'trialing' | 'active' | 'past_due' | 'canceled';

export interface CodPlanState {
  plan: CodPlanDef;
  status: CodSubStatus;
  trial_ends_at: Date | null;
  current_period_end: Date | null;
  active: boolean;
  /** Active paid Pro/Business plan — the trial runs on Free and does not count. */
  premium: boolean;
}

/** Thrown with a stable code so the frontend can show a translated message. */
export class CodLimitException extends ForbiddenException {
  constructor(code: 'PLAN_LIMIT_ITEMS' | 'PLAN_LIMIT_ORDERS', limit: number) {
    super({ statusCode: 403, code, limit, message: code });
  }
}

@Injectable()
export class CodAccountService {
  constructor(
    @InjectRepository(Subscription) private subRepo: Repository<Subscription>,
    @InjectRepository(Package) private packageRepo: Repository<Package>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Tenant) private tenantRepo: Repository<Tenant>,
    @InjectRepository(CodBusiness) private businessRepo: Repository<CodBusiness>,
    @InjectRepository(CodItem) private itemRepo: Repository<CodItem>,
    @InjectRepository(CodOrder) private orderRepo: Repository<CodOrder>,
  ) {}

  /** Null when the tenant never turned COD on. */
  async getPlanState(tenantId: number): Promise<CodPlanState | null> {
    const subs = await this.subRepo.find({ where: { tenant_id: tenantId, product: 'cod' }, order: { started_at: 'DESC' } });
    const sub = subs.find(s => s.status === 'active') ?? subs[0];
    if (!sub) return null;

    const pkg = sub.package_id ? await this.packageRepo.findOne({ where: { id: sub.package_id } }) : null;
    const plan = codPlanBySlug(pkg?.slug);
    const expires = sub.expires_at ? new Date(sub.expires_at) : null;
    const trial = sub.payment_status === 'trial';

    let status: CodSubStatus;
    if (sub.status !== 'active') status = 'canceled';
    else if (expires && expires.getTime() < Date.now()) status = 'past_due';
    else status = trial ? 'trialing' : 'active';

    const active = status === 'trialing' || status === 'active';
    return {
      plan,
      status,
      trial_ends_at: trial ? expires : null,
      current_period_end: expires,
      active,
      premium: active && plan.key !== 'free' && sub.payment_status === 'paid',
    };
  }

  async isPremium(tenantId: number) {
    return (await this.getPlanState(tenantId))?.premium ?? false;
  }

  /** Everything the COD shell needs in one call: account, business, plan, usage. */
  async me(user: { sub: number; tenant_id: number }) {
    const [state, business, account] = await Promise.all([
      this.getPlanState(user.tenant_id),
      this.businessRepo.findOne({ where: { tenant_id: user.tenant_id } }),
      this.userRepo.findOne({ where: { id: user.sub } }),
    ]);
    if (!state) return { enabled: false, email: account?.email ?? null, name: account?.name ?? null };

    const [items, ordersThisMonth] = await Promise.all([
      this.itemRepo.count({ where: { tenant_id: user.tenant_id } }),
      this.orderRepo.count({ where: { tenant_id: user.tenant_id, created_at: MoreThanOrEqual(startOfColomboMonth()) } }),
    ]);
    return {
      enabled: true,
      email: account?.email ?? null,
      name: account?.name ?? null,
      business,
      plan: this.planView(state.plan),
      subscription: { status: state.status, trial_ends_at: state.trial_ends_at, current_period_end: state.current_period_end },
      active: state.active,
      premium: state.premium,
      usage: { items, orders_this_month: ordersThisMonth },
    };
  }

  private planView(p: CodPlanDef) {
    const { description, ...rest } = p;
    return rest;
  }

  /** Plans with the package ids the shared checkout needs; prices come from the package table. */
  async plans() {
    const packages = await this.packageRepo.find({ where: { product: 'cod', is_active: true }, order: { sort_order: 'ASC' } });
    return COD_PLANS.map(p => {
      const pkg = packages.find(x => x.slug === p.slug);
      return {
        ...this.planView(p),
        package_id: pkg?.id ?? null,
        monthly_price_lkr: pkg ? Number(pkg.price_monthly) : p.monthly_price_lkr,
        yearly_price_lkr: pkg ? Number(pkg.price_yearly) : p.monthly_price_lkr * 12,
      };
    });
  }

  async requireEnabled(tenantId: number) {
    const state = await this.getPlanState(tenantId);
    if (!state) throw new ForbiddenException('KadeHub COD is not enabled for this account');
    return state;
  }

  /** Creates or updates the tenant's COD business profile (registration wizard + Settings). */
  async saveBusiness(tenantId: number, dto: UpdateCodBusinessDto) {
    await this.requireEnabled(tenantId);
    let business = await this.businessRepo.findOne({ where: { tenant_id: tenantId } });
    if (!business) business = this.businessRepo.create({ tenant_id: tenantId });
    const clean = (v: string | undefined | null, fallback: string) => (v === undefined || v === null ? fallback : v.trim());

    business.name = dto.name.trim();
    business.phone = clean(dto.phone, business.phone ?? '');
    business.address = clean(dto.address, business.address ?? '');
    business.city = clean(dto.city, business.city ?? '');
    if (dto.logo_url !== undefined) business.logo_url = dto.logo_url ? dto.logo_url.trim() : null;
    if (dto.business_type) business.business_type = dto.business_type;
    business.tagline = clean(dto.tagline, business.tagline ?? '');
    if (dto.brand_color) business.brand_color = dto.brand_color.toLowerCase();
    business.invoice_footer = clean(dto.invoice_footer, business.invoice_footer ?? '');
    if (dto.imports_goods !== undefined) business.imports_goods = dto.imports_goods;
    return this.businessRepo.save(business);
  }

  async setLogo(tenantId: number, url: string) {
    await this.requireEnabled(tenantId);
    const business = await this.businessRepo.findOne({ where: { tenant_id: tenantId } });
    if (!business) throw new NotFoundException('Save your business details first');
    business.logo_url = url;
    return this.businessRepo.save(business);
  }

  async changePassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user || !(await bcrypt.compare(dto.current_password, user.password_hash))) {
      throw new UnauthorizedException('CURRENT_PASSWORD_WRONG');
    }
    user.password_hash = await bcrypt.hash(dto.password, 10);
    await this.userRepo.save(user);
    return { ok: true };
  }

  // ---------- plan limits ----------

  async assertCanAddItem(tenantId: number) {
    const { plan } = await this.requireEnabled(tenantId);
    if (plan.max_items === null) return;
    const count = await this.itemRepo.count({ where: { tenant_id: tenantId } });
    if (count >= plan.max_items) throw new CodLimitException('PLAN_LIMIT_ITEMS', plan.max_items);
  }

  async assertCanAddOrder(tenantId: number) {
    const { plan } = await this.requireEnabled(tenantId);
    if (plan.max_orders_per_month === null) return;
    const count = await this.orderRepo.count({ where: { tenant_id: tenantId, created_at: MoreThanOrEqual(startOfColomboMonth()) } });
    if (count >= plan.max_orders_per_month) throw new CodLimitException('PLAN_LIMIT_ORDERS', plan.max_orders_per_month);
  }
}
