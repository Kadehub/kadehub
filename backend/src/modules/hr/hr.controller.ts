import {
  BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Query, UploadedFile, UseGuards,
  UseInterceptors, UsePipes, ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { uploadToCloudinary } from '../../common/cloudinary';
import { Hr, HrGuard, HrOwnerOnly, type HrCtx } from './hr-access';
import { HrAccountService } from './hr-account.service';
import { HrOrgService, viewEmployee } from './hr-org.service';
import { HrTimeService } from './hr-time.service';
import { HrPayrollService } from './hr-payroll.service';
import { HrTalentService } from './hr-talent.service';
import { HR_REPORTS, HrReportsService, type HrReportKey } from './hr-reports.service';
import { addDays, isDate, isPeriod, localDate, periodRange } from './hr-calc';
import {
  AddDocumentDto, BulkRosterDto, CopyWeekDto, CreateLeaveDto, CreateManagerDto, CreateRunDto, CreateSwapDto, DecideDto,
  EndEmploymentDto, HireApplicantDto, InterviewNoteDto, IssueAssetDto, KioskAcknowledgeDto, KioskClockDto, KioskLeaveDto,
  KioskPinDto, KioskRespondDto, KioskSwapDto, RemoveManagerDto, ReplaceManagerDto, ManualAttendanceDto, PayRunDto, PublicApplyDto, RepayAdvanceDto, ReturnAssetDto,
  SaveAdvanceDto, SaveApplicantDto, SaveAssetDto, SaveBranchDto, SaveEmployeeDto, SaveHolidayDto, SaveJobDto, SaveLeaveTypeDto,
  SaveReviewDto, SaveRosterEntryDto, SaveSettingsDto, SaveShiftTemplateDto, SaveWarningDto, SetPinDto, SetupHrDto,
  UpdateApplicantDto, UpdateAttendanceDto, UpdateManagerDto, UpdatePayslipDto,
} from './hr.dto';

const upload = (types: RegExp, mb: number) => FileInterceptor('file', {
  storage: memoryStorage(),
  limits: { fileSize: mb * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!types.test(file.mimetype)) return cb(new BadRequestException('FILE_TYPE'), false);
    cb(null, true);
  },
});
const imageUpload = upload(/^image\/(jpeg|png|webp)$/, 3);
const documentUpload = upload(/^(image\/(jpeg|png|webp)|application\/pdf)$/, 5);

const optInt = (v?: string) => (v && /^\d+$/.test(v) ? Number(v) : undefined);
const validPeriod = (v?: string) => (isPeriod(v) ? v : localDate().slice(0, 7));
const validDate = (v?: string) => (isDate(v) ? v : localDate());
const pipe = new ValidationPipe({ whitelist: true, transform: true });

/** No sign-in: the staff.kadehub.com landing page and the public job pages. */
@Controller('hr/public')
@UsePipes(pipe)
export class HrPublicController {
  constructor(private account: HrAccountService, private talent: HrTalentService) {}

  @Get('plans')
  plans() { return this.account.plans(); }

  @Get('jobs/:token')
  job(@Param('token') token: string) { return this.talent.publicJob(token); }

  @Post('jobs/:token/apply')
  @UseInterceptors(documentUpload)
  async apply(@Param('token') token: string, @Body() dto: PublicApplyDto, @UploadedFile() file?: Express.Multer.File) {
    await this.talent.publicJob(token);
    const cv = file ? await uploadToCloudinary(file.buffer, 'kadehub/hr/cv', file.originalname) : null;
    return this.talent.publicApply(token, dto, cv);
  }
}

/** Signed in, before or without a Staff role: the shell's session call and the set-up wizard. */
@Controller('hr')
@UseGuards(JwtAuthGuard)
@UsePipes(pipe)
export class HrAccountController {
  constructor(private account: HrAccountService) {}

  @Get('me')
  me(@CurrentUser() u: any) { return this.account.me(u); }

  @Get('plans')
  plans() { return this.account.plans(); }

  @Post('setup')
  setup(@CurrentUser() u: any, @Body() dto: SetupHrDto) {
    if (u.role !== 'ADMIN' && u.role !== 'SUPER_ADMIN') throw new BadRequestException('OWNER_ONLY');
    return this.account.setup(u, dto);
  }
}

