import {
  CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata, createParamDecorator,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { HrAccountService, type HrPlanState } from './hr-account.service';

/**
 * Who may do what in KadeHub Staff.
 *  - Owner: the account's ADMIN (and SUPER_ADMIN). Everything, every branch.
 *  - Branch manager: any other user of the account listed in hr_branch_manager. Only their branches,
 *    and never salaries, payroll, plans or settings.
 * Employees don't sign in during Phase 1; they use the kiosk with their PIN on a manager's device.
 */
export interface HrCtx {
  tenantId: number;
  userId: number;
  userName: string;
  owner: boolean;
  /** Branches this user may see; null = all of them. */
  branchIds: number[] | null;
  plan: HrPlanState;
}

const OWNER_ONLY = 'hr_owner_only';
/** Handler or controller only for the account owner (salaries, payroll, settings, plans). */
export const HrOwnerOnly = () => SetMetadata(OWNER_ONLY, true);

/** The HrCtx attached by HrGuard. */
export const Hr = createParamDecorator((_data: unknown, ctx: ExecutionContext): HrCtx => ctx.switchToHttp().getRequest().hr);

/** Use after JwtAuthGuard. 403 with a stable code when Staff isn't on, or the user has no role in it. */
@Injectable()
export class HrGuard implements CanActivate {
  constructor(private reflector: Reflector, private account: HrAccountService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const ctx = await this.account.context(request.user);
    if (!ctx) throw new ForbiddenException({ statusCode: 403, code: 'HR_NOT_ENABLED', message: 'KadeHub Staff is not enabled for this account' });
    if (!ctx.owner && ctx.branchIds?.length === 0) {
      throw new ForbiddenException({ statusCode: 403, code: 'HR_NO_ACCESS', message: 'Ask the account owner to make you a branch manager' });
    }
    const ownerOnly = this.reflector.getAllAndOverride<boolean>(OWNER_ONLY, [context.getHandler(), context.getClass()]);
    if (ownerOnly && !ctx.owner) throw new ForbiddenException({ statusCode: 403, code: 'HR_OWNER_ONLY', message: 'Only the account owner can do this' });
    request.hr = ctx;
    return true;
  }
}

/** 403 unless the user may work with this branch. Null branch (unassigned) is owner-only. */
export function assertBranch(ctx: HrCtx, branchId: number | null | undefined) {
  if (ctx.branchIds === null) return;
  if (branchId === null || branchId === undefined || !ctx.branchIds.includes(branchId)) {
    throw new ForbiddenException({ statusCode: 403, code: 'HR_BRANCH_FORBIDDEN', message: 'This branch is not one of yours' });
  }
}
