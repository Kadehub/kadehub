import { DataSource, QueryRunner } from 'typeorm';

export type Actor = { kind: 'human'; userId: number } | { kind: 'service' };
export const SERVICE: Actor = { kind: 'service' };

export interface Sql {
  /** SELECT, or anything returning rows. `?` placeholders on every dialect. */
  rows<T = any>(sql: string, params?: any[]): Promise<T[]>;
  /** UPDATE / DELETE / INSERT; resolves to the number of rows changed. */
  exec(sql: string, params?: any[]): Promise<number>;
  /** INSERT one row; resolves to its new id. */
  insert(table: string, row: Record<string, any>): Promise<number>;
  /** INSERT that quietly does nothing on a unique-key clash; resolves to the new id, or null if it already existed. */
  insertIgnore(table: string, row: Record<string, any>, conflictColumn: string): Promise<number | null>;
  readonly pg: boolean;
  /** The quoted name of the shared `user` table. */
  readonly userTable: string;
}

/** Thin layer over the DataSource that hides the Postgres / MySQL differences the agent's atomic SQL runs into. */
export class EaDb implements Sql {
  readonly pg: boolean;
  readonly userTable: string;

  constructor(private ds: DataSource, private runner?: QueryRunner) {
    this.pg = ds.options.type === 'postgres';
    this.userTable = this.pg ? '"user"' : '`user`';
  }

  private bind(sql: string): string {
    if (!this.pg) return sql;
    let i = 0;
    return sql.replace(/\?/g, () => `$${++i}`);
  }

  private raw(sql: string, params: any[] = []) {
    return this.ds.query(this.bind(sql), params, this.runner);
  }