/** Owner-only: settings, managers and the activity log. */
@Controller('hr')
@UseGuards(JwtAuthGuard, HrGuard)
@HrOwnerOnly()
@UsePipes(pipe)
export class HrOwnerController {
  constructor(private account: HrAccountService, private org: HrOrgService) {}

  @Get('settings')
  settings(@Hr() ctx: HrCtx) { return this.account.getSettings(ctx.tenantId); }

  @Put('settings')
  saveSettings(@Hr() ctx: HrCtx, @Body() dto: SaveSettingsDto) { return this.account.saveSettings(ctx, dto); }

  @Post('settings/logo')
  @UseInterceptors(imageUpload)
  async logo(@Hr() ctx: HrCtx, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('FILE_REQUIRED');
    const url = await uploadToCloudinary(file.buffer, `kadehub/hr/${ctx.tenantId}/logo`, file.originalname);
    return this.account.setLogo(ctx, url);
  }

  @Get('activity')
  activity(@Hr() ctx: HrCtx, @Query('page') page?: string) { return this.account.activity(ctx.tenantId, optInt(page) ?? 1); }

  @Get('managers')
  managers(@Hr() ctx: HrCtx) { return this.account.listManagers(ctx.tenantId); }

  @Post('managers')
  createManager(@Hr() ctx: HrCtx, @Body() dto: CreateManagerDto) { return this.account.createManager(ctx, dto); }

  @Patch('managers/:id')
  updateManager(@Hr() ctx: HrCtx, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateManagerDto) { return this.account.updateManager(ctx, id, dto); }

  @Post('managers/:id/replace')
  replaceManager(@Hr() ctx: HrCtx, @Param('id', ParseIntPipe) id: number, @Body() dto: ReplaceManagerDto) { return this.account.replaceManager(ctx, id, dto); }

  @Post('managers/:id/remove')
  removeManager(@Hr() ctx: HrCtx, @Param('id', ParseIntPipe) id: number, @Body() dto: RemoveManagerDto) { return this.account.removeManager(ctx, id, dto); }

  @Post('managers/:id/unblock')
  unblockManager(@Hr() ctx: HrCtx, @Param('id', ParseIntPipe) id: number) { return this.account.unblockManager(ctx, id); }

  @Post('branches')
  createBranch(@Hr() ctx: HrCtx, @Body() dto: SaveBranchDto) { return this.org.createBranch(ctx, dto); }

  @Patch('branches/:id')
  updateBranch(@Hr() ctx: HrCtx, @Param('id', ParseIntPipe) id: number, @Body() dto: SaveBranchDto) { return this.org.updateBranch(ctx, id, dto); }

  @Delete('employees/:id')
  deleteEmployee(@Hr() ctx: HrCtx, @Param('id', ParseIntPipe) id: number) { return this.org.deleteEmployee(ctx, id); }
}

/** Branches and employees (owners and branch managers, scoped by branch). */
@Controller('hr')
@UseGuards(JwtAuthGuard, HrGuard)
@UsePipes(pipe)
export class HrPeopleController {
  constructor(
    private org: HrOrgService, private time: HrTimeService, private payroll: HrPayrollService,
    private talent: HrTalentService, private reports: HrReportsService,
  ) {}

  @Get('dashboard')
  dashboard(@Hr() ctx: HrCtx, @Query('branch_id') b?: string) { return this.reports.dashboard(ctx, optInt(b)); }

  @Get('branches')
  branches(@Hr() ctx: HrCtx, @Query('all') all?: string) { return this.org.listBranches(ctx, all === '1' && ctx.owner); }

  @Get('employees')
  employees(@Hr() ctx: HrCtx, @Query('branch_id') b?: string, @Query('status') status?: string, @Query('q') q?: string) {
    return this.org.listEmployees(ctx, { branch_id: optInt(b), status, search: q });
  }

  @Post('employees')
  createEmployee(@Hr() ctx: HrCtx, @Body() dto: SaveEmployeeDto) { return this.org.createEmployee(ctx, dto); }

