import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { HrEmployee, HrSettings } from '../../database/entities/hr-core.entity';
import {
  HR_REVIEW_AREAS, HrApplicant, HrAsset, HrAssetAssignment, HrInterviewNote, HrJobPost, HrReview, HrWarning,
} from '../../database/entities/hr-talent.entity';
import { HrAccountService } from './hr-account.service';
import { HrOrgService } from './hr-org.service';
import { assertBranch, type HrCtx } from './hr-access';
import { localDate, round2 } from './hr-calc';
import type {
  HireApplicantDto, InterviewNoteDto, IssueAssetDto, PublicApplyDto, ReturnAssetDto, SaveApplicantDto, SaveAssetDto, SaveJobDto,
  SaveReviewDto, SaveWarningDto, UpdateApplicantDto,
} from './hr.dto';

/** Jobs without a branch are visible to the owner only. */
function canSeeBranch(ctx: HrCtx, branchId: number | null) {
  return ctx.branchIds === null || (branchId !== null && ctx.branchIds.includes(branchId));
}

@Injectable()
export class HrTalentService {
  constructor(
    private account: HrAccountService,
    private org: HrOrgService,
    @InjectRepository(HrSettings) private settingsRepo: Repository<HrSettings>,
    @InjectRepository(HrEmployee) private employeeRepo: Repository<HrEmployee>,
    @InjectRepository(HrJobPost) private jobRepo: Repository<HrJobPost>,
    @InjectRepository(HrApplicant) private applicantRepo: Repository<HrApplicant>,
    @InjectRepository(HrInterviewNote) private noteRepo: Repository<HrInterviewNote>,
    @InjectRepository(HrReview) private reviewRepo: Repository<HrReview>,
    @InjectRepository(HrWarning) private warningRepo: Repository<HrWarning>,
    @InjectRepository(HrAsset) private assetRepo: Repository<HrAsset>,
    @InjectRepository(HrAssetAssignment) private assignmentRepo: Repository<HrAssetAssignment>,
  ) {}

  // ───────── Jobs ─────────

  async listJobs(ctx: HrCtx) {
    const jobs = (await this.jobRepo.find({ where: { tenant_id: ctx.tenantId }, order: { created_at: 'DESC' } })).filter(j => canSeeBranch(ctx, j.branch_id));
    const counts: Array<{ job_id: number; stage: string; n: string }> = jobs.length
      ? await this.applicantRepo.createQueryBuilder('a').select('a.job_id', 'job_id').addSelect('a.stage', 'stage').addSelect('COUNT(*)', 'n')
        .where('a.tenant_id = :t', { t: ctx.tenantId }).groupBy('a.job_id').addGroupBy('a.stage').getRawMany()
      : [];
    return jobs.map(j => {
      const mine = counts.filter(c => Number(c.job_id) === j.id);
      const by = Object.fromEntries(mine.map(c => [c.stage, Number(c.n)]));
      return { ...j, applicant_count: mine.reduce((s, c) => s + Number(c.n), 0), by_stage: by };
    });
  }

  private async findJob(ctx: HrCtx, id: number) {
    const j = await this.jobRepo.findOne({ where: { id, tenant_id: ctx.tenantId } });
    if (!j || !canSeeBranch(ctx, j.branch_id)) throw new NotFoundException('Job not found');
    return j;
  }

  async saveJob(ctx: HrCtx, dto: SaveJobDto, id?: number) {
    const job = id ? await this.findJob(ctx, id) : this.jobRepo.create({ tenant_id: ctx.tenantId, token: randomBytes(9).toString('base64url'), status: 'open' });
    const branchId = dto.branch_id ?? (ctx.branchIds?.length === 1 ? ctx.branchIds[0] : null);
    if (branchId !== null || !ctx.owner) assertBranch(ctx, branchId);
    if ((dto.salary_max ?? 0) > 0 && (dto.salary_min ?? 0) > (dto.salary_max ?? 0)) throw new BadRequestException('SALARY_RANGE');
    Object.assign(job, {
      branch_id: branchId, title: dto.title.trim(), description: dto.description?.trim() || null,
      employment_type: dto.employment_type ?? job.employment_type ?? 'full_time',
      salary_min: dto.salary_min ?? 0, salary_max: dto.salary_max ?? 0,
      status: dto.status ?? job.status ?? 'open', closes_at: dto.closes_at || null,
    });
    const saved = await this.jobRepo.save(job);
    if (!id) await this.account.log(ctx, 'job.create', 'hr_job_post', saved.id, { title: saved.title });
    return saved;
  }

