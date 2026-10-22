import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, IsNull, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { HrEmployee, HrSettings } from '../../database/entities/hr-core.entity';
import {
  HrAttendance, HrHoliday, HrLeaveRequest, HrLeaveType, HrRosterEntry, HrShiftSwap, HrShiftTemplate,
} from '../../database/entities/hr-time.entity';
import { HrAccountService } from './hr-account.service';
import { HrOrgService } from './hr-org.service';
import { assertBranch, type HrCtx } from './hr-access';
import {
  addDays, computeAttendance, dateRange, instantOf, leaveDays, localDate, localTime, parseOffDays, shiftMinutes,
  shiftWindow, weekStart, weekday, type ShiftPlan,
} from './hr-calc';
import type {
  BulkRosterDto, CopyWeekDto, CreateSwapDto, LeaveRequestFields, ManualAttendanceDto, SaveHolidayDto, SaveLeaveTypeDto,
  SaveRosterEntryDto, SaveShiftTemplateDto, UpdateAttendanceDto,
} from './hr.dto';

/** One employee-day, as attendance, payroll and reports see it. */
export interface DayInfo {
  date: string;
  /** A working day for this employee: rostered, or (when no roster is used) a normal working weekday. */
  expected: boolean;
  shift: ShiftPlan | null;
  attendance: HrAttendance[];
  leave: { type: string; paid: boolean; half: boolean; color: string } | null;
  holiday: string | null;
  /** Expected, in the past, nobody clocked in and no leave or holiday covers it. */
  absent: boolean;
}

export interface EmployeePeriod {
  days: DayInfo[];
  days_worked: number;
  absent_days: number;
  paid_leave_days: number;
  unpaid_leave_days: number;
  worked_minutes: number;
  overtime_minutes: number;
  late_minutes: number;
  late_days: number;
}

const MAX_LEAVE_SPAN_DAYS = 90;

@Injectable()
export class HrTimeService {
  constructor(
    private account: HrAccountService,
    private org: HrOrgService,
    @InjectRepository(HrEmployee) private employeeRepo: Repository<HrEmployee>,
    @InjectRepository(HrShiftTemplate) private templateRepo: Repository<HrShiftTemplate>,
    @InjectRepository(HrRosterEntry) private rosterRepo: Repository<HrRosterEntry>,
    @InjectRepository(HrShiftSwap) private swapRepo: Repository<HrShiftSwap>,
    @InjectRepository(HrAttendance) private attendanceRepo: Repository<HrAttendance>,
    @InjectRepository(HrLeaveType) private leaveTypeRepo: Repository<HrLeaveType>,
    @InjectRepository(HrLeaveRequest) private leaveRepo: Repository<HrLeaveRequest>,
    @InjectRepository(HrHoliday) private holidayRepo: Repository<HrHoliday>,
  ) {}

  // ───────── Shift templates ─────────

  async listTemplates(ctx: HrCtx, branchId?: number) {
    const rows = await this.templateRepo.find({ where: { tenant_id: ctx.tenantId }, order: { start_time: 'ASC' } });
    return rows.filter(t =>
      (t.branch_id === null || ctx.branchIds === null || ctx.branchIds.includes(t.branch_id)) &&
      (!branchId || t.branch_id === null || t.branch_id === branchId));
  }

  /** Shared templates (no branch) are owner-only; managers keep templates for their own branches. */
  private assertTemplateAccess(ctx: HrCtx, branchId: number | null) {
    if (branchId === null && !ctx.owner) throw new ForbiddenException({ statusCode: 403, code: 'HR_OWNER_ONLY', message: 'Only the owner can edit shared shifts' });
    if (branchId !== null) assertBranch(ctx, branchId);
  }

  async saveTemplate(ctx: HrCtx, dto: SaveShiftTemplateDto, id?: number) {
    let t: HrShiftTemplate;
    if (id) {
      const found = await this.templateRepo.findOne({ where: { id, tenant_id: ctx.tenantId } });
      if (!found) throw new NotFoundException('Shift not found');
      this.assertTemplateAccess(ctx, found.branch_id);
      t = found;
    } else {
      t = this.templateRepo.create({ tenant_id: ctx.tenantId });
    }
    const branchId = dto.branch_id ?? null;
    this.assertTemplateAccess(ctx, branchId);
    if (dto.start_time === dto.end_time) throw new BadRequestException('SHIFT_ZERO_LENGTH');
    Object.assign(t, {
      branch_id: branchId, name: dto.name.trim(), start_time: dto.start_time, end_time: dto.end_time,
      break_minutes: dto.break_minutes ?? 0, color: (dto.color ?? t.color ?? '#7c3aed').toLowerCase(),
    });
    return this.templateRepo.save(t);
  }

  async deleteTemplate(ctx: HrCtx, id: number) {
    const t = await this.templateRepo.findOne({ where: { id, tenant_id: ctx.tenantId } });
    if (!t) throw new NotFoundException('Shift not found');
    this.assertTemplateAccess(ctx, t.branch_id);
    await this.templateRepo.delete({ id });
    return { ok: true };
  }

  // ───────── Holidays ─────────

  async listHolidays(tenantId: number, from: string, to: string) {
    return this.holidayRepo.find({ where: { tenant_id: tenantId, holiday_date: Between(from, to) }, order: { holiday_date: 'ASC' } });
  }

  async saveHoliday(ctx: HrCtx, dto: SaveHolidayDto) {
    const existing = await this.holidayRepo.findOne({ where: { tenant_id: ctx.tenantId, holiday_date: dto.holiday_date } });
    const h = existing ?? this.holidayRepo.create({ tenant_id: ctx.tenantId, holiday_date: dto.holiday_date });
    h.name = dto.name.trim();
    return this.holidayRepo.save(h);
  }

  async deleteHoliday(ctx: HrCtx, id: number) {
    await this.holidayRepo.delete({ id, tenant_id: ctx.tenantId });
    return { ok: true };
  }

