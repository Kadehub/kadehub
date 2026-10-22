import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, IsNull, Repository } from 'typeorm';
import { HrEmployee } from '../../database/entities/hr-core.entity';
import { HrLeaveRequest, HrRosterEntry } from '../../database/entities/hr-time.entity';
import { HrPayrollRun, HrPayslip } from '../../database/entities/hr-payroll.entity';
import { HrApplicant, HrAsset, HrAssetAssignment, HrJobPost } from '../../database/entities/hr-talent.entity';
import { HrTimeService } from './hr-time.service';
import { HrOrgService } from './hr-org.service';
import { assertBranch, type HrCtx } from './hr-access';
import { addDays, localDate, periodRange, round2, shiftMinutes } from './hr-calc';

export const HR_REPORTS = ['payroll', 'attendance', 'leave', 'roster', 'hiring', 'assets'] as const;
export type HrReportKey = (typeof HR_REPORTS)[number];

@Injectable()
export class HrReportsService {
  constructor(
    private time: HrTimeService,
    private org: HrOrgService,
    @InjectRepository(HrEmployee) private employeeRepo: Repository<HrEmployee>,
    @InjectRepository(HrLeaveRequest) private leaveRepo: Repository<HrLeaveRequest>,
    @InjectRepository(HrRosterEntry) private rosterRepo: Repository<HrRosterEntry>,
    @InjectRepository(HrPayrollRun) private runRepo: Repository<HrPayrollRun>,
    @InjectRepository(HrPayslip) private slipRepo: Repository<HrPayslip>,
    @InjectRepository(HrJobPost) private jobRepo: Repository<HrJobPost>,
    @InjectRepository(HrApplicant) private applicantRepo: Repository<HrApplicant>,
    @InjectRepository(HrAsset) private assetRepo: Repository<HrAsset>,
    @InjectRepository(HrAssetAssignment) private assignmentRepo: Repository<HrAssetAssignment>,
  ) {}

  private async employees(ctx: HrCtx, branchId?: number, activeOnly = true) {
    if (branchId) assertBranch(ctx, branchId);
    const all = await this.employeeRepo.find({ where: { tenant_id: ctx.tenantId, ...(activeOnly ? { status: 'active' } : {}) }, order: { full_name: 'ASC' } });
    return all.filter(e => branchId ? e.branch_id === branchId : ctx.branchIds === null || (e.branch_id !== null && ctx.branchIds.includes(e.branch_id)));
  }

