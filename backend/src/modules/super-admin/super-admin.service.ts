import { Injectable, NotFoundException, BadRequestException, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as bcrypt from 'bcryptjs';
import { Tenant } from '../../database/entities/tenant.entity';
import { User } from '../../database/entities/user.entity';
import { Subscription } from '../../database/entities/subscription.entity';
import { PaymentTransaction } from '../../database/entities/payment-transaction.entity';
import { Package } from '../../database/entities/package.entity';
import { Coupon } from '../../database/entities/coupon.entity';
import { Announcement } from '../../database/entities/announcement.entity';
import { ApiLog } from '../../database/entities/api-log.entity';
import { EmailService } from '../../common/email.service';
import { CloudflareService } from '../../common/cloudflare.service';
import {
  IsString, IsOptional, IsEnum, IsNumber, IsBoolean,
  IsDateString, IsInt, Min, Max, MaxLength, Matches,
} from 'class-validator';

// ── DTOs ──────────────────────────────────────────────────────────────────────

export class BlockTenantDto {
  @IsEnum(['active', 'blocked', 'suspended']) status: string;
  @IsOptional() @IsString() plan_note?: string;
}

export class ChangePlanDto {
  @IsNumber() package_id: number;
  @IsEnum(['monthly', 'yearly']) billing_cycle: string;
  @IsOptional() @IsString() plan_note?: string;
  @IsOptional() @IsString() coupon_code?: string;
}

export class CreateCouponDto {
  @IsString() @MaxLength(50) @Matches(/^[A-Z0-9_-]+$/i, { message: 'Code must be alphanumeric' }) code: string;
  @IsEnum(['percentage', 'fixed']) type: string;
  @IsNumber() @Min(0.01) @Max(100) value: number;
  @IsOptional() @IsInt() @Min(1) duration_months?: number;
  @IsOptional() @IsInt() @Min(1) max_uses?: number;
  @IsOptional() @IsDateString() expires_at?: string;
}

export class CreateAnnouncementDto {
  @IsString() title: string;
  @IsString() message: string;
  @IsOptional() @IsEnum(['info', 'warning', 'success', 'error']) type?: string;
  @IsOptional() @IsDateString() expires_at?: string;
}

export class UpdateAnnouncementDto {
  @IsOptional() @IsBoolean() is_active?: boolean;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() message?: string;
}

// ── Service ───────────────────────────────────────────────────────────────────

const DEFAULT_SUPER_ADMIN_EMAIL = 'superadmin@kadehub.com';
const DEFAULT_SUPER_ADMIN_PASSWORD = 'SuperAdmin@123';
const LEGACY_DUMMY_HASH = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';

@Injectable()
export class SuperAdminService implements OnModuleInit {
  private readonly logger = new Logger(SuperAdminService.name);

  constructor(
    @InjectRepository(Tenant) private tenantRepo: Repository<Tenant>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Subscription) private subRepo: Repository<Subscription>,
    @InjectRepository(PaymentTransaction) private txRepo: Repository<PaymentTransaction>,
    @InjectRepository(Package) private packageRepo: Repository<Package>,
    @InjectRepository(Coupon) private couponRepo: Repository<Coupon>,
    @InjectRepository(Announcement) private announcementRepo: Repository<Announcement>,
    @InjectRepository(ApiLog) private apiLogRepo: Repository<ApiLog>,
    private emailService: EmailService,
    private cloudflare: CloudflareService,
  ) {}

  async onModuleInit() {
    await this.ensureSuperAdmin();
  }

  private async ensureSuperAdmin() {
    try {
      await this.ensureSuperAdminRole();

      const email = (process.env.SUPER_ADMIN_EMAIL || DEFAULT_SUPER_ADMIN_EMAIL).trim().toLowerCase();
      const password = process.env.SUPER_ADMIN_PASSWORD || DEFAULT_SUPER_ADMIN_PASSWORD;
      const forceReset = process.env.SUPER_ADMIN_RESET_PASSWORD === 'true';

      let tenant = await this.tenantRepo.findOne({ where: { slug: 'kadehub-platform' } });
      if (!tenant) {
        tenant = await this.tenantRepo.save(this.tenantRepo.create({
          name: 'KadeHub Platform',
          slug: 'kadehub-platform',
          subdomain: 'admin',
          status: 'active',
        }));
      }

      let user = await this.userRepo
        .createQueryBuilder('u')
        .where('LOWER(u.email) = :email', { email })
        .getOne();
      if (!user) {
        user = await this.userRepo.findOne({ where: { role: 'SUPER_ADMIN' } });
      }

      const hash = await bcrypt.hash(password, 10);
      const brokenSeed = user?.password_hash === LEGACY_DUMMY_HASH;
      const mustWrite = !user || forceReset || brokenSeed || user.role !== 'SUPER_ADMIN'
        || !(await bcrypt.compare(password, user.password_hash));

      if (!mustWrite) return;

      if (!user) {
        await this.userRepo.save(this.userRepo.create({
          tenant_id: tenant.id,
          name: 'Super Admin',
          email,
          password_hash: hash,
          role: 'SUPER_ADMIN',
        }));
        this.logger.log(`Created Super Admin ${email}`);
        return;
      }

      user.email = email;
      user.role = 'SUPER_ADMIN';
      if (!user.tenant_id) user.tenant_id = tenant.id;
      user.password_hash = hash;
      await this.userRepo.save(user);
      this.logger.log(`Reset Super Admin login for ${email}`);
    } catch (err) {
      this.logger.warn(`Could not ensure Super Admin: ${err.message}`);
    }
  }

  private async ensureSuperAdminRole() {
    const type = this.userRepo.manager.connection.options.type;
    if (type === 'postgres') {
      await this.userRepo.query(`ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'SUPER_ADMIN'`).catch(() => {});
    } else {
      await this.userRepo.query(
        `ALTER TABLE \`user\` MODIFY COLUMN \`role\` ENUM('SUPER_ADMIN','ADMIN','CASHIER') NOT NULL DEFAULT 'CASHIER'`,
      ).catch(() => {});
    }
  }

  // ── Dashboard stats ────────────────────────────────────────────────────────

  async getPlatformStats() {
    const [totalShops, activeShops, blockedShops] = await Promise.all([
      this.tenantRepo.count(),
      this.tenantRepo.count({ where: { status: 'active' } }),
      this.tenantRepo.count({ where: { status: 'blocked' } }),
    ]);
    const revenue = await this.txRepo
      .createQueryBuilder('tx')
      .select('SUM(tx.amount)', 'total')
      .where('tx.status = :s', { s: 'completed' })
      .getRawOne();
    const recentTx = await this.txRepo.find({
      relations: ['tenant', 'package'],
      order: { created_at: 'DESC' },
      take: 10,
    });
    const pendingSlips = await this.txRepo.count({ where: { gateway: 'bank_transfer', status: 'pending' } });
    return { totalShops, activeShops, blockedShops, totalRevenue: parseFloat(revenue?.total || '0'), recentTransactions: recentTx, pendingSlips };
  }

  // ── Shops ──────────────────────────────────────────────────────────────────

  async listShops(page = 1, limit = 20, search?: string) {
    const qb = this.tenantRepo.createQueryBuilder('t');
    if (search) qb.where('t.name LIKE :s OR t.slug LIKE :s', { s: `%${search}%` });
    const [tenants, total] = await qb.orderBy('t.created_at', 'DESC').skip((page - 1) * limit).take(limit).getManyAndCount();
    const enriched = await Promise.all(tenants.map(async (t) => {
      const [userCount, activeSub] = await Promise.all([
        this.userRepo.count({ where: { tenant_id: t.id } }),
        this.subRepo.findOne({ where: { tenant_id: t.id, status: 'active', payment_status: 'paid' } }),
      ]);
      const pkg = activeSub?.package_id ? await this.packageRepo.findOne({ where: { id: activeSub.package_id } }) : null;
      return { ...t, userCount, currentPlan: pkg?.name || 'Free', planExpiry: activeSub?.expires_at || null };
    }));
    return { data: enriched, total, page, limit };
  }

  async getShopDetail(tenantId: number) {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Shop not found');
    const [users, subscriptions, transactions] = await Promise.all([
      this.userRepo.find({ where: { tenant_id: tenantId }, select: ['id', 'name', 'email', 'role', 'created_at'] }),
      this.subRepo.find({ where: { tenant_id: tenantId }, order: { started_at: 'DESC' } }),
      this.txRepo.find({ where: { tenant_id: tenantId }, relations: ['package'], order: { created_at: 'DESC' } }),
    ]);
    const activeSub = subscriptions.find(s => s.status === 'active' && s.payment_status === 'paid');
    const currentPlan = activeSub?.package_id ? await this.packageRepo.findOne({ where: { id: activeSub.package_id } }) : null;
    return { tenant, users, subscriptions, transactions, currentPlan };
  }

  async setTenantStatus(tenantId: number, dto: BlockTenantDto) {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Shop not found');
    tenant.status = dto.status;
    if (dto.plan_note !== undefined) tenant.plan_note = dto.plan_note;
    return this.tenantRepo.save(tenant);
  }

  async changePlan(tenantId: number, dto: ChangePlanDto) {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Shop not found');
    const pkg = await this.packageRepo.findOne({ where: { id: dto.package_id }, relations: ['modules'] });
    if (!pkg) throw new NotFoundException('Package not found');

    let amount = dto.billing_cycle === 'yearly' ? pkg.price_yearly : pkg.price_monthly;

    // Apply coupon if provided
    if (dto.coupon_code) {
      const coupon = await this.validateCoupon(dto.coupon_code);
      if (coupon.type === 'percentage') {
        if (coupon.value > 100) throw new BadRequestException('Invalid coupon: percentage exceeds 100');
        amount = amount * (1 - coupon.value / 100);
      } else {
        if (coupon.value <= 0) throw new BadRequestException('Invalid coupon: fixed value must be positive');
        amount = Math.max(0, amount - coupon.value);
      }
      coupon.used_count += 1;
      await this.couponRepo.save(coupon);
    }

    await this.subRepo.delete({ tenant_id: tenantId });
    const expiresAt = new Date();
    if (dto.billing_cycle === 'yearly') expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    else expiresAt.setMonth(expiresAt.getMonth() + 1);

    const subs = pkg.modules.map(m => this.subRepo.create({
      tenant_id: tenantId, module_name: m.module_name, status: 'active',
      package_id: pkg.id, billing_cycle: dto.billing_cycle,
      started_at: new Date(), expires_at: expiresAt,
      payment_status: 'paid', payment_ref: `ADMIN-${Date.now()}`,
    }));
    await this.subRepo.save(subs);

    if (dto.plan_note !== undefined) { tenant.plan_note = dto.plan_note; await this.tenantRepo.save(tenant); }

    // Email notification
    await this.emailService.notifySubscription(tenant.name, pkg.name, amount);

    return { tenant, package: pkg, subscriptions: subs, finalAmount: amount };
  }

  async deleteTenant(tenantId: number) {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Shop not found');

    // Clean up Cloudflare DNS record if one was created during registration
    try {
      const planNote = this.parsePlanNote(tenant.plan_note);
      if (planNote.cf_dns_record_id) {
        await this.cloudflare.deleteSubdomain(planNote.cf_dns_record_id);
        this.logger.log(`Deleted Cloudflare DNS record for tenant ${tenantId} (${tenant.subdomain})`);
      }
    } catch (err) {
      // Log but don't block deletion — DNS cleanup failure shouldn't prevent tenant removal
      this.logger.warn(`Failed to delete Cloudflare DNS record for tenant ${tenantId}: ${err.message}`);
    }

    await this.tenantRepo.remove(tenant);
    return { message: 'Shop deleted' };
  }

  private parsePlanNote(note: string | null): Record<string, any> {
    try { return note ? JSON.parse(note) : {}; } catch { return {}; }
  }

  // ── Transactions ───────────────────────────────────────────────────────────

  async getAllTransactions(page = 1, limit = 20) {
    const [data, total] = await this.txRepo.findAndCount({
      relations: ['tenant', 'package'],
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit };
  }

  async getTransactionsCsv(): Promise<string> {
    const txs = await this.txRepo.find({ relations: ['tenant', 'package'], order: { created_at: 'DESC' } });
    const header = 'ID,Shop,Package,Amount,Currency,Cycle,Gateway,Reference,Status,Date';
    const rows = txs.map(t =>
      [t.id, `"${t.tenant?.name || ''}"`, `"${t.package?.name || ''}"`,
       t.amount, t.currency, t.billing_cycle, t.gateway,
       t.gateway_ref || '', t.status,
       new Date(t.created_at).toISOString()].join(',')
    );
    return [header, ...rows].join('\n');
  }

  // ── Invoice ────────────────────────────────────────────────────────────────

  async getInvoiceData(txId: number) {
    const tx = await this.txRepo.findOne({ where: { id: txId }, relations: ['tenant', 'package'] });
    if (!tx) throw new NotFoundException('Transaction not found');
    const profile = await this.tenantRepo.findOne({ where: { id: tx.tenant_id } });
    return { transaction: tx, tenant: profile };
  }

  // ── Packages ───────────────────────────────────────────────────────────────

  async getPackages() {
    return this.packageRepo.find({ relations: ['modules'], order: { sort_order: 'ASC' } });
  }

  // ── Coupons ────────────────────────────────────────────────────────────────

  async getCoupons() {
    return this.couponRepo.find({ order: { created_at: 'DESC' } });
  }

  async createCoupon(dto: CreateCouponDto) {
    const existing = await this.couponRepo.findOne({ where: { code: dto.code.toUpperCase() } });
    if (existing) throw new BadRequestException('Coupon code already exists');
    const coupon = this.couponRepo.create({
      ...dto,
      code: dto.code.toUpperCase(),
      expires_at: dto.expires_at ? new Date(dto.expires_at) : undefined,
    });
    return this.couponRepo.save(coupon);
  }

  async toggleCoupon(id: number) {
    const coupon = await this.couponRepo.findOne({ where: { id } });
    if (!coupon) throw new NotFoundException('Coupon not found');
    coupon.is_active = !coupon.is_active;
    return this.couponRepo.save(coupon);
  }

  async deleteCoupon(id: number) {
    const coupon = await this.couponRepo.findOne({ where: { id } });
    if (!coupon) throw new NotFoundException('Coupon not found');
    await this.couponRepo.remove(coupon);
    return { message: 'Deleted' };
  }

  async validateCoupon(code: string) {
    const coupon = await this.couponRepo.findOne({ where: { code: code.toUpperCase(), is_active: true } });
    if (!coupon) throw new BadRequestException('Invalid or inactive coupon code');
    if (coupon.expires_at && new Date() > new Date(coupon.expires_at))
      throw new BadRequestException('Coupon has expired');
    if (coupon.max_uses && coupon.used_count >= coupon.max_uses)
      throw new BadRequestException('Coupon usage limit reached');
    return coupon;
  }

  // ── Announcements ──────────────────────────────────────────────────────────

  async getAnnouncements(activeOnly = false) {
    const qb = this.announcementRepo.createQueryBuilder('a').orderBy('a.created_at', 'DESC');
    if (activeOnly) qb.where('a.is_active = true AND (a.expires_at IS NULL OR a.expires_at > NOW())');
    return qb.getMany();
  }

  async createAnnouncement(dto: CreateAnnouncementDto) {
    const ann = this.announcementRepo.create({
      ...dto,
      type: dto.type || 'info',
      expires_at: dto.expires_at ? new Date(dto.expires_at) : undefined,
    });
    return this.announcementRepo.save(ann);
  }

  async updateAnnouncement(id: number, dto: UpdateAnnouncementDto) {
    const ann = await this.announcementRepo.findOne({ where: { id } });
    if (!ann) throw new NotFoundException('Announcement not found');
    Object.assign(ann, dto);
    return this.announcementRepo.save(ann);
  }

  async deleteAnnouncement(id: number) {
    const ann = await this.announcementRepo.findOne({ where: { id } });
    if (!ann) throw new NotFoundException('Announcement not found');
    await this.announcementRepo.remove(ann);
    return { message: 'Deleted' };
  }

  // ── API Monitor ────────────────────────────────────────────────────────────

  async getApiStats(hours = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const byTenant = await this.apiLogRepo
      .createQueryBuilder('l')
      .select('l.tenant_id', 'tenant_id')
      .addSelect('COUNT(*)', 'total_requests')
      .addSelect('AVG(l.response_ms)', 'avg_ms')
      .addSelect('SUM(CASE WHEN l.status_code >= 400 THEN 1 ELSE 0 END)', 'errors')
      .where('l.created_at > :since', { since })
      .andWhere('l.tenant_id IS NOT NULL')
      .groupBy('l.tenant_id')
      .orderBy('total_requests', 'DESC')
      .limit(20)
      .getRawMany();

    // Enrich with tenant names
    const enriched = await Promise.all(byTenant.map(async (row) => {
      const tenant = await this.tenantRepo.findOne({ where: { id: row.tenant_id } });
      return {
        tenant_id: row.tenant_id,
        tenant_name: tenant?.name || 'Unknown',
        total_requests: parseInt(row.total_requests),
        avg_ms: Math.round(parseFloat(row.avg_ms)),
        errors: parseInt(row.errors),
      };
    }));

    const topEndpoints = await this.apiLogRepo
      .createQueryBuilder('l')
      .select('l.path', 'path')
      .addSelect('l.method', 'method')
      .addSelect('COUNT(*)', 'count')
      .where('l.created_at > :since', { since })
      .groupBy('l.path')
      .addGroupBy('l.method')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    const totalRequests = await this.apiLogRepo
      .createQueryBuilder('l')
      .where('l.created_at > :since', { since })
      .getCount();

    return { byTenant: enriched, topEndpoints, totalRequests, hours };
  }

  // ── Plan Expiry Cron ───────────────────────────────────────────────────────

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handlePlanExpiry() {
    this.logger.log('Running plan expiry check...');
    const now = new Date();

    // Find subscriptions expiring in 3 days
    const threeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const expiringSoon = await this.subRepo
      .createQueryBuilder('s')
      .where('s.status = :status', { status: 'active' })
      .andWhere('s.expires_at IS NOT NULL')
      .andWhere('s.expires_at BETWEEN :now AND :soon', { now, soon: threeDays })
      .getMany();

    const notifiedTenants = new Set<number>();
    for (const sub of expiringSoon) {
      if (!notifiedTenants.has(sub.tenant_id)) {
        notifiedTenants.add(sub.tenant_id);
        const tenant = await this.tenantRepo.findOne({ where: { id: sub.tenant_id } });
        if (tenant) {
          const daysLeft = Math.ceil((new Date(sub.expires_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          await this.emailService.notifyExpiringSoon(tenant.name, daysLeft);
        }
      }
    }

    // Auto-suspend expired subscriptions
    const expired = await this.subRepo
      .createQueryBuilder('s')
      .where('s.status = :status', { status: 'active' })
      .andWhere('s.expires_at IS NOT NULL')
      .andWhere('s.expires_at < :now', { now })
      .andWhere('s.payment_status = :ps', { ps: 'paid' })
      .getMany();

    const suspendedTenants = new Set<number>();
    for (const sub of expired) {
      sub.status = 'inactive';
      await this.subRepo.save(sub);
      if (!suspendedTenants.has(sub.tenant_id)) {
        suspendedTenants.add(sub.tenant_id);
        const tenant = await this.tenantRepo.findOne({ where: { id: sub.tenant_id } });
        if (tenant && tenant.status === 'active') {
          tenant.status = 'suspended';
          tenant.plan_note = 'Auto-suspended: subscription expired';
          await this.tenantRepo.save(tenant);
          this.logger.log(`Auto-suspended tenant: ${tenant.name}`);
        }
      }
    }

    this.logger.log(`Expiry check done. Notified: ${notifiedTenants.size}, Suspended: ${suspendedTenants.size}`);
  }
}