  // ───────── Roster ─────────

  private plan(e: HrRosterEntry): ShiftPlan {
    return { work_date: e.work_date, start_time: e.start_time, end_time: e.end_time, break_minutes: e.break_minutes };
  }

  /** Approved leave that covers a date, for the given employees. */
  private async approvedLeave(tenantId: number, employeeIds: number[], from: string, to: string) {
    if (!employeeIds.length) return [];
    return this.leaveRepo.find({
      where: { tenant_id: tenantId, employee_id: In(employeeIds), status: 'approved', start_date: LessThanOrEqual(to), end_date: MoreThanOrEqual(from) },
    });
  }

  /**
   * A branch's week: its staff (plus anyone lent in), their shifts in this branch and elsewhere,
   * leave, holidays and warnings (too many hours, shifts on leave days).
   */
  async getRoster(ctx: HrCtx, branchId: number, week: string) {
    await this.org.getBranch(ctx, branchId);
    const from = weekStart(week);
    const to = addDays(from, 6);
    const days = dateRange(from, to);

    const entries = await this.rosterRepo.find({ where: { tenant_id: ctx.tenantId, branch_id: branchId, work_date: Between(from, to) } });
    const home = await this.employeeRepo.find({ where: { tenant_id: ctx.tenantId, branch_id: branchId, status: 'active' }, order: { full_name: 'ASC' } });
    const lentIds = [...new Set(entries.map(e => e.employee_id))].filter(id => !home.some(h => h.id === id));
    const lent = await this.org.employeesByIds(ctx.tenantId, lentIds);
    const staff = [...home, ...lent];
    const ids = staff.map(s => s.id);

    const elsewhere = ids.length
      ? (await this.rosterRepo.find({ where: { tenant_id: ctx.tenantId, employee_id: In(ids), work_date: Between(from, to) } })).filter(e => e.branch_id !== branchId)
      : [];
    const [leave, holidays, templates, settings, types] = await Promise.all([
      this.leaveRepo.find({ where: { tenant_id: ctx.tenantId, employee_id: In(ids.length ? ids : [0]), status: In(['approved', 'pending']), start_date: LessThanOrEqual(to), end_date: MoreThanOrEqual(from) } }),
      this.listHolidays(ctx.tenantId, from, to),
      this.listTemplates(ctx, branchId),
      this.account.getSettings(ctx.tenantId),
      this.leaveTypeRepo.find({ where: { tenant_id: ctx.tenantId } }),
    ]);

    const warnings: Array<{ employee_id: number; date?: string; code: string; value?: number }> = [];
    for (const s of staff) {
      const mine = [...entries, ...elsewhere].filter(e => e.employee_id === s.id);
      const minutes = mine.reduce((m, e) => m + shiftMinutes(e.start_time, e.end_time, e.break_minutes), 0);
      if (minutes > settings.max_weekly_hours * 60) warnings.push({ employee_id: s.id, code: 'TOO_MANY_HOURS', value: Math.round(minutes / 6) / 10 });
      for (const e of mine) {
        if (leave.some(l => l.employee_id === s.id && l.status === 'approved' && l.start_date <= e.work_date && l.end_date >= e.work_date)) {
          warnings.push({ employee_id: s.id, date: e.work_date, code: 'ON_LEAVE' });
        }
      }
    }

    return {
      branch_id: branchId, from, to, days,
      employees: staff.map(s => ({
        id: s.id, full_name: s.full_name, emp_code: s.emp_code, job_title: s.job_title, phone: s.phone, photo_url: s.photo_url,
        lent: s.branch_id !== branchId,
      })),
      entries,
      elsewhere: elsewhere.map(e => ({ id: e.id, employee_id: e.employee_id, work_date: e.work_date, branch_id: e.branch_id, start_time: e.start_time, end_time: e.end_time })),
      leave: leave.map(l => ({ ...l, type_name: types.find(t => t.id === l.leave_type_id)?.name ?? '', color: types.find(t => t.id === l.leave_type_id)?.color ?? '#64748b' })),
      holidays, templates, warnings,
    };
  }

  /** Create or replace an employee's shift for a day. Approved leave blocks the day. */
  async saveEntry(ctx: HrCtx, dto: SaveRosterEntryDto) {
    await this.org.getBranch(ctx, dto.branch_id);
    const emp = await this.org.findEmployee(ctx, dto.employee_id);
    if (emp.status !== 'active') throw new BadRequestException('EMPLOYEE_INACTIVE');
    if (dto.start_time === dto.end_time) throw new BadRequestException('SHIFT_ZERO_LENGTH');
    if ((await this.approvedLeave(ctx.tenantId, [emp.id], dto.work_date, dto.work_date)).length) throw new ConflictException('ON_LEAVE');

    const existing = await this.rosterRepo.findOne({ where: { tenant_id: ctx.tenantId, employee_id: emp.id, work_date: dto.work_date } });
    if (existing) assertBranch(ctx, existing.branch_id);
    const entry = existing ?? this.rosterRepo.create({ tenant_id: ctx.tenantId, employee_id: emp.id, work_date: dto.work_date });
    Object.assign(entry, {
      branch_id: dto.branch_id, start_time: dto.start_time, end_time: dto.end_time, break_minutes: dto.break_minutes ?? 0,
      shift_template_id: dto.shift_template_id ?? null, note: dto.note?.trim() ?? '',
    });
    return this.rosterRepo.save(entry);
  }

  async deleteEntry(ctx: HrCtx, id: number) {
    const e = await this.rosterRepo.findOne({ where: { id, tenant_id: ctx.tenantId } });
    if (!e) throw new NotFoundException('Shift not found');
    assertBranch(ctx, e.branch_id);
    await this.rosterRepo.delete({ id });
    return { ok: true };
  }

