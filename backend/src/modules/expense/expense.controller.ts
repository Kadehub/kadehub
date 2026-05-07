import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { ExpenseService } from './expense.service';
import { CreateExpenseDto } from './expense.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('expenses')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ whitelist: true }))
export class ExpenseController {
  constructor(private svc: ExpenseService) {}

  private dates(from?: string, to?: string) {
    const today = new Date().toISOString().split('T')[0];
    return { from: from || today, to: to || today };
  }

  @Get() getAll(@CurrentUser() u: any, @Query('from') from?: string, @Query('to') to?: string) {
    const d = this.dates(from, to);
    return this.svc.getExpenses(u.tenant_id, d.from, d.to);
  }

  @Get('summary') getSummary(@CurrentUser() u: any, @Query('from') from?: string, @Query('to') to?: string) {
    const d = this.dates(from, to);
    return this.svc.getSummary(u.tenant_id, d.from, d.to);
  }

  @Post() create(@CurrentUser() u: any, @Body() dto: CreateExpenseDto) {
    return this.svc.create(u.tenant_id, u.sub, dto);
  }

  @Delete(':id') delete(@CurrentUser() u: any, @Param('id') id: string) {
    return this.svc.delete(+id, u.tenant_id);
  }
}
