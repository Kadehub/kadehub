import {
  BadRequestException, Body, CanActivate, Controller, Delete, ExecutionContext, ForbiddenException, Get, Headers, HttpCode,
  Injectable, Param, ParseIntPipe, Patch, Post, Put, Query, Res, UnauthorizedException, UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ArrayMaxSize, IsArray, IsBoolean, IsEmail, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUrl, Length, Matches, Max, MaxLength, Min,
} from 'class-validator';
import { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Actor, EaDb, SERVICE, suppress } from './ea-db';
import { AdminService } from './admin.service';
import { ApprovalService } from './approval.service';
import { SettingsService } from './settings.service';
import { WorkerService, workerTokenValid } from './worker.service';
import { verifyUnsubscribeToken } from './unsubscribe';
import { MAX_ATTACHMENT_BYTES } from './mail/mime';

/** Signed in, and a super admin right now according to the database, not just according to the token. */
@Injectable()
export class EmailAgentAdminGuard implements CanActivate {
  constructor(private db: EaDb) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { user } = context.switchToHttp().getRequest();
    if (user?.role !== 'SUPER_ADMIN') throw new ForbiddenException('Super admin only');
    const [row] = await this.db.rows(`SELECT role, disabled_at FROM ${this.db.userTable} WHERE id = ?`, [user.sub]);
    if (!row || row.role !== 'SUPER_ADMIN' || row.disabled_at) throw new ForbiddenException('Super admin only');
    return true;
  }
}

class ApproveDto {
  @IsString() @Length(64, 64) content_hash: string;
  @IsOptional() @IsBoolean() acknowledge_warnings?: boolean;
  @IsOptional() @IsString() @MaxLength(2000) note?: string;
}
class EditDto {
  @IsOptional() @IsEmail() recipient?: string;
  @IsOptional() @IsString() @MaxLength(500) subject?: string;
  @IsOptional() @IsString() @MaxLength(50000) body?: string;
}
class RejectDto {
  @IsString() @Length(3, 2000) note: string;
  @IsOptional() @IsBoolean() redraft?: boolean;
}
class ReasonDto {
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}
class SuppressDto {
  @IsEmail() address: string;
  @IsOptional() @IsString() @MaxLength(200) source?: string;
}
class KnowledgeDto {
  @IsString() @Length(1, 200) title: string;
  @IsString() @Length(1, 20000) body: string;
  @IsOptional() @IsBoolean() active?: boolean;
}
class CampaignDto {
  @IsString() @Length(1, 120) name: string;
  @IsString() @Length(1, 4000) brief: string;
  @IsString() @Length(3, 500) research_query: string;
  @IsOptional() @IsString() product_slug?: string;
  @IsOptional() @IsIn(['en', 'si', 'ta']) language?: string;
}
class ProspectDto {
  @IsString() @Length(1, 200) business_name: string;
  @IsEmail() email: string;
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true }) source_url: string;
  @IsOptional() @IsString() @MaxLength(150) location?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @IsOptional() @IsInt() campaign_id?: number;
}
class StartProspectsDto {
  @IsArray() @ArrayMaxSize(100) @IsInt({ each: true }) ids: number[];
}
class ProspectStatusDto {
  @IsIn(['dismissed', 'stopped']) status: 'dismissed' | 'stopped';
}
class SettingsDto {
  @IsOptional() @IsBoolean() paused?: boolean;
  @IsOptional() @IsIn(['triage_only', 'drafting']) mode?: string;
  @IsOptional() @IsInt() @Min(0) @Max(500) daily_send_limit?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(100000) monthly_budget_usd?: number;
  @IsOptional() @IsString() @Matches(/^claude-[a-z0-9.-]+$/) model_classify?: string;
  @IsOptional() @IsString() @Matches(/^claude-[a-z0-9.-]+$/) model_draft?: string;
  @IsOptional() @IsString() @Matches(/^claude-[a-z0-9.-]+$/) model_research?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) languages?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) allowed_domains?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) approved_claims?: string[];
  @IsOptional() @IsArray() @IsInt({ each: true }) @Min(1, { each: true }) follow_up_gaps_days?: number[];
  @IsOptional() @IsInt() @Min(0) @Max(5) max_follow_ups?: number;
  @IsOptional() @IsString() @MaxLength(60) timezone?: string;
}