  /** One shift template for many employees and days. Days on approved leave are skipped. */
  async bulkFill(ctx: HrCtx, dto: BulkRosterDto) {
    await this.org.getBranch(ctx, dto.branch_id);
    const tpl = await this.templateRepo.findOne({ where: { id: dto.shift_template_id, tenant_id: ctx.tenantId } });
    if (!tpl) throw new NotFoundException('Shift not found');
    const emps = await Promise.all(dto.employee_ids.map(id => this.org.findEmployee(ctx, id)));
    const dates = [...new Set(dto.dates)].sort();
    const leave = await this.approvedLeave(ctx.tenantId, emps.map(e => e.id), dates[0], dates[dates.length - 1]);
    const existing = await this.rosterRepo.find({ where: { tenant_id: ctx.tenantId, employee_id: In(emps.map(e => e.id)), work_date: In(dates) } });

    let created = 0, skipped = 0;
    for (const emp of emps.filter(e => e.status === 'active')) {
      for (const date of dates) {
        if (leave.some(l => l.employee_id === emp.id && l.start_date <= date && l.end_date >= date)) { skipped++; continue; }
        const cur = existing.find(e => e.employee_id === emp.id && e.work_date === date);
        if (cur && (!dto.overwrite || (ctx.branchIds !== null && !ctx.branchIds.includes(cur.branch_id)))) { skipped++; continue; }
        const entry = cur ?? this.rosterRepo.create({ tenant_id: ctx.tenantId, employee_id: emp.id, work_date: date });
        Object.assign(entry, {
          branch_id: dto.branch_id, start_time: tpl.start_time, end_time: tpl.end_time, break_minutes: tpl.break_minutes, shift_template_id: tpl.id,
        });
        await this.rosterRepo.save(entry);
        created++;
      }
    }
    return { created, skipped };
  }

  async copyWeek(ctx: HrCtx, dto: CopyWeekDto) {
    await this.org.getBranch(ctx, dto.branch_id);
    const from = weekStart(dto.from_week);
    const to = weekStart(dto.to_week);
    if (from === to) throw new BadRequestException('SAME_WEEK');
    const shift = Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
    const source = await this.rosterRepo.find({ where: { tenant_id: ctx.tenantId, branch_id: dto.branch_id, work_date: Between(from, addDays(from, 6)) } });
    const ids = [...new Set(source.map(s => s.employee_id))];
    const active = new Set((await this.org.employeesByIds(ctx.tenantId, ids)).filter(e => e.status === 'active').map(e => e.id));
    const leave = await this.approvedLeave(ctx.tenantId, ids, to, addDays(to, 6));
    const existing = ids.length ? await this.rosterRepo.find({ where: { tenant_id: ctx.tenantId, employee_id: In(ids), work_date: Between(to, addDays(to, 6)) } }) : [];

    let created = 0, skipped = 0;
    for (const s of source) {
      const date = addDays(s.work_date, shift);
      if (!active.has(s.employee_id) || leave.some(l => l.employee_id === s.employee_id && l.start_date <= date && l.end_date >= date)) { skipped++; continue; }
      const cur = existing.find(e => e.employee_id === s.employee_id && e.work_date === date);
      if (cur && (!dto.overwrite || (ctx.branchIds !== null && !ctx.branchIds.includes(cur.branch_id)))) { skipped++; continue; }
      const entry = cur ?? this.rosterRepo.create({ tenant_id: ctx.tenantId, employee_id: s.employee_id, work_date: date });
      Object.assign(entry, {
        branch_id: dto.branch_id, start_time: s.start_time, end_time: s.end_time, break_minutes: s.break_minutes,
        shift_template_id: s.shift_template_id, note: s.note,
      });
      await this.rosterRepo.save(entry);
      created++;
    }
    return { created, skipped };
  }

  /** Upcoming shifts for one employee (kiosk "my roster"). */
  async upcomingShifts(tenantId: number, employeeId: number, days = 14) {
    const today = localDate();
    return this.rosterRepo.find({
      where: { tenant_id: tenantId, employee_id: employeeId, work_date: Between(today, addDays(today, days - 1)) },
      order: { work_date: 'ASC' },
    });
  }

  // ───────── Shift swaps ─────────

  private async loadEntry(tenantId: number, id: number) {
    const e = await this.rosterRepo.findOne({ where: { id, tenant_id: tenantId } });
    if (!e) throw new NotFoundException('Shift not found');
    return e;
  }

  /** Throws when the swap can no longer be applied (someone would work twice on a day). */
  private async checkSwap(tenantId: number, entry: HrRosterEntry, targetId: number, targetEntry: HrRosterEntry | null) {
    if (entry.employee_id === targetId) throw new BadRequestException('SWAP_SAME_PERSON');
    if (entry.work_date < localDate()) throw new BadRequestException('SWAP_PAST_SHIFT');
    const target = await this.employeeRepo.findOne({ where: { id: targetId, tenant_id: tenantId } });
    if (!target || target.status !== 'active') throw new BadRequestException('EMPLOYEE_INACTIVE');
    if (targetEntry) {
      if (targetEntry.employee_id !== targetId) throw new BadRequestException('SWAP_ENTRY_MISMATCH');
      if (targetEntry.work_date !== entry.work_date) {
        const busyTarget = await this.rosterRepo.findOne({ where: { tenant_id: tenantId, employee_id: targetId, work_date: entry.work_date } });
        const busyRequester = await this.rosterRepo.findOne({ where: { tenant_id: tenantId, employee_id: entry.employee_id, work_date: targetEntry.work_date } });
        if (busyTarget || busyRequester) throw new ConflictException('SWAP_CONFLICT');
      }
    } else {
      const busy = await this.rosterRepo.findOne({ where: { tenant_id: tenantId, employee_id: targetId, work_date: entry.work_date } });
      if (busy) throw new ConflictException('SWAP_CONFLICT');
    }
    const leave = await this.approvedLeave(tenantId, [targetId], entry.work_date, entry.work_date);
    if (leave.length) throw new ConflictException('ON_LEAVE');
  }