  /** Profile with everything around it: documents, leave balances, assets, reviews and warnings. */
  @Get('employees/:id')
  async employee(@Hr() ctx: HrCtx, @Param('id', ParseIntPipe) id: number) {
    const e = await this.org.findEmployee(ctx, id, true);
    const today = localDate();
    const [documents, balances, assets, reviews, warnings, advances, payslips, attendance] = await Promise.all([
      this.org.listDocuments(ctx, id),
      this.time.balances(ctx.tenantId, id, Number(today.slice(0, 4))),
      this.talent.employeeAssets(ctx, id),
      this.talent.listReviews(ctx, id),
      this.talent.listWarnings(ctx, id),
      ctx.owner ? this.payroll.listAdvances(ctx, { employee_id: id }) : Promise.resolve(null),
      ctx.owner ? this.payroll.employeePayslips(ctx, id) : Promise.resolve(null),
      this.time.employeeAttendance(ctx, id, addDays(today, -30), today),
    ]);
    return { employee: viewEmployee(e, ctx), documents, balances, assets, reviews, warnings, advances, payslips, attendance };
  }

  @Patch('employees/:id')
  updateEmployee(@Hr() ctx: HrCtx, @Param('id', ParseIntPipe) id: number, @Body() dto: SaveEmployeeDto) { return this.org.updateEmployee(ctx, id, dto); }

  @Post('employees/:id/photo')
  @UseInterceptors(imageUpload)
  async photo(@Hr() ctx: HrCtx, @Param('id', ParseIntPipe) id: number, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('FILE_REQUIRED');
    await this.org.findEmployee(ctx, id);
    const url = await uploadToCloudinary(file.buffer, `kadehub/hr/${ctx.tenantId}/photos`, file.originalname);
    return this.org.setPhoto(ctx, id, url);
  }

  @Post('employees/:id/pin')
  setPin(@Hr() ctx: HrCtx, @Param('id', ParseIntPipe) id: number, @Body() dto: SetPinDto) { return this.org.setPin(ctx, id, dto.pin); }

  @Post('employees/:id/end')
  end(@Hr() ctx: HrCtx, @Param('id', ParseIntPipe) id: number, @Body() dto: EndEmploymentDto) { return this.org.endEmployment(ctx, id, dto); }

  @Post('employees/:id/reactivate')
  reactivate(@Hr() ctx: HrCtx, @Param('id', ParseIntPipe) id: number) { return this.org.reactivate(ctx, id); }

  @Post('employees/:id/documents')
  @UseInterceptors(documentUpload)
  async addDocument(@Hr() ctx: HrCtx, @Param('id', ParseIntPipe) id: number, @Body() dto: AddDocumentDto, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('FILE_REQUIRED');
    await this.org.findEmployee(ctx, id);
    const url = await uploadToCloudinary(file.buffer, `kadehub/hr/${ctx.tenantId}/documents`, file.originalname);
    return this.org.addDocument(ctx, id, dto.title, url);
  }

  @Delete('documents/:id')
  deleteDocument(@Hr() ctx: HrCtx, @Param('id', ParseIntPipe) id: number) { return this.org.deleteDocument(ctx, id); }

  @Get('reports/:key')
  report(@Hr() ctx: HrCtx, @Param('key') key: string, @Query('period') period?: string, @Query('branch_id') b?: string) {
    if (!(HR_REPORTS as readonly string[]).includes(key)) throw new BadRequestException('UNKNOWN_REPORT');
    if (key === 'payroll' && !ctx.owner) throw new BadRequestException('OWNER_ONLY');
    return this.reports.report(ctx, key as HrReportKey, { period: validPeriod(period), branch_id: optInt(b) });
  }
}

/** Shifts, roster, swaps, attendance, leave and holidays. */
@Controller('hr')
@UseGuards(JwtAuthGuard, HrGuard)
@UsePipes(pipe)
export class HrTimeController {
  constructor(private time: HrTimeService) {}

  @Get('shift-templates')
  templates(@Hr() ctx: HrCtx, @Query('branch_id') b?: string) { return this.time.listTemplates(ctx, optInt(b)); }

  @Post('shift-templates')
  createTemplate(@Hr() ctx: HrCtx, @Body() dto: SaveShiftTemplateDto) { return this.time.saveTemplate(ctx, dto); }

  @Patch('shift-templates/:id')
  updateTemplate(@Hr() ctx: HrCtx, @Param('id', ParseIntPipe) id: number, @Body() dto: SaveShiftTemplateDto) { return this.time.saveTemplate(ctx, dto, id); }

