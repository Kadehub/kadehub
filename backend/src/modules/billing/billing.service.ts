import { Injectable, NotFoundException, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Package } from '../../database/entities/package.entity';
import { PackageModule } from '../../database/entities/package-module.entity';
import { CompanyProfile } from '../../database/entities/company-profile.entity';
import { Subscription } from '../../database/entities/subscription.entity';
import { PaymentTransaction } from '../../database/entities/payment-transaction.entity';
import { Tenant } from '../../database/entities/tenant.entity';
import { UpdateCompanyDto, CreateSubscriptionDto, InitiateOnepayDto, BankTransferDto } from './billing.dto';
import * as https from 'https';
import * as crypto from 'crypto';

const REGISTRATION_FEE_LKR = 25000;
const LKR_TO_USD = 0.0033;

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

  // ── Bank Transfer Self-Service ─────────────────────────────────────────────

  async bankTransferSubscribe(tenantId: number, dto: BankTransferDto) {
    const pkg = await this.packageRepo.findOne({ where: { id: dto.package_id }, relations: ['modules'] });
    if (!pkg) throw new NotFoundException('Package not found');

    const amount = dto.billing_cycle === 'yearly' ? Number(pkg.price_yearly) : Number(pkg.price_monthly);
    const ref = `BT-${tenantId}-${Date.now()}`;

    const tx = this.txRepo.create({
      tenant_id: tenantId,
      package_id: pkg.id,
      amount,
      currency: 'LKR',
      billing_cycle: dto.billing_cycle,
      gateway: 'bank_transfer' as any,
      gateway_ref: ref,
      status: 'completed',
      metadata: { depositor_name: dto.depositor_name, slip_reference: dto.slip_reference, notes: dto.notes || '' },
    });
    await this.txRepo.save(tx);

    // Activate subscription immediately
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
      payment_ref: ref,
    }));
    await this.subRepo.save(subs);

    // Notify admin by email (non-blocking)
    this.sendBankTransferNotification(tenantId, pkg.name, amount, dto).catch(() => {});

    return { ok: true, reference: ref, expires_at: expiresAt, package: pkg.name };
  }

  private async sendBankTransferNotification(tenantId: number, pkgName: string, amount: number, dto: BankTransferDto) {
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.default.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    });
    await transporter.sendMail({
      from: `"KadeHub Billing" <${process.env.GMAIL_USER}>`,
      to: 'official.kadehub@gmail.com',
      subject: `New Bank Transfer — ${pkgName} (Tenant #${tenantId})`,
      html: `
        <div style="font-family:sans-serif;max-width:500px">
          <h2 style="color:#0d6e5a">New Bank Transfer Subscription</h2>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:8px 0;color:#6b7280;font-size:13px">Tenant ID</td><td style="font-weight:600">#${tenantId}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280;font-size:13px">Package</td><td style="font-weight:600">${pkgName} (${dto.billing_cycle})</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280;font-size:13px">Amount</td><td style="font-weight:600">LKR ${amount.toLocaleString()}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280;font-size:13px">Depositor</td><td style="font-weight:600">${dto.depositor_name}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280;font-size:13px">Slip Ref</td><td style="font-weight:600">${dto.slip_reference}</td></tr>
            ${dto.notes ? `<tr><td style="padding:8px 0;color:#6b7280;font-size:13px">Notes</td><td style="font-weight:600">${dto.notes}</td></tr>` : ''}
          </table>
          <p style="color:#6b7280;font-size:12px;margin-top:16px">Subscription has been activated automatically. Verify the slip and revoke if fraudulent.</p>
        </div>
      `,
    });
  }

  // ── OnePay Integration ──────────────────────────────────────────────────────

  async initiateOnepay(tenantId: number, dto: InitiateOnepayDto) {
    const pkg = await this.packageRepo.findOne({
      where: { id: dto.package_id },
      relations: ['modules'],
    });
    if (!pkg) throw new NotFoundException('Package not found');

    const appId   = process.env.ONEPAY_APP_ID;
    const appToken = process.env.ONEPAY_APP_TOKEN;
    const hashSalt = process.env.ONEPAY_HASH_SALT;
    if (!appId || !appToken || !hashSalt) {
      throw new BadRequestException('OnePay credentials not configured. Set ONEPAY_APP_ID, ONEPAY_APP_TOKEN, ONEPAY_HASH_SALT in .env');
    }

    const amount = dto.billing_cycle === 'yearly'
      ? Number(pkg.price_yearly)
      : Number(pkg.price_monthly);
    const totalAmount = amount + (dto.registration_fee ?? 0);

    // Create a pending transaction first so we have a reference
    const ref = `KH-${tenantId}-${Date.now()}`;
    const tx = this.txRepo.create({
      tenant_id: tenantId,
      package_id: pkg.id,
      amount: totalAmount,
      currency: 'LKR',
      billing_cycle: dto.billing_cycle,
      gateway: 'onepay',
      gateway_ref: ref,
      status: 'pending',
      metadata: {
        package_id: dto.package_id,
        billing_cycle: dto.billing_cycle,
        registration_fee: dto.registration_fee ?? 0,
      },
    });
    await this.txRepo.save(tx);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3001';

    // Build OnePay payload per docs
    const payload = {
      amount: totalAmount,
      app_id: appId,
      reference: ref,
      customer_first_name: 'KadeHub',
      customer_last_name: 'Shop',
      customer_phone_number: '0000000000',
      customer_email: 'billing@kadehub.lk',
      transaction_redirect_url: `${appUrl}/settings?tab=billing&status=success&ref=${ref}`,
      currency: 'LKR',
    };

    // Generate hash: SHA256(app_id + amount + reference + hash_salt)
    const hashStr = `${appId}${totalAmount}${ref}${hashSalt}`;
    const hash = crypto.createHash('sha256').update(hashStr).digest('hex');

    // Call OnePay API to create transaction
    const onepayRes = await this.callOnepayApi(
      'https://merchant-api-live-v2.onepay.lk/api/ipg/gateway/request-transaction/?hash=' + hash,
      appToken,
      payload,
    );

    if (!onepayRes?.data?.gateway?.redirect_url) {
      // Update tx to failed
      tx.status = 'failed';
      await this.txRepo.save(tx);
      throw new BadRequestException(onepayRes?.message || 'OnePay transaction creation failed');
    }

    // Store OnePay transaction token
    tx.metadata = { ...tx.metadata, onepay_token: onepayRes.data.ipg_transaction_id };
    await this.txRepo.save(tx);

    return {
      payment_url: onepayRes.data.gateway.redirect_url,
      reference: ref,
      amount: totalAmount,
    };
  }

  async handleOnepayWebhook(body: any) {
    const hashSalt = process.env.ONEPAY_HASH_SALT;
    const appId    = process.env.ONEPAY_APP_ID;

    // Verify hash from OnePay
    if (hashSalt && appId && body.ipg_transaction_id) {
      const expectedHash = crypto
        .createHash('sha256')
        .update(`${appId}${body.amount}${body.reference}${hashSalt}`)
        .digest('hex');
      if (body.hash && body.hash !== expectedHash) {
        throw new BadRequestException('Invalid webhook hash');
      }
    }

    const tx = await this.txRepo.findOne({
      where: { gateway_ref: body.reference },
    });
    if (!tx) return { received: true };

    const isSuccess = body.status_code === '2' || body.payment_status === 'CAPTURED';

    tx.status = isSuccess ? 'completed' : 'failed';
    tx.metadata = { ...tx.metadata, webhook: body };
    await this.txRepo.save(tx);

    if (isSuccess) {
      await this.activateSubscription(tx);
    }

    return { received: true };
  }

  async verifyOnepayReturn(ref: string, tenantId: number) {
    const tx = await this.txRepo.findOne({
      where: { gateway_ref: ref, tenant_id: tenantId },
      relations: ['package'],
    });
    if (!tx) throw new NotFoundException('Transaction not found');

    // If already completed (webhook fired), return success
    if (tx.status === 'completed') {
      return { status: 'completed', transaction: tx };
    }

    // Poll OnePay for status
    const appToken = process.env.ONEPAY_APP_TOKEN;
    const appId    = process.env.ONEPAY_APP_ID;
    const hashSalt = process.env.ONEPAY_HASH_SALT;

    if (appToken && appId && hashSalt && tx.metadata?.onepay_token) {
      try {
        const hash = crypto
          .createHash('sha256')
          .update(`${appId}${tx.metadata.onepay_token}${hashSalt}`)
          .digest('hex');
        const res = await this.callOnepayApi(
          `https://merchant-api-live-v2.onepay.lk/api/ipg/gateway/query-transaction/?hash=${hash}`,
          appToken,
          { app_id: appId, ipg_transaction_id: tx.metadata.onepay_token },
        );
        const isSuccess = res?.data?.payment_status === 'CAPTURED' || res?.data?.status_code === '2';
        if (isSuccess && tx.status !== 'completed') {
          tx.status = 'completed';
          await this.txRepo.save(tx);
          await this.activateSubscription(tx);
        }
      } catch { /* ignore poll errors */ }
    }

    return { status: tx.status, transaction: tx };
  }

  private async activateSubscription(tx: PaymentTransaction) {
    const pkg = await this.packageRepo.findOne({
      where: { id: tx.package_id },
      relations: ['modules'],
    });
    if (!pkg) return;

    const expiresAt = new Date();
    if (tx.billing_cycle === 'yearly') expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    else expiresAt.setMonth(expiresAt.getMonth() + 1);

    await this.subRepo.delete({ tenant_id: tx.tenant_id });

    const subs = pkg.modules.map(m => this.subRepo.create({
      tenant_id: tx.tenant_id,
      module_name: m.module_name,
      status: 'active',
      package_id: pkg.id,
      billing_cycle: tx.billing_cycle,
      started_at: new Date(),
      expires_at: expiresAt,
      payment_status: 'paid',
      payment_ref: tx.gateway_ref,
    }));
    await this.subRepo.save(subs);
  }

  private callOnepayApi(url: string, appToken: string, body: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify(body);
      const urlObj = new URL(url);
      const options = {
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': appToken,
          'Content-Length': Buffer.byteLength(data),
        },
      };
      const req = https.request(options, res => {
        let raw = '';
        res.on('data', c => raw += c);
        res.on('end', () => { try { resolve(JSON.parse(raw)); } catch { reject(new Error('parse error')); } });
      });
      req.on('error', reject);
      req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')); });
      req.write(data);
      req.end();
    });
  }
}
