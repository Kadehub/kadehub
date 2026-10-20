import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * What each KadeHub role may do inside COD.
 * Keep in sync with frontend/src/lib/cod/capabilities.ts (the UI uses it to hide actions; this file is the real check).
 *
 * KadeHub has two tenant roles: ADMIN (the account owner) and CASHIER (staff). SUPER_ADMIN can do everything.
 */
export type CodCapability =
  | 'orders_create'    // create / edit / delete orders
  | 'orders_status'    // change order status, print labels
  | 'credit'           // record / delete credit payments
  | 'costs'            // see landed cost and profit
  | 'expenses'         // business expenses
  | 'reports'          // reports and the dashboard
  | 'personal_finance'; // the owner's personal expenses, budget and remaining cash

export const ALL_COD_CAPABILITIES: CodCapability[] = [
  'orders_create', 'orders_status', 'credit', 'costs', 'expenses', 'reports', 'personal_finance',
];

export const ROLE_CAPABILITIES: Record<string, CodCapability[]> = {
  ADMIN: ALL_COD_CAPABILITIES,
  CASHIER: ['orders_create', 'orders_status', 'credit'],
};

export function hasCodCapability(role: string | undefined, cap: CodCapability): boolean {
  if (role === 'SUPER_ADMIN') return true;
  return (ROLE_CAPABILITIES[role ?? ''] ?? []).includes(cap);
}

export const COD_CAPS_KEY = 'cod_caps';
/** Require at least one of these capabilities for a handler or controller. */
export const CodCap = (...caps: CodCapability[]) => SetMetadata(COD_CAPS_KEY, caps);

/** Use after JwtAuthGuard. 403 with a plain message when the user's role lacks the capability. */
@Injectable()
export class CodCapabilityGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const caps = this.reflector.getAllAndOverride<CodCapability[]>(COD_CAPS_KEY, [context.getHandler(), context.getClass()]);
    if (!caps?.length) return true;
    const { user } = context.switchToHttp().getRequest();
    if (caps.some(c => hasCodCapability(user?.role, c))) return true;
    throw new ForbiddenException('You don’t have permission to do this. Ask the account owner.');
  }
}
