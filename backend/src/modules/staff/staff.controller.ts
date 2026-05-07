import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { StaffService } from './staff.service';
import { OpenShiftDto, CloseShiftDto } from './staff.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('staff')
@UseGuards(JwtAuthGuard, RolesGuard)
@UsePipes(new ValidationPipe({ whitelist: true }))
export class StaffController {
  constructor(private svc: StaffService) {}

  private dates(from?: string, to?: string) {
    const today = new Date().toISOString().split('T')[0];
    return { from: from || today, to: to || today };
  }

  @Get('audit') @Roles('ADMIN') getAudit(@CurrentUser() u: any, @Query('from') from?: string, @Query('to') to?: string) {
    const d = this.dates(from, to);
    return this.svc.getAuditLogs(u.tenant_id, d.from, d.to);
  }

  @Get('shifts') getShifts(@CurrentUser() u: any) { return this.svc.getShifts(u.tenant_id); }

  @Post('shifts') openShift(@CurrentUser() u: any, @Body() dto: OpenShiftDto) {
    return this.svc.openShift(u.tenant_id, u.sub, dto);
  }

  @Patch('shifts/:id/close') closeShift(@CurrentUser() u: any, @Param('id') id: string, @Body() dto: CloseShiftDto) {
    return this.svc.closeShift(+id, u.tenant_id, dto);
  }

  @Get('shifts/:id/report') getShiftReport(@CurrentUser() u: any, @Param('id') id: string) {
    return this.svc.getShiftReport(+id, u.tenant_id);
  }

  @Get('performance') @Roles('ADMIN') getPerformance(@CurrentUser() u: any, @Query('from') from?: string, @Query('to') to?: string) {
    const d = this.dates(from, to);
    return this.svc.getCashierPerformance(u.tenant_id, d.from, d.to);
  }
}
