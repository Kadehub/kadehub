import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query,
  UseGuards, UsePipes, ValidationPipe, ForbiddenException, Res,
} from '@nestjs/common';
import { Response } from 'express';
import {
  SuperAdminService, BlockTenantDto, ChangePlanDto,
  CreateCouponDto, CreateAnnouncementDto, UpdateAnnouncementDto,
} from './super-admin.service';
import { BillingService } from '../billing/billing.service';
import { UpdateBankDetailsDto, RejectBankTransferDto } from '../billing/billing.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('super-admin')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ whitelist: true }))
export class SuperAdminController {
  constructor(private service: SuperAdminService, private billing: BillingService) {}

  private guard(user: any) {
    if (user.role !== 'SUPER_ADMIN') throw new ForbiddenException('Super admin only');
  }

  // ── Dashboard ──────────────────────────────────────────────────────────────
  @Get('stats')
  stats(@CurrentUser() u: any) { this.guard(u); return this.service.getPlatformStats(); }

  // ── Shops ──────────────────────────────────────────────────────────────────
  @Get('shops')
  listShops(@CurrentUser() u: any, @Query('page') page = '1', @Query('limit') limit = '20', @Query('search') search?: string) {
    this.guard(u); return this.service.listShops(+page, +limit, search);
  }

  @Get('shops/:id')
  shopDetail(@CurrentUser() u: any, @Param('id') id: string) {
    this.guard(u); return this.service.getShopDetail(+id);
  }

  @Patch('shops/:id/status')
  setStatus(@CurrentUser() u: any, @Param('id') id: string, @Body() dto: BlockTenantDto) {
    this.guard(u); return this.service.setTenantStatus(+id, dto);
  }

  @Patch('shops/:id/plan')
  changePlan(@CurrentUser() u: any, @Param('id') id: string, @Body() dto: ChangePlanDto) {
    this.guard(u); return this.service.changePlan(+id, dto);
  }

  @Delete('shops/:id')
  deleteShop(@CurrentUser() u: any, @Param('id') id: string) {
    this.guard(u); return this.service.deleteTenant(+id);
  }

  // ── Transactions ───────────────────────────────────────────────────────────
  @Get('transactions')
  transactions(@CurrentUser() u: any, @Query('page') page = '1', @Query('limit') limit = '20') {
    this.guard(u); return this.service.getAllTransactions(+page, +limit);
  }

  @Get('transactions/export/csv')
  async exportCsv(@CurrentUser() u: any, @Res() res: Response) {
    this.guard(u);
    const csv = await this.service.getTransactionsCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="transactions-${Date.now()}.csv"`);
    res.send(csv);
  }

  @Get('transactions/:id/invoice')
  getInvoice(@CurrentUser() u: any, @Param('id') id: string) {
    this.guard(u); return this.service.getInvoiceData(+id);
  }

  // ── Bank transfer slips ────────────────────────────────────────────────────
  @Get('bank-transfers')
  bankTransfers(@CurrentUser() u: any, @Query('status') status?: string) {
    this.guard(u); return this.billing.listBankTransfers(status);
  }

  @Get('bank-transfers/pending-count')
  pendingSlipCount(@CurrentUser() u: any) {
    this.guard(u); return this.billing.countPendingBankTransfers().then(count => ({ count }));
  }

  @Patch('bank-transfers/:id/approve')
  approveSlip(@CurrentUser() u: any, @Param('id') id: string) {
    this.guard(u); return this.billing.approveBankTransfer(+id);
  }

  @Patch('bank-transfers/:id/reject')
  rejectSlip(@CurrentUser() u: any, @Param('id') id: string, @Body() dto: RejectBankTransferDto) {
    this.guard(u); return this.billing.rejectBankTransfer(+id, dto.reason);
  }

  @Get('bank-details')
  getBankDetails(@CurrentUser() u: any) {
    this.guard(u); return this.billing.getPaymentOptions();
  }

  @Patch('bank-details')
  updateBankDetails(@CurrentUser() u: any, @Body() dto: UpdateBankDetailsDto) {
    this.guard(u); return this.billing.updateBankDetails(dto);
  }

  // ── Packages ───────────────────────────────────────────────────────────────
  @Get('packages')
  packages(@CurrentUser() u: any) { this.guard(u); return this.service.getPackages(); }

  // ── Coupons ────────────────────────────────────────────────────────────────
  @Get('coupons')
  getCoupons(@CurrentUser() u: any) { this.guard(u); return this.service.getCoupons(); }

  @Post('coupons')
  createCoupon(@CurrentUser() u: any, @Body() dto: CreateCouponDto) {
    this.guard(u); return this.service.createCoupon(dto);
  }

  @Patch('coupons/:id/toggle')
  toggleCoupon(@CurrentUser() u: any, @Param('id') id: string) {
    this.guard(u); return this.service.toggleCoupon(+id);
  }

  @Delete('coupons/:id')
  deleteCoupon(@CurrentUser() u: any, @Param('id') id: string) {
    this.guard(u); return this.service.deleteCoupon(+id);
  }

  @Get('coupons/validate/:code')
  validateCoupon(@CurrentUser() u: any, @Param('code') code: string) {
    this.guard(u); return this.service.validateCoupon(code);
  }

  // ── Announcements ──────────────────────────────────────────────────────────
  @Get('announcements/active')
  getActiveAnnouncements() { return this.service.getAnnouncements(true); }

  @Get('announcements')
  getAnnouncements(@CurrentUser() u: any) { this.guard(u); return this.service.getAnnouncements(); }

  @Post('announcements')
  createAnnouncement(@CurrentUser() u: any, @Body() dto: CreateAnnouncementDto) {
    this.guard(u); return this.service.createAnnouncement(dto);
  }

  @Patch('announcements/:id')
  updateAnnouncement(@CurrentUser() u: any, @Param('id') id: string, @Body() dto: UpdateAnnouncementDto) {
    this.guard(u); return this.service.updateAnnouncement(+id, dto);
  }

  @Delete('announcements/:id')
  deleteAnnouncement(@CurrentUser() u: any, @Param('id') id: string) {
    this.guard(u); return this.service.deleteAnnouncement(+id);
  }

  // ── API Monitor ────────────────────────────────────────────────────────────
  @Get('api-monitor')
  apiMonitor(@CurrentUser() u: any, @Query('hours') hours = '24') {
    this.guard(u); return this.service.getApiStats(+hours);
  }
}
