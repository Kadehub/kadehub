import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice } from '../../database/entities/invoice.entity';
import { PaymentTransaction } from '../../database/entities/payment-transaction.entity';
import { Tenant } from '../../database/entities/tenant.entity';
import { CompanyProfile } from '../../database/entities/company-profile.entity';
import { getBankDetails } from '../../common/bank-details';
import { getPlatformCompany } from '../../common/platform-company';
import { buildInvoiceEmailHtml } from '../../common/invoice-html';
import { EmailService } from '../../common/email.service';

export const REGISTRATION_FEE_LKR = 25000;

@Injectable()
export class InvoiceService {
  constructor(
    @InjectRepository(Invoice) private invoiceRepo: Repository<Invoice>,
    @InjectRepository(Tenant) private tenantRepo: Repository<Tenant>,
    @InjectRepository(CompanyProfile) private profileRepo: Repository<CompanyProfile>,
    private emailService: EmailService,
  ) {}

  private async nextInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;
    const latest = await this.invoiceRepo
      .createQueryBuilder('i')
      .where('i.invoice_number LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('i.id', 'DESC')
      .getOne();
    const seq = latest ? parseInt(latest.invoice_number.split('-').pop() || '0', 10) + 1 : 1;
    return `${prefix}${String(seq).padStart(6, '0')}`;
  }

  async createRegistrationInvoice(tenantId: number, billToName: string, billToEmail: string) {
    const existing = await this.invoiceRepo.findOne({
      where: { tenant_id: tenantId, type: 'registration_fee', status: 'pending' },
    });
    if (existing) return existing;

    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    const dueAt = new Date();
    dueAt.setDate(dueAt.getDate() + 14);

    const invoice = this.invoiceRepo.create({
      invoice_number: await this.nextInvoiceNumber(),
      tenant_id: tenantId,
      type: 'registration_fee',
      amount: REGISTRATION_FEE_LKR,
      currency: 'LKR',
      status: 'pending',
      description: 'KadeHub Registration Fee — 14-day trial access',
      bill_to_name: billToName,
      bill_to_email: billToEmail,
      issued_at: new Date(),
      due_at: dueAt,
      line_items: [{
        description: 'Registration Fee (One-time)',
        quantity: 1,
        unit_price: REGISTRATION_FEE_LKR,
        total: REGISTRATION_FEE_LKR,
      }],
      notes: `Shop: ${tenant?.name || ''}`,
    });
    return this.invoiceRepo.save(invoice);
  }

  async markPaidByTransaction(tx: PaymentTransaction) {
    const type = tx.metadata?.type === 'registration_fee' ? 'registration_fee' : 'subscription';
    let invoice = await this.invoiceRepo.findOne({
      where: { tenant_id: tx.tenant_id, type, status: 'pending' },
      order: { created_at: 'DESC' },
    });

    if (!invoice && type === 'subscription') {
      invoice = await this.createSubscriptionInvoice(tx);
    }

    if (!invoice) return null;

    invoice.status = 'paid';
    invoice.payment_transaction_id = tx.id;
    invoice.paid_at = new Date();
    if (type === 'subscription' && tx.package_id) invoice.package_id = tx.package_id;
    const saved = await this.invoiceRepo.save(invoice);
    this.emailInvoiceToCustomer(saved.id).catch(() => {});
    return saved;
  }

  async createSubscriptionInvoice(tx: PaymentTransaction) {
    const invoice = this.invoiceRepo.create({
      invoice_number: await this.nextInvoiceNumber(),
      tenant_id: tx.tenant_id,
      payment_transaction_id: tx.id,
      package_id: tx.package_id,
      type: 'subscription',
      amount: tx.amount,
      currency: tx.currency || 'LKR',
      status: tx.status === 'completed' ? 'paid' : 'pending',
      description: `KadeHub Subscription — ${tx.billing_cycle}`,
      issued_at: new Date(),
      paid_at: tx.status === 'completed' ? new Date() : undefined,
      line_items: [{
        description: `Subscription (${tx.billing_cycle})`,
        quantity: 1,
        unit_price: tx.amount,
        total: tx.amount,
      }],
    });
    return this.invoiceRepo.save(invoice);
  }

