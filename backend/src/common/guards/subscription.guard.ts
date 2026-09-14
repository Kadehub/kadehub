import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reflector } from '@nestjs/core';
import { Subscription } from '../../database/entities/subscription.entity';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectRepository(Subscription)
    private subRepo: Repository<Subscription>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const module = this.reflector.getAllAndOverride<string>('module', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!module) return true;
    const { user } = context.switchToHttp().getRequest();
    if (user?.role === 'SUPER_ADMIN') return true;
    const sub = await this.subRepo.findOne({
      where: { tenant_id: user.tenant_id, module_name: module, status: 'active' },
    });
    if (!sub) throw new ForbiddenException(`Module '${module}' not active for your subscription`);
    return true;
  }
}
