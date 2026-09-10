import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quotation } from '../../database/entities/quotation.entity';
import { CreateQuotationDto, UpdateQuotationDto } from './quotation.dto';
import { EmailService } from '../../common/email.service';

@Injectable()
export class QuotationService {
  constructor(
    @InjectRepository(Quotation) private quoteRepo: Repository<Quotation>,
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
    const quote = await this.quoteRepo.findOne({ where: { id }, relations: ['package'] });
    if (!quote) throw new NotFoundException('Quotation not found');
    return quote;
  }

  async update(id: number, dto: UpdateQuotationDto) {
    const quote = await this.getById(id);
    if (dto.status) quote.status = dto.status;
    if (dto.package_id !== undefined) quote.package_id = dto.package_id;
    if (dto.quoted_amount !== undefined) quote.quoted_amount = dto.quoted_amount;
    if (dto.valid_until) quote.valid_until = new Date(dto.valid_until);
    if (dto.notes !== undefined) quote.notes = dto.notes;
    return this.quoteRepo.save(quote);
  }

  async sendToClient(id: number) {
    const quote = await this.getById(id);
    const amount = quote.quoted_amount ? `LKR ${Number(quote.quoted_amount).toLocaleString()}` : 'To be confirmed';
    const validUntil = quote.valid_until
      ? new Date(quote.valid_until).toLocaleDateString('en-LK')
      : '30 days from issue';

    await this.emailService.send(
      quote.email,
      `Your KadeHub Quotation — ${quote.quote_number}`,
      `
        <div style="font-family:sans-serif;max-width:520px">
          <h2 style="color:#0d6e5a">KadeHub Quotation</h2>
          <p>Dear ${quote.contact_name},</p>
          <p>Thank you for your interest in KadeHub. Here is your quotation:</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:8px 0;color:#6b7280">Quote #</td><td><strong>${quote.quote_number}</strong></td></tr>
            <tr><td style="padding:8px 0;color:#6b7280">Quoted Amount</td><td><strong>${amount}</strong></td></tr>
            <tr><td style="padding:8px 0;color:#6b7280">Valid Until</td><td>${validUntil}</td></tr>
          </table>
          ${quote.notes ? `<p><strong>Notes:</strong><br/>${quote.notes.replace(/\n/g, '<br/>')}</p>` : ''}
          <p style="margin-top:24px"><a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://kadehub.com'}/register" style="background:#0d6e5a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Register Now</a></p>
          <p style="color:#6b7280;font-size:12px;margin-top:24px">KadeHub — Smart Shop Management</p>
        </div>
      `,
    );

    quote.status = 'sent';
    return this.quoteRepo.save(quote);
  }

  async countNew() {
    return this.quoteRepo.count({ where: { status: 'new' } });
  }
}
