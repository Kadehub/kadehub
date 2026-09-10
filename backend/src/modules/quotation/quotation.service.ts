import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quotation } from '../../database/entities/quotation.entity';
import { Package } from '../../database/entities/package.entity';
import { CreateQuotationDto, AdminCreateQuotationDto, UpdateQuotationDto, QuotationLineItemDto } from './quotation.dto';
import { EmailService } from '../../common/email.service';
import { getBankDetails } from '../../common/bank-details';
import { REGISTRATION_FEE_LKR } from '../billing/invoice.service';

@Injectable()
export class QuotationService {
  constructor(
    @InjectRepository(Quotation) private quoteRepo: Repository<Quotation>,
    @InjectRepository(Package) private packageRepo: Repository<Package>,
    private emailService: EmailService,
  ) {}

  private async nextQuoteNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `QT-${year}-`;
    const latest = await this.quoteRepo
      .createQueryBuilder('q')
      .where('q.quote_number LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('q.id', 'DESC')
      .getOne();
    const seq = latest ? parseInt(latest.quote_number.split('-').pop() || '0', 10) + 1 : 1;
    return `${prefix}${String(seq).padStart(6, '0')}`;
  }

  private buildLineItems(
    dto: AdminCreateQuotationDto,
    pkg: Package | null,
  ): QuotationLineItemDto[] {
    if (dto.line_items?.length) {
      return dto.line_items.map(item => ({
        ...item,
        quantity: item.quantity ?? 1,
        total: (item.quantity ?? 1) * item.unit_price,
      }));
    }

    const items: QuotationLineItemDto[] = [];
    if (dto.include_registration_fee !== false) {
      items.push({
        description: 'Registration Fee (One-time)',
        quantity: 1,
        unit_price: REGISTRATION_FEE_LKR,
      });
    }
    if (pkg) {
      const cycle = dto.billing_cycle || 'monthly';
      const price = cycle === 'yearly' ? Number(pkg.price_yearly) : Number(pkg.price_monthly);
      items.push({
        description: `${pkg.name} Plan — ${cycle} subscription`,
        quantity: 1,
        unit_price: price,
      });
    }
    if (items.length === 0 && dto.quoted_amount) {
      items.push({
        description: dto.description || 'KadeHub Platform Services',
        quantity: 1,
        unit_price: dto.quoted_amount,
      });
    }
    return items;
  }

  private totalFromItems(items: QuotationLineItemDto[]): number {
    return items.reduce((sum, i) => sum + (i.quantity ?? 1) * i.unit_price, 0);
  }

  async createPublic(dto: CreateQuotationDto) {
    const quote = this.quoteRepo.create({
      ...dto,
      quote_number: await this.nextQuoteNumber(),
      status: 'new',
    });
    const saved = await this.quoteRepo.save(quote);
    this.notifyAdmin(saved).catch(() => {});
    return { ok: true, quote_number: saved.quote_number };
  }

  async createAdmin(dto: AdminCreateQuotationDto) {
    let pkg: Package | null = null;
    if (dto.package_id) {
      pkg = await this.packageRepo.findOne({ where: { id: dto.package_id }, relations: ['modules'] });
      if (!pkg) throw new BadRequestException('Package not found');
    }

    const lineItems = this.buildLineItems(dto, pkg);
    if (!lineItems.length) {
      throw new BadRequestException('Add line items, select a package, or enter a quoted amount.');
    }

    const quotedAmount = dto.quoted_amount ?? this.totalFromItems(lineItems);
    const validUntil = dto.valid_until
      ? new Date(dto.valid_until)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const quote = this.quoteRepo.create({
      contact_name: dto.contact_name,
      email: dto.email,
      business_type: dto.business_type,
      country: dto.country,
      description: dto.description,
      package_id: dto.package_id,
      billing_cycle: dto.billing_cycle || 'monthly',
      quoted_amount: quotedAmount,
      valid_until: validUntil,
      notes: dto.notes,
      line_items: lineItems.map(i => ({
        description: i.description,
        quantity: i.quantity ?? 1,
        unit_price: i.unit_price,
        total: (i.quantity ?? 1) * i.unit_price,
      })),
      quote_number: await this.nextQuoteNumber(),
      status: 'new',
    });

    return this.quoteRepo.save(quote);
  }

  private async notifyAdmin(quote: Quotation) {
    const to = process.env.SUPER_ADMIN_EMAIL || 'official.kadehub@gmail.com';
    await this.emailService.send(
      to,
      `New Quote Request — ${quote.business_type || 'General'} (${quote.country || 'N/A'})`,
      `
        <div style="font-family:sans-serif;max-width:520px">
          <h2 style="color:#0d6e5a">New Quote Request</h2>
          <p><strong>Quote #:</strong> ${quote.quote_number}</p>
          <p><strong>Name:</strong> ${quote.contact_name}</p>
          <p><strong>Email:</strong> ${quote.email}</p>
          <p><strong>Business:</strong> ${quote.business_type || '—'}</p>
          <p><strong>Country:</strong> ${quote.country || '—'}</p>
          <p><strong>Budget:</strong> ${quote.budget_range || '—'}</p>
          <p><strong>Description:</strong><br/>${(quote.description || '').replace(/\n/g, '<br/>')}</p>
          <p style="margin-top:16px;color:#6b7280;font-size:12px">Review in Super Admin → Quotations</p>
        </div>
      `,
    );
  }

