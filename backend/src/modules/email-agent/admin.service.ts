import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Actor, EaDb, audit, normalizeAddress, parseJson, suppress, localDay } from './ea-db';
import { AiService } from './ai.service';
import { JobsService } from './jobs.service';
import { ResearchService } from './research.service';
import { SettingsService } from './settings.service';
import { contentHash, isValidAddress } from './mail/mime';
import { MAIL_READER, MAIL_SENDER, MailReader, MailSender } from './mail/provider';
import { unsubscribeConfigured } from './unsubscribe';
import { PRODUCTS } from '../../common/products';

const PAGE_SIZE = 50;
const EMAIL_LIST_COLUMNS = `id, status, kind, recipient, subject, needs_human, human_reason, validator_warnings, is_promotional,
  source_message_id, prospect_id, step, language, failure_reason, approved_at, sent_at, bounced_at, created_at, updated_at`;

const page = (raw?: string) => Math.max(0, (Math.max(1, Number(raw) || 1) - 1) * PAGE_SIZE);

@Injectable()
export class AdminService {
  constructor(
    private db: EaDb,
    private settings: SettingsService,
    private ai: AiService,
    private jobs: JobsService,
    private research: ResearchService,
    @Inject(MAIL_READER) private reader: MailReader,
    @Inject(MAIL_SENDER) private sender: MailSender,
  ) {}

  // ── Inbox ─────────────────────────────────────────────────────────────────

  inbox(filter: { escalated?: boolean; p?: string }) {
    const where = filter.escalated ? 'WHERE needs_human = ? AND resolved_at IS NULL' : '';
    return this.db.rows(
      `SELECT id, from_addr, from_name, subject, received_at, triage, classification, confidence, needs_human, human_reason,
              injection_suspected, resolved_at, language, prospect_id
         FROM ea_message ${where} ORDER BY id DESC LIMIT ${PAGE_SIZE} OFFSET ${page(filter.p)}`,
      filter.escalated ? [true] : [],
    );
  }

  async message(id: number) {
    const [m] = await this.db.rows('SELECT * FROM ea_message WHERE id = ?', [id]);
    if (!m) throw new NotFoundException('Message not found');
    const emails = await this.db.rows(`SELECT ${EMAIL_LIST_COLUMNS} FROM ea_email WHERE source_message_id = ? ORDER BY id DESC`, [id]);
    return { ...m, emails };
  }

  async resolveEscalation(actor: Actor, id: number, note?: string) {
    return this.db.tx(actor, async tx => {
      const changed = await tx.exec('UPDATE ea_message SET resolved_at = ? WHERE id = ? AND resolved_at IS NULL', [new Date(), id]);
      if (!changed) throw new NotFoundException('Nothing to resolve');
      await audit(tx, actor, 'escalation_resolved', 'message', id, { note });
      return { resolved: true };
    });
  }

  // ── Emails and approvals ──────────────────────────────────────────────────

  async emails(status: string | undefined, p?: string) {
    const statuses = status ? status.split(',') : ['draft', 'pending_approval'];
    const rows = await this.db.rows(
      `SELECT ${EMAIL_LIST_COLUMNS} FROM ea_email WHERE status IN (${statuses.map(() => '?').join(', ')}) ORDER BY id DESC LIMIT ${PAGE_SIZE} OFFSET ${page(p)}`,
      statuses,
    );
    return rows.map(r => ({ ...r, validator_warnings: parseJson(r.validator_warnings, []) }));
  }

  async pendingCount() {
    const [row] = await this.db.rows(`SELECT COUNT(*) AS n FROM ea_email WHERE status IN ('draft', 'pending_approval')`);
    return { count: Number(row.n) };
  }