  @Delete('shift-templates/:id')
  deleteTemplate(@Hr() ctx: HrCtx, @Param('id', ParseIntPipe) id: number) { return this.time.deleteTemplate(ctx, id); }

  @Get('roster')
  roster(@Hr() ctx: HrCtx, @Query('branch_id', ParseIntPipe) branchId: number, @Query('week') week?: string) {
    return this.time.getRoster(ctx, branchId, validDate(week));
  }

  @Put('roster/entry')
  saveEntry(@Hr() ctx: HrCtx, @Body() dto: SaveRosterEntryDto) { return this.time.saveEntry(ctx, dto); }

  @Delete('roster/entry/:id')
  deleteEntry(@Hr() ctx: HrCtx, @Param('id', ParseIntPipe) id: number) { return this.time.deleteEntry(ctx, id); }

  @Post('roster/bulk')
  bulk(@Hr() ctx: HrCtx, @Body() dto: BulkRosterDto) { return this.time.bulkFill(ctx, dto); }

  @Post('roster/copy-week')
  copyWeek(@Hr() ctx: HrCtx, @Body() dto: CopyWeekDto) { return this.time.copyWeek(ctx, dto); }

  @Get('swaps')
  swaps(@Hr() ctx: HrCtx, @Query('status') status?: string) { return this.time.listSwaps(ctx, { status }); }

  /** A manager recording a swap both people agreed to: applied at once. */
  @Post('swaps')
  createSwap(@Hr() ctx: HrCtx, @Body() dto: CreateSwapDto) { return this.time.createSwap(ctx, dto, null); }

  @Post('swaps/:id/approve')
  approveSwap(@Hr() ctx: HrCtx, @Param('id', ParseIntPipe) id: number) { return this.time.decideSwap(ctx, id, true); }

  @Post('swaps/:id/reject')
  rejectSwap(@Hr() ctx: HrCtx, @Param('id', ParseIntPipe) id: number) { return this.time.decideSwap(ctx, id, false); }

  @Get('attendance/day')
  day(@Hr() ctx: HrCtx, @Query('date') date?: string, @Query('branch_id') b?: string) { return this.time.daySheet(ctx, validDate(date), optInt(b)); }

  @Get('attendance/month')
  month(@Hr() ctx: HrCtx, @Query('period') period?: string, @Query('branch_id') b?: string) {
    const { from, to } = periodRange(validPeriod(period));
    return this.time.monthSheet(ctx, from, to, optInt(b));
  }

  @Get('attendance/employee/:id')
  employeeAttendance(@Hr() ctx: HrCtx, @Param('id', ParseIntPipe) id: number, @Query('period') period?: string) {
    const { from, to } = periodRange(validPeriod(period));
    return this.time.employeeAttendance(ctx, id, from, to);
  }

  @Post('attendance')
  addAttendance(@Hr() ctx: HrCtx, @Body() dto: ManualAttendanceDto) { return this.time.createManual(ctx, dto); }

  @Patch('attendance/:id')
  editAttendance(@Hr() ctx: HrCtx, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAttendanceDto) { return this.time.updateAttendance(ctx, id, dto); }

  @Delete('attendance/:id')
  deleteAttendance(@Hr() ctx: HrCtx, @Param('id', ParseIntPipe) id: number) { return this.time.deleteAttendance(ctx, id); }

  @Get('leave-types')
  leaveTypes(@Hr() ctx: HrCtx, @Query('all') all?: string) { return this.time.listLeaveTypes(ctx.tenantId, all === '1'); }

  @Post('leave-types')
  @HrOwnerOnly()
  createLeaveType(@Hr() ctx: HrCtx, @Body() dto: SaveLeaveTypeDto) { return this.time.saveLeaveType(ctx, dto); }

  @Patch('leave-types/:id')
  @HrOwnerOnly()
  updateLeaveType(@Hr() ctx: HrCtx, @Param('id', ParseIntPipe) id: number, @Body() dto: SaveLeaveTypeDto) { return this.time.saveLeaveType(ctx, dto, id); }

