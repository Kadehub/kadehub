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
import * as https from 'https';

const REGISTRATION_FEE_LKR = 25000;
const LKR_TO_USD = 0.0033; // ~1 LKR = 0.0033 USD (update periodically)

function fetchJson(url: string, timeoutMs = 5000): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { reject(new Error('parse error')); } });
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => { req.destroy(); reject(new Error('request timeout')); });
  });
}

async function isSriLankanIp(ip: string): Promise<boolean> {
  try {
    // Skip private/loopback IPs in development only
    if (process.env.NODE_ENV !== 'production') {
      if (!ip || ip === '::1' || ip.startsWith('127.') || ip.startsWith('192.168.') || ip.startsWith('10.')) return true;
    }
    const data = await fetchJson(`https://ipapi.co/${ip}/json/`);
    if (!data || typeof data.country_code !== 'string') return true;
    return data.country_code === 'LK';
  } catch {
    return true; // default to LKR on failure
  }
}

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

  async getPackagesWithCurrency(ip: string) {
    try {
      const packages = await this.packageRepo.find({
        where: { is_active: true },
        relations: ['modules'],
        order: { sort_order: 'ASC' },
      });
      const isLK = await isSriLankanIp(ip);
      const currency = isLK ? 'LKR' : 'USD';
      const rate = isLK ? 1 : LKR_TO_USD;
      const round = (n: number) => isLK ? Math.round(n) : Math.round(n * 100) / 100;

      const registrationFee = round(REGISTRATION_FEE_LKR * rate);

      const converted = packages.map(pkg => ({
        ...pkg,
        price_monthly: round(Number(pkg.price_monthly) * rate),
        price_yearly:  round(Number(pkg.price_yearly)  * rate),
      }));

      return { currency, registrationFee, packages: converted };
    } catch {
      return { currency: 'LKR', registrationFee: REGISTRATION_FEE_LKR, packages: [] };
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

      const currency = dto.currency || 'LKR';
      const amount = dto.billing_cycle === 'yearly' ? pkg.price_yearly : pkg.price_monthly;
      const gatewayRef = dto.gateway_ref || `TXN-${Date.now()}`;

      // Record subscription payment
      const tx = this.txRepo.create({
        tenant_id: tenantId,
        package_id: pkg.id,
        amount,
        currency,
        billing_cycle: dto.billing_cycle,
        gateway: dto.gateway,
        gateway_ref: gatewayRef,
        status: 'completed',
        metadata: { type: 'subscription' },
      });
      await this.txRepo.save(tx);

      // Record one-time registration fee if provided
      if (dto.registration_fee && dto.registration_fee > 0) {
        const regTx = this.txRepo.create({
          tenant_id: tenantId,
          package_id: pkg.id,
          amount: dto.registration_fee,
          currency,
          billing_cycle: dto.billing_cycle,
          gateway: dto.gateway,
          gateway_ref: `REG-${gatewayRef}`,
          status: 'completed',
          metadata: { type: 'registration_fee' },
        });
        await this.txRepo.save(regTx);
      }

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