  async rows<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return this.raw(sql, params);
  }

  async exec(sql: string, params: any[] = []): Promise<number> {
    const result = await this.raw(sql, params);
    return affected(result);
  }

  async insert(table: string, row: Record<string, any>): Promise<number> {
    const keys = Object.keys(row);
    const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`;
    if (this.pg) {
      const rows = await this.raw(`${sql} RETURNING id`, keys.map(k => row[k]));
      return Number(rows[0].id);
    }
    const res = await this.raw(sql, keys.map(k => row[k]));
    return Number(res.insertId);
  }

  async insertIgnore(table: string, row: Record<string, any>, conflictColumn: string): Promise<number | null> {
    const keys = Object.keys(row);
    const values = keys.map(k => row[k]);
    const marks = keys.map(() => '?').join(', ');
    if (this.pg) {
      const rows = await this.raw(
        `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${marks}) ON CONFLICT (${conflictColumn}) DO NOTHING RETURNING id`, values,
      );
      return rows.length ? Number(rows[0].id) : null;
    }
    const res = await this.raw(`INSERT IGNORE INTO ${table} (${keys.join(', ')}) VALUES (${marks})`, values);
    return res.affectedRows ? Number(res.insertId) : null;
  }

  /**
   * Runs work in one transaction with the actor declared where the approval triggers can read it.
   * `human` is only ever passed by the approval service, after the signed-in user's role is re-read from the database.
   * A deadlock victim was rolled back completely, so it is safe to run again; `work` must only touch the database.
   */
  async tx<T>(actor: Actor, work: (sql: EaDb) => Promise<T>): Promise<T> {
    for (let attempt = 1; ; attempt++) {
      try {
        return await this.runTx(actor, work);
      } catch (err) {
        if (attempt >= MAX_DEADLOCK_RETRIES || !isDeadlock(err)) throw err;
        await new Promise(resolve => setTimeout(resolve, 20 * attempt + Math.random() * 50));
      }
    }
  }

  private async runTx<T>(actor: Actor, work: (sql: EaDb) => Promise<T>): Promise<T> {
    const runner = this.ds.createQueryRunner();
    await runner.connect();
    const scoped = new EaDb(this.ds, runner);
    const kind = actor.kind;
    const id = actor.kind === 'human' ? String(actor.userId) : '';
    try {
      await runner.startTransaction();
      if (this.pg) {
        await runner.query(`SELECT set_config('app.ea_actor_kind', $1, TRUE), set_config('app.ea_actor_id', $2, TRUE)`, [kind, id]);
      } else {
        await runner.query('SET @ea_actor_kind = ?, @ea_actor_id = ?', [kind, id]);
      }
      const result = await work(scoped);
      await runner.commitTransaction();
      return result;
    } catch (err) {
      if (runner.isTransactionActive) await runner.rollbackTransaction().catch(() => {});
      throw err;
    } finally {
      // MySQL session variables outlive the transaction and connections are pooled, so a human actor must not linger
      if (!this.pg) await runner.query('SET @ea_actor_kind = NULL, @ea_actor_id = NULL').catch(() => {});
      await runner.release();
    }
  }
}

const MAX_DEADLOCK_RETRIES = 5;

function isDeadlock(err: any): boolean {
  const code = err?.driverError?.code ?? err?.code;
  return code === 'ER_LOCK_DEADLOCK' || code === '40P01';
}

function affected(result: any): number {
  if (result == null) return 0;
  if (typeof result.affectedRows === 'number') return result.affectedRows; // mysql2 OkPacket
  if (Array.isArray(result) && result.length === 2 && typeof result[1] === 'number') return result[1]; // TypeORM pg UPDATE/DELETE
  if (Array.isArray(result)) return result.length; // pg INSERT ... RETURNING
  return 0;
}

export const parseList = (v: string | null | undefined): string[] =>
  (v || '').split(/[,\n]/).map(s => s.trim()).filter(Boolean);

export const parseJson = <T>(v: any, fallback: T): T => {
  if (v == null || v === '') return fallback;
  if (typeof v !== 'string') return v as T;
  try { return JSON.parse(v) as T; } catch { return fallback; }
};

export const normalizeAddress = (a: string) => (a || '').trim().toLowerCase();

/** The audit trail is append-only: triggers refuse UPDATE and DELETE on it. */
export function audit(sql: Sql, actor: Actor, action: string, entity: string, entityId: number | null, details?: Record<string, unknown>) {
  return sql.insert('ea_audit_log', {
    action, entity, entity_id: entityId,
    actor_kind: actor.kind,
    actor_user_id: actor.kind === 'human' ? actor.userId : null,
    details: details ? JSON.stringify(details) : null,
  });
}

export async function isSuppressed(sql: Sql, address: string) {
  const rows = await sql.rows('SELECT id FROM ea_suppression WHERE address = ?', [normalizeAddress(address)]);
  return rows.length > 0;
}

/**
 * Suppresses an address inside the caller's transaction, and stops anything still queued for it:
 * outreach to that prospect ends and unsent emails to the address are cancelled.
 */
export async function suppress(sql: Sql, actor: Actor, address: string, reason: string, source?: string) {
  const addr = normalizeAddress(address);
  const id = await sql.insertIgnore('ea_suppression', {
    address: addr, reason, source: source?.slice(0, 200) ?? null, created_by: actor.kind === 'human' ? actor.userId : null,
  }, 'address');
  const prospectStatus = reason === 'bounce' ? 'bounced' : 'opted_out';
  await sql.exec(
    `UPDATE ea_prospect SET status = ?, next_touch_at = NULL WHERE email = ? AND status IN ('new', 'active')`,
    [prospectStatus, addr],
  );
  await sql.exec(
    `UPDATE ea_email SET status = 'cancelled', failure_reason = 'Recipient is suppressed' WHERE recipient = ? AND status IN ('draft', 'pending_approval', 'approved')`,
    [addr],
  );
  if (id !== null) await audit(sql, actor, 'suppress', 'suppression', id, { reason, source });
}

/** Local calendar day and month in the configured timezone; the daily cap and monthly budget roll over on these. */
export function localDay(now: Date, timezone: string): string {
  const tz = safeTz(timezone);
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

function safeTz(tz: string) {
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: tz });
    return tz;
  } catch {
    return 'UTC';
  }
}
