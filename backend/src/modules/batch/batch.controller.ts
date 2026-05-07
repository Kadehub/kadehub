import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { BatchService } from './batch.service';
import { CreateBatchDto } from './batch.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('batches')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ whitelist: true }))
export class BatchController {
  constructor(private svc: BatchService) {}

  @Get() getAll(@CurrentUser() u: any) { return this.svc.getAll(u.tenant_id); }

  @Get('expiring') getExpiring(@CurrentUser() u: any, @Query('days') days?: string) {
    return this.svc.getExpiringSoon(u.tenant_id, days ? +days : 30);
  }

  @Get('expired') getExpired(@CurrentUser() u: any) { return this.svc.getExpired(u.tenant_id); }

  @Post() create(@CurrentUser() u: any, @Body() dto: CreateBatchDto) {
    return this.svc.create(u.tenant_id, dto);
  }

  @Delete(':id') delete(@CurrentUser() u: any, @Param('id') id: string) {
    return this.svc.delete(+id, u.tenant_id);
  }
}