  /** Everything a reviewer needs, including the hash of what they are looking at. Approving sends that hash back. */
  async email(id: number) {
    const [e] = await this.db.rows('SELECT * FROM ea_email WHERE id = ?', [id]);
    if (!e) throw new NotFoundException('Email not found');
    const attachments = await this.db.rows('SELECT id, filename, content_type, size_bytes, sha256, created_at FROM ea_attachment WHERE email_id = ?', [id]);
    const [source] = e.source_message_id
      ? await this.db.rows('SELECT id, from_addr, from_name, subject, body_clean, received_at, classification, injection_suspected FROM ea_message WHERE id = ?', [e.source_message_id])
      : [null];
    const [prospect] = e.prospect_id
      ? await this.db.rows('SELECT id, business_name, email, source_url, location, notes, status FROM ea_prospect WHERE id = ?', [e.prospect_id])
      : [null];
    return {
      ...e,
      validator_warnings: parseJson(e.validator_warnings, []),
      sources: parseJson(e.sources, {}),
      suggested_attachments: parseJson(e.suggested_attachments, []),
      content_hash: contentHash(e.recipient, e.subject, e.body, e.attachment_hashes),
      attachments, source, prospect,
    };
  }

  // ── Suppression ───────────────────────────────────────────────────────────

  suppressions(p?: string) {
    return this.db.rows(`SELECT * FROM ea_suppression ORDER BY id DESC LIMIT ${PAGE_SIZE} OFFSET ${page(p)}`);
  }

  async addSuppression(actor: Actor, address: string, source?: string) {
    const addr = normalizeAddress(address);
    if (!isValidAddress(addr)) throw new BadRequestException('Enter a valid email address');
    await this.db.tx(actor, tx => suppress(tx, actor, addr, 'manual', source));
    return { address: addr };
  }

  async removeSuppression(actor: Actor, id: number) {
    return this.db.tx(actor, async tx => {
      const [row] = await tx.rows('SELECT address, reason FROM ea_suppression WHERE id = ?', [id]);
      if (!row) throw new NotFoundException('Not found');
      await tx.exec('DELETE FROM ea_suppression WHERE id = ?', [id]);
      await audit(tx, actor, 'suppression_removed', 'suppression', id, { address: row.address, reason: row.reason });
      return { removed: true };
    });
  }

  // ── Jobs ──────────────────────────────────────────────────────────────────

  failedJobs() {
    return this.db.rows(`SELECT id, kind, status, attempts, max_attempts, last_error, created_at, finished_at FROM ea_job WHERE status = 'dead' ORDER BY id DESC LIMIT ${PAGE_SIZE}`);
  }

  async retryJob(actor: Actor, id: number) {
    const changed = await this.jobs.retry(id);
    if (!changed) throw new NotFoundException('No failed job with that id');
    await audit(this.db, actor, 'job_retried', 'job', id);
    return { retried: true };
  }

  // ── Knowledge base ────────────────────────────────────────────────────────

  knowledge() {
    return this.db.rows('SELECT * FROM ea_kb_entry ORDER BY id DESC');
  }

  async saveKnowledge(actor: Actor, id: number | null, body: { title: string; body: string; active?: boolean }) {
    return this.db.tx(actor, async tx => {
      let entryId = id;
      const updatedBy = actor.kind === 'human' ? actor.userId : null;
      if (id) {
        const changed = await tx.exec('UPDATE ea_kb_entry SET title = ?, body = ?, active = ?, updated_by = ?, updated_at = ? WHERE id = ?', [body.title, body.body, body.active !== false, updatedBy, new Date(), id]);
        if (!changed) throw new NotFoundException('Not found');
      } else {
        entryId = await tx.insert('ea_kb_entry', { title: body.title, body: body.body, active: body.active !== false, updated_by: updatedBy });
      }
      await audit(tx, actor, id ? 'kb_updated' : 'kb_created', 'kb', entryId, { title: body.title });
      return { id: entryId };
    });
  }

  // ── Campaigns and prospects ───────────────────────────────────────────────

  campaigns() {
    return this.db.rows('SELECT * FROM ea_campaign ORDER BY id DESC LIMIT 100');
  }

  async createCampaign(actor: Actor, body: { name: string; brief: string; research_query: string; product_slug?: string; language?: string }) {
    if (body.product_slug && !PRODUCTS.some(p => p.slug === body.product_slug)) throw new BadRequestException('Unknown product');
    if (body.language && !['en', 'si', 'ta'].includes(body.language)) throw new BadRequestException('Unknown language');
    return this.db.tx(actor, async tx => {
      const id = await tx.insert('ea_campaign', {
        name: body.name, brief: body.brief, research_query: body.research_query, product_slug: body.product_slug || null,
        language: body.language || 'en', created_by: actor.kind === 'human' ? actor.userId : 0,
      });
      await audit(tx, actor, 'campaign_created', 'campaign', id, { name: body.name });
      return { id };
    });
  }