  /** Home screen: today at a glance and what's waiting for a decision. */
  async dashboard(ctx: HrCtx, branchId?: number) {
    const today = localDate();
    const emps = await this.employees(ctx, branchId);
    const ids = emps.map(e => e.id);
    const [day, pendingLeave, swaps, jobs, assetsOut, lastRun] = await Promise.all([
      this.time.daySheet(ctx, today, branchId),
      ids.length ? this.leaveRepo.count({ where: { tenant_id: ctx.tenantId, status: 'pending', employee_id: In(ids) } }) : 0,
      this.time.listSwaps(ctx, { status: 'pending_manager' }),
      this.jobRepo.find({ where: { tenant_id: ctx.tenantId, status: 'open' } }),
      ids.length ? this.assignmentRepo.count({ where: { tenant_id: ctx.tenantId, returned_date: IsNull(), employee_id: In(ids) } }) : 0,
      ctx.owner ? this.runRepo.findOne({ where: { tenant_id: ctx.tenantId }, order: { period: 'DESC', id: 'DESC' } }) : null,
    ]);
    // Swaps follow the branch picked in the header, like every other count here
    const branchSwaps = branchId ? swaps.filter(s => s.entry?.branch_id === branchId) : swaps;
    const visibleJobs = jobs.filter(j => ctx.branchIds === null || (j.branch_id !== null && ctx.branchIds.includes(j.branch_id)));
    const newApplicants = visibleJobs.length
      ? await this.applicantRepo.count({ where: { tenant_id: ctx.tenantId, job_id: In(visibleJobs.map(j => j.id)), stage: 'new' } })
      : 0;

    // Birthdays and work anniversaries in the next 14 days (month-day comparison, wrapping at year end)
    const window = Array.from({ length: 14 }, (_, i) => addDays(today, i).slice(5));
    const birthdays = emps
      .filter(e => e.dob && window.includes(e.dob.slice(5)))
      .map(e => ({ id: e.id, full_name: e.full_name, photo_url: e.photo_url, date: e.dob!.slice(5), in_days: window.indexOf(e.dob!.slice(5)) }))
      .sort((a, b) => a.in_days - b.in_days);
    const anniversaries = emps
      .filter(e => e.join_date && e.join_date.slice(0, 4) < today.slice(0, 4) && window.includes(e.join_date.slice(5)))
      .map(e => ({ id: e.id, full_name: e.full_name, years: Number(today.slice(0, 4)) - Number(e.join_date!.slice(0, 4)), in_days: window.indexOf(e.join_date!.slice(5)) }))
      .sort((a, b) => a.in_days - b.in_days);

    return {
      date: today,
      employees: emps.length,
      today: day.summary,
      not_in: day.rows.filter(r => r.status === 'not_in').map(r => ({ ...r.employee, shift: r.shift })),
      on_leave: day.rows.filter(r => r.status === 'leave').map(r => ({ ...r.employee, leave: r.leave })),
      late: day.rows.filter(r => r.status === 'late').map(r => ({ ...r.employee, late_minutes: r.attendance.reduce((m, a) => m + a.late_minutes, 0) })),
      pending: { leave: pendingLeave, swaps: branchSwaps.length, new_applicants: newApplicants },
      open_jobs: visibleJobs.length,
      assets_out: assetsOut,
      birthdays, anniversaries,
      last_run: lastRun ? { id: lastRun.id, period: lastRun.period, status: lastRun.status, total_net: lastRun.total_net } : null,
    };
  }

  async report(ctx: HrCtx, key: HrReportKey, q: { period: string; branch_id?: number }) {
    switch (key) {
      case 'payroll': return this.payrollReport(ctx, q.period, q.branch_id);
      case 'attendance': return this.attendanceReport(ctx, q.period, q.branch_id);
      case 'leave': return this.leaveReport(ctx, q.period, q.branch_id);
      case 'roster': return this.rosterReport(ctx, q.period, q.branch_id);
      case 'hiring': return this.hiringReport(ctx);
      case 'assets': return this.assetsReport(ctx, q.branch_id);
    }
  }