  /**
   * Kiosk requests start with the colleague (pending_colleague). A manager recording a swap
   * both people already agreed is applied straight away.
   */
  async createSwap(ctx: HrCtx, dto: CreateSwapDto, fromKiosk: { employeeId: number } | null) {
    const entry = await this.loadEntry(ctx.tenantId, dto.entry_id);
    if (fromKiosk && entry.employee_id !== fromKiosk.employeeId) throw new ForbiddenException('This is not your shift');
    assertBranch(ctx, entry.branch_id);
    // The colleague must be someone this manager looks after (403 for another branch's staff)
    await this.org.findEmployee(ctx, dto.target_id);
    const targetEntry = dto.target_entry_id ? await this.loadEntry(ctx.tenantId, dto.target_entry_id) : null;
    await this.checkSwap(ctx.tenantId, entry, dto.target_id, targetEntry);
    const open = await this.swapRepo.findOne({ where: { tenant_id: ctx.tenantId, entry_id: entry.id, status: In(['pending_colleague', 'pending_manager']) } });
    if (open) throw new ConflictException('SWAP_ALREADY_REQUESTED');

    const swap = await this.swapRepo.save(this.swapRepo.create({
      tenant_id: ctx.tenantId, entry_id: entry.id, requester_id: entry.employee_id, target_id: dto.target_id,
      target_entry_id: targetEntry?.id ?? null, reason: dto.reason?.trim() ?? '',
      status: fromKiosk ? 'pending_colleague' : 'pending_manager',
    }));
    if (!fromKiosk) return this.decideSwap(ctx, swap.id, true);
    return swap;
  }

  /** The colleague answers on the kiosk. */
  async respondSwap(ctx: HrCtx, id: number, employeeId: number, accept: boolean) {
    const swap = await this.swapRepo.findOne({ where: { id, tenant_id: ctx.tenantId } });
    if (!swap || swap.target_id !== employeeId) throw new NotFoundException('Swap request not found');
    if (swap.status !== 'pending_colleague') throw new BadRequestException('SWAP_NOT_PENDING');
    swap.status = accept ? 'pending_manager' : 'rejected';
    return this.swapRepo.save(swap);
  }

  /** Manager approval applies the change to the roster; rejection just closes the request. */
  async decideSwap(ctx: HrCtx, id: number, approve: boolean) {
    const swap = await this.swapRepo.findOne({ where: { id, tenant_id: ctx.tenantId } });
    if (!swap) throw new NotFoundException('Swap request not found');
    if (!['pending_colleague', 'pending_manager'].includes(swap.status)) throw new BadRequestException('SWAP_NOT_PENDING');
    const entry = await this.loadEntry(ctx.tenantId, swap.entry_id);
    assertBranch(ctx, entry.branch_id);

    if (approve) {
      const targetEntry = swap.target_entry_id ? await this.rosterRepo.findOne({ where: { id: swap.target_entry_id, tenant_id: ctx.tenantId } }) : null;
      if (swap.target_entry_id && !targetEntry) throw new BadRequestException('SWAP_ENTRY_MISMATCH');
      await this.checkSwap(ctx.tenantId, entry, swap.target_id, targetEntry);
      if (!targetEntry) {
        entry.employee_id = swap.target_id;
        await this.rosterRepo.save(entry);
      } else if (targetEntry.work_date === entry.work_date) {
        // Same day: trade the shift details (one entry per person per day stays true throughout)
        const keys = ['branch_id', 'start_time', 'end_time', 'break_minutes', 'shift_template_id', 'note'] as const;
        const a = { ...entry }, b = { ...targetEntry };
        for (const k of keys) { (entry as any)[k] = b[k]; (targetEntry as any)[k] = a[k]; }
        await this.rosterRepo.save([entry, targetEntry]);
      } else {
        entry.employee_id = swap.target_id;
        targetEntry.employee_id = swap.requester_id;
        await this.rosterRepo.save([entry, targetEntry]);
      }
    }
    swap.status = approve ? 'approved' : 'rejected';
    swap.decided_by = ctx.userId;
    swap.decided_at = new Date();
    await this.swapRepo.save(swap);
    await this.account.log(ctx, approve ? 'swap.approve' : 'swap.reject', 'hr_shift_swap', swap.id, { entry_id: swap.entry_id });
    return swap;
  }

  async cancelSwap(ctx: HrCtx, id: number, employeeId: number) {
    const swap = await this.swapRepo.findOne({ where: { id, tenant_id: ctx.tenantId } });
    if (!swap || swap.requester_id !== employeeId) throw new NotFoundException('Swap request not found');
    if (!['pending_colleague', 'pending_manager'].includes(swap.status)) throw new BadRequestException('SWAP_NOT_PENDING');
    swap.status = 'cancelled';
    return this.swapRepo.save(swap);
  }

  /** Swap requests in the caller's branches, with names and shift details. */
  async listSwaps(ctx: HrCtx, q: { status?: string; employee_id?: number }) {
    const where: Record<string, unknown> = { tenant_id: ctx.tenantId };
    if (q.status === 'pending') where.status = In(['pending_colleague', 'pending_manager']);
    else if (q.status) where.status = q.status;
    let swaps = await this.swapRepo.find({ where, order: { created_at: 'DESC' }, take: 200 });
    if (q.employee_id) swaps = swaps.filter(s => s.requester_id === q.employee_id || s.target_id === q.employee_id);
    const entryIds = swaps.flatMap(s => [s.entry_id, s.target_entry_id]).filter((x): x is number => !!x);
    const entries = entryIds.length ? await this.rosterRepo.find({ where: { id: In(entryIds) } }) : [];
    const people = await this.org.employeesByIds(ctx.tenantId, swaps.flatMap(s => [s.requester_id, s.target_id]));
    const name = (id: number) => people.find(p => p.id === id)?.full_name ?? '';
    return swaps
      .map(s => ({ ...s, entry: entries.find(e => e.id === s.entry_id) ?? null, target_entry: entries.find(e => e.id === s.target_entry_id) ?? null }))
      .filter(s => s.entry && (ctx.branchIds === null || ctx.branchIds.includes(s.entry.branch_id)))
      .map(s => ({ ...s, requester_name: name(s.requester_id), target_name: name(s.target_id) }));
  }

