import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Sale } from '../../database/entities/sale.entity';
import { SaleItem } from '../../database/entities/sale-item.entity';
import { CreditSale } from '../../database/entities/credit-sale.entity';
import { Inventory } from '../../database/entities/inventory.entity';
import { Product } from '../../database/entities/product.entity';
import { AppEventEmitter, SALE_COMPLETED } from '../../common/events/app-event-emitter';
import { CreateSaleDto } from './pos.dto';

@Injectable()
export class PosService {
  constructor(
    @InjectRepository(Sale) private saleRepo: Repository<Sale>,
    @InjectRepository(SaleItem) private saleItemRepo: Repository<SaleItem>,
    @InjectRepository(CreditSale) private creditRepo: Repository<CreditSale>,
    @InjectRepository(Inventory) private inventoryRepo: Repository<Inventory>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
    private events: AppEventEmitter,
  ) {}

  async createSale(tenantId: number, userId: number, dto: CreateSaleDto) {
    if (dto.payment_method === 'CREDIT' && !dto.customer_id)
      throw new BadRequestException('A customer must be selected for credit sales');

    // Load the products from THIS tenant only, so a caller can't reference — or
    // reprice — another shop's product by guessing its numeric id.
    const productIds = dto.items.map(i => i.product_id);
    const products = await this.productRepo.find({ where: { id: In(productIds), tenant_id: tenantId } });
    const productById = new Map(products.map(p => [p.id, p]));
    for (const item of dto.items) {
      if (!productById.has(item.product_id))
        throw new BadRequestException(`Product ID ${item.product_id} not found`);
      if (item.quantity <= 0) throw new BadRequestException('Invalid item quantity');
    }

    // Validate stock availability before processing
    for (const item of dto.items) {
      const inv = await this.inventoryRepo.findOne({ where: { product_id: item.product_id } });
      if (!inv || inv.quantity < item.quantity)
        throw new BadRequestException(`Insufficient stock for product ID ${item.product_id}`);
    }

    // Price is always taken from the tenant's own product record, never from
    // the client, so a manipulated request can't check out below the real price.
    const pricedItems = dto.items.map(i => ({ ...i, price: Number(productById.get(i.product_id)!.price) }));
    const subtotal = pricedItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const discount = dto.discount || 0;
    if (discount > subtotal) throw new BadRequestException('Discount cannot exceed subtotal');
    const total = Math.max(0, subtotal - discount);

    const sale = this.saleRepo.create({
      tenant_id: tenantId,
      user_id: userId,
      customer_id: dto.customer_id || null,
      total_amount: total,
      discount: discount,
      payment_method: dto.payment_method,
    });
    await this.saleRepo.save(sale);

    const items = pricedItems.map((i) => this.saleItemRepo.create({ sale_id: sale.id, product_id: i.product_id, quantity: i.quantity, price: i.price }));
    await this.saleItemRepo.save(items);

    // Auto-create credit record for CREDIT sales
    if (dto.payment_method === 'CREDIT') {
      await this.creditRepo.save(this.creditRepo.create({
        tenant_id: tenantId,
        sale_id: sale.id,
        customer_id: dto.customer_id!,
        amount_due: total,
        amount_paid: 0,
        due_date: dto.due_date || null,
        status: 'outstanding',
      }));
    }

    this.events.emit(SALE_COMPLETED, { sale_id: sale.id, tenant_id: tenantId, customer_id: dto.customer_id, items: pricedItems, total });

    return this.getReceipt(sale.id);
  }

  async getReceipt(saleId: number, tenantId?: number) {
    return this.saleRepo.findOne({
      where: { id: saleId, ...(tenantId && { tenant_id: tenantId }) },
      relations: ['items', 'items.product', 'user', 'customer'],
    });
  }

  async voidSale(saleId: number, tenantId: number) {
    const sale = await this.saleRepo.findOne({
      where: { id: saleId, tenant_id: tenantId },
      relations: ['items'],
    });
    if (!sale) throw new BadRequestException('Sale not found');
    if (sale.status === 'voided') throw new BadRequestException('Sale already voided');
    // Restore stock
    for (const item of sale.items) {
      await this.inventoryRepo.increment({ product_id: item.product_id }, 'quantity', item.quantity);
    }
    sale.status = 'voided';
    return this.saleRepo.save(sale);
  }

  async getSales(tenantId: number, date?: string) {
    const qb = this.saleRepo.createQueryBuilder('s')
      .where('s.tenant_id = :tenantId', { tenantId })
      .orderBy('s.created_at', 'DESC')
      .take(50);
    if (date) qb.andWhere('DATE(s.created_at) = :date', { date });
    return qb.getMany();
  }
}
