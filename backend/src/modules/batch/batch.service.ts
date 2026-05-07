import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Batch } from '../../database/entities/batch.entity';
import { CreateBatchDto } from './batch.dto';

@Injectable()
export class BatchService {
  constructor(@InjectRepository(Batch) private repo: Repository<Batch>) {}

  getAll(tenantId: number) {
    return this.repo.find({
      where: { tenant_id: tenantId },
      relations: ['product'],
      order: { expiry_date: 'ASC' },
    });
  }

  getExpiringSoon(tenantId: number, days = 30) {
    const future = new Date();
    future.setDate(future.getDate() + days);
    const today = new Date().toISOString().split('T')[0];
    const limit = future.toISOString().split('T')[0];
    return this.repo.createQueryBuilder('b')
      .leftJoin('b.product', 'p')
      .where('b.tenant_id = :tenantId', { tenantId })
      .andWhere('b.expiry_date IS NOT NULL')
      .andWhere('b.expiry_date BETWEEN :today AND :limit', { today, limit })
      .andWhere('b.quantity > 0')
      .select(['b.id', 'b.batch_number', 'b.quantity', 'b.expiry_date', 'p.id', 'p.name', 'p.category'])
      .orderBy('b.expiry_date', 'ASC')
      .getRawMany();
  }

  getExpired(tenantId: number) {
    const today = new Date().toISOString().split('T')[0];
    return this.repo.createQueryBuilder('b')
      .leftJoin('b.product', 'p')
      .where('b.tenant_id = :tenantId', { tenantId })
      .andWhere('b.expiry_date < :today', { today })
      .andWhere('b.quantity > 0')
      .select(['b.id', 'b.batch_number', 'b.quantity', 'b.expiry_date', 'p.id', 'p.name', 'p.category'])
      .orderBy('b.expiry_date', 'ASC')
      .getRawMany();
  }

  create(tenantId: number, dto: CreateBatchDto) {
    return this.repo.save(this.repo.create({ tenant_id: tenantId, ...dto }));
  }

  delete(id: number, tenantId: number) {
    return this.repo.delete({ id, tenant_id: tenantId });
  }
}
