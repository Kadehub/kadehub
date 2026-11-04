import { Inject, Injectable, Logger } from '@nestjs/common';
import { EaDb, SERVICE, Sql, audit, isSuppressed, normalizeAddress, suppress } from './ea-db';
import { JobsService } from './jobs.service';
import { CursorExpiredError, InboundMail, MAIL_READER, MailReader, ProviderError } from './mail/provider';
import {
  bouncedAddresses, detectLanguage, htmlToText, looksLikeInjection, parseFrom, stripQuotedHistory, triage,
} from './triage';

const POLL_LEASE_MS = 5 * 60 * 1000;
const MAX_MESSAGES_PER_POLL = 200;
const EXPIRED_CURSOR_LOOKBACK_MS = 3 * 24 * 60 * 60 * 1000;

// Postgres text can't hold NUL, and hostile mail can contain one
const clean = (s: string | undefined | null) => (s ?? '')
  .replace(/\u0000/g, '')
  .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '�');

/** True only when Gmail itself vouches that the From domain passed DKIM or DMARC. */
export function senderVerified(mail: InboundMail, address: string): boolean {
  const header = mail.rawHeaders.find(h => h.name.toLowerCase() === 'authentication-results')?.value ?? '';
  // Google puts its result first; anything else could have been added by the sender
  if (!/^\s*mx\.google\.com\b/i.test(header)) return false;
  const domain = address.split('@')[1];
  if (!domain) return false;
  if (new RegExp(`\\bdmarc=pass\\b[^;]*header\\.from=${domain.replace(/\./g, '\\.')}\\b`, 'i').test(header)) return true;
  return new RegExp(`\\bdkim=pass\\b[^;]*header\\.(?:i=@|d=)${domain.replace(/\./g, '\\.')}\\b`, 'i').test(header);
}

@Injectable()
export class IngestService {
  private readonly logger = new Logger(IngestService.name);

  constructor(
    private db: EaDb,
    private jobs: JobsService,
    @Inject(MAIL_READER) private reader: MailReader,
  ) {}

  /**
   * One lease-guarded poll. The cursor only moves after every message on the way was stored, and storing is
   * idempotent on the provider's message id, so overlaps and crashes re-read mail but never double-process it.
   */
  async poll(activatedAt: Date, now = new Date()): Promise<{ polled: boolean; stored: number; cursorExpired?: boolean }> {
    if (!this.reader.isConfigured()) return { polled: false, stored: 0 };
    const won = await this.db.exec(
      'UPDATE ea_mailbox_state SET poll_lease_until = ? WHERE id = 1 AND (poll_lease_until IS NULL OR poll_lease_until < ?)',
      [new Date(now.getTime() + POLL_LEASE_MS), now],
    );
    if (!won) return { polled: false, stored: 0 };

    try {
      const [state] = await this.db.rows('SELECT history_id, last_poll_at FROM ea_mailbox_state WHERE id = 1');
      let stored = 0;
      let nextCursor: string | null = state.history_id;
      let cursorExpired = false;

      if (state.history_id) {
        try {
          let pageToken: string | undefined;
          do {
            const page = await this.reader.listHistory(state.history_id, pageToken);
            stored += await this.processIds(page.messageIds);
            if (page.historyId) nextCursor = page.historyId;
            pageToken = page.nextPageToken;
          } while (pageToken && stored < MAX_MESSAGES_PER_POLL);
          // Stopped early: keep the old cursor so the rest is read next time
          if (pageToken) nextCursor = state.history_id;
        } catch (err) {
          if (!(err instanceof CursorExpiredError)) throw err;
          cursorExpired = true;
          this.logger.warn('History cursor expired, falling back to listing by date');
        }
      }
      if (!state.history_id || cursorExpired) {
        // Take the new cursor first: mail arriving during the listing is then picked up by the next poll
        nextCursor = await this.reader.getProfileHistoryId();
        const since = cursorExpired
          ? new Date(Math.min(new Date(state.last_poll_at ?? now).getTime(), now.getTime()) - EXPIRED_CURSOR_LOOKBACK_MS)
          : activatedAt;
        let pageToken: string | undefined;
        do {
          const page = await this.reader.listSince(since, pageToken);
          stored += await this.processIds(page.messageIds);
          pageToken = page.nextPageToken;
        } while (pageToken && stored < MAX_MESSAGES_PER_POLL);
      }

      await this.db.exec(
        'UPDATE ea_mailbox_state SET history_id = ?, last_poll_at = ?, last_poll_error = NULL, poll_lease_until = NULL WHERE id = 1',
        [nextCursor, now],
      );
      return { polled: true, stored, cursorExpired };
    } catch (err) {
      await this.db.exec(
        'UPDATE ea_mailbox_state SET last_poll_error = ?, poll_lease_until = NULL WHERE id = 1',
        [String(err?.message ?? err).slice(0, 500)],
      );
      throw err;
    }
  }