const human = (user: any): Actor => ({ kind: 'human', userId: Number(user.sub) });

@Controller('super-admin/email-agent')
@UseGuards(JwtAuthGuard, EmailAgentAdminGuard)
export class EmailAgentAdminController {
  constructor(private admin: AdminService, private approvals: ApprovalService, private settings: SettingsService) {}

  // Inbox and escalations
  @Get('inbox') inbox(@Query('p') p?: string) { return this.admin.inbox({ p }); }
  @Get('escalations') escalations(@Query('p') p?: string) { return this.admin.inbox({ escalated: true, p }); }
  @Get('messages/:id') message(@Param('id', ParseIntPipe) id: number) { return this.admin.message(id); }
  @Post('messages/:id/resolve') resolve(@CurrentUser() u: any, @Param('id', ParseIntPipe) id: number, @Body() b: ReasonDto) {
    return this.admin.resolveEscalation(human(u), id, b?.reason);
  }

  // Approvals
  @Get('emails') emails(@Query('status') status?: string, @Query('p') p?: string) { return this.admin.emails(status, p); }
  @Get('emails/pending-count') pendingCount() { return this.admin.pendingCount(); }
  @Get('emails/:id') email(@Param('id', ParseIntPipe) id: number) { return this.admin.email(id); }
  @Patch('emails/:id') edit(@CurrentUser() u: any, @Param('id', ParseIntPipe) id: number, @Body() b: EditDto) {
    return this.approvals.edit(Number(u.sub), id, b);
  }
  @Post('emails/:id/approve') approve(@CurrentUser() u: any, @Param('id', ParseIntPipe) id: number, @Body() b: ApproveDto) {
    return this.approvals.approve(Number(u.sub), id, { contentHash: b.content_hash, acknowledgeWarnings: b.acknowledge_warnings, note: b.note });
  }
  @Post('emails/:id/reject') reject(@CurrentUser() u: any, @Param('id', ParseIntPipe) id: number, @Body() b: RejectDto) {
    return this.approvals.reject(Number(u.sub), id, b.note, !!b.redraft);
  }
  @Post('emails/:id/cancel') cancel(@CurrentUser() u: any, @Param('id', ParseIntPipe) id: number, @Body() b: ReasonDto) {
    return this.approvals.cancel(Number(u.sub), id, b?.reason);
  }
  @Post('emails/:id/reopen') reopen(@CurrentUser() u: any, @Param('id', ParseIntPipe) id: number) {
    return this.approvals.reopenFailed(Number(u.sub), id);
  }
  @Post('emails/:id/attachments')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_ATTACHMENT_BYTES } }))
  attach(@CurrentUser() u: any, @Param('id', ParseIntPipe) id: number, @UploadedFile() file: any) {
    if (!file) throw new BadRequestException('No file received');
    return this.approvals.addAttachment(Number(u.sub), id, file);
  }
  @Delete('emails/:id/attachments/:attachmentId') detach(@CurrentUser() u: any, @Param('id', ParseIntPipe) id: number, @Param('attachmentId', ParseIntPipe) attachmentId: number) {
    return this.approvals.removeAttachment(Number(u.sub), id, attachmentId);
  }
  @Get('emails/:id/attachments/:attachmentId') async download(@Param('id', ParseIntPipe) id: number, @Param('attachmentId', ParseIntPipe) attachmentId: number, @Res() res: Response) {
    const a = await this.admin.attachmentContent(id, attachmentId);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(a.filename)}`);
    res.send(Buffer.from(a.content));
  }

  // Suppression
  @Get('suppressions') suppressions(@Query('p') p?: string) { return this.admin.suppressions(p); }
  @Post('suppressions') addSuppression(@CurrentUser() u: any, @Body() b: SuppressDto) { return this.admin.addSuppression(human(u), b.address, b.source); }
  @Delete('suppressions/:id') removeSuppression(@CurrentUser() u: any, @Param('id', ParseIntPipe) id: number) { return this.admin.removeSuppression(human(u), id); }

  // Failed jobs
  @Get('jobs/failed') failedJobs() { return this.admin.failedJobs(); }
  @Post('jobs/:id/retry') retryJob(@CurrentUser() u: any, @Param('id', ParseIntPipe) id: number) { return this.admin.retryJob(human(u), id); }

  // Knowledge base
  @Get('knowledge') knowledge() { return this.admin.knowledge(); }
  @Post('knowledge') addKnowledge(@CurrentUser() u: any, @Body() b: KnowledgeDto) { return this.admin.saveKnowledge(human(u), null, b); }
  @Put('knowledge/:id') saveKnowledge(@CurrentUser() u: any, @Param('id', ParseIntPipe) id: number, @Body() b: KnowledgeDto) { return this.admin.saveKnowledge(human(u), id, b); }

  // Campaigns and prospects
  @Get('campaigns') campaigns() { return this.admin.campaigns(); }
  @Post('campaigns') createCampaign(@CurrentUser() u: any, @Body() b: CampaignDto) { return this.admin.createCampaign(human(u), b); }
  @Post('campaigns/:id/research') research(@CurrentUser() u: any, @Param('id', ParseIntPipe) id: number) { return this.admin.startResearch(human(u), id); }
  @Get('prospects') prospects(@Query('status') status?: string, @Query('p') p?: string) { return this.admin.prospects(status, p); }
  @Post('prospects') addProspect(@CurrentUser() u: any, @Body() b: ProspectDto) { return this.admin.addProspect(human(u), b); }
  @Post('prospects/start') startProspects(@CurrentUser() u: any, @Body() b: StartProspectsDto) { return this.admin.startProspects(human(u), b.ids); }
  @Patch('prospects/:id') setProspect(@CurrentUser() u: any, @Param('id', ParseIntPipe) id: number, @Body() b: ProspectStatusDto) { return this.admin.setProspectStatus(human(u), id, b.status); }

  // Settings, status, analytics
  @Get('settings') async getSettings() { return { settings: await this.settings.get(), readiness: this.admin.readiness() }; }
  @Patch('settings') patchSettings(@CurrentUser() u: any, @Body() b: SettingsDto) { return this.settings.update(human(u), b as any); }
  @Get('analytics') analytics() { return this.admin.analytics(); }
  @Get('audit') audit(@Query('p') p?: string) { return this.admin.audit(p); }
}

/** Called by cron every minute. */
@Controller('email-agent/worker')
export class EmailAgentWorkerController {
  constructor(private worker: WorkerService) {}

  @Post('tick')
  @HttpCode(200)
  tick(@Headers('authorization') authorization?: string) {
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;
    if (!workerTokenValid(token)) throw new UnauthorizedException();
    return this.worker.tick();
  }
}

const page = (body: string) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>KadeHub email preferences</title></head><body style="font-family:system-ui,sans-serif;max-width:480px;margin:64px auto;padding:0 16px;color:#0F172A">${body}</body></html>`;