  @Get('leave')
  leave(@Hr() ctx: HrCtx, @Query('status') status?: string, @Query('branch_id') b?: string, @Query('employee_id') emp?: string,
    @Query('from') from?: string, @Query('to') to?: string) {
    return this.time.listLeave(ctx, { status, branch_id: optInt(b), employee_id: optInt(emp), from: isDate(from) ? from : undefined, to: isDate(to) ? to : undefined });
  }

  @Post('leave')
  requestLeave(@Hr() ctx: HrCtx, @Body() dto: CreateLeaveDto) { return this.time.requestLeave(ctx, dto.employee_id, dto, !!dto.approve); }

  @Post('leave/:id/approve')
  approveLeave(@Hr() ctx: HrCtx, @Param('id', ParseIntPipe) id: number, @Body() dto: DecideDto) { return this.time.decideLeave(ctx, id, 'approved', dto.note); }

  @Post('leave/:id/reject')
  rejectLeave(@Hr() ctx: HrCtx, @Param('id', ParseIntPipe) id: number, @Body() dto: DecideDto) { return this.time.decideLeave(ctx, id, 'rejected', dto.note); }

  @Post('leave/:id/cancel')
  cancelLeave(@Hr() ctx: HrCtx, @Param('id', ParseIntPipe) id: number, @Body() dto: DecideDto) { return this.time.decideLeave(ctx, id, 'cancelled', dto.note); }

  @Get('leave/balances/:employeeId')
  async balances(@Hr() ctx: HrCtx, @Param('employeeId', ParseIntPipe) employeeId: number, @Query('year') year?: string) {
    return this.time.balances(ctx.tenantId, employeeId, optInt(year) ?? Number(localDate().slice(0, 4)));
  }

  @Get('holidays')
  holidays(@Hr() ctx: HrCtx, @Query('year') year?: string) {
    const y = optInt(year) ?? Number(localDate().slice(0, 4));
    return this.time.listHolidays(ctx.tenantId, `${y}-01-01`, `${y}-12-31`);
  }

  @Post('holidays')
  @HrOwnerOnly()
  saveHoliday(@Hr() ctx: HrCtx, @Body() dto: SaveHolidayDto) { return this.time.saveHoliday(ctx, dto); }

  @Delete('holidays/:id')
  @HrOwnerOnly()
  deleteHoliday(@Hr() ctx: HrCtx, @Param('id', ParseIntPipe) id: number) { return this.time.deleteHoliday(ctx, id); }
}

/**
 * The shared tablet at the shop, signed in as an owner or manager. Every call carries the
 * employee's id and PIN, checked before anything happens.
 */
/** The PIN identifies the employee, so staff lent in from another branch can use this branch's kiosk too. */
const anyBranch = (ctx: HrCtx): HrCtx => ({ ...ctx, branchIds: null });

@Controller('hr/kiosk')
@UseGuards(JwtAuthGuard, HrGuard)
@UsePipes(pipe)
export class HrKioskController {
  constructor(private org: HrOrgService, private time: HrTimeService, private talent: HrTalentService) {}

  /** Name tiles for the kiosk: the branch's staff plus anyone rostered there today. */
  @Get('staff')
  async staff(@Hr() ctx: HrCtx, @Query('branch_id', ParseIntPipe) branchId: number) {
    await this.org.getBranch(ctx, branchId);
    const day = await this.time.daySheet(ctx, localDate(), branchId);
    const pins = await this.org.withPin(ctx.tenantId, day.rows.map(r => r.employee.id));
    return day.rows.map(r => ({
      id: r.employee.id, full_name: r.employee.full_name, photo_url: r.employee.photo_url, job_title: r.employee.job_title,
      clocked_in: r.clocked_in, status: r.status, shift: r.shift,
      has_pin: pins.has(r.employee.id),
    }));
  }

