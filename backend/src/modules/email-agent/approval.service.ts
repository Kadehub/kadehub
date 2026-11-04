import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Actor, EaDb, Sql, audit, isSuppressed, normalizeAddress, parseJson } from './ea-db';
import { JobsService } from './jobs.service';
import { SettingsService } from './settings.service';
import { catalogueNames } from './tools';
import { BLOCKING_ISSUES, ValidationIssue, validateDraft } from './validation';
import {
  ALLOWED_ATTACHMENT_TYPES, MAX_ATTACHMENTS, MAX_ATTACHMENT_BYTES, MAX_TOTAL_ATTACHMENT_BYTES,
  contentHash, safeFilename, sha256Hex,
} from './mail/mime';

/** Trigger messages become a 409 here, so the reviewer sees why instead of a server error. */
function conflictFrom(err: any): never {
  const message = String(err?.message ?? '');
  if (message.includes('ea_email:')) throw new ConflictException(message.replace(/^.*?ea_email:\s*/, ''));
  throw err;
}

/**
 * Everything a person does to an email. Each method declares a human actor, which only ever comes from the signed-in
 * session in the controller, and the database triggers do the actual enforcing.
 */
@Injectable()
export class ApprovalService {
  constructor(private db: EaDb, private jobs: JobsService, private settings: SettingsService) {}

  /** The role in the token could be up to 7 days old, so it is always re-read. */
  private async humanActor(sql: Sql, userId: number): Promise<Actor> {
    const [user] = await sql.rows(`SELECT role, disabled_at FROM ${sql.userTable} WHERE id = ?`, [userId]);
    if (!user || user.role !== 'SUPER_ADMIN' || user.disabled_at) throw new ForbiddenException('Only an active super admin can do this');
    return { kind: 'human', userId };
  }

  private async load(sql: Sql, id: number) {
    const [email] = await sql.rows('SELECT * FROM ea_email WHERE id = ?', [id]);
    if (!email) throw new NotFoundException('Email not found');
    return email;
  }

  /** Re-runs the validator against the email as it stands now, including a person's edits. */
  async revalidate(sql: Sql, email: { recipient: string; subject: string; body: string; sources?: string | null }): Promise<ValidationIssue[]> {
    const s = await this.settings.get(sql);
    const sources = parseJson<{ amounts?: string[] }>(email.sources, {});
    return validateDraft(email.subject, email.body, {
      recipient: email.recipient,
      recipientSuppressed: await isSuppressed(sql, email.recipient),
      knownAmounts: new Set(sources.amounts ?? []),
      knownNames: await catalogueNames(sql),
      allowedDomains: s.allowed_domains,
      approvedClaims: s.approved_claims,
    });
  }

  /**
   * `contentHash` is the hash the reviewer's screen was showing: approving something that changed since they read it
   * is refused rather than guessed at.
   */
  async approve(userId: number, id: number, opts: { contentHash: string; acknowledgeWarnings?: boolean; note?: string }) {
    const actor = await this.humanActor(this.db, userId);
    return this.db.tx(actor, async tx => {
      const email = await this.load(tx, id);
      if (!['draft', 'pending_approval'].includes(email.status)) throw new ConflictException(`This email is ${email.status}`);
      const current = contentHash(email.recipient, email.subject, email.body, email.attachment_hashes);
      if (opts.contentHash !== current) throw new ConflictException('This email changed after you opened it. Reload and review it again.');

      const issues = await this.revalidate(tx, email);
      const blocking = issues.filter(i => BLOCKING_ISSUES.has(i.code));
      if (blocking.length) throw new BadRequestException(blocking.map(i => i.message).join('; '));
      if (issues.length && !opts.acknowledgeWarnings) {
        throw new BadRequestException(`Confirm these warnings first: ${issues.map(i => i.message).join('; ')}`);
      }

      try {
        if (email.status === 'draft') await tx.exec(`UPDATE ea_email SET status = 'pending_approval' WHERE id = ? AND status = 'draft'`, [id]);
        const changed = await tx.exec(`UPDATE ea_email SET status = 'approved', review_note = ?, reviewed_by = ? WHERE id = ? AND status = 'pending_approval'`, [opts.note ?? null, userId, id]);
        if (!changed) throw new ConflictException('Someone else already acted on this email');
      } catch (err) {
        conflictFrom(err);
      }
      const [row] = await tx.rows('SELECT approved_hash, approved_at FROM ea_email WHERE id = ?', [id]);
      await audit(tx, actor, 'approve', 'email', id, { hash: row.approved_hash, acknowledged_warnings: issues.map(i => i.code), note: opts.note });
      await this.jobs.enqueue(tx, 'send', `send:${id}:${new Date(row.approved_at).getTime()}`, { emailId: id });
      return { status: 'approved', approved_hash: row.approved_hash };
    });
  }

