import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!roles) return true;
    const { user } = context.switchToHttp().getRequest();
    // SUPER_ADMIN bypasses all role checks
    if (user.role === 'SUPER_ADMIN') return true;
    if (!roles.includes(user.role)) throw new ForbiddenException('Insufficient permissions');
    return true;
  }
}
