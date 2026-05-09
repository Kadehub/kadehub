import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sale } from '../../database/entities/sale.entity';
import { SaleItem } from '../../database/entities/sale-item.entity';
import { Customer } from '../../database/entities/customer.entity';
import { Product } from '../../database/entities/product.entity';
import { Inventory } from '../../database/entities/inventory.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Sale) private saleRepo: Repository<Sale>,
    @InjectRepository(SaleItem) private saleItemRepo: Repository<SaleItem>,
    @InjectRepository(Customer) private customerRepo: Repository<Customer>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
    @InjectRepository(Inventory) private inventoryRepo: Repository<Inventory>,
  ) {}

  // ── POS: summary for any date range ──
  async getSummary(tenantId: number, from: string, to: string) {
    return this.saleRepo
      .createQueryBuilder('s')
      .where('s.tenant_id = :tenantId', { tenantId })
      .andWhere('DATE(s.created_at) BETWEEN :from AND :to', { from, to })
      .andWhere('s.status = :status', { status: 'completed' })
      .select([
        'COUNT(s.id) as total_sales',
        'COALESCE(SUM(s.total_amount), 0) as revenue',
        'COALESCE(AVG(s.total_amount), 0) as avg_sale',
        'COALESCE(SUM(s.discount), 0) as total_discount',
        'SUM(CASE WHEN s.payment_method = "CASH" THEN 1 ELSE 0 END) as cash_count',
        'SUM(CASE WHEN s.payment_method = "CARD" THEN 1 ELSE 0 END) as card_count',
        'SUM(CASE WHEN s.payment_method = "LANKAQR" THEN 1 ELSE 0 END) as qr_count',
        'COALESCE(SUM(CASE WHEN s.payment_method = "CASH" THEN s.total_amount ELSE 0 END), 0) as cash_revenue',
        'COALESCE(SUM(CASE WHEN s.payment_method = "CARD" THEN s.total_amount ELSE 0 END), 0) as card_revenue',
        'COALESCE(SUM(CASE WHEN s.payment_method = "LANKAQR" THEN s.total_amount ELSE 0 END), 0) as qr_revenue',
      ])
      .getRawOne();
  }

  // ── POS: revenue grouped by period ──
  async getRevenueByPeriod(tenantId: number, from: string, to: string, groupBy: 'day' | 'week' | 'month' = 'day') {
    const groupExpr =
      groupBy === 'month' ? 'DATE_FORMAT(s.created_at, "%Y-%m")' :
      groupBy === 'week'  ? 'DATE_FORMAT(s.created_at, "%Y-%u")' :
      'DATE(s.created_at)';

    return this.saleRepo
      .createQueryBuilder('s')
      .where('s.tenant_id = :tenantId', { tenantId })
      .andWhere('DATE(s.created_at) BETWEEN :from AND :to', { from, to })
      .andWhere('s.status = :status', { status: 'completed' })
      .groupBy(groupExpr)
      .select([
        `${groupExpr} as period`,
        'COALESCE(SUM(s.total_amount), 0) as revenue',
        'COUNT(s.id) as sales',
        'COALESCE(AVG(s.total_amount), 0) as avg_sale',
      ])
      .orderBy('period', 'ASC')
      .getRawMany();
  }

  // ── POS: hourly sales heatmap ──
  async getHourlySales(tenantId: number, from: string, to: string) {
    return this.saleRepo
      .createQueryBuilder('s')
      .where('s.tenant_id = :tenantId', { tenantId })
      .andWhere('DATE(s.created_at) BETWEEN :from AND :to', { from, to })
      .andWhere('s.status = :status', { status: 'completed' })
      .groupBy('HOUR(s.created_at)')
      .select([
        'HOUR(s.created_at) as hour',
        'COUNT(s.id) as sales',
        'COALESCE(SUM(s.total_amount), 0) as revenue',
      ])
      .orderBy('hour', 'ASC')
      .getRawMany();
  }

  // ── POS: recent sales list ──
  async getRecentSales(tenantId: number, from: string, to: string, limit = 50) {
    return this.saleRepo
      .createQueryBuilder('s')
      .leftJoin('s.user', 'u')
      .leftJoin('s.customer', 'c')
      .where('s.tenant_id = :tenantId', { tenantId })
      .andWhere('DATE(s.created_at) BETWEEN :from AND :to', { from, to })
      .select([
        's.id as id', 's.total_amount as total_amount', 's.discount as discount',
        's.payment_method as payment_method', 's.status as status',
        's.created_at as created_at', 'u.name as cashier', 'c.name as customer',
      ])
      .orderBy('s.created_at', 'DESC')
      .limit(limit)
      .getRawMany();
  }

  // ── Products: top selling with revenue ──
  async getTopProducts(tenantId: number, from: string, to: string, limit = 15) {
    return this.saleItemRepo
      .createQueryBuilder('si')
      .innerJoin('si.sale', 's')
      .innerJoin('si.product', 'p')
      .where('s.tenant_id = :tenantId', { tenantId })
      .andWhere('DATE(s.created_at) BETWEEN :from AND :to', { from, to })
      .andWhere('s.status = :status', { status: 'completed' })
      .groupBy('si.product_id, p.name, p.category')
      .select([
        'p.id as id', 'p.name as name', 'p.category as category',
        'SUM(si.quantity) as total_qty',
        'COALESCE(SUM(si.quantity * si.price), 0) as revenue',
        'COALESCE(AVG(si.price), 0) as avg_price',
      ])
      .orderBy('total_qty', 'DESC')
      .limit(limit)
      .getRawMany();
  }

  // ── Products: category breakdown ──
  async getCategoryBreakdown(tenantId: number, from: string, to: string) {
    return this.saleItemRepo
      .createQueryBuilder('si')
      .innerJoin('si.sale', 's')
      .innerJoin('si.product', 'p')
      .where('s.tenant_id = :tenantId', { tenantId })
      .andWhere('DATE(s.created_at) BETWEEN :from AND :to', { from, to })
      .andWhere('s.status = :status', { status: 'completed' })
      .groupBy('COALESCE(p.category, \'Other\')')
      .select([
        'COALESCE(p.category, \'Other\') as category',
        'SUM(si.quantity) as total_qty',
        'COALESCE(SUM(si.quantity * si.price), 0) as revenue',
      ])
      .orderBy('revenue', 'DESC')
      .getRawMany();
  }

  // ── Inventory: stock status ──
  async getStockReport(tenantId: number) {
    return this.productRepo
      .createQueryBuilder('p')
      .innerJoin('p.inventory', 'i')
      .where('p.tenant_id = :tenantId', { tenantId })
      .andWhere('p.is_active = true')
      .select([
        'p.id as id', 'p.name as name', 'p.category as category',
        'p.price as price', 'p.cost as cost',
        'i.quantity as quantity', 'i.reorder_level as reorder_level',
        '(p.price + 0) * (i.quantity + 0) as stock_value',
        '(p.cost + 0) * (i.quantity + 0) as cost_value',
      ])
      .orderBy('i.quantity', 'ASC')
      .getRawMany();
  }

  // ── Inventory: stock value summary ──
  async getStockValueSummary(tenantId: number) {
    return this.productRepo
      .createQueryBuilder('p')
      .innerJoin('p.inventory', 'i')
      .where('p.tenant_id = :tenantId', { tenantId })
      .andWhere('p.is_active = true')
      .select([
        'COUNT(p.id) as total_products',
        'COALESCE(SUM(p.price * i.quantity), 0) as total_retail_value',
        'COALESCE(SUM(p.cost * i.quantity), 0) as total_cost_value',
        'SUM(CASE WHEN i.quantity <= 0 THEN 1 ELSE 0 END) as out_of_stock',
        'SUM(CASE WHEN i.quantity > 0 AND i.quantity <= i.reorder_level THEN 1 ELSE 0 END) as low_stock',
        'SUM(CASE WHEN i.quantity > i.reorder_level THEN 1 ELSE 0 END) as healthy_stock',
      ])
      .getRawOne();
  }

  // ── CRM: customer summary ──
  async getCustomerSummary(tenantId: number, from: string, to: string) {
    const totals = await this.customerRepo
      .createQueryBuilder('c')
      .where('c.tenant_id = :tenantId', { tenantId })
      .select([
        'COUNT(c.id) as total_customers',
        'COALESCE(SUM(c.loyalty_points), 0) as total_points',
        'COALESCE(AVG(c.loyalty_points), 0) as avg_points',
      ])
      .getRawOne();

    const newCustomers = await this.customerRepo
      .createQueryBuilder('c')
      .where('c.tenant_id = :tenantId', { tenantId })
      .andWhere('DATE(c.created_at) BETWEEN :from AND :to', { from, to })
      .select('COUNT(c.id) as new_customers')
      .getRawOne();

    return { ...totals, ...newCustomers };
  }

  // ── CRM: top customers by spend ──
  async getTopCustomers(tenantId: number, from: string, to: string, limit = 10) {
    return this.saleRepo
      .createQueryBuilder('s')
      .innerJoin('s.customer', 'c')
      .where('s.tenant_id = :tenantId', { tenantId })
      .andWhere('DATE(s.created_at) BETWEEN :from AND :to', { from, to })
      .andWhere('s.status = :status', { status: 'completed' })
      .andWhere('s.customer_id IS NOT NULL')
      .groupBy('s.customer_id, c.id, c.name, c.phone, c.loyalty_points')
      .select([
        'c.id as id', 'c.name as name', 'c.phone as phone',
        'c.loyalty_points as loyalty_points',
        'COUNT(s.id) as visit_count',
        'COALESCE(SUM(s.total_amount), 0) as total_spend',
        'COALESCE(AVG(s.total_amount), 0) as avg_spend',
      ])
      .orderBy('total_spend', 'DESC')
      .limit(limit)
      .getRawMany();
  }

  // ── CRM: customer growth over time ──
  async getCustomerGrowth(tenantId: number, from: string, to: string) {
    return this.customerRepo
      .createQueryBuilder('c')
      .where('c.tenant_id = :tenantId', { tenantId })
      .andWhere('DATE(c.created_at) BETWEEN :from AND :to', { from, to })
      .groupBy('DATE(c.created_at)')
      .select(['DATE(c.created_at) as date', 'COUNT(c.id) as new_customers'])
      .orderBy('date', 'ASC')
      .getRawMany();
  }

  // legacy compat
  async getDailySummary(tenantId: number, date: string) {
    return this.getSummary(tenantId, date, date);
  }

  // Free basic report — today's sales + stock snapshot
  async getBasicReport(tenantId: number, from: string, to: string) {
    const sales = await this.saleRepo
      .createQueryBuilder('s')
      .where('s.tenant_id = :tenantId', { tenantId })
      .andWhere('DATE(s.created_at) BETWEEN :from AND :to', { from, to })
      .andWhere('s.status = :status', { status: 'completed' })
      .select([
        'COUNT(s.id) as total_sales',
        'COALESCE(SUM(s.total_amount), 0) as revenue',
        'COALESCE(SUM(s.discount), 0) as total_discount',
      ])
      .getRawOne();

    const stock = await this.productRepo
      .createQueryBuilder('p')
      .innerJoin('p.inventory', 'i')
      .where('p.tenant_id = :tenantId', { tenantId })
      .andWhere('p.is_active = true')
      .select([
        'COUNT(p.id) as total_products',
        'SUM(CASE WHEN i.quantity <= i.reorder_level THEN 1 ELSE 0 END) as low_stock',
        'SUM(CASE WHEN i.quantity <= 0 THEN 1 ELSE 0 END) as out_of_stock',
      ])
      .getRawOne();

    return { ...sales, ...stock };
  }
}
