import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ProductAccessService } from '../../modules/platform/product-access.service';

export const PRODUCT_KEY = 'product';
/** Marks a controller/handler as belonging to a product; ProductGuard then requires access to it. */
export const Product = (slug: string) => SetMetadata(PRODUCT_KEY, slug);

/**
 * Use after JwtAuthGuard. Responds 402 when the account has no active subscription to the product
 * (never enabled, or trial expired) so product frontends can send the user to their billing page.
 * Attaches the subscription as `request.productAccess`.
 */
@Injectable()
export class ProductGuard implements CanActivate {
  constructor(private reflector: Reflector, private access: ProductAccessService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const product = this.reflector.getAllAndOverride<string>(PRODUCT_KEY, [context.getHandler(), context.getClass()]);
    if (!product) return true;
    const request = context.switchToHttp().getRequest();
    const { user } = request;
    if (user?.role === 'SUPER_ADMIN') return true;
    const sub = await this.access.getAccess(user.tenant_id, product);
    if (!sub) {
      throw new HttpException({ statusCode: 402, message: `No active ${product} subscription`, product }, HttpStatus.PAYMENT_REQUIRED);
    }
    request.productAccess = sub;
    return true;
  }
}
