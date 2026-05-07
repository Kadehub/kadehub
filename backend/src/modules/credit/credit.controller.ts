import { Controller, Get, Post, Body, Param, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { CreditService } from './credit.service';
import { CreateCreditSaleDto, RecordPaymentDto } from './credit.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('credit')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ whitelist: true }))
export class CreditController {
  constructor(private svc: CreditService) {}

  @Get() getAll(@CurrentUser() u: any) { return this.svc.getAll(u.tenant_id); }
  @Get('outstanding') getOutstanding(@CurrentUser() u: any) { return this.svc.getOutstanding(u.tenant_id); }
  @Get('summary') getSummary(@CurrentUser() u: any) { return this.svc.getSummary(u.tenant_id); }

  @Post() create(@CurrentUser() u: any, @Body() dto: CreateCreditSaleDto) {
    return this.svc.create(u.tenant_id, dto);
  }

  @Post(':id/pay') recordPayment(@CurrentUser() u: any, @Param('id') id: string, @Body() dto: RecordPaymentDto) {
    return this.svc.recordPayment(+id, u.tenant_id, dto);
  }
}
