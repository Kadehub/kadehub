import { Injectable, NotFoundException, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Package } from '../../database/entities/package.entity';
import { PackageModule } from '../../database/entities/package-module.entity';
import { CompanyProfile } from '../../database/entities/company-profile.entity';
import { Subscription } from '../../database/entities/subscription.entity';
import { PaymentTransaction } from '../../database/entities/payment-transaction.entity';
import { Tenant } from '../../database/entities/tenant.entity';
import { User } from '../../database/entities/user.entity';
import { UpdateCompanyDto, CreateSubscriptionDto, InitiateOnepayDto, BankTransferDto, UpdateBankDetailsDto } from './billing.dto';
import { InvoiceService } from './invoice.service';
import { EmailService } from '../../common/email.service';
import { getBankDetails, saveBankDetails, isOnepayConfigured } from '../../common/bank-details';
import * as https from 'https';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

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
    @InjectRepository(User) private userRepo: Repository<User>,
    private invoiceService: InvoiceService,
    private emailService: EmailService,
  ) {}

  private async getShopContact(tenantId: number) {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    const profile = await this.profileRepo.findOne({ where: { tenant_id: tenantId } });
    const admin = await this.userRepo.findOne({ where: { tenant_id: tenantId, role: 'ADMIN' } });
    return { shopName: tenant?.name || 'Shop', email: profile?.email || admin?.email };
  }

  private async notifyPaymentSuccess(tx: PaymentTransaction, pkg?: Package | null) {
    const { shopName, email } = await this.getShopContact(tx.tenant_id);
    const planName = pkg?.name || (tx.metadata?.type === 'registration_fee' ? 'Registration Fee' : 'Subscription');
    if (tx.metadata?.type !== 'registration_fee') {
      await this.emailService.notifySubscription(shopName, planName, Number(tx.amount), email);
    }
  }

  private async notifyPaymentFailure(tenantId: number, planName: string, reason?: string) {
    const { shopName, email } = await this.getShopContact(tenantId);
    await this.emailService.notifyPaymentFailed(shopName, planName, email, reason);
  }

  private async syncInvoice(tx: PaymentTransaction) {
    if (tx.status === 'completed') {
      await this.invoiceService.markPaidByTransaction(tx).catch(() => {});
    }
  }

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
      await this.syncInvoice(tx);

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
        await this.syncInvoice(regTx);
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
      await this.notifyPaymentSuccess(tx, pkg);

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

  getPaymentOptions() {
    return {
      bank: getBankDetails(),
      onepay_enabled: isOnepayConfigured(),
    };
  }

  updateBankDetails(dto: UpdateBankDetailsDto) {
    return saveBankDetails(dto);
  }

  async listBankTransfers(status?: string) {
    const where: any = { gateway: 'bank_transfer' };
    if (status && ['pending', 'completed', 'failed', 'refunded'].includes(status)) {
      where.status = status;
    }
    return this.txRepo.find({
      where,
      relations: ['tenant', 'package'],
      order: { created_at: 'DESC' },
    });
  }

  async getMyBankTransfers(tenantId: number) {
    return this.txRepo.find({
      where: { tenant_id: tenantId, gateway: 'bank_transfer' },
      relations: ['package'],
      order: { created_at: 'DESC' },
    });
  }

  async countPendingBankTransfers() {
    return this.txRepo.count({ where: { gateway: 'bank_transfer', status: 'pending' } });
  }

  // ── Bank Transfer (pending until admin approves) ───────────────────────────

  async submitBankTransfer(tenantId: number, dto: BankTransferDto, slipUrl: string) {
    const pending = await this.txRepo.findOne({
      where: { tenant_id: tenantId, gateway: 'bank_transfer', status: 'pending' },
    });
    if (pending) {
      throw new BadRequestException('You already have a bank slip pending review. Please wait for admin approval.');
    }

    let pkg: Package | null = null;
    let amount = REGISTRATION_FEE_LKR;
    let billingCycle: 'monthly' | 'yearly' = dto.billing_cycle || 'monthly';
    let packageId = 1;

    if (dto.type === 'subscription') {
      if (!dto.package_id) throw new BadRequestException('package_id is required for subscription payments.');
      pkg = await this.packageRepo.findOne({ where: { id: dto.package_id }, relations: ['modules'] });
      if (!pkg) throw new NotFoundException('Package not found');
      packageId = pkg.id;
      amount = billingCycle === 'yearly' ? Number(pkg.price_yearly) : Number(pkg.price_monthly);
      if (dto.registration_fee && dto.registration_fee > 0) amount += Number(dto.registration_fee);
    }

    const ref = `BT-${tenantId}-${Date.now()}`;
    const tx = this.txRepo.create({
      tenant_id: tenantId,
      package_id: packageId,
      amount,
      currency: 'LKR',
      billing_cycle: billingCycle,
      gateway: 'bank_transfer' as any,
      gateway_ref: ref,
      status: 'pending',
      metadata: {
        type: dto.type,
        depositor_name: dto.depositor_name,
        slip_reference: dto.slip_reference || ref,
        notes: dto.notes || '',
        slip_url: slipUrl,
        registration_fee: dto.registration_fee ?? 0,
      },
    });
    await this.txRepo.save(tx);

    this.sendBankTransferNotification(tenantId, pkg?.name || 'Registration fee', amount, dto, slipUrl).catch(() => {});

    return {
      ok: true,
      status: 'pending',
      reference: ref,
      amount,
      message: 'Slip submitted. Your account will be activated after admin verifies the payment.',
    };
  }

  async approveBankTransfer(txId: number) {
    const tx = await this.txRepo.findOne({ where: { id: txId, gateway: 'bank_transfer' } });
    if (!tx) throw new NotFoundException('Bank transfer not found');
    if (tx.status !== 'pending') throw new BadRequestException('This slip has already been processed.');

    tx.status = 'completed';
    tx.metadata = { ...tx.metadata, approved_at: new Date().toISOString() };
    await this.txRepo.save(tx);
    await this.syncInvoice(tx);

    const pkg = tx.package_id ? await this.packageRepo.findOne({ where: { id: tx.package_id } }) : null;
    if (tx.metadata?.type === 'registration_fee') {
      await this.activateTrialAfterRegistrationFee(tx.tenant_id);
    } else {
      await this.tenantRepo.update(tx.tenant_id, { status: 'active' });
      await this.activateSubscription(tx);
    }
    await this.notifyPaymentSuccess(tx, pkg);

    return { ok: true, status: 'completed', transaction: tx };
  }

  async rejectBankTransfer(txId: number, reason?: string) {
    const tx = await this.txRepo.findOne({ where: { id: txId, gateway: 'bank_transfer' } });
    if (!tx) throw new NotFoundException('Bank transfer not found');
    if (tx.status !== 'pending') throw new BadRequestException('This slip has already been processed.');

    tx.status = 'failed';
    tx.metadata = {
      ...tx.metadata,
      rejected_at: new Date().toISOString(),
      reject_reason: reason || 'Payment could not be verified',
    };
    await this.txRepo.save(tx);

    const pkg = await this.packageRepo.findOne({ where: { id: tx.package_id } });
    const planName = tx.metadata?.type === 'registration_fee' ? 'Registration Fee' : (pkg?.name || 'Subscription');
    await this.notifyPaymentFailure(tx.tenant_id, planName, reason);

    return { ok: true, status: 'failed', transaction: tx };
  }

  private async sendBankTransferNotification(
    tenantId: number,
    pkgName: string,
    amount: number,
    dto: BankTransferDto,
    slipUrl: string,
  ) {
    const nodemailer = await import('nodemailer');
    const user = process.env.GMAIL_USER || process.env.SMTP_USER;
    const pass = process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS;
    if (!user || !pass) return;

    const transporter = nodemailer.default.createTransport({
      service: 'gmail',
      auth: { user, pass },
    });
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    await transporter.sendMail({
      from: `"KadeHub Billing" <${user}>`,
      to: process.env.SUPER_ADMIN_EMAIL || 'official.kadehub@gmail.com',
      subject: `Bank slip pending — ${pkgName} (Tenant #${tenantId})`,
      html: `
        <div style="font-family:sans-serif;max-width:500px">
          <h2 style="color:#0d6e5a">New bank slip awaiting approval</h2>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:8px 0;color:#6b7280;font-size:13px">Tenant ID</td><td style="font-weight:600">#${tenantId}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280;font-size:13px">Type</td><td style="font-weight:600">${dto.type}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280;font-size:13px">Package</td><td style="font-weight:600">${pkgName}${dto.billing_cycle ? ` (${dto.billing_cycle})` : ''}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280;font-size:13px">Amount</td><td style="font-weight:600">LKR ${amount.toLocaleString()}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280;font-size:13px">Depositor</td><td style="font-weight:600">${dto.depositor_name}</td></tr>
            ${dto.notes ? `<tr><td style="padding:8px 0;color:#6b7280;font-size:13px">Notes</td><td style="font-weight:600">${dto.notes}</td></tr>` : ''}
          </table>
          <p style="margin-top:16px"><a href="${slipUrl}" style="color:#0d6e5a;font-weight:600">View slip</a></p>
          <p style="color:#6b7280;font-size:12px;margin-top:12px">Review and approve in Super Admin → Payment Slips. ${appUrl}/super-admin/payments</p>
        </div>
      `,
    });
  }

  async uploadSlipFile(file: Express.Multer.File, req: any): Promise<string> {
    if (!file?.buffer) throw new BadRequestException('Payment slip is required.');
    try {
      if (process.env.MINIO_ACCESS_KEY && process.env.MINIO_SECRET_KEY) {
        const { uploadToCloudinary } = await import('../../common/cloudinary');
        return await uploadToCloudinary(file.buffer, 'kadehub/slips', file.originalname);
      }
    } catch { /* fall back to local disk */ }

    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    const filename = `slip-${Date.now()}${ext}`;
    fs.writeFileSync(path.join(uploadsDir, filename), file.buffer);
    return `${req.protocol}://${req.get('host')}/uploads/${filename}`;
  }

  // ── OnePay Integration ──────────────────────────────────────────────────────

  async initiateRegistrationFee(tenantId: number) {
    const appId    = process.env.ONEPAY_APP_ID;
    const appToken = process.env.ONEPAY_APP_TOKEN;
    const hashSalt = process.env.ONEPAY_HASH_SALT;
    if (!appId || !appToken || !hashSalt) {
      throw new BadRequestException('OnePay credentials not configured.');
    }

    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    // Idempotency: if already paid, just activate trial and return
    const alreadyPaid = await this.txRepo.findOne({
      where: { tenant_id: tenantId, status: 'completed', metadata: { type: 'registration_fee' } as any },
    });
    if (alreadyPaid) {
      await this.activateTrialAfterRegistrationFee(tenantId);
      return { already_paid: true };
    }

    const ref = `REG-${tenantId}-${Date.now()}`;
    const tx = this.txRepo.create({
      tenant_id: tenantId,
      package_id: 1, // placeholder — registration fee is not tied to a package
      amount: REGISTRATION_FEE_LKR,
      currency: 'LKR',
      billing_cycle: 'monthly',
      gateway: 'onepay',
      gateway_ref: ref,
      status: 'pending',
      metadata: { type: 'registration_fee' },
    });
    await this.txRepo.save(tx);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const payload = {
      amount: REGISTRATION_FEE_LKR,
      app_id: appId,
      reference: ref,
      customer_first_name: tenant.name,
      customer_last_name: 'KadeHub',
      customer_phone_number: '0000000000',
      customer_email: 'billing@kadehub.lk',
      transaction_redirect_url: `${appUrl}/register/pay?status=success&ref=${ref}`,
      currency: 'LKR',
    };

    const hashStr = `${appId}${REGISTRATION_FEE_LKR}${ref}${hashSalt}`;
    const hash = crypto.createHash('sha256').update(hashStr).digest('hex');

    const onepayRes = await this.callOnepayApi(
      `https://merchant-api-live-v2.onepay.lk/api/ipg/gateway/request-transaction/?hash=${hash}`,
      appToken,
      payload,
    );

    if (!onepayRes?.data?.gateway?.redirect_url) {
      tx.status = 'failed';
      await this.txRepo.save(tx);
      throw new BadRequestException(onepayRes?.message || 'OnePay transaction creation failed');
    }

    tx.metadata = { ...tx.metadata, onepay_token: onepayRes.data.ipg_transaction_id };
    await this.txRepo.save(tx);

    return { payment_url: onepayRes.data.gateway.redirect_url, reference: ref, amount: REGISTRATION_FEE_LKR };
  }

  async verifyRegistrationFeeReturn(ref: string, tenantId: number) {
    const tx = await this.txRepo.findOne({ where: { gateway_ref: ref, tenant_id: tenantId } });
    if (!tx) throw new NotFoundException('Transaction not found');

    if (tx.status === 'completed') {
      await this.activateTrialAfterRegistrationFee(tenantId);
      return { status: 'completed' };
    }

    // Poll OnePay
    const appToken = process.env.ONEPAY_APP_TOKEN;
    const appId    = process.env.ONEPAY_APP_ID;
    const hashSalt = process.env.ONEPAY_HASH_SALT;
    if (appToken && appId && hashSalt && tx.metadata?.onepay_token) {
      try {
        const hash = crypto.createHash('sha256')
          .update(`${appId}${tx.metadata.onepay_token}${hashSalt}`).digest('hex');
        const res = await this.callOnepayApi(
          `https://merchant-api-live-v2.onepay.lk/api/ipg/gateway/query-transaction/?hash=${hash}`,
          appToken,
          { app_id: appId, ipg_transaction_id: tx.metadata.onepay_token },
        );
        if (res?.data?.payment_status === 'CAPTURED' || res?.data?.status_code === '2') {
          tx.status = 'completed';
          await this.txRepo.save(tx);
          await this.syncInvoice(tx);
          await this.activateTrialAfterRegistrationFee(tenantId);
          return { status: 'completed' };
        }
      } catch { /* ignore */ }
    }

    return { status: tx.status };
  }

  /** Start 14-day full-access trial (no upfront registration payment). */
  async activateTrial(tenantId: number) {
    await this.tenantRepo.update(tenantId, { status: 'active' });

    const existing = await this.subRepo.findOne({ where: { tenant_id: tenantId } });
    if (existing) return;

    const modules = ['pos', 'inventory', 'customer', 'analytics', 'expense', 'credit', 'discount', 'supplier', 'batch', 'staff'];
    const trialExpires = new Date();
    trialExpires.setDate(trialExpires.getDate() + 14);
    await this.subRepo.save(
      modules.map(m => this.subRepo.create({
        tenant_id: tenantId,
        module_name: m,
        status: 'active',
        payment_status: 'trial',
        expires_at: trialExpires,
      }))
    );
  }

  async hasPaidRegistrationFee(tenantId: number): Promise<boolean> {
    const txs = await this.txRepo.find({ where: { tenant_id: tenantId, status: 'completed' } });
    return txs.some(t => t.metadata?.type === 'registration_fee');
  }

  async getCheckoutInfo(tenantId: number, ip: string) {
    const pkgs = await this.getPackagesWithCurrency(ip);
    const registrationFeePaid = await this.hasPaidRegistrationFee(tenantId);
    return {
      ...pkgs,
      registrationFeePaid,
      registrationFeeDue: registrationFeePaid ? 0 : pkgs.registrationFee,
    };
  }

  /** @deprecated Use activateTrial — kept for legacy registration-fee payment flows */
  private async activateTrialAfterRegistrationFee(tenantId: number) {
    return this.activateTrial(tenantId);
  }

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
      await this.syncInvoice(tx);
      const pkg = await this.packageRepo.findOne({ where: { id: tx.package_id } });
      if (tx.metadata?.type === 'registration_fee') {
        await this.activateTrialAfterRegistrationFee(tx.tenant_id);
      } else {
        await this.activateSubscription(tx);
      }
      await this.notifyPaymentSuccess(tx, pkg);
    } else {
      const pkg = await this.packageRepo.findOne({ where: { id: tx.package_id } });
      const planName = tx.metadata?.type === 'registration_fee' ? 'Registration Fee' : (pkg?.name || 'Subscription');
      await this.notifyPaymentFailure(tx.tenant_id, planName, 'Online payment was declined or cancelled');
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
          await this.syncInvoice(tx);
          await this.activateSubscription(tx);
          const pkg = await this.packageRepo.findOne({ where: { id: tx.package_id } });
          await this.notifyPaymentSuccess(tx, pkg);
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
