import {
  Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, UsePipes, ValidationPipe, ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ProductGuard, Product } from '../../common/guards/product.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CodCap, CodCapabilityGuard } from './cod-capabilities';
import { CodExpensesService } from './cod-expenses.service';
import { SaveCodExpenseDto } from './cod.dto';

/** /api/cod/expenses… — business expenses (capability `expenses`). */
@Controller('cod')
@UseGuards(JwtAuthGuard, ProductGuard, CodCapabilityGuard)
@Product('cod')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class CodExpensesController {
  constructor(private expenses: CodExpensesService) {}

  @Get('expenses')
  @CodCap('expenses')
  list(@CurrentUser() u: any) {
    return this.expenses.listExpenses(u.tenant_id);
  }

  @Post('expenses')
  @CodCap('expenses')
  create(@CurrentUser() u: any, @Body() dto: SaveCodExpenseDto) {
    return this.expenses.createExpense(u.tenant_id, dto);
  }

  @Patch('expenses/:id')
  @CodCap('expenses')
  update(@CurrentUser() u: any, @Param('id', ParseIntPipe) id: number, @Body() dto: SaveCodExpenseDto) {
    return this.expenses.updateExpense(u.tenant_id, id, dto);
  }

  @Delete('expenses/:id')
  @CodCap('expenses')
  remove(@CurrentUser() u: any, @Param('id', ParseIntPipe) id: number) {
    return this.expenses.deleteExpense(u.tenant_id, id);
  }
}