  // ───────── Attendance ─────────

  /** The roster entry an attendance record belongs to: that day's, or last night's shift still running. */
  private async shiftFor(tenantId: number, employeeId: number, at: Date): Promise<HrRosterEntry | null> {
    const today = localDate(at);
    const rows = await this.rosterRepo.find({ where: { tenant_id: tenantId, employee_id: employeeId, work_date: In([today, addDays(today, -1)]) } });
    const yesterday = rows.find(r => r.work_date !== today);
    // An overnight shift (ends at or before it starts) from yesterday is still "today's" until 3 hours after it ends
    if (yesterday && yesterday.end_time <= yesterday.start_time) {
      const w = shiftWindow(yesterday.work_date, yesterday.start_time, yesterday.end_time);
      if (at.getTime() < w.end.getTime() + 3 * 3_600_000) return yesterday;
    }
    return rows.find(r => r.work_date === today) ?? null;
  }

  private async recompute(a: HrAttendance, settings: HrSettings) {
    const entry = await this.rosterRepo.findOne({ where: { tenant_id: a.tenant_id, employee_id: a.employee_id, work_date: a.work_date } });
    Object.assign(a, computeAttendance(new Date(a.clock_in), a.clock_out ? new Date(a.clock_out) : null, entry ? this.plan(entry) : null, settings));
  }

  /** Clocked in and not out yet (within the last 20 hours, so a forgotten clock-out doesn't stay open forever). */
  async openAttendance(tenantId: number, employeeId: number) {
    const since = new Date(Date.now() - 20 * 3_600_000);
    return this.attendanceRepo.findOne({
      where: { tenant_id: tenantId, employee_id: employeeId, clock_out: IsNull(), clock_in: MoreThanOrEqual(since) },
      order: { clock_in: 'DESC' },
    });
  }

  /** Kiosk punch: clock in when not clocked in, otherwise clock out. */
  async punch(ctx: HrCtx, emp: HrEmployee, branchId: number, photoUrl: string | null) {
    const settings = await this.account.getSettings(ctx.tenantId);
    if (settings.require_photo && !photoUrl) throw new BadRequestException('PHOTO_REQUIRED');
    const now = new Date();
    const open = await this.openAttendance(ctx.tenantId, emp.id);
    if (open) {
      if (now.getTime() - new Date(open.clock_in).getTime() < 60_000) throw new BadRequestException('PUNCH_TOO_SOON');
      open.clock_out = now;
      open.photo_out_url = photoUrl;
      await this.recompute(open, settings);
      return { action: 'out' as const, attendance: await this.attendanceRepo.save(open) };
    }
    const shift = await this.shiftFor(ctx.tenantId, emp.id, now);
    const a = this.attendanceRepo.create({
      tenant_id: ctx.tenantId, employee_id: emp.id, branch_id: shift?.branch_id ?? branchId,
      work_date: shift?.work_date ?? localDate(now), clock_in: now, clock_out: null, photo_in_url: photoUrl, source: 'kiosk',
    });
    await this.recompute(a, settings);
    return { action: 'in' as const, attendance: await this.attendanceRepo.save(a) };
  }

  /** "HH:MM" on a work date → instant; a clock-out earlier than the clock-in is the next morning. */
  private toInstants(date: string, inTime: string, outTime: string | null | undefined) {
    const clockIn = instantOf(date, inTime);
    let clockOut = outTime ? instantOf(date, outTime) : null;
    if (clockOut && clockOut.getTime() <= clockIn.getTime()) clockOut = new Date(clockOut.getTime() + 86_400_000);
    return { clockIn, clockOut };
  }

  async createManual(ctx: HrCtx, dto: ManualAttendanceDto) {
    const emp = await this.org.findEmployee(ctx, dto.employee_id);
    if (dto.work_date > localDate()) throw new BadRequestException('FUTURE_DATE');
    const settings = await this.account.getSettings(ctx.tenantId);
    const { clockIn, clockOut } = this.toInstants(dto.work_date, dto.clock_in, dto.clock_out);
    const entry = await this.rosterRepo.findOne({ where: { tenant_id: ctx.tenantId, employee_id: emp.id, work_date: dto.work_date } });
    const a = this.attendanceRepo.create({
      tenant_id: ctx.tenantId, employee_id: emp.id, branch_id: entry?.branch_id ?? emp.branch_id, work_date: dto.work_date,
      clock_in: clockIn, clock_out: clockOut, source: 'manual', note: dto.note?.trim() ?? '', edited_by: ctx.userId,
    });
    await this.recompute(a, settings);
    const saved = await this.attendanceRepo.save(a);
    await this.account.log(ctx, 'attendance.add', 'hr_attendance', saved.id, { name: emp.full_name, date: dto.work_date, in: dto.clock_in, out: dto.clock_out ?? null });
    return saved;
  }

  private async findAttendance(ctx: HrCtx, id: number) {
    const a = await this.attendanceRepo.findOne({ where: { id, tenant_id: ctx.tenantId } });
    if (!a) throw new NotFoundException('Attendance not found');
    await this.org.findEmployee(ctx, a.employee_id);
    return a;
  }

