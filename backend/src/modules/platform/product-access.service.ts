import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription } from '../../database/entities/subscription.entity';
import { Package } from '../../database/entities/package.entity';
import { BillingService } from '../billing/billing.service';
import { PRODUCTS } from '../../common/products';
import { HR_TRIAL_DAYS, HR_TRIAL_PLAN } from '../hr/hr-plans';

/** Seeded by the COD migrations; new accounts start here (50 orders a month, never expires). */
export const COD_FREE_PACKAGE_SLUG = 'cod-free';

/**
 * Turns a product on for an account (tenant) and answers "may this tenant use product X".
 * Each product is one or more `subscription` rows with `product = <slug>`.
 */
@Injectable()
export class ProductAccessService {
  constructor(
    @InjectRepository(Subscription) private subRepo: Repository<Subscription>,
    @InjectRepository(Package) private packageRepo: Repository<Package>,
    private billingService: BillingService,
  ) {}

  async enableProduct(tenantId: number, product: string) {
    if (!PRODUCTS.some(p => p.slug === product)) throw new BadRequestException(`Unknown product '${product}'`);
    if (product === 'pos') return this.billingService.activateTrial(tenantId);

    const existing = await this.subRepo.findOne({ where: { tenant_id: tenantId, product } });
    if (existing) return;

    if (product === 'cod') {
      const pkg = await this.packageRepo.findOne({ where: { slug: COD_FREE_PACKAGE_SLUG } });
      await this.subRepo.save(this.subRepo.create({
        tenant_id: tenantId, product: 'cod', module_name: 'cod', status: 'active',
        package_id: pkg?.id ?? null, payment_status: 'paid', payment_ref: 'free',
      }));
      return;
    }

    if (product === 'hr') {
      // 14 days of Staff Pro; afterwards the account drops to Staff Free instead of being locked out
      const pkg = await this.packageRepo.findOne({ where: { slug: HR_TRIAL_PLAN.slug } });
      const expires = new Date();
      expires.setDate(expires.getDate() + HR_TRIAL_DAYS);
      await this.subRepo.save(this.subRepo.create({
        tenant_id: tenantId, product: 'hr', module_name: 'hr', status: 'active',
        package_id: pkg?.id ?? null, payment_status: 'trial', expires_at: expires,
      }));
      return;
    }

    // Tasks is free to use; the row only records that the account joined
    await this.subRepo.save(this.subRepo.create({
      tenant_id: tenantId, product, module_name: product, status: 'active',
      payment_status: 'paid', payment_ref: 'free',
    }));
  }

  /** Active subscription row for the product, or null. Trials past their expiry don't count. */
  async getAccess(tenantId: number, product: string): Promise<Subscription | null> {
    const subs = await this.subRepo.find({ where: { tenant_id: tenantId, product, status: 'active' } });
    const now = Date.now();
    const current = subs.find(s => !s.expires_at || new Date(s.expires_at).getTime() > now) ?? null;
    // COD doesn't lock: an expired trial or plan carries on as COD Free (limits enforced by CodAccountService)
    if (!current && product === 'cod') return subs[0] ?? null;
    return current;
  }
}