/** Public, signed link. GET only asks, since mail scanners follow links; POST acts, and is also the RFC 8058 one-click. */
@Controller('email-agent/unsubscribe')
export class EmailAgentUnsubscribeController {
  constructor(private db: EaDb) {}

  @Get()
  ask(@Query('t') t: string, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    if (!verifyUnsubscribeToken(t)) return res.status(400).send(page('<h1>This link is not valid</h1><p>Reply to our email with the word "unsubscribe" and we will stop writing to you.</p>'));
    const safe = encodeURIComponent(t);
    return res.send(page(`<h1>Stop these emails?</h1><p>We will not email this address again.</p><form method="post" action="?t=${safe}"><button style="background:#00796B;color:#fff;border:0;padding:12px 20px;border-radius:8px;font-size:16px;cursor:pointer">Unsubscribe</button></form>`));
  }

  @Post()
  @HttpCode(200)
  async confirm(@Query('t') t: string, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    const address = verifyUnsubscribeToken(t);
    if (!address) return res.status(400).send(page('<h1>This link is not valid</h1>'));
    await this.db.tx(SERVICE, tx => suppress(tx, SERVICE, address, 'unsubscribe', 'unsubscribe link'));
    return res.send(page('<h1>You are unsubscribed</h1><p>We will not email this address again.</p>'));
  }
}