  /** After the PIN: the employee's own screen. */
  @Post('verify')
  async verify(@Hr() ctx: HrCtx, @Body() dto: KioskPinDto) {
    const e = await this.org.verifyPin(anyBranch(ctx), dto.employee_id, dto.pin);
    const year = Number(localDate().slice(0, 4));
    const [open, shifts, balances, types, swaps, acks] = await Promise.all([
      this.time.openAttendance(ctx.tenantId, e.id),
      this.time.upcomingShifts(ctx.tenantId, e.id),
      this.time.balances(ctx.tenantId, e.id, year),
      this.time.listLeaveTypes(ctx.tenantId),
      this.time.listSwaps({ ...ctx, branchIds: null }, { employee_id: e.id }),
      this.talent.unacknowledged(ctx.tenantId, e.id),
    ]);
    // Colleagues and their shifts, for choosing who to swap with
    const colleagues = e.branch_id
      ? ((await this.org.listEmployees({ ...ctx, branchIds: null }, { branch_id: e.branch_id })) as Array<Record<string, any>>)
        .filter(c => c.id !== e.id).map(c => ({ id: c.id, full_name: c.full_name }))
      : [];
    const colleagueShifts = (await Promise.all(colleagues.map(c => this.time.upcomingShifts(ctx.tenantId, c.id as number)))).flat();
    return {
      employee: { id: e.id, full_name: e.full_name, emp_code: e.emp_code, photo_url: e.photo_url, job_title: e.job_title, branch_id: e.branch_id },
      clocked_in: !!open, open_since: open?.clock_in ?? null,
      shifts, balances, leave_types: types, colleagues, colleague_shifts: colleagueShifts,
      swaps: swaps.filter(s => ['pending_colleague', 'pending_manager'].includes(s.status) || s.created_at > new Date(Date.now() - 14 * 86_400_000)),
      acknowledgements: acks,
    };
  }

  @Post('punch')
  @UseInterceptors(imageUpload)
  async punch(@Hr() ctx: HrCtx, @Body() dto: KioskClockDto, @UploadedFile() file?: Express.Multer.File) {
    const e = await this.org.verifyPin(anyBranch(ctx), dto.employee_id, dto.pin);
    await this.org.getBranch(ctx, dto.branch_id);
    const photo = file ? await uploadToCloudinary(file.buffer, `kadehub/hr/${ctx.tenantId}/punches`, file.originalname || 'punch.jpg') : null;
    const res = await this.time.punch(anyBranch(ctx), e, dto.branch_id, photo);
    return { action: res.action, at: res.attendance.clock_out ?? res.attendance.clock_in, late_minutes: res.attendance.late_minutes, worked_minutes: res.attendance.worked_minutes, name: e.full_name };
  }

  @Post('leave')
  async leave(@Hr() ctx: HrCtx, @Body() dto: KioskLeaveDto) {
    const e = await this.org.verifyPin(anyBranch(ctx), dto.employee_id, dto.pin);
    return this.time.requestLeave(anyBranch(ctx), e.id, dto, false);
  }

  @Post('swap')
  async swap(@Hr() ctx: HrCtx, @Body() dto: KioskSwapDto) {
    const e = await this.org.verifyPin(anyBranch(ctx), dto.employee_id, dto.pin);
    return this.time.createSwap(ctx, dto, { employeeId: e.id });
  }

  @Post('swap/:id/respond')
  async respond(@Hr() ctx: HrCtx, @Param('id', ParseIntPipe) id: number, @Body() dto: KioskRespondDto) {
    const e = await this.org.verifyPin(anyBranch(ctx), dto.employee_id, dto.pin);
    return this.time.respondSwap(ctx, id, e.id, dto.accept);
  }

  @Post('swap/:id/cancel')
  async cancel(@Hr() ctx: HrCtx, @Param('id', ParseIntPipe) id: number, @Body() dto: KioskPinDto) {
    const e = await this.org.verifyPin(anyBranch(ctx), dto.employee_id, dto.pin);
    return this.time.cancelSwap(ctx, id, e.id);
  }

  @Post('acknowledge')
  async acknowledge(@Hr() ctx: HrCtx, @Body() dto: KioskAcknowledgeDto) {
    const e = await this.org.verifyPin(anyBranch(ctx), dto.employee_id, dto.pin);
    return this.talent.acknowledge(anyBranch(ctx), dto.kind, dto.id, e.id);
  }
}

/** Advances, payroll runs and payslips — owner only. */
@Controller('hr')
@UseGuards(JwtAuthGuard, HrGuard)
@HrOwnerOnly()
@UsePipes(pipe)
export class HrPayrollController {
  constructor(private payroll: HrPayrollService) {}

  @Get('advances')
  advances(@Hr() ctx: HrCtx, @Query('employee_id') emp?: string, @Query('status') status?: string) {
    return this.payroll.listAdvances(ctx, { employee_id: optInt(emp), status });
  }

