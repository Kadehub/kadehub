import { Controller, Post, Get, Body, Param, Query, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { PosService } from './pos.service';
import { CreateSaleDto } from './pos.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('pos')
@UseGuards(JwtAuthGuard)
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
}
