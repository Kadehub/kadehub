import { Controller, Post, Get, Patch, Body, Param, Query, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { PosService } from './pos.service';
import { CreateSaleDto } from './pos.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TrialGuard } from '../../common/guards/trial.guard';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';
import { Module as SubModule } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('pos')
@UseGuards(JwtAuthGuard, TrialGuard, SubscriptionGuard)
@SubModule('pos')
export class PosController {
  constructor(private posService: PosService) {}

  @Post('sales')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  createSale(@CurrentUser() user: any, @Body() dto: CreateSaleDto) {
    return this.posService.createSale(user.tenant_id, user.sub, dto);
  }

  @Get('sales')
  getSales(@CurrentUser() user: any, @Query('date') date?: string) {
    return this.posService.getSales(user.tenant_id, date);
  }

  @Get('sales/:id/receipt')
  getReceipt(@CurrentUser() user: any, @Param('id') id: string) {
    return this.posService.getReceipt(+id, user.tenant_id);
  }

  @Patch('sales/:id/void')
  voidSale(@CurrentUser() user: any, @Param('id') id: string) {
    return this.posService.voidSale(+id, user.tenant_id);
  }
}