  async deleteJob(ctx: HrCtx, id: number) {
    const job = await this.findJob(ctx, id);
    await this.jobRepo.delete({ id: job.id });
    await this.account.log(ctx, 'job.delete', 'hr_job_post', job.id, { title: job.title });
    return { ok: true };
  }

  // ───────── Public job page ─────────

  private async openJobByToken(token: string) {
    const job = await this.jobRepo.findOne({ where: { token } });
    if (!job || job.status !== 'open' || (job.closes_at && job.closes_at < localDate())) throw new NotFoundException('JOB_CLOSED');
    return job;
  }

  /** What anyone with the link sees. No ids, no internal data. */
  async publicJob(token: string) {
    const job = await this.openJobByToken(token);
    const s = await this.settingsRepo.findOne({ where: { tenant_id: job.tenant_id } });
    return {
      title: job.title, description: job.description, employment_type: job.employment_type,
      salary_min: job.salary_min, salary_max: job.salary_max, closes_at: job.closes_at, posted_at: job.created_at,
      business: { name: s?.business_name ?? '', logo_url: s?.logo_url ?? null, brand_color: s?.brand_color ?? '#7c3aed', address: s?.address ?? '' },
    };
  }

  async publicApply(token: string, dto: PublicApplyDto, cvUrl: string | null) {
    // Bots fill the hidden field; pretend it worked
    if (dto.website?.trim()) return { ok: true };
    const job = await this.openJobByToken(token);
    const phone = dto.phone.trim();
    const dup = await this.applicantRepo.findOne({ where: { job_id: job.id, phone } });
    if (dup) throw new ConflictException('ALREADY_APPLIED');
    const recent = await this.applicantRepo.count({ where: { job_id: job.id, source: 'public' } });
    if (recent >= 1000) throw new BadRequestException('JOB_FULL');
    await this.applicantRepo.save(this.applicantRepo.create({
      tenant_id: job.tenant_id, job_id: job.id, name: dto.name.trim(), phone, email: dto.email?.trim() ?? '',
      cover_note: dto.cover_note?.trim() || null, cv_url: cvUrl, source: 'public', stage: 'new',
    }));
    return { ok: true };
  }

  // ───────── Applicants ─────────

  async listApplicants(ctx: HrCtx, jobId?: number) {
    const jobs = await this.listJobs(ctx);
    const jobIds = jobId ? jobs.filter(j => j.id === jobId).map(j => j.id) : jobs.map(j => j.id);
    if (!jobIds.length) return [];
    const rows = await this.applicantRepo.find({ where: { tenant_id: ctx.tenantId, job_id: In(jobIds) }, order: { created_at: 'DESC' } });
    return rows.map(a => ({ ...a, job_title: jobs.find(j => j.id === a.job_id)?.title ?? '' }));
  }

  private async findApplicant(ctx: HrCtx, id: number) {
    const a = await this.applicantRepo.findOne({ where: { id, tenant_id: ctx.tenantId } });
    if (!a) throw new NotFoundException('Applicant not found');
    await this.findJob(ctx, a.job_id);
    return a;
  }

  async getApplicant(ctx: HrCtx, id: number) {
    const a = await this.findApplicant(ctx, id);
    const notes = await this.noteRepo.find({ where: { applicant_id: a.id }, order: { created_at: 'DESC' } });
    const job = await this.findJob(ctx, a.job_id);
    return { ...a, job_title: job.title, notes };
  }

