import { Injectable, NotFoundException, BadRequestException, ConflictException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import {
  IsString, IsOptional, IsEnum, IsNumber, IsBoolean, IsInt, IsEmail, IsArray, Min, MinLength, MaxLength,
} from 'class-validator';
import { User } from '../../database/entities/user.entity';
import { Tenant } from '../../database/entities/tenant.entity';
import { Package } from '../../database/entities/package.entity';
import { PackageModule } from '../../database/entities/package-module.entity';
import { Subscription } from '../../database/entities/subscription.entity';
import { AuditLog } from '../../database/entities/audit-log.entity';
import { COD_BUSINESS_TYPES } from '../cod/cod.dto';
import { setDisabledUsers, markUserDisabled } from '../../common/disabled-users';

// ── DTOs ──────────────────────────────────────────────────────────────────────

export class SavePackageDto {
  @IsString() @MinLength(2) @MaxLength(80) name: string;
  @IsOptional() @IsString() @MaxLength(80) slug?: string;
  @IsEnum(['pos', 'cod', 'tasks']) product: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsNumber() @Min(0) price_monthly: number;
  @IsNumber() @Min(0) price_yearly: number;
  @IsOptional() @IsBoolean() is_active?: boolean;
  @IsOptional() @IsBoolean() is_popular?: boolean;
  @IsOptional() @IsInt() @Min(0) sort_order?: number;
  @IsOptional() @IsInt() @Min(1) employee_limit?: number | null;
  @IsArray() @IsString({ each: true }) @MaxLength(40, { each: true }) modules: string[];
}

export class ResetPasswordDto {
  /** Leave empty to generate one. */
  @IsOptional() @IsString() @MinLength(8) @MaxLength(100) password?: string;
}

export class ChangeEmailDto {
  @IsEmail() email: string;
}

export class SetDisabledDto {
  @IsBoolean() disabled: boolean;
}

export class TasksBanDto {
  @IsBoolean() banned: boolean;
  @IsOptional() @IsString() @MaxLength(255) reason?: string;
}

export class AddAdminDto {
  @IsString() @MinLength(2) @MaxLength(100) name: string;
  @IsEmail() email: string;
  @IsString() @MinLength(8) @MaxLength(100) password: string;
}

export class ChangeOwnPasswordDto {
  @IsString() current_password: string;
  @IsString() @MinLength(8) @MaxLength(100) new_password: string;
}

export type CodFilter = {
  q?: string; type?: string; category?: string; page?: number; limit?: number;
  /** Orders only */
  status?: string; from?: string; to?: string;
};

const CSV_LIMIT = 50_000;

/** One CSV cell: quoted, and never read by a spreadsheet as a formula. Phone numbers keep their leading "+". */
function cell(v: unknown): string {
  let s = v === null || v === undefined ? '' : v instanceof Date ? v.toISOString() : String(v);
  if (/^[=@\t\r]/.test(s) || /^[+-][^\d\s]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

/** BOM so Excel opens Sinhala/Tamil names correctly. */
export function toCsv(header: string[], rows: unknown[][]): string {
  return '﻿' + [header.map(cell).join(','), ...rows.map(r => r.map(cell).join(','))].join('\r\n');
}

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);

/**
 * Super admin controls beyond shops and billing: people, admins, plans, the activity log and the COD directory.
 */
@Injectable()
export class SuperAdminOpsService implements OnModuleInit {
  constructor(
    private ds: DataSource,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Tenant) private tenantRepo: Repository<Tenant>,
    @InjectRepository(Package) private packageRepo: Repository<Package>,
    @InjectRepository(PackageModule) private moduleRepo: Repository<PackageModule>,
    @InjectRepository(Subscription) private subRepo: Repository<Subscription>,
    @InjectRepository(AuditLog) private auditRepo: Repository<AuditLog>,
  ) {}

  private get pg() { return this.ds.options.type === 'postgres'; }
  /** Raw SQL written with "?" placeholders, run on either dialect. */
  private sql<T = any>(text: string, params: unknown[] = []): Promise<T[]> {
    let i = 0;
    return this.ds.query(this.pg ? text.replace(/\?/g, () => `$${++i}`) : text, params);
  }

  // ── switched-off accounts (read by the JWT guard) ─────────────────────────

  async onModuleInit() { await this.refreshDisabled(); }

  @Cron(CronExpression.EVERY_MINUTE)
  async refreshDisabled() {
    try {
      const rows = await this.userRepo.createQueryBuilder('u').select('u.id', 'id').where('u.disabled_at IS NOT NULL').getRawMany();
      setDisabledUsers(rows.map(r => Number(r.id)));
    } catch { /* column not migrated yet */ }
  }

  // ── activity log ──────────────────────────────────────────────────────────

  /** Records a super admin action. Stored on the admin's own (platform) tenant so it outlives deleted shops. */
  async audit(admin: { sub: number; tenant_id: number }, action: string, entity: string, entityId: number | null, details?: Record<string, unknown>) {
    await this.auditRepo.save(this.auditRepo.create({
      tenant_id: admin.tenant_id, user_id: admin.sub, action, entity, entity_id: entityId ?? undefined, details: details ?? null,
    })).catch(() => {});
  }

  async activity(page = 1, limit = 30, action?: string) {
    const qb = this.auditRepo.createQueryBuilder('a')
      .innerJoin(User, 'u', 'u.id = a.user_id')
      .addSelect(['u.name', 'u.email'])
      .where('u.role = :r', { r: 'SUPER_ADMIN' });
    if (action) qb.andWhere('a.action LIKE :act', { act: `${action}%` });
    const total = await qb.getCount();
    const rows = await qb.select(['a.id', 'a.action', 'a.entity', 'a.entity_id', 'a.details', 'a.created_at'])
      .addSelect(['u.name', 'u.email'])
      .orderBy('a.created_at', 'DESC').addOrderBy('a.id', 'DESC').offset((page - 1) * limit).limit(limit).getRawMany();
    return {
      data: rows.map(r => ({
        id: r.a_id, action: r.a_action, entity: r.a_entity, entity_id: r.a_entity_id,
        details: typeof r.a_details === 'string' ? JSON.parse(r.a_details || 'null') : r.a_details,
        created_at: r.a_created_at, admin: { name: r.u_name, email: r.u_email },
      })),
      total, page, limit,
    };
  }

  // ── people ────────────────────────────────────────────────────────────────

  async listUsers(q?: string, filter?: string, page = 1, limit = 25) {
    const qb = this.userRepo.createQueryBuilder('u')
      .leftJoin(Tenant, 't', 't.id = u.tenant_id')
      .select(['u.id', 'u.name', 'u.email', 'u.phone', 'u.role', 'u.tenant_id', 'u.created_at', 'u.disabled_at', 'u.tasks_banned_at', 'u.tasks_ban_reason'])
      .addSelect(['t.name', 't.status'])
      .where('u.role <> :sa', { sa: 'SUPER_ADMIN' });
    if (q) qb.andWhere('(LOWER(u.name) LIKE :q OR LOWER(u.email) LIKE :q OR u.phone LIKE :q OR LOWER(t.name) LIKE :q)', { q: `%${q.toLowerCase()}%` });
    if (filter === 'disabled') qb.andWhere('u.disabled_at IS NOT NULL');
    if (filter === 'tasks_banned') qb.andWhere('u.tasks_banned_at IS NOT NULL');
    if (filter === 'admins') qb.andWhere('u.role = :ad', { ad: 'ADMIN' });
    if (filter === 'staff') qb.andWhere('u.role = :ca', { ca: 'CASHIER' });
    const total = await qb.getCount();
    const rows = await qb.orderBy('u.created_at', 'DESC').offset((page - 1) * limit).limit(limit).getRawMany();
    return {
      data: rows.map(r => ({
        id: r.u_id, name: r.u_name, email: r.u_email, phone: r.u_phone, role: r.u_role, created_at: r.u_created_at,
        disabled_at: r.u_disabled_at, tasks_banned_at: r.u_tasks_banned_at, tasks_ban_reason: r.u_tasks_ban_reason,
        shop: { id: r.u_tenant_id, name: r.t_name, status: r.t_status },
      })),
      total, page, limit,
    };
  }

  private async person(id: number, allowAdmins = false) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role === 'SUPER_ADMIN' && !allowAdmins) throw new BadRequestException('Manage super admins under Settings → Admins');
    return user;
  }

  async resetPassword(id: number, dto: ResetPasswordDto) {
    const user = await this.person(id);
    const password = dto.password || crypto.randomBytes(9).toString('base64url');
    user.password_hash = await bcrypt.hash(password, 10);
    await this.userRepo.save(user);
    // Shown once to the admin to pass on; never stored in the clear
    return { password, generated: !dto.password };
  }

  async changeEmail(id: number, dto: ChangeEmailDto) {
    const user = await this.person(id);
    const email = dto.email.trim().toLowerCase();
    const taken = await this.userRepo.createQueryBuilder('u').where('LOWER(u.email) = :e AND u.id <> :id', { e: email, id }).getCount();
    if (taken) throw new ConflictException('Another account already uses that email');
    const from = user.email;
    user.email = email;
    await this.userRepo.save(user);
    return { id, email, from };
  }

  /** `admins`: true only from Settings → Admins; the People page can't touch super admins. */
  async setDisabled(id: number, disabled: boolean, actingAdminId: number, admins = false) {
    if (id === actingAdminId) throw new BadRequestException("You can't switch off your own account");
    const user = await this.person(id, admins);
    if (admins && user.role !== 'SUPER_ADMIN') throw new BadRequestException('Not a super admin');
    if (user.role === 'SUPER_ADMIN' && disabled) {
      const others = await this.userRepo.createQueryBuilder('u')
        .where('u.role = :r AND u.id <> :id AND u.disabled_at IS NULL', { r: 'SUPER_ADMIN', id }).getCount();
      if (!others) throw new BadRequestException('At least one super admin must stay active');
    }
    user.disabled_at = disabled ? new Date() : null;
    await this.userRepo.save(user);
    markUserDisabled(user.id, disabled);
    return { id, disabled_at: user.disabled_at };
  }

  async setTasksBan(id: number, dto: TasksBanDto) {
    const user = await this.person(id);
    user.tasks_banned_at = dto.banned ? new Date() : null;
    user.tasks_ban_reason = dto.banned ? (dto.reason?.trim() || null) : null;
    await this.userRepo.save(user);
    return { id, tasks_banned_at: user.tasks_banned_at, tasks_ban_reason: user.tasks_ban_reason };
  }

  // ── super admins ──────────────────────────────────────────────────────────

  async listAdmins() {
    return this.userRepo.find({
      where: { role: 'SUPER_ADMIN' }, order: { created_at: 'ASC' },
      select: ['id', 'name', 'email', 'created_at', 'disabled_at'],
    });
  }

  async addAdmin(dto: AddAdminDto, platformTenantId: number) {
    const email = dto.email.trim().toLowerCase();
    if (await this.userRepo.createQueryBuilder('u').where('LOWER(u.email) = :e', { e: email }).getCount()) {
      throw new ConflictException('An account with that email already exists');
    }
    const user = await this.userRepo.save(this.userRepo.create({
      tenant_id: platformTenantId, name: dto.name.trim(), email, role: 'SUPER_ADMIN',
      password_hash: await bcrypt.hash(dto.password, 10),
    }));
    return { id: user.id, name: user.name, email: user.email, created_at: user.created_at, disabled_at: null };
  }

  async changeOwnPassword(adminId: number, dto: ChangeOwnPasswordDto) {
    const user = await this.userRepo.findOne({ where: { id: adminId } });
    if (!user) throw new NotFoundException('User not found');
    // 400, not 401: a wrong current password must not sign the admin out
    if (!(await bcrypt.compare(dto.current_password, user.password_hash))) throw new BadRequestException('Current password is incorrect');
    user.password_hash = await bcrypt.hash(dto.new_password, 10);
    await this.userRepo.save(user);
    return { ok: true };
  }

  // ── packages ──────────────────────────────────────────────────────────────

  async moduleNames() {
    const rows = await this.moduleRepo.createQueryBuilder('m').select('DISTINCT m.module_name', 'name').getRawMany();
    return rows.map(r => r.name).filter(Boolean).sort();
  }

  async savePackage(dto: SavePackageDto, id?: number) {
    const pkg = id ? await this.packageRepo.findOne({ where: { id } }) : this.packageRepo.create();
    if (!pkg) throw new NotFoundException('Package not found');
    const slug = slugify(dto.slug || dto.name);
    if (!slug) throw new BadRequestException('Give the package a name');
    const clash = await this.packageRepo.findOne({ where: { slug } });
    if (clash && clash.id !== pkg.id) throw new ConflictException(`Another package already uses the slug "${slug}"`);
    const modules = [...new Set(dto.modules.map(m => m.trim().toLowerCase()).filter(Boolean))];
    if (!modules.length) throw new BadRequestException('Pick at least one feature (module)');

    Object.assign(pkg, {
      name: dto.name.trim(), slug, product: dto.product, description: dto.description?.trim() || null,
      price_monthly: dto.price_monthly, price_yearly: dto.price_yearly,
      is_active: dto.is_active ?? pkg.is_active ?? true, is_popular: dto.is_popular ?? false,
      sort_order: dto.sort_order ?? pkg.sort_order ?? 0, employee_limit: dto.employee_limit ?? null,
    });
    await this.ds.transaction(async em => {
      const saved = await em.save(Package, pkg);
      await em.delete(PackageModule, { package_id: saved.id });
      await em.save(PackageModule, modules.map(module_name => em.create(PackageModule, { package_id: saved.id, module_name })));
    });
    // Existing subscribers keep the features they paid for; the new list applies from their next plan change
    return this.packageRepo.findOne({ where: { id: pkg.id }, relations: ['modules'] });
  }

  async deletePackage(id: number) {
    const pkg = await this.packageRepo.findOne({ where: { id } });
    if (!pkg) throw new NotFoundException('Package not found');
    const inUse = await this.subRepo.count({ where: { package_id: id } });
    if (inUse) throw new BadRequestException(`${inUse} subscription(s) use this package — switch it off instead of deleting it`);
    await this.ds.transaction(async em => {
      await em.delete(PackageModule, { package_id: id });
      await em.delete(Package, { id });
    });
    return { id, name: pkg.name };
  }

  // ── COD ───────────────────────────────────────────────────────────────────

  async codStats() {
    const since = new Date(Date.now() - 30 * 86400_000);
    const [[b], [o], [r], subs] = await Promise.all([
      this.sql('SELECT COUNT(*) AS n FROM cod_business'),
      this.sql('SELECT COUNT(*) AS n, COALESCE(SUM(total_amount), 0) AS v FROM cod_order'),
      this.sql('SELECT COUNT(*) AS n, COALESCE(SUM(total_amount), 0) AS v FROM cod_order WHERE created_at >= ?', [since]),
      this.sql("SELECT payment_status AS s, COUNT(DISTINCT tenant_id) AS n FROM subscription WHERE product = 'cod' AND status = 'active' GROUP BY payment_status"),
    ]);
    const bySub = Object.fromEntries(subs.map((x: any) => [x.s, Number(x.n)]));
    return {
      businesses: Number(b?.n ?? 0),
      orders: Number(o?.n ?? 0), order_value: Number(o?.v ?? 0),
      orders_30d: Number(r?.n ?? 0), order_value_30d: Number(r?.v ?? 0),
      trial: bySub.trial ?? 0, paid: bySub.paid ?? 0,
    };
  }

  async codCategories() {
    const items = await this.sql<{ c: string }>("SELECT DISTINCT category AS c FROM cod_item WHERE category <> '' ORDER BY category");
    return { business_types: [...COD_BUSINESS_TYPES], item_categories: items.map(r => r.c) };
  }

  /** Businesses on COD with their owner's contact details. */
  async codBusinesses(f: CodFilter, all = false) {
    const where: string[] = []; const params: unknown[] = [];
    if (f.type) { where.push('b.business_type = ?'); params.push(f.type); }
    if (f.q) {
      where.push('(LOWER(b.name) LIKE ? OR b.phone LIKE ? OR LOWER(b.city) LIKE ? OR LOWER(t.name) LIKE ?)');
      const like = `%${f.q.toLowerCase()}%`; params.push(like, `%${f.q}%`, like, like);
    }
    const from = `FROM cod_business b JOIN tenant t ON t.id = b.tenant_id ${where.length ? 'WHERE ' + where.join(' AND ') : ''}`;
    const [{ n }] = await this.sql(`SELECT COUNT(*) AS n ${from}`, params);
    const limit = all ? CSV_LIMIT : (f.limit ?? 25); const page = all ? 1 : (f.page ?? 1);
    const rows = await this.sql(
      `SELECT b.tenant_id, b.name, b.phone, b.address, b.city, b.business_type, b.created_at, t.name AS account, t.status AS account_status
       ${from} ORDER BY b.created_at DESC LIMIT ${Number(limit)} OFFSET ${(page - 1) * Number(limit)}`, params);

    const tenantIds = rows.map(r => Number(r.tenant_id));
    const [owners, subs, orders] = tenantIds.length ? await Promise.all([
      this.userRepo.find({ where: { tenant_id: In(tenantIds), role: 'ADMIN' }, order: { id: 'ASC' }, select: ['id', 'tenant_id', 'name', 'email', 'phone'] }),
      this.subRepo.find({ where: { tenant_id: In(tenantIds), product: 'cod' }, order: { id: 'DESC' } }),
      this.sql(`SELECT tenant_id, COUNT(*) AS n, COALESCE(SUM(total_amount), 0) AS v, MAX(created_at) AS last_at FROM cod_order WHERE tenant_id IN (${tenantIds.map(() => '?').join(',')}) GROUP BY tenant_id`, tenantIds),
    ]) : [[], [], []];
    const ownerOf = new Map<number, User>(); for (const u of owners) if (!ownerOf.has(u.tenant_id)) ownerOf.set(u.tenant_id, u);
    const subOf = new Map<number, Subscription>(); for (const s of subs) if (!subOf.has(s.tenant_id)) subOf.set(s.tenant_id, s);
    const ordersOf = new Map<number, any>(orders.map((o: any) => [Number(o.tenant_id), o]));

    return {
      data: rows.map(r => {
        const id = Number(r.tenant_id); const owner = ownerOf.get(id); const sub = subOf.get(id); const o = ordersOf.get(id);
        return {
          tenant_id: id, business: r.name || r.account, category: r.business_type,
          phone: r.phone || owner?.phone || '', email: owner?.email || '', owner: owner?.name || '',
          address: r.address, city: r.city, account_status: r.account_status,
          plan: sub ? (sub.payment_status === 'trial' ? 'Trial' : sub.payment_status === 'paid' ? 'Paid' : sub.payment_status) : 'None',
          plan_expires: sub?.expires_at ?? null,
          orders: Number(o?.n ?? 0), order_value: Number(o?.v ?? 0), last_order: o?.last_at ?? null, joined: r.created_at,
        };
      }),
      total: Number(n), page, limit,
    };
  }

  /** People who ordered from COD businesses, one row per business + phone number. */
  async codCustomers(f: CodFilter, all = false) {
    const where = ["o.customer_phone <> ''"]; const params: unknown[] = [];
    if (f.type) { where.push('b.business_type = ?'); params.push(f.type); }
    if (f.category) {
      where.push('EXISTS (SELECT 1 FROM cod_order_item oi JOIN cod_item i ON i.id = oi.item_id WHERE oi.order_id = o.id AND i.category = ?)');
      params.push(f.category);
    }
    if (f.q) {
      where.push("(LOWER(o.customer_name) LIKE ? OR o.customer_phone LIKE ? OR LOWER(COALESCE(o.customer_email, '')) LIKE ? OR LOWER(o.city) LIKE ?)");
      const like = `%${f.q.toLowerCase()}%`; params.push(like, `%${f.q}%`, like, like);
    }
    const grouped = `
      SELECT o.tenant_id, o.customer_phone AS phone,
        MAX(o.customer_name) AS name, MAX(o.customer_email) AS email, MAX(o.customer_address) AS address, MAX(o.city) AS city,
        MAX(o.customer_type) AS customer_type, COUNT(*) AS orders, COALESCE(SUM(o.total_amount), 0) AS spent,
        MIN(o.created_at) AS first_order, MAX(o.created_at) AS last_order,
        MAX(b.name) AS business, MAX(b.business_type) AS business_type
      FROM cod_order o JOIN cod_business b ON b.tenant_id = o.tenant_id
      WHERE ${where.join(' AND ')}
      GROUP BY o.tenant_id, o.customer_phone`;
    const [{ n }] = await this.sql(`SELECT COUNT(*) AS n FROM (${grouped}) x`, params);
    const limit = all ? CSV_LIMIT : (f.limit ?? 25); const page = all ? 1 : (f.page ?? 1);
    const rows = await this.sql(`${grouped} ORDER BY last_order DESC LIMIT ${Number(limit)} OFFSET ${(page - 1) * Number(limit)}`, params);

    // Item categories each customer bought from (shown in the table and the CSV)
    const cats = rows.length ? await this.sql(
      `SELECT o.tenant_id, o.customer_phone AS phone, i.category
       FROM cod_order o JOIN cod_order_item oi ON oi.order_id = o.id JOIN cod_item i ON i.id = oi.item_id
       WHERE o.tenant_id IN (${[...new Set(rows.map(r => Number(r.tenant_id)))].map(() => '?').join(',')})
       GROUP BY o.tenant_id, o.customer_phone, i.category`,
      [...new Set(rows.map(r => Number(r.tenant_id)))]) : [];
    const catsOf = new Map<string, string[]>();
    for (const c of cats) { const k = `${c.tenant_id}|${c.phone}`; catsOf.set(k, [...(catsOf.get(k) ?? []), c.category]); }

    return {
      data: rows.map(r => ({
        tenant_id: Number(r.tenant_id), business: r.business, business_type: r.business_type,
        name: r.name, phone: r.phone, email: r.email || '', address: r.address, city: r.city, customer_type: r.customer_type,
        orders: Number(r.orders), spent: Number(r.spent), first_order: r.first_order, last_order: r.last_order,
        item_categories: (catsOf.get(`${r.tenant_id}|${r.phone}`) ?? []).sort(),
      })),
      total: Number(n), page, limit,
    };
  }

  async codBusinessesCsv(f: CodFilter) {
    const { data } = await this.codBusinesses(f, true);
    return toCsv(
      ['Business', 'Category', 'Owner', 'Email', 'Phone', 'Address', 'City', 'Plan', 'Plan expires', 'Orders', 'Order value (LKR)', 'Last order', 'Joined', 'Account status'],
      data.map(d => [d.business, d.category, d.owner, d.email, d.phone, d.address, d.city, d.plan, d.plan_expires, d.orders, d.order_value.toFixed(2), d.last_order, d.joined, d.account_status]),
    );
  }

  /** Every COD order with the customer's details as typed on the order. */
  async codOrders(f: CodFilter, all = false) {
    const where: string[] = []; const params: unknown[] = [];
    if (f.type) { where.push('b.business_type = ?'); params.push(f.type); }
    if (f.status) { where.push('o.status = ?'); params.push(f.status); }
    if (f.from) { where.push('o.created_at >= ?'); params.push(new Date(`${f.from}T00:00:00`)); }
    if (f.to) { where.push('o.created_at < ?'); params.push(new Date(new Date(`${f.to}T00:00:00`).getTime() + 86400_000)); }
    if (f.category) {
      where.push('EXISTS (SELECT 1 FROM cod_order_item oi JOIN cod_item i ON i.id = oi.item_id WHERE oi.order_id = o.id AND i.category = ?)');
      params.push(f.category);
    }
    if (f.q) {
      where.push(`(LOWER(o.customer_name) LIKE ? OR o.customer_phone LIKE ? OR LOWER(COALESCE(o.customer_email, '')) LIKE ?
        OR LOWER(o.customer_address) LIKE ? OR LOWER(o.city) LIKE ? OR LOWER(o.invoice_number) LIKE ?)`);
      const like = `%${f.q.toLowerCase()}%`; params.push(like, `%${f.q}%`, like, like, like, like);
    }
    const from = `FROM cod_order o JOIN cod_business b ON b.tenant_id = o.tenant_id ${where.length ? 'WHERE ' + where.join(' AND ') : ''}`;
    const [{ n }] = await this.sql(`SELECT COUNT(*) AS n ${from}`, params);
    const limit = all ? CSV_LIMIT : (f.limit ?? 25); const page = all ? 1 : (f.page ?? 1);
    const rows = await this.sql(
      `SELECT o.id, o.tenant_id, o.invoice_number, o.customer_name, o.customer_phone, o.customer_email, o.customer_address, o.city,
        o.customer_type, o.status, o.payment_type, o.subtotal, o.delivery_charge, o.discount, o.total_amount, o.tracking_number,
        o.po_number, o.payment_due_date, o.notes, o.created_at, b.name AS business, b.business_type
       ${from} ORDER BY o.created_at DESC, o.id DESC LIMIT ${Number(limit)} OFFSET ${(page - 1) * Number(limit)}`, params);

    // What was on each order
    const ids = rows.map(r => Number(r.id));
    const lines = ids.length ? await this.sql(
      `SELECT oi.order_id, oi.item_name, oi.quantity, i.category
       FROM cod_order_item oi LEFT JOIN cod_item i ON i.id = oi.item_id
       WHERE oi.order_id IN (${ids.map(() => '?').join(',')}) ORDER BY oi.id`, ids) : [];
    const linesOf = new Map<number, { name: string; qty: number; category: string | null }[]>();
    for (const l of lines) {
      const k = Number(l.order_id);
      linesOf.set(k, [...(linesOf.get(k) ?? []), { name: l.item_name, qty: Number(l.quantity), category: l.category ?? null }]);
    }

    return {
      data: rows.map(r => {
        const items = linesOf.get(Number(r.id)) ?? [];
        return {
          id: Number(r.id), tenant_id: Number(r.tenant_id), invoice: r.invoice_number, date: r.created_at,
          name: r.customer_name, phone: r.customer_phone || '', email: r.customer_email || '', address: r.customer_address || '', city: r.city || '',
          customer_type: r.customer_type, status: r.status, payment_type: r.payment_type,
          subtotal: Number(r.subtotal), delivery: Number(r.delivery_charge), discount: Number(r.discount), total: Number(r.total_amount),
          tracking: r.tracking_number || '', po: r.po_number || '', due: r.payment_due_date || null, notes: r.notes || '',
          items: items.map(i => `${i.qty} × ${i.name}`).join('; '),
          item_categories: [...new Set(items.map(i => i.category).filter(Boolean))] as string[],
          business: r.business, business_type: r.business_type,
        };
      }),
      total: Number(n), page, limit,
    };
  }

  async codOrdersCsv(f: CodFilter) {
    const { data } = await this.codOrders(f, true);
    return toCsv(
      ['Order date', 'Invoice', 'Customer', 'Phone', 'Email', 'Address', 'City', 'Customer type', 'Items', 'Item categories',
        'Subtotal (LKR)', 'Delivery (LKR)', 'Discount (LKR)', 'Total (LKR)', 'Payment', 'Status', 'Payment due', 'Tracking no.', 'PO no.', 'Notes',
        'Business', 'Business category'],
      data.map(d => [d.date, d.invoice, d.name, d.phone, d.email, d.address, d.city, d.customer_type, d.items, d.item_categories.join('; '),
        d.subtotal.toFixed(2), d.delivery.toFixed(2), d.discount.toFixed(2), d.total.toFixed(2), d.payment_type, d.status, d.due, d.tracking, d.po, d.notes,
        d.business, d.business_type]),
    );
  }

  async codCustomersCsv(f: CodFilter) {
    const { data } = await this.codCustomers(f, true);
    return toCsv(
      ['Customer', 'Phone', 'Email', 'Address', 'City', 'Customer type', 'Bought (item categories)', 'Orders', 'Spent (LKR)', 'First order', 'Last order', 'Business', 'Business category'],
      data.map(d => [d.name, d.phone, d.email, d.address, d.city, d.customer_type, d.item_categories.join('; '), d.orders, d.spent.toFixed(2), d.first_order, d.last_order, d.business, d.business_type]),
    );
  }
}