  /** Any edit after approval voids it: the trigger drops the email back to pending_approval. */
  async edit(userId: number, id: number, patch: { recipient?: string; subject?: string; body?: string }) {
    const actor = await this.humanActor(this.db, userId);
    return this.db.tx(actor, async tx => {
      const email = await this.load(tx, id);
      const next = {
        recipient: patch.recipient !== undefined ? normalizeAddress(patch.recipient) : email.recipient,
        subject: patch.subject !== undefined ? patch.subject.replace(/[\r\n]+/g, ' ').trim() : email.subject,
        body: patch.body !== undefined ? patch.body.replace(/\r\n/g, '\n') : email.body,
      };
      const issues = await this.revalidate(tx, { ...next, sources: email.sources });
      const wasApproved = email.status === 'approved';
      try {
        await tx.exec('UPDATE ea_email SET recipient = ?, subject = ?, body = ?, validator_warnings = ? WHERE id = ?', [next.recipient, next.subject, next.body, JSON.stringify(issues), id]);
        if (email.status === 'draft') await tx.exec(`UPDATE ea_email SET status = 'pending_approval' WHERE id = ?`, [id]);
      } catch (err) {
        conflictFrom(err);
      }
      const [after] = await tx.rows('SELECT status FROM ea_email WHERE id = ?', [id]);
      await audit(tx, actor, 'edit', 'email', id, { approval_voided: wasApproved && after.status !== 'approved', fields: Object.keys(patch) });
      return { status: after.status, warnings: issues };
    });
  }

  /** The note is what the AI reads before it writes again. `redraft` queues a fresh attempt straight away. */
  async reject(userId: number, id: number, note: string, redraft: boolean) {
    const actor = await this.humanActor(this.db, userId);
    return this.db.tx(actor, async tx => {
      const email = await this.load(tx, id);
      try {
        const changed = await tx.exec(
          `UPDATE ea_email SET status = 'rejected', review_note = ?, reviewed_by = ? WHERE id = ? AND status IN ('draft', 'pending_approval')`,
          [note, userId, id],
        );
        if (!changed) throw new ConflictException(`This email is ${email.status}`);
      } catch (err) {
        conflictFrom(err);
      }
      await audit(tx, actor, 'reject', 'email', id, { note, redraft });
      if (redraft && email.ai_generated) {
        if (email.prospect_id) {
          await this.jobs.enqueue(tx, 'draft_outreach', `redraft_outreach:${id}`, { prospectId: email.prospect_id, step: email.step ?? 0, draftKey: `outreach:${email.prospect_id}:${email.step ?? 0}:r${id}`, note });
        } else if (email.source_message_id) {
          await this.jobs.enqueue(tx, 'draft_reply', `redraft_reply:${id}`, { messageId: email.source_message_id, draftKey: `reply:${email.source_message_id}:r${id}`, note });
        }
      } else if (email.prospect_id) {
        await tx.exec(`UPDATE ea_prospect SET status = 'stopped', next_touch_at = NULL WHERE id = ? AND status = 'active'`, [email.prospect_id]);
      }
      return { status: 'rejected' };
    });
  }