  async getForTenant(tenantId: number) {
    return this.invoiceRepo.find({
      where: { tenant_id: tenantId },
      relations: ['package', 'payment_transaction'],
      order: { created_at: 'DESC' },
    });
  }

  async listAll(page = 1, limit = 20, status?: string) {
    const qb = this.invoiceRepo.createQueryBuilder('i')
      .leftJoinAndSelect('i.tenant', 'tenant')
      .leftJoinAndSelect('i.package', 'package')
      .orderBy('i.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);
    if (status) qb.andWhere('i.status = :status', { status });
    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async getById(id: number) {
    const invoice = await this.invoiceRepo.findOne({
      where: { id },
      relations: ['tenant', 'package', 'payment_transaction'],
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async getPrintData(id: number) {
    const invoice = await this.getById(id);
    const profile = await this.profileRepo.findOne({ where: { tenant_id: invoice.tenant_id } });
    const bank = getBankDetails();
    const platform = getPlatformCompany();
    const payment = invoice.payment_transaction || null;

    if (invoice.package && invoice.line_items?.length === 1 && invoice.type === 'subscription') {
      invoice.line_items = [{
        description: `${invoice.package.name} Plan — ${invoice.payment_transaction?.billing_cycle || 'monthly'} subscription`,
        quantity: 1,
        unit_price: invoice.amount,
        total: invoice.amount,
      }];
    }

    return { invoice, tenant: invoice.tenant, profile, bank, platform, payment };
  }

  async getPrintDataByTransaction(txId: number) {
    const invoice = await this.invoiceRepo.findOne({
      where: { payment_transaction_id: txId },
      relations: ['tenant', 'package', 'payment_transaction'],
    });
    if (invoice) return this.getPrintData(invoice.id);

    const tx = await this.invoiceRepo.manager.getRepository(PaymentTransaction).findOne({
      where: { id: txId },
      relations: ['tenant', 'package'],
    });
    if (!tx) throw new NotFoundException('Transaction not found');

    const profile = await this.profileRepo.findOne({ where: { tenant_id: tx.tenant_id } });
    const isRegFee = tx.metadata?.type === 'registration_fee';
    const syntheticInvoice = {
      invoice_number: `INV-${new Date(tx.created_at).getFullYear()}-${String(tx.id).padStart(6, '0')}`,
      tenant_id: tx.tenant_id,
      type: isRegFee ? 'registration_fee' : 'subscription',
      amount: tx.amount,
      currency: tx.currency || 'LKR',
      status: tx.status === 'completed' ? 'paid' : 'pending',
      description: isRegFee
        ? 'KadeHub Registration Fee — 14-day trial access'
        : `${tx.package?.name || 'KadeHub'} Subscription — ${tx.billing_cycle}`,
      bill_to_name: tx.tenant?.name,
      bill_to_email: profile?.email,
      issued_at: tx.created_at,
      due_at: tx.created_at,
      paid_at: tx.status === 'completed' ? tx.created_at : null,
      line_items: [{
        description: isRegFee
          ? 'Registration Fee (One-time)'
          : `${tx.package?.name || 'Subscription'} Plan (${tx.billing_cycle})`,
        quantity: 1,
        unit_price: tx.amount,
        total: tx.amount,
      }],
      created_at: tx.created_at,
    };

    return {
      invoice: syntheticInvoice,
      tenant: tx.tenant,
      profile,
      bank: getBankDetails(),
      platform: getPlatformCompany(),
      payment: tx,
    };
  }

  async emailInvoiceToCustomer(id: number, overrideEmail?: string) {
    const data = await this.getPrintData(id);
    const to = overrideEmail || data.invoice.bill_to_email || data.profile?.email;
    if (!to) throw new BadRequestException('No email address found for this customer');
    const html = buildInvoiceEmailHtml(data);
    const sent = await this.emailService.sendInvoice(to, data.invoice.invoice_number, html);
    if (!sent) throw new BadRequestException('Email could not be sent. Configure SMTP_USER and SMTP_PASS in .env');
    return { ok: true, sent_to: to, invoice_number: data.invoice.invoice_number };
  }
}
