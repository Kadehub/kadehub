import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { CreateCustomerDto, UpdateCustomerDto } from './customer.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TrialGuard } from '../../common/guards/trial.guard';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';
import { Module as SubModule } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('customers')
@UseGuards(JwtAuthGuard, TrialGuard, SubscriptionGuard)
@SubModule('customer')
@UsePipes(new ValidationPipe({ whitelist: true }))
export class CustomerController {
  constructor(private customerService: CustomerService) {}

  @Get()
  getAll(@CurrentUser() user: any) {
    return this.customerService.getCustomers(user.tenant_id);
  }

  @Get('search')
  findByPhone(@CurrentUser() user: any, @Query('phone') phone: string) {
    return this.customerService.findByPhone(user.tenant_id, phone);
  }

  @Get(':id')
  getOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.customerService.getCustomer(+id, user.tenant_id);
  }

  @Get(':id/purchases')
  getPurchases(@CurrentUser() user: any, @Param('id') id: string) {
    return this.customerService.getPurchaseHistory(+id, user.tenant_id);
  }

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateCustomerDto) {
    return this.customerService.createCustomer(user.tenant_id, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.customerService.updateCustomer(+id, user.tenant_id, dto);
  }
}
