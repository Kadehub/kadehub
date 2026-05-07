import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Discount } from '../../database/entities/discount.entity';
import { CreateDiscountDto, UpdateDiscountDto } from './discount.dto';

@Injectable()
export class DiscountService {
  constructor(@InjectRepository(Discount) private repo: Repository<Discount>) {}

  getAll(tenantId: number) {
    return this.repo.find({ where: { tenant_id: tenantId }, order: { created_at: 'DESC' } });
  }

  getActive(tenantId: number, cartTotal: number) {
    const today = new Date().toISOString().split('T')[0];
    return this.repo.createQueryBuilder('d')
      .where('d.tenant_id = :tenantId', { tenantId })
      .andWhere('d.is_active = true')
      .andWhere('d.min_purchase <= :cartTotal', { cartTotal })
      .andWhere('(d.valid_from IS NULL OR d.valid_from <= :today)', { today })
      .andWhere('(d.valid_to IS NULL OR d.valid_to >= :today)', { today })
      .getMany();
  }

  create(tenantId: number, dto: CreateDiscountDto) {
    return this.repo.save(this.repo.create({ tenant_id: tenantId, ...dto }));
  }

  async update(id: number, tenantId: number, dto: UpdateDiscountDto) {
    const d = await this.repo.findOne({ where: { id, tenant_id: tenantId } });
    if (!d) throw new NotFoundException('Discount not found');
    Object.assign(d, dto);
    return this.repo.save(d);
  }

  delete(id: number, tenantId: number) {
    return this.repo.delete({ id, tenant_id: tenantId });
  }
}