  async list(page = 1, limit = 20, status?: string) {
    const qb = this.quoteRepo.createQueryBuilder('q')
      .leftJoinAndSelect('q.package', 'package')
      .orderBy('q.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);
    if (status) qb.andWhere('q.status = :status', { status });
    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async getById(id: number) {
    const quote = await this.quoteRepo.findOne({ where: { id }, relations: ['package', 'package.modules'] });
    if (!quote) throw new NotFoundException('Quotation not found');
    return quote;
  }

  async getPrintData(id: number) {
    const quote = await this.getById(id);
    const bank = getBankDetails();
    return { quote, bank };
  }

  async update(id: number, dto: UpdateQuotationDto) {
    const quote = await this.getById(id);
    if (dto.contact_name) quote.contact_name = dto.contact_name;
    if (dto.email) quote.email = dto.email;
    if (dto.business_type !== undefined) quote.business_type = dto.business_type;
    if (dto.country !== undefined) quote.country = dto.country;
    if (dto.description !== undefined) quote.description = dto.description;
    if (dto.status) quote.status = dto.status;
    if (dto.package_id !== undefined) quote.package_id = dto.package_id;
    if (dto.billing_cycle) quote.billing_cycle = dto.billing_cycle;
    if (dto.quoted_amount !== undefined) quote.quoted_amount = dto.quoted_amount;
    if (dto.valid_until) quote.valid_until = new Date(dto.valid_until);
    if (dto.notes !== undefined) quote.notes = dto.notes;
    if (dto.line_items?.length) {
      quote.line_items = dto.line_items.map(i => ({
        description: i.description,
        quantity: i.quantity ?? 1,
        unit_price: i.unit_price,
        total: (i.quantity ?? 1) * i.unit_price,
      }));
      if (dto.quoted_amount === undefined) {
        quote.quoted_amount = this.totalFromItems(dto.line_items);
      }
    }
    return this.quoteRepo.save(quote);
  }

  async sendToClient(id: number) {
    const quote = await this.getById(id);
    const amount = quote.quoted_amount ? `LKR ${Number(quote.quoted_amount).toLocaleString()}` : 'To be confirmed';
    const validUntil = quote.valid_until
      ? new Date(quote.valid_until).toLocaleDateString('en-LK')
      : '30 days from issue';

    const itemRows = (quote.line_items || []).map((i: any) =>
      `<tr><td style="padding:8px;border:1px solid #e5e7eb">${i.description}</td>
       <td style="padding:8px;border:1px solid #e5e7eb;text-align:right">LKR ${Number(i.total ?? i.unit_price).toLocaleString()}</td></tr>`
    ).join('');

    await this.emailService.send(
      quote.email,
      `Your KadeHub Quotation — ${quote.quote_number}`,
      `
        <div style="font-family:sans-serif;max-width:520px">
          <h2 style="color:#0d6e5a">KadeHub Quotation</h2>
          <p>Dear ${quote.contact_name},</p>
          <p>Thank you for your interest in KadeHub. Here is your quotation:</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
            <tr><td style="padding:8px 0;color:#6b7280">Quote #</td><td><strong>${quote.quote_number}</strong></td></tr>
            <tr><td style="padding:8px 0;color:#6b7280">Quoted Amount</td><td><strong>${amount}</strong></td></tr>
            <tr><td style="padding:8px 0;color:#6b7280">Valid Until</td><td>${validUntil}</td></tr>
          </table>
          ${itemRows ? `<table style="width:100%;border-collapse:collapse;margin:16px 0"><tr><th style="padding:8px;border:1px solid #e5e7eb;text-align:left">Item</th><th style="padding:8px;border:1px solid #e5e7eb">Amount</th></tr>${itemRows}</table>` : ''}
          ${quote.notes ? `<p><strong>Notes:</strong><br/>${quote.notes.replace(/\n/g, '<br/>')}</p>` : ''}
          <p style="margin-top:24px"><a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://kadehub.com'}/register" style="background:#0d6e5a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Register Now</a></p>
          <p style="color:#6b7280;font-size:12px;margin-top:24px">KadeHub — Smart Shop Management</p>
        </div>
      `,
    );

    quote.status = 'sent';
    return this.quoteRepo.save(quote);
  }

  async delete(id: number) {
    const quote = await this.getById(id);
    await this.quoteRepo.remove(quote);
    return { message: 'Deleted' };
  }

  async countNew() {
    return this.quoteRepo.count({ where: { status: 'new' } });
  }
}
