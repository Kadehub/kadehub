import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../../database/entities/customer.entity';
import { Sale } from '../../database/entities/sale.entity';
import { AppEventEmitter, SALE_COMPLETED } from '../../common/events/app-event-emitter';
import { CreateCustomerDto, UpdateCustomerDto } from './customer.dto';

const POINTS_PER_100 = 1;

@Injectable()
export class CustomerService implements OnModuleInit {
  constructor(
    @InjectRepository(Customer) private customerRepo: Repository<Customer>,
    @InjectRepository(Sale) private saleRepo: Repository<Sale>,
    private events: AppEventEmitter,
  ) {}

  onModuleInit() {
    this.events.on(SALE_COMPLETED, async ({ customer_id, total }: { customer_id: number; total: number }) => {
      if (!customer_id) return;
      const points = Math.floor(total / 100) * POINTS_PER_100;
      if (points > 0) await this.customerRepo.increment({ id: customer_id }, 'loyalty_points', points);
    });
  }

  async getCustomers(tenantId: number) {
    return this.customerRepo.find({ where: { tenant_id: tenantId }, order: { name: 'ASC' } });
  }

  async findByPhone(tenantId: number, phone: string) {
    return this.customerRepo.findOne({ where: { tenant_id: tenantId, phone } });
  }

  async createCustomer(tenantId: number, dto: CreateCustomerDto) {
    const customer = this.customerRepo.create({ tenant_id: tenantId, ...dto });
    return this.customerRepo.save(customer);
  }

  async updateCustomer(id: number, tenantId: number, dto: UpdateCustomerDto) {
    const customer = await this.customerRepo.findOne({ where: { id, tenant_id: tenantId } });
    if (!customer) throw new NotFoundException('Customer not found');
    Object.assign(customer, dto);
    return this.customerRepo.save(customer);
  }

  async getCustomer(id: number, tenantId: number) {
    return this.customerRepo.findOne({ where: { id, tenant_id: tenantId } });
  }

  async getPurchaseHistory(customerId: number, tenantId: number) {
    return this.saleRepo.createQueryBuilder('s')
      .where('s.tenant_id = :tenantId', { tenantId })
      .andWhere('s.customer_id = :customerId', { customerId })
      .select(['s.id as id', 's.total_amount as total_amount', 's.discount as discount',
        's.payment_method as payment_method', 's.status as status', 's.created_at as created_at'])
      .orderBy('s.created_at', 'DESC')
      .limit(50)
      .getRawMany();
  }
}
