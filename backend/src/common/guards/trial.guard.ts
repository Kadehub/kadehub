import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription } from '../../database/entities/subscription.entity';

@Injectable()
export class TrialGuard implements CanActivate {
  constructor(
    @InjectRepository(Subscription) private subRepo: Repository<Subscription>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;

    // SUPER_ADMIN bypasses trial check
    if (!user || user.role === 'SUPER_ADMIN') return true;

    const subs = await this.subRepo.find({ where: { tenant_id: user.tenant_id, status: 'active' } });
    if (!subs.length) throw new HttpException({ code: 'TRIAL_EXPIRED', message: 'Trial expired. Please subscribe.' }, HttpStatus.PAYMENT_REQUIRED);

    const now = new Date();
    const hasPaid = subs.some(s => s.payment_status === 'paid');
    if (hasPaid) return true;

    // All subs are trial — check if any is still valid
    const trialActive = subs.some(s => s.payment_status === 'trial' && (!s.expires_at || new Date(s.expires_at) > now));
    if (trialActive) return true;

    throw new HttpException({ code: 'TRIAL_EXPIRED', message: 'Your 14-day free trial has expired. Please choose a plan to continue.' }, HttpStatus.PAYMENT_REQUIRED);
  }
}