  async createApplicant(ctx: HrCtx, dto: SaveApplicantDto, cvUrl: string | null) {
    const job = await this.findJob(ctx, dto.job_id);
    return this.applicantRepo.save(this.applicantRepo.create({
      tenant_id: ctx.tenantId, job_id: job.id, name: dto.name.trim(), phone: dto.phone?.trim() ?? '', email: dto.email?.trim() ?? '',
      cover_note: dto.cover_note?.trim() || null, cv_url: cvUrl, source: 'manual', stage: 'new',
    }));
  }

  async updateApplicant(ctx: HrCtx, id: number, dto: UpdateApplicantDto) {
    const a = await this.findApplicant(ctx, id);
    if (dto.stage === 'hired' && !a.employee_id) throw new BadRequestException('USE_HIRE');
    if (dto.stage !== undefined) a.stage = dto.stage;
    if (dto.rating !== undefined) a.rating = dto.rating;
    if (dto.interview_at !== undefined) {
      const at = dto.interview_at ? new Date(dto.interview_at) : null;
      if (at && Number.isNaN(at.getTime())) throw new BadRequestException('BAD_DATE');
      a.interview_at = at;
      if (at && ['new', 'shortlisted'].includes(a.stage)) a.stage = 'interview';
    }
    if (dto.name !== undefined) a.name = dto.name.trim();
    if (dto.phone !== undefined) a.phone = dto.phone.trim();
    if (dto.email !== undefined) a.email = dto.email.trim();
    return this.applicantRepo.save(a);
  }

  async deleteApplicant(ctx: HrCtx, id: number) {
    const a = await this.findApplicant(ctx, id);
    await this.applicantRepo.delete({ id: a.id });
    return { ok: true };
  }

  async addNote(ctx: HrCtx, applicantId: number, dto: InterviewNoteDto) {
    const a = await this.findApplicant(ctx, applicantId);
    return this.noteRepo.save(this.noteRepo.create({
      tenant_id: ctx.tenantId, applicant_id: a.id, author_id: ctx.userId, author_name: ctx.userName, note: dto.note.trim(), rating: dto.rating ?? 0,
    }));
  }

  /** Turns the applicant into an employee (plan limit applies) and marks them hired. */
  async hire(ctx: HrCtx, applicantId: number, dto: HireApplicantDto) {
    const a = await this.findApplicant(ctx, applicantId);
    if (a.employee_id) throw new ConflictException('ALREADY_HIRED');
    const job = await this.findJob(ctx, a.job_id);
    const emp = await this.org.createEmployee(ctx, {
      full_name: a.name, phone: a.phone, email: a.email,
      branch_id: dto.branch_id ?? job.branch_id, job_title: dto.job_title ?? job.title, employment_type: job.employment_type,
      join_date: dto.join_date ?? localDate(), pay_type: dto.pay_type, base_salary: dto.base_salary,
    });
    a.employee_id = emp.id as number;
    a.stage = 'hired';
    await this.applicantRepo.save(a);
    await this.account.log(ctx, 'applicant.hire', 'hr_applicant', a.id, { name: a.name, job: job.title, employee_id: emp.id });
    return { applicant: a, employee: emp };
  }

  // ───────── Reviews ─────────

  private parseRatings(r: HrReview) {
    try { return { ...r, ratings: r.ratings ? JSON.parse(r.ratings) : {} }; } catch { return { ...r, ratings: {} }; }
  }

  /** Reviews in the caller's branches; one employee's when employee_id is given. */
  async listReviews(ctx: HrCtx, employeeId?: number) {
    const ids = await this.visibleEmployeeIds(ctx, employeeId);
    if (!ids.length) return [];
    const rows = await this.reviewRepo.find({ where: { tenant_id: ctx.tenantId, employee_id: In(ids) }, order: { review_date: 'DESC' }, take: 300 });
    const people = await this.org.employeesByIds(ctx.tenantId, rows.map(r => r.employee_id));
    return rows.map(r => ({ ...this.parseRatings(r), employee_name: people.find(p => p.id === r.employee_id)?.full_name ?? '' }));
  }

