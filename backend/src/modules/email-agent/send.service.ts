import { Inject, Injectable, Logger } from '@nestjs/common';
import { EaDb, SERVICE, audit, isSuppressed, localDay } from './ea-db';
import { SettingsService } from './settings.service';
import { buildRfc822, contentHash, sha256Hex } from './mail/mime';
import { MAIL_READER, MAIL_SENDER, MailReader, MailSender, ProviderError } from './mail/provider';
import { unsubscribeConfigured, unsubscribeUrl } from './unsubscribe';

export type SendOutcome = 'sent' | 'failed' | 'skipped' | 'paused' | 'daily_limit' | 'blocked';

const STUCK_AFTER_MS = 10 * 60 * 1000;
const BOOKKEEPING_ATTEMPTS = 3;

/**
 * The one place in the codebase that hands a customer email to the provider. A test fails if anything else calls
 * MailSender.send. Every rule is re-checked here at the last moment, whatever was true when the email was approved.
 */
@Injectable()
export class SendService {
  private readonly logger = new Logger(SendService.name);

  constructor(
    private db: EaDb,
    private settings: SettingsService,
    @Inject(MAIL_SENDER) private sender: MailSender,
    @Inject(MAIL_READER) private reader: MailReader,
  ) {}

  async sendApproved(emailId: number): Promise<SendOutcome> {
    const s = await this.settings.get();
    if (s.paused) return 'paused';

    const [email] = await this.db.rows('SELECT * FROM ea_email WHERE id = ?', [emailId]);
    if (!email || email.status !== 'approved') return 'skipped';

    const attachments = await this.db.rows(
      'SELECT filename, content_type, sha256, content FROM ea_attachment WHERE email_id = ? ORDER BY sha256', [emailId],
    );
    // The stored bytes must still be the bytes that were approved
    const actualHashes = attachments.map(a => sha256Hex(Buffer.from(a.content))).sort().join(',');
    const hash = contentHash(email.recipient, email.subject, email.body, actualHashes);
    if (hash !== email.approved_hash) return this.voidApproval(emailId, 'Content no longer matches what was approved');

    const [approver] = await this.db.rows(`SELECT role, disabled_at FROM ${this.db.userTable} WHERE id = ?`, [email.approved_by]);
    if (!approver || approver.role !== 'SUPER_ADMIN' || approver.disabled_at) {
      return this.voidApproval(emailId, 'The approver no longer holds the approver role');
    }

    if (await isSuppressed(this.db, email.recipient)) return this.cancel(emailId, 'Recipient is suppressed');
    if (email.prospect_id) {
      const [p] = await this.db.rows('SELECT status FROM ea_prospect WHERE id = ?', [email.prospect_id]);
      if (!p || p.status !== 'active') return this.cancel(emailId, 'The outreach sequence has stopped');
    }
    if (!this.sender.isConfigured()) throw new Error('Gmail sending is not configured');
    if (email.is_promotional && !unsubscribeConfigured()) throw new Error('EMAIL_AGENT_UNSUBSCRIBE_SECRET is required to send promotional email');

    // One transaction: take a slot under the daily cap, then claim the email. Both or neither.
    const day = localDay(new Date(), s.timezone);
    // Created up front, outside the claim, so concurrent claims only contend on the counter's row lock
    await this.db.exec(
      this.db.pg ? 'INSERT INTO ea_daily_send (day, sent_count) VALUES (?, 0) ON CONFLICT (day) DO NOTHING'
                 : 'INSERT IGNORE INTO ea_daily_send (day, sent_count) VALUES (?, 0)',
      [day],
    );
    const claim = await this.db.tx(SERVICE, async tx => {
      const slot = await tx.exec('UPDATE ea_daily_send SET sent_count = sent_count + 1 WHERE day = ? AND sent_count < ?', [day, s.daily_send_limit]);
      if (!slot) return 'daily_limit' as const;
      const won = await tx.exec(
        `UPDATE ea_email SET status = 'sending', sending_at = ? WHERE id = ? AND status = 'approved' AND approved_hash = ?`,
        [new Date(), emailId, hash],
      );
      if (!won) throw new ClaimLostError();
      return 'claimed' as const;
    }).catch(err => {
      if (err instanceof ClaimLostError) return 'lost' as const; // Rolled back, so the slot was not used
      throw err;
    });
    if (claim === 'daily_limit') return 'daily_limit';
    if (claim === 'lost') return 'skipped';

    let raw: Buffer;
    try {
      raw = buildRfc822({
        from: this.sender.mailbox(),
        fromName: 'KadeHub',
        to: email.recipient,
        subject: email.subject,
        body: email.body,
        messageId: email.rfc_message_id,
        inReplyTo: email.in_reply_to,
        references: email.refs,
        listUnsubscribe: email.is_promotional ? { url: unsubscribeUrl(email.recipient), mailto: this.sender.mailbox() } : null,
        attachments: attachments.map(a => ({ filename: a.filename, contentType: a.content_type, content: Buffer.from(a.content) })),
      });
    } catch (err) {
      return this.markFailed(emailId, `Could not build the message: ${err.message}`, day, true);
    }

    let accepted: { id: string; threadId: string | null };
    try {
      accepted = await this.sender.send(raw, email.provider_thread_id);
    } catch (err) {
      const definite = err instanceof ProviderError && err.definite;
      return this.markFailed(emailId, definite ? String(err.message) : `Outcome unknown: ${err?.message ?? err}`, day, definite);
    }

    // The provider accepted it: from here on it counts as sent, and no error below may say otherwise
    await this.recordSent(emailId, accepted);
    return 'sent';
  }

