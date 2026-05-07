import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../../database/entities/customer.entity';
import { AppEventEmitter, SALE_COMPLETED } from '../../common/events/app-event-emitter';
import { CreateCustomerDto } from './customer.dto';

const POINTS_PER_100 = 1;

@Injectable()
export class CustomerService implements OnModuleInit {
  constructor(
    @InjectRepository(Customer) private customerRepo: Repository<Customer>,
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

  async getCustomer(id: number, tenantId: number) {
    return this.customerRepo.findOne({ where: { id, tenant_id: tenantId } });
  }
}