  async createReview(ctx: HrCtx, dto: SaveReviewDto) {
    const emp = await this.org.findEmployee(ctx, dto.employee_id);
    const ratings = Object.fromEntries(HR_REVIEW_AREAS.map(k => [k, dto.ratings[k]]));
    const overall = round2(HR_REVIEW_AREAS.reduce((s, k) => s + dto.ratings[k], 0) / HR_REVIEW_AREAS.length);
    const r = await this.reviewRepo.save(this.reviewRepo.create({
      tenant_id: ctx.tenantId, employee_id: emp.id, period: dto.period?.trim() ?? '', review_date: dto.review_date,
      reviewer_id: ctx.userId, reviewer_name: ctx.userName, ratings: JSON.stringify(ratings), overall,
      strengths: dto.strengths?.trim() || null, improvements: dto.improvements?.trim() || null, goals: dto.goals?.trim() || null,
    }));
    await this.account.log(ctx, 'review.create', 'hr_review', r.id, { name: emp.full_name, overall });
    return this.parseRatings(r);
  }

  async deleteReview(ctx: HrCtx, id: number) {
    const r = await this.reviewRepo.findOne({ where: { id, tenant_id: ctx.tenantId } });
    if (!r) throw new NotFoundException('Review not found');
    await this.org.findEmployee(ctx, r.employee_id);
    await this.reviewRepo.delete({ id: r.id });
    return { ok: true };
  }

  // ───────── Warnings ─────────

  async listWarnings(ctx: HrCtx, employeeId?: number) {
    const ids = await this.visibleEmployeeIds(ctx, employeeId);
    if (!ids.length) return [];
    const rows = await this.warningRepo.find({ where: { tenant_id: ctx.tenantId, employee_id: In(ids) }, order: { warning_date: 'DESC' }, take: 300 });
    const people = await this.org.employeesByIds(ctx.tenantId, rows.map(r => r.employee_id));
    return rows.map(r => ({ ...r, employee_name: people.find(p => p.id === r.employee_id)?.full_name ?? '' }));
  }

  async createWarning(ctx: HrCtx, dto: SaveWarningDto) {
    const emp = await this.org.findEmployee(ctx, dto.employee_id);
    const w = await this.warningRepo.save(this.warningRepo.create({
      tenant_id: ctx.tenantId, employee_id: emp.id, level: dto.level, warning_date: dto.warning_date, reason: dto.reason.trim(),
      details: dto.details?.trim() || null, issued_by: ctx.userId, issued_by_name: ctx.userName,
    }));
    await this.account.log(ctx, 'warning.create', 'hr_warning', w.id, { name: emp.full_name, level: w.level, reason: w.reason });
    return w;
  }

  async deleteWarning(ctx: HrCtx, id: number) {
    const w = await this.warningRepo.findOne({ where: { id, tenant_id: ctx.tenantId } });
    if (!w) throw new NotFoundException('Warning not found');
    await this.org.findEmployee(ctx, w.employee_id);
    await this.warningRepo.delete({ id: w.id });
    await this.account.log(ctx, 'warning.delete', 'hr_warning', w.id, { employee_id: w.employee_id, level: w.level });
    return { ok: true };
  }

  /** Employee read and signed for it on the kiosk. */
  async acknowledge(ctx: HrCtx, kind: 'review' | 'warning', id: number, employeeId: number) {
    const repo = (kind === 'review' ? this.reviewRepo : this.warningRepo) as Repository<HrReview | HrWarning>;
    const row = await repo.findOne({ where: { id, tenant_id: ctx.tenantId, employee_id: employeeId } });
    if (!row) throw new NotFoundException('Not found');
    if (!row.acknowledged_at) { row.acknowledged_at = new Date(); await repo.save(row); }
    return { ok: true };
  }

