import { Module } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EmailService } from '../../common/email.service';
import { EaDb } from './ea-db';
import { AdminService } from './admin.service';
import { AI_GATEWAY, AiService, AnthropicGateway } from './ai.service';
import { AlertService } from './alert.service';
import { ApprovalService } from './approval.service';
import {
  EmailAgentAdminController, EmailAgentAdminGuard, EmailAgentUnsubscribeController, EmailAgentWorkerController,
} from './email-agent.controller';
import { IngestService } from './ingest.service';
import { JobsService } from './jobs.service';
import { GmailReader, GmailSender } from './mail/gmail';
import { MAIL_READER, MAIL_SENDER } from './mail/provider';
import { PipelineService } from './pipeline.service';
import { ResearchService } from './research.service';
import { SendService } from './send.service';
import { SettingsService } from './settings.service';
import { WorkerService } from './worker.service';

@Module({
  controllers: [EmailAgentAdminController, EmailAgentWorkerController, EmailAgentUnsubscribeController],
  providers: [
    { provide: EaDb, useFactory: (ds: DataSource) => new EaDb(ds), inject: [DataSource] },
    { provide: MAIL_READER, useClass: GmailReader },
    { provide: MAIL_SENDER, useClass: GmailSender },
    { provide: AI_GATEWAY, useClass: AnthropicGateway },
    EmailService, AlertService, SettingsService, AiService, JobsService, IngestService, PipelineService,
    ResearchService, SendService, ApprovalService, AdminService, WorkerService, EmailAgentAdminGuard,
  ],
})
export class EmailAgentModule {}
