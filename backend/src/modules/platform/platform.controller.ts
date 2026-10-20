import { Controller, Get, Post, Patch, Param, Body, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { PlatformService } from './platform.service';
import { ProductAccessService } from './product-access.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ChangeAccountPasswordDto, UpdateAccountDto } from './platform.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('platform')
@UsePipes(new ValidationPipe({ whitelist: true }))
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

  /** One KadeHub account: profile, business and every product's subscription state. */
  @Get('account')
  @UseGuards(JwtAuthGuard)
  account(@CurrentUser() user: any) {
    return this.platformService.account(user);
  }

  @Patch('account')
  @UseGuards(JwtAuthGuard)
  updateAccount(@CurrentUser() user: any, @Body() dto: UpdateAccountDto) {
    return this.platformService.updateAccount(user, dto);
  }

  @Post('account/password')
  @UseGuards(JwtAuthGuard)
  changePassword(@CurrentUser() user: any, @Body() dto: ChangeAccountPasswordDto) {
    return this.platformService.changePassword(user, dto);
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