  /** Reviews and warnings an employee hasn't acknowledged yet (kiosk). */
  async unacknowledged(tenantId: number, employeeId: number) {
    const [reviews, warnings] = await Promise.all([
      this.reviewRepo.find({ where: { tenant_id: tenantId, employee_id: employeeId, acknowledged_at: IsNull() }, order: { review_date: 'DESC' } }),
      this.warningRepo.find({ where: { tenant_id: tenantId, employee_id: employeeId, acknowledged_at: IsNull() }, order: { warning_date: 'DESC' } }),
    ]);
    return { reviews: reviews.map(r => this.parseRatings(r)), warnings };
  }

  private async visibleEmployeeIds(ctx: HrCtx, employeeId?: number) {
    if (employeeId) return [(await this.org.findEmployee(ctx, employeeId)).id];
    const all = await this.employeeRepo.find({ where: { tenant_id: ctx.tenantId }, select: ['id', 'branch_id'] });
    return all.filter(e => canSeeBranch(ctx, e.branch_id)).map(e => e.id);
  }

  // ───────── Assets ─────────

  async listAssets(ctx: HrCtx, q: { branch_id?: number; status?: string; employee_id?: number }) {
    if (q.branch_id) assertBranch(ctx, q.branch_id);
    let assets = await this.assetRepo.find({ where: { tenant_id: ctx.tenantId, ...(q.status ? { status: q.status } : {}), ...(q.branch_id ? { branch_id: q.branch_id } : {}) }, order: { code: 'ASC' } });
    assets = assets.filter(a => canSeeBranch(ctx, a.branch_id));
    const open = assets.length ? await this.assignmentRepo.find({ where: { tenant_id: ctx.tenantId, asset_id: In(assets.map(a => a.id)), returned_date: IsNull() } }) : [];
    const people = await this.org.employeesByIds(ctx.tenantId, open.map(o => o.employee_id));
    const rows = assets.map(a => {
      const cur = open.find(o => o.asset_id === a.id);
      return { ...a, holder: cur ? { assignment_id: cur.id, employee_id: cur.employee_id, name: people.find(p => p.id === cur.employee_id)?.full_name ?? '', issued_date: cur.issued_date } : null };
    });
    return q.employee_id ? rows.filter(r => r.holder?.employee_id === q.employee_id) : rows;
  }

  private async findAsset(ctx: HrCtx, id: number) {
    const a = await this.assetRepo.findOne({ where: { id, tenant_id: ctx.tenantId } });
    if (!a || !canSeeBranch(ctx, a.branch_id)) throw new NotFoundException('Asset not found');
    return a;
  }

  private async nextAssetCode(tenantId: number) {
    const rows = await this.assetRepo.find({ where: { tenant_id: tenantId }, select: ['code'] });
    const max = rows.reduce((m, r) => { const n = /^AST-(\d+)$/.exec(r.code)?.[1]; return n ? Math.max(m, Number(n)) : m; }, 0);
    return `AST-${String(max + 1).padStart(3, '0')}`;
  }

  async saveAsset(ctx: HrCtx, dto: SaveAssetDto, id?: number) {
    const asset = id ? await this.findAsset(ctx, id) : this.assetRepo.create({ tenant_id: ctx.tenantId, status: 'available' });
    const branchId = dto.branch_id ?? (id ? asset.branch_id : ctx.branchIds?.length === 1 ? ctx.branchIds[0] : null);
    if (branchId !== null || !ctx.owner) assertBranch(ctx, branchId);
    const code = dto.code?.trim().toUpperCase() || asset.code || await this.nextAssetCode(ctx.tenantId);
    const clash = await this.assetRepo.findOne({ where: { tenant_id: ctx.tenantId, code } });
    if (clash && clash.id !== asset.id) throw new ConflictException('ASSET_CODE_TAKEN');
    if (dto.status && asset.status === 'issued' && dto.status !== 'issued') throw new BadRequestException('ASSET_ISSUED');
    Object.assign(asset, {
      branch_id: branchId, code, name: dto.name.trim(), category: dto.category ?? asset.category ?? 'other',
      value: dto.value ?? asset.value ?? 0, notes: dto.notes?.trim() ?? asset.notes ?? '',
      ...(dto.status ? { status: dto.status } : {}),
    });
    return this.assetRepo.save(asset);
  }

