import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Package } from '../../database/entities/package.entity';
import { PackageModule } from '../../database/entities/package-module.entity';
import { CompanyProfile } from '../../database/entities/company-profile.entity';
import { Subscription } from '../../database/entities/subscription.entity';
import { PaymentTransaction } from '../../database/entities/payment-transaction.entity';
import { Tenant } from '../../database/entities/tenant.entity';
import { UpdateCompanyDto, CreateSubscriptionDto } from './billing.dto';

@Injectable()
export class BillingService {
  constructor(
    @InjectRepository(Package) private packageRepo: Repository<Package>,
    @InjectRepository(PackageModule) private pkgModuleRepo: Repository<PackageModule>,
    @InjectRepository(CompanyProfile) private profileRepo: Repository<CompanyProfile>,
    @InjectRepository(Subscription) private subRepo: Repository<Subscription>,
    @InjectRepository(PaymentTransaction) private txRepo: Repository<PaymentTransaction>,
    @InjectRepository(Tenant) private tenantRepo: Repository<Tenant>,
  ) {}

  async getPackages() {
    try {
      return await this.packageRepo.find({
        where: { is_active: true },
        relations: ['modules'],
        order: { sort_order: 'ASC' },
      });
    } catch {
      return []; // table may not exist yet
    }
  }

  async getProfile(tenantId: number) {
    try {
      let profile = await this.profileRepo.findOne({ where: { tenant_id: tenantId } });
      if (!profile) {
        profile = this.profileRepo.create({ tenant_id: tenantId });
        await this.profileRepo.save(profile);
      }
      const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
      return { ...profile, name: tenant?.name || 'KadeHub Shop' };
    } catch {
      // company_profile table may not exist — return minimal profile
      const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } }).catch(() => null);
      return { tenant_id: tenantId, name: tenant?.name || 'KadeHub Shop' };
    }
  }

  async updateProfile(tenantId: number, dto: UpdateCompanyDto) {
    try {
      let profile = await this.profileRepo.findOne({ where: { tenant_id: tenantId } });
      if (!profile) profile = this.profileRepo.create({ tenant_id: tenantId });
      Object.assign(profile, dto);
      return await this.profileRepo.save(profile);
    } catch (e: any) {
      throw new InternalServerErrorException('Could not update profile. Run migrate-billing.sql first.');
    }
  }

  async uploadLogo(tenantId: number, logoUrl: string) {
    try {
      let profile = await this.profileRepo.findOne({ where: { tenant_id: tenantId } });
      if (!profile) profile = this.profileRepo.create({ tenant_id: tenantId });
      profile.logo_url = logoUrl;
      return await this.profileRepo.save(profile);
    } catch (e: any) {
      throw new InternalServerErrorException('Could not upload logo. Run migrate-billing.sql first.');
    }
  }

  async getActiveSubscriptions(tenantId: number) {
    try {
      const all = await this.subRepo.find({ where: { tenant_id: tenantId, status: 'active' } });
      // Deduplicate by module_name — keep latest
      const seen = new Map<string, typeof all[0]>();
      for (const sub of all) {
        const existing = seen.get(sub.module_name);
        if (!existing || new Date(sub.started_at) > new Date(existing.started_at)) {
          seen.set(sub.module_name, sub);
        }
      }
      return Array.from(seen.values());
    } catch {
      return [];
    }
  }

  async subscribe(tenantId: number, dto: CreateSubscriptionDto) {
    try {
      const pkg = await this.packageRepo.findOne({
        where: { id: dto.package_id },
        relations: ['modules'],
      });
      if (!pkg) throw new NotFoundException('Package not found');

      const amount = dto.billing_cycle === 'yearly' ? pkg.price_yearly : pkg.price_monthly;

      const tx = this.txRepo.create({
        tenant_id: tenantId,
        package_id: pkg.id,
        amount,
        billing_cycle: dto.billing_cycle,
        gateway: dto.gateway,
        gateway_ref: dto.gateway_ref || `TXN-${Date.now()}`,
        status: 'completed',
      });
      await this.txRepo.save(tx);

      const expiresAt = new Date();
      if (dto.billing_cycle === 'yearly') expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      else expiresAt.setMonth(expiresAt.getMonth() + 1);

      await this.subRepo.delete({ tenant_id: tenantId });

      const subs = pkg.modules.map(m => this.subRepo.create({
        tenant_id: tenantId,
        module_name: m.module_name,
        status: 'active',
        package_id: pkg.id,
        billing_cycle: dto.billing_cycle,
        started_at: new Date(),
        expires_at: expiresAt,
        payment_status: 'paid',
        payment_ref: tx.gateway_ref,
      }));
      await this.subRepo.save(subs);

      return { transaction: tx, subscriptions: subs, package: pkg };
    } catch (e: any) {
      if (e instanceof NotFoundException) throw e;
      throw new InternalServerErrorException('Subscription failed. Run migrate-billing.sql first.');
    }
  }

  async getTransactions(tenantId: number) {
    try {
      return await this.txRepo.find({
        where: { tenant_id: tenantId },
        relations: ['package'],
        order: { created_at: 'DESC' },
      });
    } catch {
      return [];
    }
  }
}
