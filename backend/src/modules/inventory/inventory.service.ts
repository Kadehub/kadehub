import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../../database/entities/product.entity';
import { Inventory } from '../../database/entities/inventory.entity';
import { AppEventEmitter, SALE_COMPLETED } from '../../common/events/app-event-emitter';
import { CreateProductDto, UpdateProductDto, AdjustStockDto } from './inventory.dto';

@Injectable()
export class InventoryService implements OnModuleInit {
  constructor(
    @InjectRepository(Product) private productRepo: Repository<Product>,
    @InjectRepository(Inventory) private inventoryRepo: Repository<Inventory>,
    private events: AppEventEmitter,
  ) {}

  onModuleInit() {
    this.events.on(SALE_COMPLETED, async ({ items }: { items: { product_id: number; quantity: number }[] }) => {
      for (const item of items) {
        await this.inventoryRepo.decrement({ product_id: item.product_id }, 'quantity', item.quantity);
      }
    });
  }

  async getProducts(tenantId: number) {
    return this.productRepo.find({
      where: { tenant_id: tenantId, is_active: true },
      relations: ['inventory'],
      order: { name: 'ASC' },
    });
  }

  async getProductByBarcode(tenantId: number, barcode: string) {
    return this.productRepo.findOne({ where: { tenant_id: tenantId, barcode }, relations: ['inventory'] });
  }

  async createProduct(tenantId: number, dto: CreateProductDto) {
    const product = this.productRepo.create({
      tenant_id: tenantId, name: dto.name, barcode: dto.barcode,
      price: dto.price, cost: dto.cost || 0, category: dto.category,
      image_url: dto.image_url || null,
    });
    await this.productRepo.save(product);
    const inv = this.inventoryRepo.create({ product_id: product.id, quantity: dto.initialStock, reorder_level: dto.reorderLevel || 10 });
    await this.inventoryRepo.save(inv);
    return { ...product, inventory: inv };
  }

  async updateProduct(productId: number, tenantId: number, dto: UpdateProductDto) {
    const product = await this.productRepo.findOne({ where: { id: productId, tenant_id: tenantId } });
    if (!product) throw new NotFoundException('Product not found');
    Object.assign(product, dto);
    return this.productRepo.save(product);
  }

  async updateProductImage(productId: number, tenantId: number, imageUrl: string) {
    const product = await this.productRepo.findOne({ where: { id: productId, tenant_id: tenantId } });
    if (!product) throw new NotFoundException('Product not found');
    product.image_url = imageUrl;
    return this.productRepo.save(product);
  }

  async adjustStock(productId: number, tenantId: number, dto: AdjustStockDto) {
    const product = await this.productRepo.findOne({ where: { id: productId, tenant_id: tenantId } });
    if (!product) throw new NotFoundException('Product not found');
    await this.inventoryRepo.increment({ product_id: productId }, 'quantity', dto.quantity);
    return this.inventoryRepo.findOne({ where: { product_id: productId } });
  }

  async importFromCsv(tenantId: number, csvBuffer: Buffer) {
    const lines = csvBuffer.toString('utf-8').split(/\r?\n/).filter(Boolean);
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const idx = (name: string) => headers.indexOf(name);
    const imported: number[] = [];
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
      const name = cols[idx('name')];
      if (!name) { errors.push(`Row ${i + 1}: missing name`); continue; }
      const price = parseFloat(cols[idx('price')]);
      if (isNaN(price) || price <= 0) { errors.push(`Row ${i + 1}: invalid price`); continue; }
      try {
        const product = this.productRepo.create({
          tenant_id: tenantId, name,
          barcode: cols[idx('barcode')] || null,
          price,
          cost: parseFloat(cols[idx('cost')]) || 0,
          category: cols[idx('category')] || null,
        });
        await this.productRepo.save(product);
        const inv = this.inventoryRepo.create({
          product_id: product.id,
          quantity: parseInt(cols[idx('stock')]) || 0,
          reorder_level: parseInt(cols[idx('reorder_level')]) || 10,
        });
        await this.inventoryRepo.save(inv);
        imported.push(product.id);
      } catch (e) {
        errors.push(`Row ${i + 1}: ${e.message}`);
      }
    }
    return { imported: imported.length, skipped: errors.length, errors };
  }

  async getLowStock(tenantId: number) {
    return this.productRepo
      .createQueryBuilder('p')
      .innerJoin('p.inventory', 'i')
      .where('p.tenant_id = :tenantId', { tenantId })
      .andWhere('i.quantity <= i.reorder_level')
      .select(['p.id', 'p.name', 'i.quantity', 'i.reorder_level'])
      .getRawMany();
  }
}