  /** Bookkeeping after acceptance. If the database is down too, the stuck-send sweep settles it from the mailbox. */
  private async recordSent(emailId: number, accepted: { id: string; threadId: string | null }) {
    for (let attempt = 1; attempt <= BOOKKEEPING_ATTEMPTS; attempt++) {
      try {
        await this.db.tx(SERVICE, async tx => {
          await tx.exec(
            `UPDATE ea_email SET status = 'sent', sent_at = ?, provider_message_id = ?, provider_thread_id = COALESCE(provider_thread_id, ?) WHERE id = ? AND status = 'sending'`,
            [new Date(), accepted.id, accepted.threadId, emailId],
          );
          await audit(tx, SERVICE, 'sent', 'email', emailId, { provider_message_id: accepted.id });
        });
        break;
      } catch (err) {
        this.logger.error(`Email ${emailId} was sent but recording it failed (attempt ${attempt}): ${err.message}`);
        if (attempt === BOOKKEEPING_ATTEMPTS) return;
      }
    }
    await this.advanceSequence(emailId, accepted.threadId).catch(err => this.logger.error(`Email ${emailId} sent, sequence update failed: ${err.message}`));
  }

  /** Moves the prospect on, and schedules the next follow-up. */
  private async advanceSequence(emailId: number, threadId: string | null) {
    const [email] = await this.db.rows('SELECT prospect_id, step, rfc_message_id FROM ea_email WHERE id = ?', [emailId]);
    if (!email?.prospect_id) return;
    const s = await this.settings.get();
    const step = Number(email.step ?? 0);
    const more = step < s.max_follow_ups && s.follow_up_gaps_days.length > 0;
    const gapDays = s.follow_up_gaps_days[Math.min(step, s.follow_up_gaps_days.length - 1)];
    await this.db.exec(
      `UPDATE ea_prospect SET step = ?, status = ?, next_touch_at = ?, last_rfc_message_id = ?, provider_thread_id = COALESCE(provider_thread_id, ?)
        WHERE id = ? AND status = 'active'`,
      [step + 1, more ? 'active' : 'completed', more ? new Date(Date.now() + gapDays * 86_400_000) : null, email.rfc_message_id, threadId, email.prospect_id],
    );
  }

  /** `refundSlot` only when the provider certainly did not take the message. */
  private async markFailed(emailId: number, reason: string, day: string, refundSlot: boolean): Promise<SendOutcome> {
    await this.db.tx(SERVICE, async tx => {
      await tx.exec(`UPDATE ea_email SET status = 'failed', failure_reason = ? WHERE id = ? AND status = 'sending'`, [reason.slice(0, 500), emailId]);
      if (refundSlot) await tx.exec('UPDATE ea_daily_send SET sent_count = sent_count - 1 WHERE day = ? AND sent_count > 0', [day]);
      await audit(tx, SERVICE, 'send_failed', 'email', emailId, { reason: reason.slice(0, 300) });
    });
    return 'failed';
  }

  private async voidApproval(emailId: number, reason: string): Promise<SendOutcome> {
    await this.db.tx(SERVICE, async tx => {
      const changed = await tx.exec(`UPDATE ea_email SET status = 'pending_approval', human_reason = ? WHERE id = ? AND status = 'approved'`, [reason, emailId]);
      if (changed) await audit(tx, SERVICE, 'approval_voided', 'email', emailId, { reason });
    });
    return 'blocked';
  }

  private async cancel(emailId: number, reason: string): Promise<SendOutcome> {
    await this.db.tx(SERVICE, async tx => {
      const changed = await tx.exec(`UPDATE ea_email SET status = 'cancelled', failure_reason = ? WHERE id = ? AND status = 'approved'`, [reason, emailId]);
      if (changed) await audit(tx, SERVICE, 'send_cancelled', 'email', emailId, { reason });
    });
    return 'blocked';
  }

  /**
   * A message left in `sending` means a worker died mid-send. It is never re-sent. If the mailbox shows it went out
   * it is recorded as sent; otherwise it fails as "outcome unknown" for a person to check.
   */
  async sweepStuck(now = new Date()): Promise<number> {
    const cutoff = new Date(now.getTime() - STUCK_AFTER_MS);
    const stuck = await this.db.rows(`SELECT id, rfc_message_id FROM ea_email WHERE status = 'sending' AND sending_at < ?`, [cutoff]);
    for (const email of stuck) {
      let found: string | null = null;
      try {
        if (this.reader.isConfigured()) found = await this.reader.findByRfcMessageId(email.rfc_message_id);
      } catch (err) {
        this.logger.warn(`Could not check the mailbox for stuck email ${email.id}: ${err.message}`);
      }
      if (found) {
        await this.recordSent(Number(email.id), { id: found, threadId: null });
        continue;
      }
      await this.db.tx(SERVICE, async tx => {
        const changed = await tx.exec(
          `UPDATE ea_email SET status = 'failed', failure_reason = ? WHERE id = ? AND status = 'sending'`,
          ['Outcome unknown: the worker stopped during sending. Check the Sent folder. It will not be re-sent automatically.', email.id],
        );
        if (changed) await audit(tx, SERVICE, 'send_outcome_unknown', 'email', Number(email.id));
      });
    }
    return stuck.length;
  }
}

class ClaimLostError extends Error {}