  /** Fix a punch: times are wall-clock on the record's work date. */
  async updateAttendance(ctx: HrCtx, id: number, dto: UpdateAttendanceDto) {
    const a = await this.findAttendance(ctx, id);
    const before = { in: localTime(new Date(a.clock_in)), out: a.clock_out ? localTime(new Date(a.clock_out)) : null };
    const inTime = dto.clock_in ?? before.in;
    const outTime = dto.clock_out === undefined ? before.out : dto.clock_out;
    const { clockIn, clockOut } = this.toInstants(a.work_date, inTime, outTime);
    a.clock_in = clockIn;
    a.clock_out = clockOut;
    if (dto.note !== undefined) a.note = dto.note.trim();
    a.edited_by = ctx.userId;
    await this.recompute(a, await this.account.getSettings(ctx.tenantId));
    const saved = await this.attendanceRepo.save(a);
    await this.account.log(ctx, 'attendance.edit', 'hr_attendance', a.id, { date: a.work_date, from: before, to: { in: inTime, out: outTime } });
    return saved;
  }

  async deleteAttendance(ctx: HrCtx, id: number) {
    const a = await this.findAttendance(ctx, id);
    await this.attendanceRepo.delete({ id: a.id });
    await this.account.log(ctx, 'attendance.delete', 'hr_attendance', a.id, { employee_id: a.employee_id, date: a.work_date });
    return { ok: true };
  }

  /**
   * Day-by-day picture of a period for a set of employees: shifts, punches, leave, holidays and
   * absences, plus the totals payroll needs. Days before joining, after leaving or in the future
   * are never expected (so never absent).
   */
  async periodActivity(tenantId: number, employees: HrEmployee[], from: string, to: string): Promise<Map<number, EmployeePeriod>> {
    const ids = employees.map(e => e.id);
    const out = new Map<number, EmployeePeriod>();
    if (!ids.length) return out;
    const [settings, entries, punches, leave, holidays, types] = await Promise.all([
      this.account.getSettings(tenantId),
      this.rosterRepo.find({ where: { tenant_id: tenantId, employee_id: In(ids), work_date: Between(from, to) } }),
      this.attendanceRepo.find({ where: { tenant_id: tenantId, employee_id: In(ids), work_date: Between(from, to) }, order: { clock_in: 'ASC' } }),
      this.approvedLeave(tenantId, ids, from, to),
      this.listHolidays(tenantId, from, to),
      this.leaveTypeRepo.find({ where: { tenant_id: tenantId } }),
    ]);
    const offDays = parseOffDays(settings.weekly_off_days);
    const holidayName = new Map(holidays.map(h => [h.holiday_date, h.name]));
    const today = localDate();

    for (const emp of employees) {
      const mine = entries.filter(e => e.employee_id === emp.id);
      const usesRoster = mine.length > 0;
      // No roster and no punches at all: this shop doesn't track this person's attendance, so nobody is absent
      const tracked = usesRoster || punches.some(p => p.employee_id === emp.id);
      // Before the join date nothing is expected; a missing join date means the day the record was added
      const joined = emp.join_date ?? localDate(new Date(emp.created_at));
      const days: DayInfo[] = [];
      const totals = { days_worked: 0, absent_days: 0, paid_leave_days: 0, unpaid_leave_days: 0, worked_minutes: 0, overtime_minutes: 0, late_minutes: 0, late_days: 0 };

      for (const date of dateRange(from, to)) {
        const employed = date >= joined && (!emp.leave_date || date <= emp.leave_date);
        const entry = mine.find(e => e.work_date === date) ?? null;
        const att = punches.filter(p => p.employee_id === emp.id && p.work_date === date);
        const lv = leave.find(l => l.employee_id === emp.id && l.start_date <= date && l.end_date >= date);
        const type = lv ? types.find(t => t.id === lv.leave_type_id) : undefined;
        const holiday = holidayName.get(date) ?? null;
        const workingDay = usesRoster ? !!entry : !offDays.includes(weekday(date)) && !holiday;
        const expected = employed && workingDay;
        // A leave day counts on any normal working day, roster or not: approving leave removes the shifts,
        // and weekly days off and holidays are never taken from the balance (same rule as leaveDays()).
        const leaveCounts = !!lv && employed && !offDays.includes(weekday(date)) && !holiday;
        // Today is never absent yet: the day sheet shows "not in" until the day is over
        const absent = tracked && expected && date < today && !att.length && !leaveCounts && !holiday;

        if (att.length) {
          totals.days_worked += 1;
          totals.worked_minutes += att.reduce((m, a) => m + a.worked_minutes, 0);
          totals.overtime_minutes += att.reduce((m, a) => m + a.overtime_minutes, 0);
          const late = att.reduce((m, a) => m + a.late_minutes, 0);
          totals.late_minutes += late;
          if (late) totals.late_days += 1;
        }
        if (absent) totals.absent_days += 1;
        if (leaveCounts && lv) {
          const share = lv.half_day ? 0.5 : 1;
          if (type?.paid === false) totals.unpaid_leave_days += share;
          else totals.paid_leave_days += share;
        }
        days.push({
          date, expected, shift: entry ? this.plan(entry) : null, attendance: att,
          leave: lv && leaveCounts ? { type: type?.name ?? '', paid: type?.paid !== false, half: lv.half_day, color: type?.color ?? '#64748b' } : null,
          holiday, absent,
        });
      }
      out.set(emp.id, { days, ...totals });
    }
    return out;
  }

  /** Scoped employees for a sheet: one branch or every branch the caller sees. */
  private async scopedEmployees(ctx: HrCtx, branchId?: number, includeLeftSince?: string) {
    const all = await this.employeeRepo.find({ where: { tenant_id: ctx.tenantId }, order: { full_name: 'ASC' } });
    return all.filter(e =>
      (e.status === 'active' || (includeLeftSince && e.leave_date && e.leave_date >= includeLeftSince)) &&
      (branchId ? e.branch_id === branchId : ctx.branchIds === null || (e.branch_id !== null && ctx.branchIds.includes(e.branch_id))));
  }

