import {
  Controller, Get, Post, Patch, Param, Body, Query,
  UseGuards, UsePipes, ValidationPipe, ForbiddenException,
} from '@nestjs/common';
import { QuotationService } from './quotation.service';
import { CreateQuotationDto, UpdateQuotationDto } from './quotation.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller()
@UsePipes(new ValidationPipe({ whitelist: true }))
export class QuotationController {
  constructor(private service: QuotationService) {}

  /** Public — landing page quote form */
  @Post('quotations')
  createPublic(@Body() dto: CreateQuotationDto) {
    return this.service.createPublic(dto);
  }

  private guard(user: any) {
    if (user.role !== 'SUPER_ADMIN') throw new ForbiddenException('Super admin only');
  }

  @Get('super-admin/quotations')
  @UseGuards(JwtAuthGuard)
  list(@CurrentUser() u: any, @Query('page') page = '1', @Query('limit') limit = '20', @Query('status') status?: string) {
    this.guard(u);
    return this.service.list(+page, +limit, status);
  }

  @Get('super-admin/quotations/new-count')
  @UseGuards(JwtAuthGuard)
  newCount(@CurrentUser() u: any) {
    this.guard(u);
    return this.service.countNew().then(count => ({ count }));
  }

  @Get('super-admin/quotations/:id')
  @UseGuards(JwtAuthGuard)
  getOne(@CurrentUser() u: any, @Param('id') id: string) {
    this.guard(u);
    return this.service.getById(+id);
  }

  @Patch('super-admin/quotations/:id')
  @UseGuards(JwtAuthGuard)
  update(@CurrentUser() u: any, @Param('id') id: string, @Body() dto: UpdateQuotationDto) {
    this.guard(u);
    return this.service.update(+id, dto);
  }

  @Post('super-admin/quotations/:id/send')
  @UseGuards(JwtAuthGuard)
  send(@CurrentUser() u: any, @Param('id') id: string) {
    this.guard(u);
    return this.service.sendToClient(+id);
  }
}
