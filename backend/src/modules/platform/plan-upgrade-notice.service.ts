import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { PlanUpgradeNotice } from '../../database/entities/plan-upgrade-notice.entity';
import { PRODUCTS } from '../../common/products';

/** An upgrade means paying more per month. Renewals, downgrades and one-off top-ups aren't worth congratulating. */
export function isPlanUpgrade(
  next: { slug?: string | null; price_monthly: number | string },
  previous: { price_monthly: number | string } | null | undefined,
): boolean {
  if (next.slug?.includes('topup')) return false;
  return Number(next.price_monthly) > Number(previous?.price_monthly ?? 0);
}

@Injectable()
export class PlanUpgradeNoticeService {
  constructor(@InjectRepository(PlanUpgradeNotice) private repo: Repository<PlanUpgradeNotice>) {}

  /** Called on every plan a super admin sets. Any notice not yet seen is out of date now, so it's replaced. */
  async planChanged(
    tenantId: number,
    product: string,
    next: { slug?: string | null; name: string; price_monthly: number | string },
    previous: { price_monthly: number | string } | null | undefined,
    expiresAt: Date,
  ) {
    await this.repo.delete({ tenant_id: tenantId, product, seen_at: IsNull() });
    if (!isPlanUpgrade(next, previous)) return;
    await this.repo.insert({ tenant_id: tenantId, product, plan_name: next.name, expires_at: expiresAt, seen_at: null });
  }

  /**
   * Hands out the oldest unseen notice and marks it seen in the same step: the update only succeeds for one
   * caller, so two tabs or devices opening together can't both show it.
   */
  async claim(tenantId: number) {
    const notice = await this.repo.findOne({ where: { tenant_id: tenantId, seen_at: IsNull() }, order: { id: 'ASC' } });
    if (!notice) return null;
    const result = await this.repo.update({ id: notice.id, seen_at: IsNull() }, { seen_at: new Date() });
    if (!result.affected) return null;
    return {
      plan_name: notice.plan_name,
      product_name: PRODUCTS.find(p => p.slug === notice.product)?.name ?? 'KadeHub',
      expires_at: notice.expires_at,
    };
  }
}
