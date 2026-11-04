import { Injectable } from '@nestjs/common';
import { EaDb, Sql, parseJson } from './ea-db';

export type JobKind = 'classify' | 'draft_reply' | 'draft_outreach' | 'research' | 'send';
export const AI_JOB_KINDS: JobKind[] = ['classify', 'draft_reply', 'draft_outreach', 'research'];

export interface Job { id: number; kind: JobKind; payload: any; attempts: number; max_attempts: number; }

const LEASE_MS = 10 * 60 * 1000;
const MAX_BACKOFF_MS = 60 * 60 * 1000;

export function backoffMs(attempts: number) {
  return Math.min(MAX_BACKOFF_MS, 60_000 * 2 ** Math.max(0, attempts - 1));
}

/** Durable queue in the database. Idempotency keys stop duplicates, leases recover from crashes. */
@Injectable()
export class JobsService {
  constructor(private db: EaDb) {}

  /** Enqueues inside the caller's transaction when given one, so a job exists only if its cause was committed. */
  async enqueue(sql: Sql, kind: JobKind, key: string, payload: Record<string, unknown>, runAfter = new Date()) {
    return sql.insertIgnore('ea_job', {
      kind, idempotency_key: key.slice(0, 190), payload: JSON.stringify(payload), run_after: runAfter,
    }, 'idempotency_key');
  }

  /**
   * Claims due jobs by compare-and-swap: each row can only be won by one worker, because the UPDATE re-checks the
   * state it saw. This gives the same guarantee as SKIP LOCKED and also runs on MariaDB 10.4, which lacks it.
   */
  async claim(kinds: JobKind[], limit: number, owner: string, now = new Date()): Promise<Job[]> {
    if (!kinds.length) return [];
    const marks = kinds.map(() => '?').join(', ');
    const candidates = await this.db.rows(
      `SELECT id, kind, payload, status, attempts, max_attempts, lease_expires_at FROM ea_job
        WHERE kind IN (${marks}) AND ((status = 'queued' AND run_after <= ?) OR (status = 'running' AND lease_expires_at < ?))
        ORDER BY id LIMIT ?`,
      [...kinds, now, now, limit * 3],
    );
    const claimed: Job[] = [];
    for (const row of candidates) {
      if (claimed.length >= limit) break;
      const attempts = Number(row.attempts);
      const maxAttempts = Number(row.max_attempts);
      // A job whose worker died too many times goes to the failed-jobs page rather than looping forever
      if (row.status === 'running' && attempts >= maxAttempts) {
        await this.db.exec(
          `UPDATE ea_job SET status = 'dead', finished_at = ?, last_error = ? WHERE id = ? AND status = 'running' AND lease_expires_at < ?`,
          [now, 'Worker stopped before finishing, too many times', row.id, now],
        );
        continue;
      }
      const won = await this.db.exec(
        `UPDATE ea_job SET status = 'running', attempts = attempts + 1, lease_owner = ?, lease_expires_at = ?
          WHERE id = ? AND attempts = ? AND ((status = 'queued' AND run_after <= ?) OR (status = 'running' AND lease_expires_at < ?))`,
        [owner, new Date(now.getTime() + LEASE_MS), row.id, attempts, now, now],
      );
      if (won === 1) claimed.push({ id: Number(row.id), kind: row.kind, payload: parseJson(row.payload, {}), attempts: attempts + 1, max_attempts: maxAttempts });
    }
    return claimed;
  }

  complete(job: Job) {
    return this.db.exec(`UPDATE ea_job SET status = 'done', finished_at = ?, lease_owner = NULL, lease_expires_at = NULL WHERE id = ?`, [new Date(), job.id]);
  }

  /** Not a failure (budget reached, daily cap, paused): try later without using up an attempt. */
  defer(job: Job, runAfter: Date) {
    return this.db.exec(
      `UPDATE ea_job SET status = 'queued', attempts = attempts - 1, run_after = ?, lease_owner = NULL, lease_expires_at = NULL WHERE id = ?`,
      [runAfter, job.id],
    );
  }

  /** Backs off and retries, or dead-letters. Returns true when dead-lettered. */
  async fail(job: Job, error: string, now = new Date()): Promise<boolean> {
    const message = (error || 'Unknown error').slice(0, 1000);
    if (job.attempts >= job.max_attempts) {
      await this.db.exec(`UPDATE ea_job SET status = 'dead', finished_at = ?, last_error = ?, lease_owner = NULL, lease_expires_at = NULL WHERE id = ?`, [now, message, job.id]);
      return true;
    }
    await this.db.exec(
      `UPDATE ea_job SET status = 'queued', run_after = ?, last_error = ?, lease_owner = NULL, lease_expires_at = NULL WHERE id = ?`,
      [new Date(now.getTime() + backoffMs(job.attempts)), message, job.id],
    );
    return false;
  }

  /** Puts a dead-lettered job back in the queue with fresh attempts. */
  retry(id: number) {
    return this.db.exec(
      `UPDATE ea_job SET status = 'queued', attempts = 0, run_after = ?, last_error = NULL, finished_at = NULL WHERE id = ? AND status = 'dead'`,
      [new Date(), id],
    );
  }
}