  @Post('advances')
  createAdvance(@Hr() ctx: HrCtx, @Body() dto: SaveAdvanceDto) { return this.payroll.createAdvance(ctx, dto); }

  @Patch('advances/:id')
  updateAdvance(@Hr() ctx: HrCtx, @Param('id', ParseIntPipe) id: number, @Body() dto: SaveAdvanceDto) { return this.payroll.updateAdvance(ctx, id, dto); }

  @Post('advances/:id/repay')
  repay(@Hr() ctx: HrCtx, @Param('id', ParseIntPipe) id: number, @Body() dto: RepayAdvanceDto) { return this.payroll.repayAdvance(ctx, id, dto); }

  @Delete('advances/:id')
  deleteAdvance(@Hr() ctx: HrCtx, @Param('id', ParseIntPipe) id: number) { return this.payroll.deleteAdvance(ctx, id); }

  @Get('payroll/runs')
  runs(@Hr() ctx: HrCtx) { return this.payroll.listRuns(ctx); }

  @Post('payroll/runs')
  createRun(@Hr() ctx: HrCtx, @Body() dto: CreateRunDto) { return this.payroll.createRun(ctx, dto); }

  @Get('payroll/runs/:id')
  run(@Hr() ctx: HrCtx, @Param('id', ParseIntPipe) id: number) { return this.payroll.getRun(ctx, id); }

  @Post('payroll/runs/:id/regenerate')
  regenerate(@Hr() ctx: HrCtx, @Param('id', ParseIntPipe) id: number) { return this.payroll.regenerate(ctx, id); }

  @Post('payroll/runs/:id/finalize')
  finalize(@Hr() ctx: HrCtx, @Param('id', ParseIntPipe) id: number) { return this.payroll.finalize(ctx, id); }

  @Post('payroll/runs/:id/reopen')
  reopen(@Hr() ctx: HrCtx, @Param('id', ParseIntPipe) id: number) { return this.payroll.reopen(ctx, id); }

  @Post('payroll/runs/:id/pay')
  pay(@Hr() ctx: HrCtx, @Param('id', ParseIntPipe) id: number, @Body() dto: PayRunDto) { return this.payroll.pay(ctx, id, dto); }

  @Delete('payroll/runs/:id')
  deleteRun(@Hr() ctx: HrCtx, @Param('id', ParseIntPipe) id: number) { return this.payroll.deleteRun(ctx, id); }

  @Get('payslips/:id')
  payslip(@Hr() ctx: HrCtx, @Param('id', ParseIntPipe) id: number) { return this.payroll.payslipDetail(ctx, id); }

  @Patch('payslips/:id')
  updatePayslip(@Hr() ctx: HrCtx, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePayslipDto) { return this.payroll.updatePayslip(ctx, id, dto); }

  @Delete('payslips/:id')
  removePayslip(@Hr() ctx: HrCtx, @Param('id', ParseIntPipe) id: number) { return this.payroll.removePayslip(ctx, id); }
}

/** Hiring, reviews, warnings and assets. */
@Controller('hr')
@UseGuards(JwtAuthGuard, HrGuard)
@UsePipes(pipe)
export class HrTalentController {
  constructor(private talent: HrTalentService) {}

  @Get('jobs')
  jobs(@Hr() ctx: HrCtx) { return this.talent.listJobs(ctx); }

  @Post('jobs')
  createJob(@Hr() ctx: HrCtx, @Body() dto: SaveJobDto) { return this.talent.saveJob(ctx, dto); }

  @Patch('jobs/:id')
  updateJob(@Hr() ctx: HrCtx, @Param('id', ParseIntPipe) id: number, @Body() dto: SaveJobDto) { return this.talent.saveJob(ctx, dto, id); }

  @Delete('jobs/:id')
  deleteJob(@Hr() ctx: HrCtx, @Param('id', ParseIntPipe) id: number) { return this.talent.deleteJob(ctx, id); }

  @Get('applicants')
  applicants(@Hr() ctx: HrCtx, @Query('job_id') job?: string) { return this.talent.listApplicants(ctx, optInt(job)); }

