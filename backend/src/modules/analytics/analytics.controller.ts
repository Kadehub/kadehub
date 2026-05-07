import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  private dates(from?: string, to?: string) {
    const today = new Date().toISOString().split('T')[0];
    return { from: from || today, to: to || today };
  }

  @Get('summary')
  summary(@CurrentUser() u: any, @Query('from') from?: string, @Query('to') to?: string) {
    const d = this.dates(from, to);
    return this.analyticsService.getSummary(u.tenant_id, d.from, d.to);
  }

  @Get('revenue')
  revenue(@CurrentUser() u: any, @Query('from') from?: string, @Query('to') to?: string, @Query('groupBy') groupBy?: string) {
    const d = this.dates(from, to);
    return this.analyticsService.getRevenueByPeriod(u.tenant_id, d.from, d.to, (groupBy as any) || 'day');
  }

  @Get('hourly')
  hourly(@CurrentUser() u: any, @Query('from') from?: string, @Query('to') to?: string) {
    const d = this.dates(from, to);
    return this.analyticsService.getHourlySales(u.tenant_id, d.from, d.to);
  }

  @Get('recent-sales')
  recentSales(@CurrentUser() u: any, @Query('from') from?: string, @Query('to') to?: string, @Query('limit') limit?: string) {
    const d = this.dates(from, to);
    return this.analyticsService.getRecentSales(u.tenant_id, d.from, d.to, limit ? +limit : 50);
  }

  @Get('top-products')
  topProducts(@CurrentUser() u: any, @Query('from') from?: string, @Query('to') to?: string, @Query('limit') limit?: string) {
    const d = this.dates(from, to);
    return this.analyticsService.getTopProducts(u.tenant_id, d.from, d.to, limit ? +limit : 15);
  }

  @Get('category-breakdown')
  categoryBreakdown(@CurrentUser() u: any, @Query('from') from?: string, @Query('to') to?: string) {
    const d = this.dates(from, to);
    return this.analyticsService.getCategoryBreakdown(u.tenant_id, d.from, d.to);
  }

  @Get('stock-report')
  stockReport(@CurrentUser() u: any) {
    return this.analyticsService.getStockReport(u.tenant_id);
  }

  @Get('stock-value')
  stockValue(@CurrentUser() u: any) {
    return this.analyticsService.getStockValueSummary(u.tenant_id);
  }

  @Get('customer-summary')
  customerSummary(@CurrentUser() u: any, @Query('from') from?: string, @Query('to') to?: string) {
    const d = this.dates(from, to);
    return this.analyticsService.getCustomerSummary(u.tenant_id, d.from, d.to);
  }

  @Get('top-customers')
  topCustomers(@CurrentUser() u: any, @Query('from') from?: string, @Query('to') to?: string) {
    const d = this.dates(from, to);
    return this.analyticsService.getTopCustomers(u.tenant_id, d.from, d.to);
  }

  @Get('customer-growth')
  customerGrowth(@CurrentUser() u: any, @Query('from') from?: string, @Query('to') to?: string) {
    const d = this.dates(from, to);
    return this.analyticsService.getCustomerGrowth(u.tenant_id, d.from, d.to);
  }

  // legacy
  @Get('daily')
  daily(@CurrentUser() u: any, @Query('date') date?: string) {
    const today = new Date().toISOString().split('T')[0];
    return this.analyticsService.getDailySummary(u.tenant_id, date || today);
  }
}
