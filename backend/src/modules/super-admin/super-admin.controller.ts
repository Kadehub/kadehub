import {
  Controller, Get, Post, Put, Patch, Delete, Param, Body, Query,
  UseGuards, UsePipes, ValidationPipe, ForbiddenException, Res,
} from '@nestjs/common';
import { Response } from 'express';
import {
  SuperAdminService, BlockTenantDto, ChangePlanDto, SetPackageProductDto,
  CreateCouponDto, CreateAnnouncementDto, UpdateAnnouncementDto,
} from './super-admin.service';
import {
  SuperAdminOpsService, SavePackageDto, ResetPasswordDto, ChangeEmailDto, SetDisabledDto, TasksBanDto,
  AddAdminDto, ChangeOwnPasswordDto, CodFilter,
} from './super-admin-ops.service';
import { BillingService } from '../billing/billing.service';
import { InvoiceService } from '../billing/invoice.service';
import { getPlatformCompany, savePlatformCompany } from '../../common/platform-company';
import { UpdateBankDetailsDto, RejectBankTransferDto } from '../billing/billing.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('super-admin')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ whitelist: true }))
export class SuperAdminController {
  constructor(
    private service: SuperAdminService, private ops: SuperAdminOpsService,
    private billing: BillingService, private invoices: InvoiceService,
  ) {}

  private guard(user: any) {
    if (user.role !== 'SUPER_ADMIN') throw new ForbiddenException('Super admin only');
  }

  /** Runs a change and records it in the activity log once it succeeded. */
  private async logged<T>(u: any, action: string, entity: string, id: number | null, work: Promise<T> | T, details?: (r: T) => Record<string, unknown>) {
    const result = await work;
    await this.ops.audit(u, action, entity, id, details?.(result));
    return result;
  }