  async startResearch(actor: Actor, campaignId: number) {
    const [c] = await this.db.rows('SELECT id FROM ea_campaign WHERE id = ?', [campaignId]);
    if (!c) throw new NotFoundException('Campaign not found');
    return this.db.tx(actor, async tx => {
      // Time-based key: the same campaign can be researched again later, not twice by a double click
      const slot = Math.floor(Date.now() / 60_000);
      await this.jobs.enqueue(tx, 'research', `research:${campaignId}:${slot}`, { campaignId });
      await tx.exec(`UPDATE ea_campaign SET status = 'queued' WHERE id = ?`, [campaignId]);
      await audit(tx, actor, 'research_started', 'campaign', campaignId);
      return { queued: true };
    });
  }

  prospects(status?: string, p?: string) {
    const where = status ? 'WHERE status = ?' : '';
    return this.db.rows(`SELECT * FROM ea_prospect ${where} ORDER BY id DESC LIMIT ${PAGE_SIZE} OFFSET ${page(p)}`, status ? [status] : []);
  }

  /** Added by hand: passes the same published-on-this-page check as research. */
  async addProspect(actor: Actor, body: { business_name: string; email: string; source_url: string; location?: string; notes?: string; campaign_id?: number }) {
    const verdict = await this.research.addProspect(body, body.campaign_id ?? null);
    await audit(this.db, actor, 'prospect_add_attempt', 'prospect', null, { verdict, email: normalizeAddress(body.email) });
    if (verdict !== 'added') {
      const why: Record<string, string> = {
        invalid: 'Check the name, email and URL',
        duplicate: 'This address is already a prospect',
        suppressed: 'This address is on the suppression list',
        existing_customer: 'This address already belongs to a KadeHub account',
        not_on_page: 'That address could not be found on that page, and only published addresses can be used',
      };
      throw new BadRequestException(why[verdict]);
    }
    return { added: true };
  }

  /** A person chooses who enters a sequence. The first draft is then queued, and it still needs approval. */
  async startProspects(actor: Actor, ids: number[]) {
    if (!ids.length) throw new BadRequestException('Choose at least one prospect');
    return this.db.tx(actor, async tx => {
      let started = 0;
      for (const id of ids) {
        started += await tx.exec(`UPDATE ea_prospect SET status = 'active', next_touch_at = ? WHERE id = ? AND status = 'new'`, [new Date(), id]);
      }
      await audit(tx, actor, 'prospects_started', 'prospect', null, { ids, started });
      return { started };
    });
  }

  async setProspectStatus(actor: Actor, id: number, status: 'dismissed' | 'stopped') {
    return this.db.tx(actor, async tx => {
      const changed = await tx.exec(`UPDATE ea_prospect SET status = ?, next_touch_at = NULL WHERE id = ? AND status IN ('new', 'active')`, [status, id]);
      if (!changed) throw new NotFoundException('That prospect can no longer be changed');
      await tx.exec(`UPDATE ea_email SET status = 'cancelled', failure_reason = 'Outreach stopped' WHERE prospect_id = ? AND status IN ('draft', 'pending_approval', 'approved')`, [id]);
      await audit(tx, actor, `prospect_${status}`, 'prospect', id);
      return { status };
    });
  }

  // ── Status and analytics ──────────────────────────────────────────────────

  /** Which pieces are set up. Yes or no only, no secret values. */
  readiness() {
    const token = process.env.EMAIL_AGENT_WORKER_TOKEN || '';
    return {
      mailbox: this.reader.mailbox() || null,
      gmail_read_configured: this.reader.isConfigured(),
      gmail_send_configured: this.sender.isConfigured(),
      claude_configured: this.ai.isConfigured(),
      worker_token_configured: token.length >= 24,
      unsubscribe_configured: unsubscribeConfigured(),
      alerts_configured: !!process.env.SUPER_ADMIN_EMAIL && !!process.env.SMTP_USER,
    };
  }