  /** Today (or any day) for a branch: who's in, late, absent, on leave or off. */
  async daySheet(ctx: HrCtx, date: string, branchId?: number) {
    if (branchId) assertBranch(ctx, branchId);
    let emps = await this.scopedEmployees(ctx, branchId, date);
    if (branchId) {
      // Staff lent in from another branch work here today, so they belong on this sheet (and kiosk)
      const lentIds = (await this.rosterRepo.find({ where: { tenant_id: ctx.tenantId, branch_id: branchId, work_date: date } }))
        .map(r => r.employee_id).filter(id => !emps.some(e => e.id === id));
      if (lentIds.length) emps = [...emps, ...(await this.org.employeesByIds(ctx.tenantId, lentIds)).filter(e => e.status === 'active')];
    }
    const activity = await this.periodActivity(ctx.tenantId, emps, date, date);
    const today = localDate();
    const now = localTime(new Date());
    const rows = emps.map(e => {
      const d = activity.get(e.id)!.days[0];
      const att = d.attendance;
      const open = att.find(a => !a.clock_out);
      let status: string;
      if (att.length) status = att.some(a => a.late_minutes > 0) ? 'late' : 'present';
      else if (d.leave) status = 'leave';
      else if (d.holiday) status = 'holiday';
      else if (!d.expected) status = 'off';
      else if (d.absent) status = 'absent';
      else if (date === today && d.shift && d.shift.start_time > now) status = 'upcoming';
      else status = date === today ? 'not_in' : 'absent';
      return {
        employee: { id: e.id, full_name: e.full_name, emp_code: e.emp_code, photo_url: e.photo_url, branch_id: e.branch_id, job_title: e.job_title },
        status, shift: d.shift, leave: d.leave, holiday: d.holiday, clocked_in: !!open,
        attendance: att.map(a => ({ ...a, in_time: localTime(new Date(a.clock_in)), out_time: a.clock_out ? localTime(new Date(a.clock_out)) : null })),
      };
    });
    const count = (s: string) => rows.filter(r => r.status === s).length;
    return {
      date, rows,
      summary: { present: count('present') + count('late'), late: count('late'), absent: count('absent') + count('not_in'), leave: count('leave'), off: count('off') + count('holiday'), upcoming: count('upcoming') },
    };
  }

  /** Month grid: one status letter per employee per day, plus totals. */
  async monthSheet(ctx: HrCtx, from: string, to: string, branchId?: number) {
    if (branchId) assertBranch(ctx, branchId);
    const emps = await this.scopedEmployees(ctx, branchId, from);
    const activity = await this.periodActivity(ctx.tenantId, emps, from, to);
    return {
      from, to, days: dateRange(from, to),
      rows: emps.map(e => {
        const a = activity.get(e.id)!;
        return {
          employee: { id: e.id, full_name: e.full_name, emp_code: e.emp_code, branch_id: e.branch_id },
          days: a.days.map(d => ({
            date: d.date,
            code: d.attendance.length ? (d.attendance.some(x => x.late_minutes > 0) ? 'L' : 'P') : d.leave ? 'V' : d.holiday ? 'H' : d.absent ? 'A' : d.expected ? '-' : 'O',
            worked: d.attendance.reduce((m, x) => m + x.worked_minutes, 0),
          })),
          totals: {
            present: a.days_worked, late: a.late_days, absent: a.absent_days, leave: a.paid_leave_days + a.unpaid_leave_days,
            worked_hours: Math.round(a.worked_minutes / 6) / 10, overtime_hours: Math.round(a.overtime_minutes / 6) / 10, late_minutes: a.late_minutes,
          },
        };
      }),
    };
  }

  /** Raw punches for one employee in a range (profile and kiosk). */
  async employeeAttendance(ctx: HrCtx, employeeId: number, from: string, to: string) {
    await this.org.findEmployee(ctx, employeeId);
    const rows = await this.attendanceRepo.find({ where: { tenant_id: ctx.tenantId, employee_id: employeeId, work_date: Between(from, to) }, order: { clock_in: 'DESC' } });
    return rows.map(a => ({ ...a, in_time: localTime(new Date(a.clock_in)), out_time: a.clock_out ? localTime(new Date(a.clock_out)) : null }));
  }

  // ───────── Leave ─────────

  async listLeaveTypes(tenantId: number, includeInactive = false) {
    return this.leaveTypeRepo.find({ where: { tenant_id: tenantId, ...(includeInactive ? {} : { is_active: true }) }, order: { id: 'ASC' } });
  }

  async saveLeaveType(ctx: HrCtx, dto: SaveLeaveTypeDto, id?: number) {
    const t = id ? await this.leaveTypeRepo.findOne({ where: { id, tenant_id: ctx.tenantId } }) : this.leaveTypeRepo.create({ tenant_id: ctx.tenantId });
    if (!t) throw new NotFoundException('Leave type not found');
    Object.assign(t, {
      name: dto.name.trim(), days_per_year: dto.days_per_year, paid: dto.paid ?? t.paid ?? true,
      color: (dto.color ?? t.color ?? '#16a34a').toLowerCase(), is_active: dto.is_active ?? t.is_active ?? true,
    });
    return this.leaveTypeRepo.save(t);
  }

  /** Entitlement, taken, pending and left per leave type for a calendar year. 0 days a year = no limit. */
  async balances(tenantId: number, employeeId: number, year: number) {
    const types = await this.listLeaveTypes(tenantId);
    const reqs = await this.leaveRepo.find({
      where: { tenant_id: tenantId, employee_id: employeeId, status: In(['approved', 'pending']), start_date: Between(`${year}-01-01`, `${year}-12-31`) },
    });
    return types.map(t => {
      const mine = reqs.filter(r => r.leave_type_id === t.id);
      const used = mine.filter(r => r.status === 'approved').reduce((s, r) => s + r.days, 0);
      const pending = mine.filter(r => r.status === 'pending').reduce((s, r) => s + r.days, 0);
      const limited = t.days_per_year > 0;
      return {
        leave_type_id: t.id, name: t.name, paid: t.paid, color: t.color,
        entitled: limited ? t.days_per_year : null, used, pending,
        remaining: limited ? Math.max(0, t.days_per_year - used - pending) : null,
      };
    });
  }

