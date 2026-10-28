import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Subscription } from '../../database/entities/subscription.entity';
import { Package } from '../../database/entities/package.entity';
import { User } from '../../database/entities/user.entity';
import { Tenant } from '../../database/entities/tenant.entity';
import { CodBusiness } from '../../database/entities/cod-business.entity';
import { CodOrder } from '../../database/entities/cod-order.entity';
import { CodOrderTopup } from '../../database/entities/cod-order-topup.entity';
import { COD_FREE_PLAN, COD_ORDER_GRACE, COD_PLANS, COD_TOPUP, COD_TOPUP_PLAN_SLUG, codPlanBySlug, CodPlanDef } from './cod-plans';
import { colomboMonthKey, startOfColomboMonth } from './cod-analytics';
import { UpdateCodBusinessDto, ChangePasswordDto } from './cod.dto';

/** CODPlatform's subscription vocabulary, derived from the shared subscription row. */
export type CodSubStatus = 'trialing' | 'active' | 'past_due' | 'canceled';

export interface CodPlanState {
  plan: CodPlanDef;
  status: CodSubStatus;
  trial_ends_at: Date | null;
  current_period_end: Date | null;
  active: boolean;
  /** Active paid plan (Growth, Scale or a legacy Pro/Business) — Free and trials do not count. */
  premium: boolean;
}

/** Thrown with a stable code so the frontend can show a translated message. */
export class CodLimitException extends ForbiddenException {
  constructor(code: 'PLAN_LIMIT_ORDERS', limit: number) {
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
    @InjectRepository(CodOrder) private orderRepo: Repository<CodOrder>,
    @InjectRepository(CodOrderTopup) private topupRepo: Repository<CodOrderTopup>,
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

    if (sub.status !== 'active') {
      return { plan, status: 'canceled', trial_ends_at: null, current_period_end: expires, active: false, premium: false };
    }
    // COD never locks for lapsing: Free (50 orders a month) never expires, and an ended trial
    // or paid plan carries on as Free until the seller buys a plan again
    if (plan.key === 'free' || (expires && expires.getTime() < Date.now())) {
      return { plan: COD_FREE_PLAN, status: 'active', trial_ends_at: null, current_period_end: null, active: true, premium: false };
    }
    return {
      plan,
      status: trial ? 'trialing' : 'active',
      trial_ends_at: trial ? expires : null,
      current_period_end: expires,
      active: true,
      premium: !trial && sub.payment_status === 'paid',
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

    const [ordersThisMonth, limit] = await Promise.all([
      this.countOrdersThisMonth(user.tenant_id),
      this.orderLimit(user.tenant_id, state),
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
      usage: {
        orders_this_month: ordersThisMonth, orders_limit: limit.total, topup_orders: limit.topups,
        orders_grace: limit.total === null ? 0 : COD_ORDER_GRACE,
      },
      topup: await this.topupOffer(state),
    };
  }

  private planView(p: CodPlanDef) {
    const { description, ...rest } = p;
    return rest;
  }

  /** Plans with the package ids the shared checkout needs; prices come from the package table. */
  async plans() {
    const packages = await this.packageRepo.find({ where: { product: 'cod', is_active: true }, order: { sort_order: 'ASC' } });
    return COD_PLANS.filter(p => !p.legacy).map(p => {
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
      // 400, not 401: the frontend treats any 401 as an expired session and signs the user out
      throw new BadRequestException('CURRENT_PASSWORD_WRONG');
    }
    user.password_hash = await bcrypt.hash(dto.password, 10);
    await this.userRepo.save(user);
    return { ok: true };
  }

  // ---------- plan limits ----------

  async assertCanAddOrder(tenantId: number) {
    const state = await this.requireEnabled(tenantId);
    const { total } = await this.orderLimit(tenantId, state);
    if (total === null) return;
    // The last few orders past the limit still go through (the app warns), then orders are blocked
    const count = await this.countOrdersThisMonth(tenantId);
    if (count >= total + COD_ORDER_GRACE) throw new CodLimitException('PLAN_LIMIT_ORDERS', total);
  }

  private countOrdersThisMonth(tenantId: number) {
    return this.orderRepo.count({ where: { tenant_id: tenantId, created_at: MoreThanOrEqual(startOfColomboMonth()) } });
  }

  /** This month's order limit: the plan's monthly orders plus any top-ups bought this month. Null = unlimited. */
  private async orderLimit(tenantId: number, state: CodPlanState): Promise<{ total: number | null; topups: number }> {
    const rows = await this.topupRepo.find({ where: { tenant_id: tenantId, month: colomboMonthKey() } });
    const topups = rows.reduce((sum, r) => sum + r.orders, 0);
    const base = state.plan.max_orders_per_month;
    return { total: base === null ? null : base + topups, topups };
  }

  /** The +100 orders top-up, offered only on a paid, current top plan — smaller plans upgrade instead. */
  private async topupOffer(state: CodPlanState) {
    if (!state.premium || state.plan.slug !== COD_TOPUP_PLAN_SLUG) return null;
    const pkg = await this.packageRepo.findOne({ where: { slug: COD_TOPUP.slug, is_active: true } });
    if (!pkg) return null;
    return { package_id: pkg.id, orders: COD_TOPUP.orders, price_lkr: Number(pkg.price_monthly) };
  }
}
