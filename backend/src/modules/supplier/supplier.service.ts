import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Supplier } from '../../database/entities/supplier.entity';
import { PurchaseOrder } from '../../database/entities/purchase-order.entity';
import { PurchaseOrderItem } from '../../database/entities/purchase-order-item.entity';
import { Inventory } from '../../database/entities/inventory.entity';
import { Product } from '../../database/entities/product.entity';
import { CreateSupplierDto, UpdateSupplierDto, CreatePurchaseOrderDto } from './supplier.dto';

@Injectable()
export class SupplierService {
  constructor(
    @InjectRepository(Supplier) private supplierRepo: Repository<Supplier>,
    @InjectRepository(PurchaseOrder) private orderRepo: Repository<PurchaseOrder>,
    @InjectRepository(PurchaseOrderItem) private orderItemRepo: Repository<PurchaseOrderItem>,
    @InjectRepository(Inventory) private inventoryRepo: Repository<Inventory>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
  ) {}

  getSuppliers(tenantId: number) {
    return this.supplierRepo.find({ where: { tenant_id: tenantId, is_active: true }, order: { name: 'ASC' } });
  }

  async createSupplier(tenantId: number, dto: CreateSupplierDto) {
    return this.supplierRepo.save(this.supplierRepo.create({ tenant_id: tenantId, ...dto }));
  }

  async updateSupplier(id: number, tenantId: number, dto: UpdateSupplierDto) {
    const s = await this.supplierRepo.findOne({ where: { id, tenant_id: tenantId } });
    if (!s) throw new NotFoundException('Supplier not found');
    Object.assign(s, dto);
    return this.supplierRepo.save(s);
  }

  getOrders(tenantId: number) {
    return this.orderRepo.find({
      where: { tenant_id: tenantId },
      relations: ['supplier', 'items', 'items.product'],
      order: { created_at: 'DESC' },
    });
  }

  async createOrder(tenantId: number, userId: number, dto: CreatePurchaseOrderDto) {
    const supplier = await this.supplierRepo.findOne({ where: { id: dto.supplier_id, tenant_id: tenantId } });
    if (!supplier) throw new NotFoundException('Supplier not found');

    const productIds = dto.items.map(i => i.product_id);
    const products = await this.productRepo.find({ where: { id: In(productIds), tenant_id: tenantId } });
    if (products.length !== new Set(productIds).size) {
      throw new BadRequestException('One or more products were not found');
    }

    const total = dto.items.reduce((s, i) => s + i.cost * i.quantity, 0);
    const order = await this.orderRepo.save(
      this.orderRepo.create({ tenant_id: tenantId, user_id: userId, supplier_id: dto.supplier_id, total_amount: total, notes: dto.notes }),
    );
    const items = dto.items.map(i => this.orderItemRepo.create({ order_id: order.id, ...i }));
    await this.orderItemRepo.save(items);
    return this.orderRepo.findOne({ where: { id: order.id }, relations: ['supplier', 'items', 'items.product'] });
  }

  async receiveOrder(id: number, tenantId: number) {
    const order = await this.orderRepo.findOne({ where: { id, tenant_id: tenantId }, relations: ['items'] });
    if (!order) throw new NotFoundException('Order not found');
    for (const item of order.items) {
      await this.inventoryRepo.increment({ product_id: item.product_id }, 'quantity', item.quantity);
      await this.orderItemRepo.update(item.id, { received_qty: item.quantity });
    }
    order.status = 'received';
    order.received_at = new Date();
    return this.orderRepo.save(order);
  }

  async attachInvoice(id: number, tenantId: number, invoiceUrl: string) {
    const order = await this.orderRepo.findOne({ where: { id, tenant_id: tenantId } });
    if (!order) throw new NotFoundException('Order not found');
    order.invoice_url = invoiceUrl;
    return this.orderRepo.save(order);
  }

  async cancelOrder(id: number, tenantId: number) {
    const order = await this.orderRepo.findOne({ where: { id, tenant_id: tenantId } });
    if (!order) throw new NotFoundException('Order not found');
    order.status = 'cancelled';
    return this.orderRepo.save(order);
  }
}