  async requestLeave(ctx: HrCtx, employeeId: number, dto: LeaveRequestFields, approve: boolean) {
    const emp = await this.org.findEmployee(ctx, employeeId);
    if (emp.status !== 'active') throw new BadRequestException('EMPLOYEE_INACTIVE');
    if (dto.end_date < dto.start_date) throw new BadRequestException('LEAVE_DATES');
    if (dateRange(dto.start_date, dto.end_date).length > MAX_LEAVE_SPAN_DAYS) throw new BadRequestException('LEAVE_TOO_LONG');
    const type = await this.leaveTypeRepo.findOne({ where: { id: dto.leave_type_id, tenant_id: ctx.tenantId, is_active: true } });
    if (!type) throw new NotFoundException('Leave type not found');
    const halfDay = !!dto.half_day && dto.start_date === dto.end_date;

    const overlap = await this.leaveRepo.findOne({
      where: { tenant_id: ctx.tenantId, employee_id: emp.id, status: In(['approved', 'pending']), start_date: LessThanOrEqual(dto.end_date), end_date: MoreThanOrEqual(dto.start_date) },
    });
    if (overlap) throw new ConflictException('LEAVE_OVERLAP');

    const settings = await this.account.getSettings(ctx.tenantId);
    const holidays = new Set((await this.listHolidays(ctx.tenantId, dto.start_date, dto.end_date)).map(h => h.holiday_date));
    const days = leaveDays(dto.start_date, dto.end_date, halfDay, parseOffDays(settings.weekly_off_days), holidays);
    if (days <= 0) throw new BadRequestException('LEAVE_NO_WORKING_DAYS');
    if (type.days_per_year > 0) {
      const bal = (await this.balances(ctx.tenantId, emp.id, Number(dto.start_date.slice(0, 4)))).find(b => b.leave_type_id === type.id);
      if (bal && bal.remaining !== null && days > bal.remaining) throw new BadRequestException({ statusCode: 400, code: 'LEAVE_BALANCE', remaining: bal.remaining, message: 'LEAVE_BALANCE' });
    }

    const req = await this.leaveRepo.save(this.leaveRepo.create({
      tenant_id: ctx.tenantId, employee_id: emp.id, leave_type_id: type.id, start_date: dto.start_date, end_date: dto.end_date,
      half_day: halfDay, days, reason: dto.reason?.trim() ?? '', status: 'pending',
    }));
    await this.account.log(ctx, 'leave.request', 'hr_leave_request', req.id, { name: emp.full_name, type: type.name, from: req.start_date, to: req.end_date, days });
    return approve ? this.decideLeave(ctx, req.id, 'approved') : req;
  }

  /** Approving takes the employee off the roster for those days. */
  async decideLeave(ctx: HrCtx, id: number, status: 'approved' | 'rejected' | 'cancelled', note?: string) {
    const req = await this.leaveRepo.findOne({ where: { id, tenant_id: ctx.tenantId } });
    if (!req) throw new NotFoundException('Leave request not found');
    const emp = await this.org.findEmployee(ctx, req.employee_id);
    if (status === 'cancelled' ? !['pending', 'approved'].includes(req.status) : req.status !== 'pending') {
      throw new BadRequestException('LEAVE_NOT_PENDING');
    }
    req.status = status;
    req.decided_by = ctx.userId;
    req.decided_at = new Date();
    req.decision_note = note?.trim() ?? '';
    await this.leaveRepo.save(req);
    let removedShifts = 0;
    if (status === 'approved' && !req.half_day) {
      const res = await this.rosterRepo.delete({ tenant_id: ctx.tenantId, employee_id: req.employee_id, work_date: Between(req.start_date, req.end_date) });
      removedShifts = res.affected ?? 0;
    }
    await this.account.log(ctx, `leave.${status}`, 'hr_leave_request', req.id, { name: emp.full_name, from: req.start_date, to: req.end_date });
    return { ...req, removed_shifts: removedShifts };
  }

  async listLeave(ctx: HrCtx, q: { status?: string; branch_id?: number; employee_id?: number; from?: string; to?: string }) {
    if (q.branch_id) assertBranch(ctx, q.branch_id);
    const qb = this.leaveRepo.createQueryBuilder('l')
      .innerJoin(HrEmployee, 'e', 'e.id = l.employee_id')
      .addSelect(['e.full_name', 'e.emp_code', 'e.branch_id', 'e.photo_url'])
      .where('l.tenant_id = :t', { t: ctx.tenantId });
    if (q.status) qb.andWhere('l.status = :s', { s: q.status });
    if (q.employee_id) qb.andWhere('l.employee_id = :emp', { emp: q.employee_id });
    if (q.branch_id) qb.andWhere('e.branch_id = :b', { b: q.branch_id });
    else if (ctx.branchIds !== null) qb.andWhere('e.branch_id IN (:...ids)', { ids: ctx.branchIds.length ? ctx.branchIds : [0] });
    if (q.from) qb.andWhere('l.end_date >= :from', { from: q.from });
    if (q.to) qb.andWhere('l.start_date <= :to', { to: q.to });
    const { entities, raw } = await qb.orderBy('l.start_date', 'DESC').limit(500).getRawAndEntities();
    const types = await this.listLeaveTypes(ctx.tenantId, true);
    return entities.map((l, i) => {
      const t = types.find(x => x.id === l.leave_type_id);
      return {
        ...l, type_name: t?.name ?? '', type_color: t?.color ?? '#64748b', paid: t?.paid ?? true,
        employee_name: raw[i]?.e_full_name ?? '', emp_code: raw[i]?.e_emp_code ?? '', branch_id: raw[i]?.e_branch_id ?? null, photo_url: raw[i]?.e_photo_url ?? null,
      };
    });
  }
}
