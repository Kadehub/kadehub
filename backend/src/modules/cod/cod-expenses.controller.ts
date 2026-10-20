import {
  Controller, Get, Post, Patch, Put, Delete, Body, Param, Query, UseGuards, UsePipes, ValidationPipe, ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ProductGuard, Product } from '../../common/guards/product.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CodCap, CodCapabilityGuard } from './cod-capabilities';
import { CodExpensesService } from './cod-expenses.service';
import { ExpenseRangeQuery, PersonalSettingsDto, SaveBusinessExpenseDto, SavePersonalExpenseDto } from './cod-expenses.dto';

/**
 * /api/cod/expenses…           business expenses (capability `expenses`)
 * /api/cod/personal-expenses…  the owner's personal expenses (capability `personal_finance`, admin only)
 * /api/cod/personal-settings   monthly personal budget (capability `personal_finance`)
 * Create/update answer `{ id, expense }`, or `{ duplicate: true, error }` when a lookalike exists
 * and `allow_duplicate` wasn't sent.
 */
@Controller('cod')
@UseGuards(JwtAuthGuard, ProductGuard, CodCapabilityGuard)
@Product('cod')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class CodExpensesController {
  constructor(private expenses: CodExpensesService) {}

  // ── business ──
  @Get('expenses')
  @CodCap('expenses')
  list(@CurrentUser() u: any, @Query() q: ExpenseRangeQuery) {
    return this.expenses.listExpenses(u.tenant_id, q.from, q.to);
  }

  @Post('expenses')
  @CodCap('expenses')
  create(@CurrentUser() u: any, @Body() dto: SaveBusinessExpenseDto) {
    return this.expenses.createExpense(u, dto);
  }

  @Patch('expenses/:id')
  @CodCap('expenses')
  update(@CurrentUser() u: any, @Param('id', ParseIntPipe) id: number, @Body() dto: SaveBusinessExpenseDto) {
    return this.expenses.updateExpense(u, id, dto);
  }

  @Delete('expenses/:id')
  @CodCap('expenses')
  remove(@CurrentUser() u: any, @Param('id', ParseIntPipe) id: number) {
    return this.expenses.deleteExpense(u, id);
  }

  // ── personal (admin only) ──
  @Get('personal-expenses')
  @CodCap('personal_finance')
  listPersonal(@CurrentUser() u: any, @Query() q: ExpenseRangeQuery) {
    return this.expenses.listPersonal(u.tenant_id, q.from, q.to);
  }

  @Post('personal-expenses')
  @CodCap('personal_finance')
  createPersonal(@CurrentUser() u: any, @Body() dto: SavePersonalExpenseDto) {
    return this.expenses.createPersonal(u, dto);
  }

  @Patch('personal-expenses/:id')
  @CodCap('personal_finance')
  updatePersonal(@CurrentUser() u: any, @Param('id', ParseIntPipe) id: number, @Body() dto: SavePersonalExpenseDto) {
    return this.expenses.updatePersonal(u, id, dto);
  }

  @Delete('personal-expenses/:id')
  @CodCap('personal_finance')
  removePersonal(@CurrentUser() u: any, @Param('id', ParseIntPipe) id: number) {
    return this.expenses.deletePersonal(u, id);
  }

  @Get('personal-settings')
  @CodCap('personal_finance')
  settings(@CurrentUser() u: any) {
    return this.expenses.getSettings(u.tenant_id);
  }

  @Put('personal-settings')
  @CodCap('personal_finance')
  saveSettings(@CurrentUser() u: any, @Body() dto: PersonalSettingsDto) {
    return this.expenses.saveSettings(u, dto);
  }
}
