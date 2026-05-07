import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { DiscountService } from './discount.service';
import { CreateDiscountDto, UpdateDiscountDto } from './discount.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('discounts')
@UseGuards(JwtAuthGuard, RolesGuard)
@UsePipes(new ValidationPipe({ whitelist: true }))
export class DiscountController {
  constructor(private svc: DiscountService) {}

  @Get() getAll(@CurrentUser() u: any) { return this.svc.getAll(u.tenant_id); }

  @Get('active') getActive(@CurrentUser() u: any, @Query('total') total?: string) {
    return this.svc.getActive(u.tenant_id, total ? +total : 0);
  }

  @Post() @Roles('ADMIN') create(@CurrentUser() u: any, @Body() dto: CreateDiscountDto) {
    return this.svc.create(u.tenant_id, dto);
  }

  @Patch(':id') @Roles('ADMIN') update(@CurrentUser() u: any, @Param('id') id: string, @Body() dto: UpdateDiscountDto) {
    return this.svc.update(+id, u.tenant_id, dto);
  }

  @Delete(':id') @Roles('ADMIN') delete(@CurrentUser() u: any, @Param('id') id: string) {
    return this.svc.delete(+id, u.tenant_id);
  }
}
