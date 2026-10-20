import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription } from '../../database/entities/subscription.entity';
import { PRODUCTS } from '../../common/products';

@Injectable()
export class PlatformService {
  constructor(@InjectRepository(Subscription) private subRepo: Repository<Subscription>) {}

  listProducts() {
    return PRODUCTS;
  }

  /** Registry plus whether the caller's account has an active subscription to each product. */
  async myProducts(user: { tenant_id: number; role: string }) {
    if (user.role === 'SUPER_ADMIN') return PRODUCTS.map(p => ({ ...p, enabled: true }));
    const rows: Array<{ product: string }> = await this.subRepo
      .createQueryBuilder('s')
      .select('DISTINCT s.product', 'product')
      .where('s.tenant_id = :tid', { tid: user.tenant_id })
      .andWhere('s.status = :status', { status: 'active' })
      .getRawMany();
    const enabled = new Set(rows.map(r => r.product));
    return PRODUCTS.map(p => ({ ...p, enabled: enabled.has(p.slug) }));
  }
}