  async deleteAsset(ctx: HrCtx, id: number) {
    const a = await this.findAsset(ctx, id);
    if (a.status === 'issued') throw new BadRequestException('ASSET_ISSUED');
    await this.assetRepo.delete({ id: a.id });
    return { ok: true };
  }

  async issueAsset(ctx: HrCtx, id: number, dto: IssueAssetDto) {
    const a = await this.findAsset(ctx, id);
    if (a.status !== 'available') throw new BadRequestException('ASSET_NOT_AVAILABLE');
    const emp = await this.org.findEmployee(ctx, dto.employee_id);
    if (emp.status !== 'active') throw new BadRequestException('EMPLOYEE_INACTIVE');
    const asg = await this.assignmentRepo.save(this.assignmentRepo.create({
      tenant_id: ctx.tenantId, asset_id: a.id, employee_id: emp.id, issued_date: dto.issued_date,
      condition_out: dto.condition_out?.trim() ?? '', notes: dto.notes?.trim() ?? '',
    }));
    a.status = 'issued';
    await this.assetRepo.save(a);
    await this.account.log(ctx, 'asset.issue', 'hr_asset', a.id, { asset: a.name, code: a.code, to: emp.full_name });
    return asg;
  }

  async returnAsset(ctx: HrCtx, id: number, dto: ReturnAssetDto) {
    const a = await this.findAsset(ctx, id);
    const asg = await this.assignmentRepo.findOne({ where: { tenant_id: ctx.tenantId, asset_id: a.id, returned_date: IsNull() } });
    if (!asg) throw new BadRequestException('ASSET_NOT_ISSUED');
    if (dto.returned_date < asg.issued_date) throw new BadRequestException('RETURN_BEFORE_ISSUE');
    asg.returned_date = dto.returned_date;
    asg.condition_in = dto.lost ? 'lost' : dto.condition_in?.trim() ?? '';
    asg.deduction_amount = dto.deduction_amount ?? 0;
    if (dto.notes !== undefined) asg.notes = dto.notes.trim();
    await this.assignmentRepo.save(asg);
    a.status = dto.lost ? 'lost' : 'available';
    await this.assetRepo.save(a);
    await this.account.log(ctx, dto.lost ? 'asset.lost' : 'asset.return', 'hr_asset', a.id, { asset: a.name, code: a.code, deduction: asg.deduction_amount });
    return asg;
  }

  async assetHistory(ctx: HrCtx, id: number) {
    const a = await this.findAsset(ctx, id);
    const rows = await this.assignmentRepo.find({ where: { tenant_id: ctx.tenantId, asset_id: a.id }, order: { issued_date: 'DESC', id: 'DESC' } });
    const people = await this.org.employeesByIds(ctx.tenantId, rows.map(r => r.employee_id));
    return rows.map(r => ({ ...r, employee_name: people.find(p => p.id === r.employee_id)?.full_name ?? '' }));
  }

  /** Everything an employee holds, or held, with what they still have — shown when they resign. */
  async employeeAssets(ctx: HrCtx, employeeId: number) {
    await this.org.findEmployee(ctx, employeeId);
    const rows = await this.assignmentRepo.find({ where: { tenant_id: ctx.tenantId, employee_id: employeeId }, order: { issued_date: 'DESC' } });
    const assets = rows.length ? await this.assetRepo.find({ where: { id: In(rows.map(r => r.asset_id)) } }) : [];
    return rows.map(r => {
      const a = assets.find(x => x.id === r.asset_id);
      return { ...r, asset_name: a?.name ?? '', asset_code: a?.code ?? '', category: a?.category ?? '', value: a?.value ?? 0, outstanding: !r.returned_date };
    });
  }
}
