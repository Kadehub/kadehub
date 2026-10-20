import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Subscription } from '../../database/entities/subscription.entity';
import { Package } from '../../database/entities/package.entity';
import { User } from '../../database/entities/user.entity';
import { Tenant } from '../../database/entities/tenant.entity';
import { PRODUCTS, type ProductDef } from '../../common/products';
import { ChangeAccountPasswordDto, UpdateAccountDto } from './platform.dto';

/** Where an account stands with one product. Tasks has no plans, so joining it is simply 'free'. */
export type ProductState = 'not_started' | 'trial' | 'active' | 'expired' | 'free';

export interface ProductSummary extends ProductDef {
  enabled: boolean;
  state: ProductState;
  plan: string | null;
  billing_cycle: string | null;
  expires_at: Date | null;
  days_left: number | null;
}

@Injectable()
export class PlatformService {
  constructor(
    @InjectRepository(Subscription) private subRepo: Repository<Subscription>,
    @InjectRepository(Package) private packageRepo: Repository<Package>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Tenant) private tenantRepo: Repository<Tenant>,
  ) {}

  listProducts() {
    return PRODUCTS;
  }

  /** Registry plus whether the caller's account has an active subscription to each product. */
  async myProducts(user: { tenant_id: number; role: string }): Promise<ProductSummary[]> {
    if (user.role === 'SUPER_ADMIN') {
      return PRODUCTS.map(p => ({ ...p, enabled: true, state: 'active', plan: null, billing_cycle: null, expires_at: null, days_left: null }));
    }
    const subs = await this.subRepo.find({ where: { tenant_id: user.tenant_id } });
    const pkgIds = [...new Set(subs.map(s => s.package_id).filter(Boolean))];
    const packages = pkgIds.length ? await this.packageRepo.find({ where: { id: In(pkgIds) } }) : [];
    return PRODUCTS.map(p => this.summarize(p, subs.filter(s => s.product === p.slug), packages));
  }

  private summarize(p: ProductDef, rows: Subscription[], packages: Package[]): ProductSummary {
    const base = { ...p, plan: null as string | null, billing_cycle: null as string | null, expires_at: null as Date | null, days_left: null as number | null };
    if (!rows.length) return { ...base, enabled: false, state: 'not_started' };
    if (p.slug === 'tasks') return { ...base, enabled: true, state: 'free' };

    const now = Date.now();
    const valid = rows.filter(r => r.status === 'active' && (!r.expires_at || new Date(r.expires_at).getTime() > now));
    const pick = valid.find(r => r.payment_status === 'paid') ?? valid.find(r => r.payment_status === 'trial');
    const daysLeft = (d: Date | null) => (d ? Math.max(0, Math.ceil((new Date(d).getTime() - now) / 86_400_000)) : null);
    const planName = (r: Subscription) => packages.find(k => k.id === r.package_id)?.name ?? null;

    if (pick) {
      return {
        ...base, enabled: true,
        state: pick.payment_status === 'paid' ? 'active' : 'trial',
        plan: planName(pick), billing_cycle: pick.billing_cycle ?? null,
        expires_at: pick.expires_at ?? null, days_left: daysLeft(pick.expires_at),
      };
    }
    const last = [...rows].sort((a, b) => new Date(b.expires_at ?? 0).getTime() - new Date(a.expires_at ?? 0).getTime())[0];
    return { ...base, enabled: false, state: 'expired', plan: planName(last), expires_at: last.expires_at ?? null, days_left: 0 };
  }

  /** The signed-in person, their business and every product's subscription — for the hub's account page. */
  async account(user: { sub: number; tenant_id: number; role: string }) {
    const [u, tenant, products] = await Promise.all([
      this.userRepo.findOne({ where: { id: user.sub } }),
      this.tenantRepo.findOne({ where: { id: user.tenant_id } }),
      this.myProducts(user),
    ]);
    if (!u) throw new NotFoundException('Account not found');
    return {
      user: { id: u.id, name: u.name, email: u.email, phone: u.phone ?? null, role: u.role, photo_url: u.photo_url ?? null },
      business: tenant ? { id: tenant.id, name: tenant.name, subdomain: tenant.subdomain ?? null, status: tenant.status } : null,
      products,
    };
  }

  async updateAccount(user: { sub: number }, dto: UpdateAccountDto) {
    const u = await this.userRepo.findOne({ where: { id: user.sub } });
    if (!u) throw new NotFoundException('Account not found');
    if (dto.name !== undefined) u.name = dto.name.trim();
    if (dto.phone !== undefined) u.phone = dto.phone.trim() || null;
    await this.userRepo.save(u);
    return { id: u.id, name: u.name, email: u.email, phone: u.phone ?? null, role: u.role };
  }

  async changePassword(user: { sub: number }, dto: ChangeAccountPasswordDto) {
    const u = await this.userRepo.findOne({ where: { id: user.sub } });
    if (!u || !(await bcrypt.compare(dto.current_password, u.password_hash))) {
      // 400, not 401: the frontend treats any 401 as an expired session and signs the user out
      throw new BadRequestException('Current password is incorrect');
    }
    u.password_hash = await bcrypt.hash(dto.new_password, 10);
    await this.userRepo.save(u);
    return { ok: true };
  }
}