  async analytics() {
    const s = await this.settings.get();
    const now = new Date();
    const day = localDay(now, s.timezone);
    const countBy = async (sql: string, params: any[] = []) => {
      const [r] = await this.db.rows(sql, params);
      return Number(r.n);
    };
    const since = new Date(now.getTime() - 30 * 86_400_000);
    const sent = await countBy(`SELECT COUNT(*) AS n FROM ea_email WHERE status = 'sent' AND sent_at >= ?`, [since]);
    const bounced = await countBy(`SELECT COUNT(*) AS n FROM ea_email WHERE bounced_at >= ?`, [since]);
    const optOuts = await countBy(`SELECT COUNT(*) AS n FROM ea_suppression WHERE reason IN ('unsubscribe', 'opt_out') AND created_at >= ?`, [since]);
    const contacted = await countBy(`SELECT COUNT(*) AS n FROM ea_prospect WHERE step > 0`);
    const replied = await countBy(`SELECT COUNT(DISTINCT prospect_id) AS n FROM ea_message WHERE prospect_id IS NOT NULL AND triage IN ('pass', 'unsubscribe')`);
    const approved = await countBy(`SELECT COUNT(*) AS n FROM ea_email WHERE approved_at >= ?`, [since]);
    const rejected = await countBy(`SELECT COUNT(*) AS n FROM ea_email WHERE status = 'rejected' AND updated_at >= ?`, [since]);
    const received = await countBy(`SELECT COUNT(*) AS n FROM ea_message WHERE created_at >= ?`, [since]);
    const [today] = await this.db.rows('SELECT sent_count FROM ea_daily_send WHERE day = ?', [day]);
    const [state] = await this.db.rows('SELECT worker_heartbeat_at, worker_last_result, last_poll_at, last_poll_error FROM ea_mailbox_state WHERE id = 1');
    const queue = await this.db.rows('SELECT status, COUNT(*) AS n FROM ea_job GROUP BY status');
    const spend = await this.ai.monthSpend(s.timezone);
    const usage = await this.db.rows(
      `SELECT purpose, SUM(cost_usd) AS cost, SUM(input_tokens) AS input_tokens, SUM(output_tokens) AS output_tokens, SUM(cache_read_tokens) AS cache_read_tokens
         FROM ea_ai_usage WHERE month = ? GROUP BY purpose`,
      [day.slice(0, 7)],
    );
    const rate = (a: number, b: number) => (b ? a / b : null);
    return {
      window_days: 30,
      received, sent, bounced, opt_outs: optOuts, approved, rejected,
      contacted, replied,
      response_rate: rate(replied, contacted),
      bounce_rate: rate(bounced, sent),
      opt_out_rate: rate(optOuts, sent),
      approval_rate: rate(approved, approved + rejected),
      sent_today: Number(today?.sent_count ?? 0),
      daily_limit: s.daily_send_limit,
      ai_spend_usd: spend,
      ai_budget_usd: s.monthly_budget_usd,
      ai_usage: usage.map(u => ({ purpose: u.purpose, cost: Number(u.cost), input_tokens: Number(u.input_tokens), output_tokens: Number(u.output_tokens), cache_read_tokens: Number(u.cache_read_tokens) })),
      worker_last_run: state?.worker_heartbeat_at ?? null,
      worker_last_result: parseJson(state?.worker_last_result, null),
      last_poll_at: state?.last_poll_at ?? null,
      last_poll_error: state?.last_poll_error ?? null,
      queue: Object.fromEntries(queue.map(q => [q.status, Number(q.n)])),
    };
  }

  audit(p?: string) {
    return this.db.rows(`SELECT * FROM ea_audit_log ORDER BY id DESC LIMIT ${PAGE_SIZE} OFFSET ${page(p)}`);
  }

  async attachmentContent(emailId: number, attachmentId: number) {
    const [a] = await this.db.rows('SELECT filename, content_type, content FROM ea_attachment WHERE id = ? AND email_id = ?', [attachmentId, emailId]);
    if (!a) throw new NotFoundException('Attachment not found');
    return a;
  }

}