  private sendCsv(res: Response, name: string, csv: string) {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${name}-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csv);
  }

  private codFilter(q?: string, type?: string, category?: string, page?: string): CodFilter {
    return { q: q?.trim() || undefined, type: type || undefined, category: category || undefined, page: Math.max(1, +(page || 1) || 1) };
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
    this.guard(u); return this.logged(u, `shop.${dto.status}`, 'tenant', +id, this.service.setTenantStatus(+id, dto), t => ({ shop: t.name, note: dto.plan_note }));
  }

  @Patch('shops/:id/plan')
  changePlan(@CurrentUser() u: any, @Param('id') id: string, @Body() dto: ChangePlanDto) {
    this.guard(u);
    return this.logged(u, 'shop.plan', 'tenant', +id, this.service.changePlan(+id, dto),
      r => ({ shop: r.tenant.name, package: r.package.name, product: r.package.product, cycle: dto.billing_cycle, amount: r.finalAmount }));
  }

  @Delete('shops/:id')
  async deleteShop(@CurrentUser() u: any, @Param('id') id: string) {
    this.guard(u);
    const shop = await this.service.getShopDetail(+id).then(d => d.tenant.name).catch(() => null);
    return this.logged(u, 'shop.delete', 'tenant', +id, this.service.deleteTenant(+id), () => ({ shop }));
  }

  @Post('shops/:id/impersonate')
  impersonateShop(@CurrentUser() u: any, @Param('id') id: string) {
    this.guard(u); return this.logged(u, 'shop.sign_in_as', 'tenant', +id, this.service.impersonateShop(+id, u.sub), r => ({ shop: r.shop.name, as: r.user.name }));
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
  getTransactionInvoice(@CurrentUser() u: any, @Param('id') id: string) {
    this.guard(u); return this.invoices.getPrintDataByTransaction(+id);
  }

  // ── Invoices ───────────────────────────────────────────────────────────────
  @Get('invoices')
  listInvoices(@CurrentUser() u: any, @Query('page') page = '1', @Query('limit') limit = '20', @Query('status') status?: string) {
    this.guard(u); return this.invoices.listAll(+page, +limit, status);
  }

  @Get('invoices/:id')
  getInvoice(@CurrentUser() u: any, @Param('id') id: string) {
    this.guard(u); return this.invoices.getPrintData(+id);
  }

  @Post('invoices/:id/email')
  emailInvoice(@CurrentUser() u: any, @Param('id') id: string) {
    this.guard(u); return this.invoices.emailInvoiceToCustomer(+id);
  }

  @Get('revenue')
  revenueReport(@CurrentUser() u: any) {
    this.guard(u); return this.service.getRevenueReport();
  }

  @Get('revenue/export/csv')
  async exportRevenueCsv(@CurrentUser() u: any, @Res() res: Response) {
    this.guard(u);
    const csv = await this.service.getRevenueCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="revenue-report-${Date.now()}.csv"`);
    res.send(csv);
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
    this.guard(u); return this.logged(u, 'payment.approve', 'payment_transaction', +id, this.billing.approveBankTransfer(+id));
  }

  @Patch('bank-transfers/:id/reject')
  rejectSlip(@CurrentUser() u: any, @Param('id') id: string, @Body() dto: RejectBankTransferDto) {
    this.guard(u); return this.logged(u, 'payment.reject', 'payment_transaction', +id, this.billing.rejectBankTransfer(+id, dto.reason), () => ({ reason: dto.reason }));
  }

  @Get('bank-details')
  getBankDetails(@CurrentUser() u: any) {
    this.guard(u); return this.billing.getPaymentOptions();
  }

  @Patch('bank-details')
  updateBankDetails(@CurrentUser() u: any, @Body() dto: UpdateBankDetailsDto) {
    this.guard(u); return this.logged(u, 'settings.bank_details', 'settings', null, Promise.resolve(this.billing.updateBankDetails(dto)));
  }

  @Get('platform-company')
  getPlatformCompany(@CurrentUser() u: any) {
    this.guard(u); return getPlatformCompany();
  }

  @Patch('platform-company')
  updatePlatformCompany(@CurrentUser() u: any, @Body() dto: Record<string, any>) {
    this.guard(u); return this.logged(u, 'settings.company', 'settings', null, Promise.resolve(savePlatformCompany(dto)));
  }

  // ── Packages ───────────────────────────────────────────────────────────────
  @Get('packages')
  packages(@CurrentUser() u: any) { this.guard(u); return this.service.getPackages(); }

  @Patch('packages/:id/product')
  setPackageProduct(@CurrentUser() u: any, @Param('id') id: string, @Body() dto: SetPackageProductDto) {
    this.guard(u); return this.logged(u, 'package.product', 'package', +id, this.service.setPackageProduct(+id, dto.product), p => ({ package: p.name, product: p.product }));
  }

  @Get('packages/modules')
  packageModules(@CurrentUser() u: any) { this.guard(u); return this.ops.moduleNames(); }

  @Post('packages')
  createPackage(@CurrentUser() u: any, @Body() dto: SavePackageDto) {
    this.guard(u); return this.logged(u, 'package.create', 'package', null, this.ops.savePackage(dto), p => ({ package: p?.name, product: p?.product, monthly: p?.price_monthly, yearly: p?.price_yearly }));
  }

  @Put('packages/:id')
  updatePackage(@CurrentUser() u: any, @Param('id') id: string, @Body() dto: SavePackageDto) {
    this.guard(u); return this.logged(u, 'package.update', 'package', +id, this.ops.savePackage(dto, +id), p => ({ package: p?.name, monthly: p?.price_monthly, yearly: p?.price_yearly, active: p?.is_active }));
  }

  @Delete('packages/:id')
  deletePackage(@CurrentUser() u: any, @Param('id') id: string) {
    this.guard(u); return this.logged(u, 'package.delete', 'package', +id, this.ops.deletePackage(+id), p => ({ package: p.name }));
  }

  // ── People ─────────────────────────────────────────────────────────────────
  @Get('users')
  users(@CurrentUser() u: any, @Query('q') q?: string, @Query('filter') filter?: string, @Query('page') page = '1') {
    this.guard(u); return this.ops.listUsers(q?.trim() || undefined, filter, Math.max(1, +page || 1));
  }

  @Patch('users/:id/password')
  resetPassword(@CurrentUser() u: any, @Param('id') id: string, @Body() dto: ResetPasswordDto) {
    // The password itself never goes into the log
    this.guard(u); return this.logged(u, 'user.reset_password', 'user', +id, this.ops.resetPassword(+id, dto), r => ({ generated: r.generated }));
  }

  @Patch('users/:id/email')
  changeEmail(@CurrentUser() u: any, @Param('id') id: string, @Body() dto: ChangeEmailDto) {
    this.guard(u); return this.logged(u, 'user.email', 'user', +id, this.ops.changeEmail(+id, dto), r => ({ from: r.from, to: r.email }));
  }

  @Patch('users/:id/disabled')
  setDisabled(@CurrentUser() u: any, @Param('id') id: string, @Body() dto: SetDisabledDto) {
    this.guard(u); return this.logged(u, dto.disabled ? 'user.disable' : 'user.enable', 'user', +id, this.ops.setDisabled(+id, dto.disabled, u.sub));
  }

  @Patch('users/:id/tasks-ban')
  tasksBan(@CurrentUser() u: any, @Param('id') id: string, @Body() dto: TasksBanDto) {
    this.guard(u); return this.logged(u, dto.banned ? 'tasks.ban' : 'tasks.unban', 'user', +id, this.ops.setTasksBan(+id, dto), () => ({ reason: dto.reason }));
  }

  // ── Super admins ───────────────────────────────────────────────────────────
  @Get('admins')
  admins(@CurrentUser() u: any) { this.guard(u); return this.ops.listAdmins(); }

  @Post('admins')
  addAdmin(@CurrentUser() u: any, @Body() dto: AddAdminDto) {
    this.guard(u); return this.logged(u, 'admin.add', 'user', null, this.ops.addAdmin(dto, u.tenant_id), a => ({ admin: a.email }));
  }

  @Patch('admins/:id/disabled')
  setAdminDisabled(@CurrentUser() u: any, @Param('id') id: string, @Body() dto: SetDisabledDto) {
    this.guard(u); return this.logged(u, dto.disabled ? 'admin.disable' : 'admin.enable', 'user', +id, this.ops.setDisabled(+id, dto.disabled, u.sub, true));
  }

  @Patch('me/password')
  changeOwnPassword(@CurrentUser() u: any, @Body() dto: ChangeOwnPasswordDto) {
    this.guard(u); return this.logged(u, 'admin.password', 'user', u.sub, this.ops.changeOwnPassword(u.sub, dto));
  }

  // ── Activity log ───────────────────────────────────────────────────────────
  @Get('activity')
  activity(@CurrentUser() u: any, @Query('page') page = '1', @Query('action') action?: string) {
    this.guard(u); return this.ops.activity(Math.max(1, +page || 1), 30, action || undefined);
  }

  // ── COD directory ──────────────────────────────────────────────────────────
  @Get('cod/stats')
  codStats(@CurrentUser() u: any) { this.guard(u); return this.ops.codStats(); }

  @Get('cod/categories')
  codCategories(@CurrentUser() u: any) { this.guard(u); return this.ops.codCategories(); }

  @Get('cod/businesses')
  codBusinesses(@CurrentUser() u: any, @Query('q') q?: string, @Query('type') type?: string, @Query('page') page?: string) {
    this.guard(u); return this.ops.codBusinesses(this.codFilter(q, type, undefined, page));
  }

  @Get('cod/businesses/export/csv')
  async codBusinessesCsv(@CurrentUser() u: any, @Res() res: Response, @Query('q') q?: string, @Query('type') type?: string) {
    this.guard(u);
    const filter = this.codFilter(q, type);
    const csv = await this.logged(u, 'cod.export_businesses', 'cod', null, this.ops.codBusinessesCsv(filter), () => ({ ...filter, page: undefined }));
    this.sendCsv(res, 'cod-businesses', csv);
  }

  @Get('cod/customers')
  codCustomers(@CurrentUser() u: any, @Query('q') q?: string, @Query('type') type?: string, @Query('category') category?: string, @Query('page') page?: string) {
    this.guard(u); return this.ops.codCustomers(this.codFilter(q, type, category, page));
  }

  @Get('cod/customers/export/csv')
  async codCustomersCsv(@CurrentUser() u: any, @Res() res: Response, @Query('q') q?: string, @Query('type') type?: string, @Query('category') category?: string) {
    this.guard(u);
    const filter = this.codFilter(q, type, category);
    // Customer contact lists are personal data — every download is recorded
    const csv = await this.logged(u, 'cod.export_customers', 'cod', null, this.ops.codCustomersCsv(filter), () => ({ ...filter, page: undefined }));
    this.sendCsv(res, 'cod-customers', csv);
  }

  // ── Coupons ────────────────────────────────────────────────────────────────
  @Get('coupons')
  getCoupons(@CurrentUser() u: any) { this.guard(u); return this.service.getCoupons(); }

  @Post('coupons')
  createCoupon(@CurrentUser() u: any, @Body() dto: CreateCouponDto) {
    this.guard(u); return this.logged(u, 'coupon.create', 'coupon', null, this.service.createCoupon(dto), () => ({ code: dto.code, type: dto.type, value: dto.value }));
  }

  @Patch('coupons/:id/toggle')
  toggleCoupon(@CurrentUser() u: any, @Param('id') id: string) {
    this.guard(u); return this.logged(u, 'coupon.toggle', 'coupon', +id, this.service.toggleCoupon(+id));
  }

  @Delete('coupons/:id')
  deleteCoupon(@CurrentUser() u: any, @Param('id') id: string) {
    this.guard(u); return this.logged(u, 'coupon.delete', 'coupon', +id, this.service.deleteCoupon(+id));
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
    this.guard(u); return this.logged(u, 'announcement.create', 'announcement', null, this.service.createAnnouncement(dto), () => ({ title: dto.title }));
  }

  @Patch('announcements/:id')
  updateAnnouncement(@CurrentUser() u: any, @Param('id') id: string, @Body() dto: UpdateAnnouncementDto) {
    this.guard(u); return this.service.updateAnnouncement(+id, dto);
  }

  @Delete('announcements/:id')
  deleteAnnouncement(@CurrentUser() u: any, @Param('id') id: string) {
    this.guard(u); return this.logged(u, 'announcement.delete', 'announcement', +id, this.service.deleteAnnouncement(+id));
  }

  // ── API Monitor ────────────────────────────────────────────────────────────
  @Get('api-monitor')
  apiMonitor(@CurrentUser() u: any, @Query('hours') hours = '24') {
    this.guard(u); return this.service.getApiStats(+hours);
  }
}