  /** Owner only (the controller checks): every payslip for the month across runs. */
  private async payrollReport(ctx: HrCtx, period: string, branchId?: number) {
    const runs = await this.runRepo.find({ where: { tenant_id: ctx.tenantId, period } });
    const slips = runs.length ? await this.slipRepo.find({ where: { run_id: In(runs.map(r => r.id)) } }) : [];
    const people = await this.org.employeesByIds(ctx.tenantId, slips.map(s => s.employee_id));
    const rows = slips
      .map(s => ({ s, e: people.find(p => p.id === s.employee_id) }))
      .filter(({ e }) => !branchId || e?.branch_id === branchId)
      .map(({ s, e }) => ({
        emp_code: e?.emp_code ?? '', name: e?.full_name ?? '', base_pay: s.base_pay, nopay: s.nopay_deduction, overtime: s.overtime_pay,
        allowances: s.allowances, bonus: round2(s.bonus + s.other_earnings), gross: s.gross, epf_employee: s.epf_employee,
        advances: s.advance_deduction, other_deductions: round2(s.late_deduction + s.asset_deduction + s.other_deductions),
        net: s.net_pay, epf_employer: s.epf_employer, etf_employer: s.etf_employer,
        status: s.paid_at ? 'paid' : runs.find(r => r.id === s.run_id)?.status ?? '',
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    const sum = (k: keyof (typeof rows)[number]) => round2(rows.reduce((t, r) => t + (r[k] as number), 0));
    return {
      columns: ['emp_code', 'name', 'base_pay', 'nopay', 'overtime', 'allowances', 'bonus', 'gross', 'epf_employee', 'advances', 'other_deductions', 'net', 'epf_employer', 'etf_employer', 'status'],
      money: ['base_pay', 'nopay', 'overtime', 'allowances', 'bonus', 'gross', 'epf_employee', 'advances', 'other_deductions', 'net', 'epf_employer', 'etf_employer'],
      rows,
      totals: { gross: sum('gross'), net: sum('net'), epf_employee: sum('epf_employee'), epf_employer: sum('epf_employer'), etf_employer: sum('etf_employer') },
    };
  }

  private async attendanceReport(ctx: HrCtx, period: string, branchId?: number) {
    const { from, to } = periodRange(period);
    const sheet = await this.time.monthSheet(ctx, from, to, branchId);
    const rows = sheet.rows.map(r => ({
      emp_code: r.employee.emp_code, name: r.employee.full_name,
      present: r.totals.present, late: r.totals.late, late_minutes: r.totals.late_minutes, absent: r.totals.absent, leave: r.totals.leave,
      worked_hours: r.totals.worked_hours, overtime_hours: r.totals.overtime_hours,
    }));
    return {
      columns: ['emp_code', 'name', 'present', 'late', 'late_minutes', 'absent', 'leave', 'worked_hours', 'overtime_hours'],
      money: [], rows,
      totals: { present: rows.reduce((s, r) => s + r.present, 0), absent: rows.reduce((s, r) => s + r.absent, 0), overtime_hours: round2(rows.reduce((s, r) => s + r.overtime_hours, 0)) },
    };
  }

  /** Balances for the period's year per leave type, plus days taken in the month. */
  private async leaveReport(ctx: HrCtx, period: string, branchId?: number) {
    const emps = await this.employees(ctx, branchId);
    const year = Number(period.slice(0, 4));
    const { from, to } = periodRange(period);
    const types = await this.time.listLeaveTypes(ctx.tenantId);
    const month = emps.length ? await this.leaveRepo.find({
      where: { tenant_id: ctx.tenantId, employee_id: In(emps.map(e => e.id)), status: 'approved', start_date: Between(from, to) },
    }) : [];
    const rows = [];
    for (const e of emps) {
      const bal = await this.time.balances(ctx.tenantId, e.id, year);
      const row: Record<string, string | number> = { emp_code: e.emp_code, name: e.full_name, taken_this_month: month.filter(m => m.employee_id === e.id).reduce((s, m) => s + m.days, 0) };
      for (const b of bal) row[`type_${b.leave_type_id}`] = b.entitled === null ? `${b.used}` : `${b.used} / ${b.entitled}`;
      rows.push(row);
    }
    return {
      columns: ['emp_code', 'name', ...types.map(t => `type_${t.id}`), 'taken_this_month'],
      labels: Object.fromEntries(types.map(t => [`type_${t.id}`, t.name])),
      money: [], rows, totals: {},
    };
  }

  /** Scheduled hours from the roster against hours actually worked. */
  private async rosterReport(ctx: HrCtx, period: string, branchId?: number) {
    const { from, to } = periodRange(period);
    const emps = await this.employees(ctx, branchId);
    const entries = emps.length ? await this.rosterRepo.find({ where: { tenant_id: ctx.tenantId, employee_id: In(emps.map(e => e.id)), work_date: Between(from, to) } }) : [];
    const activity = await this.time.periodActivity(ctx.tenantId, emps, from, to);
    const rows = emps.map(e => {
      const mine = entries.filter(x => x.employee_id === e.id);
      const scheduled = mine.reduce((m, x) => m + shiftMinutes(x.start_time, x.end_time, x.break_minutes), 0);
      const a = activity.get(e.id)!;
      return {
        emp_code: e.emp_code, name: e.full_name, shifts: mine.length,
        scheduled_hours: round2(scheduled / 60), worked_hours: round2(a.worked_minutes / 60), overtime_hours: round2(a.overtime_minutes / 60),
        difference: round2((a.worked_minutes - scheduled) / 60),
      };
    });
    return {
      columns: ['emp_code', 'name', 'shifts', 'scheduled_hours', 'worked_hours', 'overtime_hours', 'difference'],
      money: [], rows,
      totals: { scheduled_hours: round2(rows.reduce((s, r) => s + r.scheduled_hours, 0)), worked_hours: round2(rows.reduce((s, r) => s + r.worked_hours, 0)) },
    };
  }

  private async hiringReport(ctx: HrCtx) {
    const jobs = (await this.jobRepo.find({ where: { tenant_id: ctx.tenantId }, order: { created_at: 'DESC' } }))
      .filter(j => ctx.branchIds === null || (j.branch_id !== null && ctx.branchIds.includes(j.branch_id)));
    const apps = jobs.length ? await this.applicantRepo.find({ where: { tenant_id: ctx.tenantId, job_id: In(jobs.map(j => j.id)) } }) : [];
    const rows = jobs.map(j => {
      const mine = apps.filter(a => a.job_id === j.id);
      const n = (s: string) => mine.filter(a => a.stage === s).length;
      const hired = mine.filter(a => a.stage === 'hired');
      const days = hired.map(a => (new Date(a.updated_at).getTime() - new Date(a.created_at).getTime()) / 86_400_000);
      return {
        title: j.title, status: j.status, applicants: mine.length, new: n('new'), shortlisted: n('shortlisted'), interview: n('interview'),
        offered: n('offered'), hired: n('hired'), rejected: n('rejected'),
        avg_days_to_hire: days.length ? round2(days.reduce((s, d) => s + d, 0) / days.length) : '',
      };
    });
    return {
      columns: ['title', 'status', 'applicants', 'new', 'shortlisted', 'interview', 'offered', 'hired', 'rejected', 'avg_days_to_hire'],
      money: [], rows,
      totals: { applicants: apps.length, hired: apps.filter(a => a.stage === 'hired').length },
    };
  }

  private async assetsReport(ctx: HrCtx, branchId?: number) {
    if (branchId) assertBranch(ctx, branchId);
    const assets = (await this.assetRepo.find({ where: { tenant_id: ctx.tenantId, ...(branchId ? { branch_id: branchId } : {}) }, order: { code: 'ASC' } }))
      .filter(a => ctx.branchIds === null || (a.branch_id !== null && ctx.branchIds.includes(a.branch_id)));
    const open = assets.length ? await this.assignmentRepo.find({ where: { tenant_id: ctx.tenantId, asset_id: In(assets.map(a => a.id)), returned_date: IsNull() } }) : [];
    const people = await this.org.employeesByIds(ctx.tenantId, open.map(o => o.employee_id));
    const rows = assets.map(a => {
      const cur = open.find(o => o.asset_id === a.id);
      const holder = cur ? people.find(p => p.id === cur.employee_id) : undefined;
      return {
        code: a.code, name: a.name, category: a.category, value: a.value, status: a.status,
        holder: holder?.full_name ?? '', holder_status: holder?.status ?? '', issued_date: cur?.issued_date ?? '',
      };
    });
    return {
      columns: ['code', 'name', 'category', 'value', 'status', 'holder', 'holder_status', 'issued_date'],
      money: ['value'], rows,
      totals: {
        value: round2(rows.reduce((s, r) => s + r.value, 0)),
        issued: rows.filter(r => r.status === 'issued').length,
        // Issued to someone who has left: chase these first
        with_leavers: rows.filter(r => r.holder && r.holder_status !== 'active').length,
      },
    };
  }
}
