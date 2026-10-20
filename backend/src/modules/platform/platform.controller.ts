import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { PlatformService } from './platform.service';
import { ProductAccessService } from './product-access.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('platform')
export class PlatformController {
  constructor(private platformService: PlatformService, private access: ProductAccessService) {}

  @Get('products')
  listProducts() {
    return this.platformService.listProducts();
  }

  @Get('my-products')
  @UseGuards(JwtAuthGuard)
  myProducts(@CurrentUser() user: any) {
    return this.platformService.myProducts(user);
  }

  /** Lets an existing account start using another product (e.g. a POS shop turning on COD). */
  @Post('enable/:product')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async enable(@CurrentUser() user: any, @Param('product') product: string) {
    await this.access.enableProduct(user.tenant_id, product);
    return this.platformService.myProducts(user);
  }
}
