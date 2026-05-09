import { Controller, Get, Post, Patch, Body, Param, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { SupplierService } from './supplier.service';
import { CreateSupplierDto, UpdateSupplierDto, CreatePurchaseOrderDto } from './supplier.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TrialGuard } from '../../common/guards/trial.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('suppliers')
@UseGuards(JwtAuthGuard, RolesGuard, TrialGuard)
@UsePipes(new ValidationPipe({ whitelist: true }))
export class SupplierController {
  constructor(private svc: SupplierService) {}

  @Get() getAll(@CurrentUser() u: any) { return this.svc.getSuppliers(u.tenant_id); }

  @Post() @Roles('ADMIN') create(@CurrentUser() u: any, @Body() dto: CreateSupplierDto) {
    return this.svc.createSupplier(u.tenant_id, dto);
  }

  @Patch(':id') @Roles('ADMIN') update(@CurrentUser() u: any, @Param('id') id: string, @Body() dto: UpdateSupplierDto) {
    return this.svc.updateSupplier(+id, u.tenant_id, dto);
  }

  @Get('orders') getOrders(@CurrentUser() u: any) { return this.svc.getOrders(u.tenant_id); }

  @Post('orders') @Roles('ADMIN') createOrder(@CurrentUser() u: any, @Body() dto: CreatePurchaseOrderDto) {
    return this.svc.createOrder(u.tenant_id, u.sub, dto);
  }

  @Patch('orders/:id/receive') @Roles('ADMIN') receive(@CurrentUser() u: any, @Param('id') id: string) {
    return this.svc.receiveOrder(+id, u.tenant_id);
  }

  @Patch('orders/:id/cancel') @Roles('ADMIN') cancel(@CurrentUser() u: any, @Param('id') id: string) {
    return this.svc.cancelOrder(+id, u.tenant_id);
  }
}