  async cancel(userId: number, id: number, reason?: string) {
    const actor = await this.humanActor(this.db, userId);
    return this.db.tx(actor, async tx => {
      const email = await this.load(tx, id);
      try {
        const changed = await tx.exec(`UPDATE ea_email SET status = 'cancelled', failure_reason = ? WHERE id = ? AND status IN ('draft', 'pending_approval', 'approved')`, [reason ?? 'Cancelled by reviewer', id]);
        if (!changed) throw new ConflictException(`This email is ${email.status}`);
      } catch (err) {
        conflictFrom(err);
      }
      if (email.prospect_id) await tx.exec(`UPDATE ea_prospect SET status = 'stopped', next_touch_at = NULL WHERE id = ? AND status = 'active'`, [email.prospect_id]);
      await audit(tx, actor, 'cancel', 'email', id, { reason });
      return { status: 'cancelled' };
    });
  }

  /** A failed email only goes out again through a fresh approval, and only a person can start that. */
  async reopenFailed(userId: number, id: number) {
    const actor = await this.humanActor(this.db, userId);
    return this.db.tx(actor, async tx => {
      await this.load(tx, id);
      try {
        const changed = await tx.exec(`UPDATE ea_email SET status = 'pending_approval', failure_reason = NULL WHERE id = ? AND status = 'failed'`, [id]);
        if (!changed) throw new ConflictException('Only a failed email can be reopened');
      } catch (err) {
        conflictFrom(err);
      }
      await audit(tx, actor, 'reopen', 'email', id);
      return { status: 'pending_approval' };
    });
  }

  /** Only people attach files. Changing an attachment changes the content hash, which voids any approval. */
  async addAttachment(userId: number, id: number, file: { originalname: string; mimetype: string; buffer: Buffer; size: number }) {
    if (!file?.buffer?.length) throw new BadRequestException('No file received');
    if (file.size > MAX_ATTACHMENT_BYTES) throw new BadRequestException('Attachments can be up to 5 MB each');
    if (!ALLOWED_ATTACHMENT_TYPES.has(file.mimetype)) throw new BadRequestException('Allowed types: PDF, PNG, JPG, TXT, CSV, DOCX, XLSX');
    const actor = await this.humanActor(this.db, userId);
    return this.db.tx(actor, async tx => {
      await this.load(tx, id);
      const [totals] = await tx.rows('SELECT COUNT(*) AS n, COALESCE(SUM(size_bytes), 0) AS bytes FROM ea_attachment WHERE email_id = ?', [id]);
      if (Number(totals.n) >= MAX_ATTACHMENTS) throw new BadRequestException(`Up to ${MAX_ATTACHMENTS} attachments`);
      if (Number(totals.bytes) + file.size > MAX_TOTAL_ATTACHMENT_BYTES) throw new BadRequestException('Attachments can total up to 10 MB');
      const sha256 = sha256Hex(file.buffer);
      let attachmentId: number;
      try {
        attachmentId = await tx.insert('ea_attachment', {
          email_id: id, filename: safeFilename(file.originalname), content_type: file.mimetype,
          size_bytes: file.size, sha256, content: file.buffer, uploaded_by: userId,
        });
      } catch (err) {
        conflictFrom(err);
      }
      await audit(tx, actor, 'attachment_added', 'email', id, { sha256, size: file.size });
      return { id: attachmentId };
    });
  }

  async removeAttachment(userId: number, id: number, attachmentId: number) {
    const actor = await this.humanActor(this.db, userId);
    return this.db.tx(actor, async tx => {
      try {
        const removed = await tx.exec('DELETE FROM ea_attachment WHERE id = ? AND email_id = ?', [attachmentId, id]);
        if (!removed) throw new NotFoundException('Attachment not found');
      } catch (err) {
        conflictFrom(err);
      }
      await audit(tx, actor, 'attachment_removed', 'email', id, { attachmentId });
      return { removed: true };
    });
  }
}
