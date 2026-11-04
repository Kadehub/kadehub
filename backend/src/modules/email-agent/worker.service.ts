import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomBytes, timingSafeEqual, createHash } from 'crypto';
import { EaDb, SERVICE, audit } from './ea-db';
import { AI_JOB_KINDS, Job, JobKind, JobsService } from './jobs.service';
import { IngestService } from './ingest.service';
import { PipelineService } from './pipeline.service';
import { ResearchService } from './research.service';
import { SendService } from './send.service';
import { AiService, BudgetExceededError } from './ai.service';
import { AlertService } from './alert.service';
import { SettingsService } from './settings.service';

const TICK_BUDGET_MS = 45_000;
const BATCH = 5;
const MAX_PROSPECTS_PER_TICK = 20;

export function workerTokenValid(given: string | undefined): boolean {
  const expected = process.env.EMAIL_AGENT_WORKER_TOKEN || '';
  // Too short counts as not configured, so a weak token can never open the endpoint
  if (expected.length < 24 || !given) return false;
  // Hashing first gives equal-length inputs, as timingSafeEqual needs, and hides the length
  const a = createHash('sha256').update(given).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

@Injectable()
export class WorkerService {
  private readonly logger = new Logger(WorkerService.name);
  private readonly owner = `w-${process.pid}-${randomBytes(4).toString('hex')}`;
  private running = false;

  constructor(
    private db: EaDb,
    private jobs: JobsService,
    private ingest: IngestService,
    private pipeline: PipelineService,
    private research: ResearchService,
    private sender: SendService,
    private ai: AiService,
    private alerts: AlertService,
    private settings: SettingsService,
  ) {}

  /**
   * One cron tick. Overlaps are safe between instances, since polling is leased and jobs are claimed atomically.
   * Within one process, a tick that finds another still running leaves the work to it.
   */
  async tick(): Promise<Record<string, unknown>> {
    if (this.running) return { skipped: 'already running' };
    this.running = true;
    const started = Date.now();
    const result: Record<string, unknown> = {};
    try {
      await this.db.exec('UPDATE ea_mailbox_state SET worker_heartbeat_at = ? WHERE id = 1', [new Date()]);
      const s = await this.settings.get();
      // Never turned on: nothing is read, nothing is stored
      if (!s.activated_at) return (result.state = 'not_activated', result);

      result.stuck_swept = await this.sender.sweepStuck();

      // Mail keeps being read while paused, so opt-outs and bounces are still honoured
      try {
        Object.assign(result, await this.ingest.poll(new Date(s.activated_at)));
      } catch (err) {
        result.poll_error = String(err?.message ?? err).slice(0, 300);
        this.logger.error(`Poll failed: ${result.poll_error}`);
      }

      if (s.paused) return (result.state = 'paused', result);

      // Triage-only is the first rollout stage: mail gets sorted, and nothing is written for anyone to approve
      const drafting = s.mode === 'drafting';
      if (drafting) result.outreach_scheduled = await this.scheduleOutreach();
      const kinds: JobKind[] = ['send'];
      if (this.ai.isConfigured() && (await this.ai.budgetAvailable())) {
        kinds.push(...AI_JOB_KINDS.filter(k => drafting || !k.startsWith('draft_')));
      } else {
        result.ai = 'off';
      }

      let ran = 0;
      while (Date.now() - started < TICK_BUDGET_MS) {
        const claimed = await this.jobs.claim(kinds, BATCH, this.owner);
        if (!claimed.length) break;
        for (const job of claimed) {
          await this.runJob(job);
          ran++;
        }
      }
      result.jobs_run = ran;
      result.state = 'ran';
      return result;
    } finally {
      this.running = false;
      await this.db.exec('UPDATE ea_mailbox_state SET worker_last_result = ? WHERE id = 1', [JSON.stringify({ at: new Date().toISOString(), ...result })])
        .catch(err => this.logger.error(`Could not record the worker result: ${err.message}`));
    }
  }

  /** Active prospects whose next email is due get a draft job. Clearing next_touch_at means they are queued once. */
  private async scheduleOutreach(): Promise<number> {
    const due = await this.db.rows(
      `SELECT id, step FROM ea_prospect WHERE status = 'active' AND next_touch_at IS NOT NULL AND next_touch_at <= ? ORDER BY next_touch_at LIMIT ?`,
      [new Date(), MAX_PROSPECTS_PER_TICK],
    );
    let scheduled = 0;
    for (const p of due) {
      await this.db.tx(SERVICE, async tx => {
        const won = await tx.exec(`UPDATE ea_prospect SET next_touch_at = NULL WHERE id = ? AND status = 'active' AND next_touch_at IS NOT NULL`, [p.id]);
        if (!won) return;
        await this.jobs.enqueue(tx, 'draft_outreach', `outreach:${p.id}:${p.step}`, { prospectId: Number(p.id), step: Number(p.step) });
        scheduled++;
      });
    }
    return scheduled;
  }

  private async runJob(job: Job) {
    try {
      switch (job.kind) {
        case 'classify':
          await this.pipeline.classify(job.payload.messageId);
          break;
        case 'draft_reply':
          await this.pipeline.draftReply(job.payload.messageId, job.payload.draftKey, job.payload.note);
          break;
        case 'draft_outreach':
          await this.pipeline.draftOutreach(job.payload.prospectId, job.payload.step, job.payload.draftKey, job.payload.note);
          break;
        case 'research':
          await this.research.runCampaign(job.payload.campaignId);
          break;
        case 'send': {
          const outcome = await this.sender.sendApproved(job.payload.emailId);
          if (outcome === 'daily_limit' || outcome === 'paused') {
            await this.jobs.defer(job, new Date(Date.now() + 15 * 60 * 1000));
            return;
          }
          break;
        }
      }
      await this.jobs.complete(job);
    } catch (err) {
      if (err instanceof BudgetExceededError) {
        await this.jobs.defer(job, new Date(Date.now() + 60 * 60 * 1000));
        return;
      }
      const message = String(err?.message ?? err);
      this.logger.error(`Job ${job.id} (${job.kind}) failed, attempt ${job.attempts}: ${message}`);
      const dead = await this.jobs.fail(job, message);
      if (dead) {
        await audit(this.db, SERVICE, 'job_dead_lettered', 'job', job.id, { kind: job.kind, error: message.slice(0, 300) }).catch(() => {});
        await this.alerts.notify(`Email agent job failed: ${job.kind}`, `Job ${job.id} (${job.kind}) failed ${job.attempts} times and needs attention on the failed jobs page. Last error: ${message.slice(0, 300)}`);
      }
    }
  }
}