  @Post('applicants')
  @UseInterceptors(documentUpload)
  async createApplicant(@Hr() ctx: HrCtx, @Body() dto: SaveApplicantDto, @UploadedFile() file?: Express.Multer.File) {
    const cv = file ? await uploadToCloudinary(file.buffer, `kadehub/hr/${ctx.tenantId}/cv`, file.originalname) : null;
    return this.talent.createApplicant(ctx, dto, cv);
  }

  @Get('applicants/:id')
  applicant(@Hr() ctx: HrCtx, @Param('id', ParseIntPipe) id: number) { return this.talent.getApplicant(ctx, id); }

  @Patch('applicants/:id')
  updateApplicant(@Hr() ctx: HrCtx, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateApplicantDto) { return this.talent.updateApplicant(ctx, id, dto); }

  @Delete('applicants/:id')
  deleteApplicant(@Hr() ctx: HrCtx, @Param('id', ParseIntPipe) id: number) { return this.talent.deleteApplicant(ctx, id); }

  @Post('applicants/:id/notes')
  addNote(@Hr() ctx: HrCtx, @Param('id', ParseIntPipe) id: number, @Body() dto: InterviewNoteDto) { return this.talent.addNote(ctx, id, dto); }

  @Post('applicants/:id/hire')
  hire(@Hr() ctx: HrCtx, @Param('id', ParseIntPipe) id: number, @Body() dto: HireApplicantDto) { return this.talent.hire(ctx, id, dto); }

  @Get('reviews')
  reviews(@Hr() ctx: HrCtx, @Query('employee_id') emp?: string) { return this.talent.listReviews(ctx, optInt(emp)); }

  @Post('reviews')
  createReview(@Hr() ctx: HrCtx, @Body() dto: SaveReviewDto) { return this.talent.createReview(ctx, dto); }

  @Delete('reviews/:id')
  @HrOwnerOnly()
  deleteReview(@Hr() ctx: HrCtx, @Param('id', ParseIntPipe) id: number) { return this.talent.deleteReview(ctx, id); }

  @Get('warnings')
  warnings(@Hr() ctx: HrCtx, @Query('employee_id') emp?: string) { return this.talent.listWarnings(ctx, optInt(emp)); }

  @Post('warnings')
  createWarning(@Hr() ctx: HrCtx, @Body() dto: SaveWarningDto) { return this.talent.createWarning(ctx, dto); }

  @Delete('warnings/:id')
  @HrOwnerOnly()
  deleteWarning(@Hr() ctx: HrCtx, @Param('id', ParseIntPipe) id: number) { return this.talent.deleteWarning(ctx, id); }

  @Get('assets')
  assets(@Hr() ctx: HrCtx, @Query('branch_id') b?: string, @Query('status') status?: string, @Query('employee_id') emp?: string) {
    return this.talent.listAssets(ctx, { branch_id: optInt(b), status, employee_id: optInt(emp) });
  }

  @Post('assets')
  createAsset(@Hr() ctx: HrCtx, @Body() dto: SaveAssetDto) { return this.talent.saveAsset(ctx, dto); }

  @Patch('assets/:id')
  updateAsset(@Hr() ctx: HrCtx, @Param('id', ParseIntPipe) id: number, @Body() dto: SaveAssetDto) { return this.talent.saveAsset(ctx, dto, id); }

  @Delete('assets/:id')
  deleteAsset(@Hr() ctx: HrCtx, @Param('id', ParseIntPipe) id: number) { return this.talent.deleteAsset(ctx, id); }

  @Post('assets/:id/issue')
  issue(@Hr() ctx: HrCtx, @Param('id', ParseIntPipe) id: number, @Body() dto: IssueAssetDto) { return this.talent.issueAsset(ctx, id, dto); }

  @Post('assets/:id/return')
  returnAsset(@Hr() ctx: HrCtx, @Param('id', ParseIntPipe) id: number, @Body() dto: ReturnAssetDto) { return this.talent.returnAsset(ctx, id, dto); }

  @Get('assets/:id/history')
  history(@Hr() ctx: HrCtx, @Param('id', ParseIntPipe) id: number) { return this.talent.assetHistory(ctx, id); }
}

export const HR_CONTROLLERS = [
  HrPublicController, HrAccountController, HrOwnerController, HrPeopleController, HrTimeController, HrKioskController,
  HrPayrollController, HrTalentController,
];
