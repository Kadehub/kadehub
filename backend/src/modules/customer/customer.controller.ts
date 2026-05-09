import { Controller, Get, Post, Body, Param, Query, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { CreateCustomerDto } from './customer.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TrialGuard } from '../../common/guards/trial.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('customers')
@UseGuards(JwtAuthGuard, TrialGuard)
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

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateCustomerDto) {
    return this.customerService.createCustomer(user.tenant_id, dto);
  }
}