  private async processIds(ids: string[]): Promise<number> {
    let stored = 0;
    for (const id of ids) {
      const known = await this.db.rows('SELECT id FROM ea_message WHERE provider_message_id = ?', [id]);
      if (known.length) continue;
      let mail: InboundMail;
      try {
        mail = await this.reader.getMessage(id);
      } catch (err) {
        // Deleted between listing and reading: nothing left to process
        if (err instanceof ProviderError && err.status === 404) continue;
        throw err;
      }
      if (await this.store(mail)) stored++;
    }
    return stored;
  }

  /** Stores one message and applies deterministic triage in a single transaction. No AI is involved. */
  async store(mail: InboundMail): Promise<number | null> {
    const from = parseFrom(mail.headers['from']);
    const body = clean(mail.text.trim() ? mail.text : htmlToText(mail.html));
    const cleanBody = stripQuotedHistory(body);
    const subject = clean(mail.headers['subject']).slice(0, 500);

    return this.db.tx(SERVICE, async tx => {
      const suppressed = from.address ? await isSuppressed(tx, from.address) : false;
      const result = triage(mail, from, this.reader.mailbox(), cleanBody, suppressed);
      const injection = result === 'pass' && (looksLikeInjection(cleanBody) || looksLikeInjection(subject));
      const prospect = result === 'own_mail' ? null : await this.findProspect(tx, from.address, mail.threadId);

      const messageId = await tx.insertIgnore('ea_message', {
        provider_message_id: mail.providerId,
        provider_thread_id: mail.threadId,
        rfc_message_id: clean(mail.headers['message-id']).slice(0, 300) || null,
        refs: clean(mail.headers['references']) || null,
        from_addr: from.address.slice(0, 190) || null,
        from_name: clean(from.name).slice(0, 200) || null,
        subject,
        body_text: body,
        body_clean: cleanBody,
        received_at: mail.internalDate,
        auth_verified: senderVerified(mail, from.address),
        language: detectLanguage(cleanBody),
        triage: result,
        needs_human: injection,
        human_reason: injection ? 'Looks like an attempt to instruct the AI. Review before trusting any draft.' : null,
        injection_suspected: injection,
        prospect_id: prospect?.id ?? null,
      }, 'provider_message_id');
      if (messageId === null) return null; // Already stored by an overlapping poll

      if (result === 'bounce') await this.applyBounce(tx, mail, messageId);
      if (result === 'unsubscribe' && from.address) {
        await suppress(tx, SERVICE, from.address, 'unsubscribe', `message:${messageId}`);
      }
      if (result === 'pass') {
        if (prospect) await this.stopSequenceOnReply(tx, prospect, messageId);
        await this.jobs.enqueue(tx, 'classify', `classify:${messageId}`, { messageId });
      }
      return messageId;
    });
  }

  private async findProspect(tx: Sql, address: string, threadId: string | null) {
    const params: any[] = [normalizeAddress(address)];
    let where = 'email = ?';
    if (threadId) { where += ' OR provider_thread_id = ?'; params.push(threadId); }
    const [row] = await tx.rows(`SELECT id, status FROM ea_prospect WHERE ${where} LIMIT 1`, params);
    return row ?? null;
  }

  /** Any real reply ends the sequence, whatever it says. */
  private async stopSequenceOnReply(tx: Sql, prospect: { id: number; status: string }, messageId: number) {
    if (prospect.status !== 'active') return;
    await tx.exec(`UPDATE ea_prospect SET status = 'replied', next_touch_at = NULL WHERE id = ?`, [prospect.id]);
    await tx.exec(
      `UPDATE ea_email SET status = 'cancelled', failure_reason = 'Prospect replied' WHERE prospect_id = ? AND status IN ('draft', 'pending_approval', 'approved')`,
      [prospect.id],
    );
    await audit(tx, SERVICE, 'sequence_stopped', 'prospect', Number(prospect.id), { cause: 'reply', messageId });
  }

  /** Only addresses we really wrote to are suppressed, so a forged bounce can't silence an arbitrary address. */
  private async applyBounce(tx: Sql, mail: InboundMail, messageId: number) {
    for (const address of bouncedAddresses(mail)) {
      const sent = await tx.rows(`SELECT id FROM ea_email WHERE recipient = ? AND status IN ('sent', 'sending', 'failed') ORDER BY id DESC LIMIT 1`, [address]);
      if (!sent.length) continue;
      await tx.exec('UPDATE ea_email SET bounced_at = ? WHERE id = ?', [new Date(), sent[0].id]);
      await suppress(tx, SERVICE, address, 'bounce', `message:${messageId}`);
    }
  }
}
