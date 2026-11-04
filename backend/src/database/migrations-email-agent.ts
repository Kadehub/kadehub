import { DataSource } from 'typeorm';
import type { Migration } from './migrations';

/**
 * Schema for the email agent (tables prefixed ea_). Works on Postgres (production) and MySQL/MariaDB (local).
 *
 * The approval rules live here, in triggers, so that no application bug or AI output can talk its way past them:
 *  - an email only reaches `approved` when the transaction declares a human actor whose user row is an active SUPER_ADMIN;
 *  - the trigger, not the app, stamps the approver and pins the sha256 of recipient, subject, body and attachment hashes;
 *  - any content change after approval drops the email back to pending_approval;
 *  - `sending` requires the pinned hash to still match and the approver to still hold the role.
 *
 * The actor is declared per transaction (see EaDb.tx). The app has a single database login, so this stops every code
 * path that does not declare a human (the worker, the AI pipeline, ad-hoc SQL); it can't stop someone holding the
 * database password. docs/EMAIL_AGENT.md covers that limit.
 */

const TABLES = [
  'ea_prospect', 'ea_campaign', 'ea_kb_entry', 'ea_daily_send', 'ea_ai_usage', 'ea_audit_log', 'ea_suppression',
  'ea_attachment', 'ea_email', 'ea_message', 'ea_job', 'ea_mailbox_state', 'ea_settings',
];

export const DEFAULT_MODEL = 'claude-opus-5-5';

type Col = { pg: string; my: string };
const C = {
  id: { pg: 'SERIAL PRIMARY KEY', my: 'INT NOT NULL AUTO_INCREMENT PRIMARY KEY' },
  ts: { pg: 'TIMESTAMPTZ NULL', my: 'DATETIME(3) NULL' },
  tsNow: { pg: 'TIMESTAMPTZ NOT NULL DEFAULT NOW()', my: 'DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)' },
  text: { pg: 'TEXT NULL', my: 'MEDIUMTEXT NULL' },
  textReq: { pg: "TEXT NOT NULL", my: 'MEDIUMTEXT NOT NULL' },
  bool: { pg: 'BOOLEAN NOT NULL DEFAULT FALSE', my: 'TINYINT(1) NOT NULL DEFAULT 0' },
  boolTrue: { pg: 'BOOLEAN NOT NULL DEFAULT TRUE', my: 'TINYINT(1) NOT NULL DEFAULT 1' },
  bytes: { pg: 'BYTEA NOT NULL', my: 'LONGBLOB NOT NULL' },
};
const same = (sql: string): Col => ({ pg: sql, my: sql });

function createTable(ds: DataSource, pg: boolean, name: string, cols: Record<string, Col>, extra: string[] = []) {
  const body = [...Object.entries(cols).map(([k, c]) => `${k} ${pg ? c.pg : c.my}`), ...extra].join(',\n  ');
  const tail = pg ? '' : ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';
  return ds.query(`CREATE TABLE ${name} (\n  ${body}\n)${tail}`);
}

async function createSchema(ds: DataSource, pg: boolean) {
  await createTable(ds, pg, 'ea_settings', {
    id: same('INT PRIMARY KEY'),
    // Emergency pause: on from the first moment. An admin has to turn the agent on.
    paused: C.boolTrue,
    activated_at: C.ts,
    mode: same("VARCHAR(20) NOT NULL DEFAULT 'triage_only'"),
    daily_send_limit: same('INT NOT NULL DEFAULT 20'),
    monthly_budget_usd: same('DECIMAL(10,2) NOT NULL DEFAULT 50'),
    model_classify: same(`VARCHAR(60) NOT NULL DEFAULT '${DEFAULT_MODEL}'`),
    model_draft: same(`VARCHAR(60) NOT NULL DEFAULT '${DEFAULT_MODEL}'`),
    model_research: same(`VARCHAR(60) NOT NULL DEFAULT '${DEFAULT_MODEL}'`),
    languages: same("VARCHAR(60) NOT NULL DEFAULT 'en,si,ta'"),
    allowed_domains: C.text,
    approved_claims: C.text,
    follow_up_gaps_days: same("VARCHAR(60) NOT NULL DEFAULT '4,7'"),
    max_follow_ups: same('INT NOT NULL DEFAULT 2'),
    timezone: same("VARCHAR(60) NOT NULL DEFAULT 'Asia/Colombo'"),
    budget_alerted_month: same('VARCHAR(7) NULL'),
    updated_at: C.tsNow,
  });
  await ds.query(
    pg ? `INSERT INTO ea_settings (id, allowed_domains, approved_claims) VALUES ($1, $2, $3)`
       : `INSERT INTO ea_settings (id, allowed_domains, approved_claims) VALUES (?, ?, ?)`,
    [1, 'kadehub.com', ''],
  );

  await createTable(ds, pg, 'ea_mailbox_state', {
    id: same('INT PRIMARY KEY'),
    history_id: same('VARCHAR(40) NULL'),
    last_poll_at: C.ts,
    poll_lease_until: C.ts,
    last_poll_error: same('VARCHAR(500) NULL'),
    worker_heartbeat_at: C.ts,
    worker_last_result: C.text,
  });
  await ds.query('INSERT INTO ea_mailbox_state (id) VALUES (1)');

  await createTable(ds, pg, 'ea_job', {
    id: C.id,
    kind: same('VARCHAR(30) NOT NULL'),
    idempotency_key: same('VARCHAR(190) NOT NULL UNIQUE'),
    payload: C.text,
    status: same("VARCHAR(12) NOT NULL DEFAULT 'queued'"),
    attempts: same('INT NOT NULL DEFAULT 0'),
    max_attempts: same('INT NOT NULL DEFAULT 5'),
    run_after: C.tsNow,
    lease_owner: same('VARCHAR(60) NULL'),
    lease_expires_at: C.ts,
    last_error: same('VARCHAR(1000) NULL'),
    created_at: C.tsNow,
    finished_at: C.ts,
  });
  await ds.query('CREATE INDEX ea_job_due ON ea_job (status, run_after)');

  await createTable(ds, pg, 'ea_campaign', {
    id: C.id,
    name: same('VARCHAR(120) NOT NULL'),
    brief: C.textReq,
    product_slug: same('VARCHAR(30) NULL'),
    language: same("VARCHAR(5) NOT NULL DEFAULT 'en'"),
    research_query: same('VARCHAR(500) NOT NULL'),
    status: same("VARCHAR(20) NOT NULL DEFAULT 'idle'"),
    last_research_summary: C.text,
    created_by: same('INT NOT NULL'),
    created_at: C.tsNow,
  });

  await createTable(ds, pg, 'ea_prospect', {
    id: C.id,
    campaign_id: same('INT NULL'),
    business_name: same('VARCHAR(200) NOT NULL'),
    email: same('VARCHAR(190) NOT NULL UNIQUE'),
    source_url: same('VARCHAR(1000) NOT NULL'),
    location: same('VARCHAR(150) NULL'),
    notes: C.text,
    // new -> active -> replied | bounced | opted_out | completed | stopped; new -> dismissed
    status: same("VARCHAR(20) NOT NULL DEFAULT 'new'"),
    step: same('INT NOT NULL DEFAULT 0'),
    next_touch_at: C.ts,
    provider_thread_id: same('VARCHAR(40) NULL'),
    last_rfc_message_id: same('VARCHAR(300) NULL'),
    created_at: C.tsNow,
  });
  await ds.query('CREATE INDEX ea_prospect_due ON ea_prospect (status, next_touch_at)');

  await createTable(ds, pg, 'ea_message', {
    id: C.id,
    provider_message_id: same('VARCHAR(40) NOT NULL UNIQUE'),
    provider_thread_id: same('VARCHAR(40) NULL'),
    rfc_message_id: same('VARCHAR(300) NULL'),
    refs: C.text,
    from_addr: same('VARCHAR(190) NULL'),
    from_name: same('VARCHAR(200) NULL'),
    subject: same('VARCHAR(500) NULL'),
    body_text: C.text,
    body_clean: C.text,
    received_at: C.ts,
    auth_verified: C.bool,
    language: same('VARCHAR(5) NULL'),
    triage: same('VARCHAR(30) NOT NULL'),
    classification: same('VARCHAR(30) NULL'),
    confidence: same('DECIMAL(4,3) NULL'),
    needs_human: C.bool,
    human_reason: same('VARCHAR(500) NULL'),
    injection_suspected: C.bool,
    resolved_at: C.ts,
    prospect_id: same('INT NULL'),
    created_at: C.tsNow,
  });
  await ds.query('CREATE INDEX ea_message_thread ON ea_message (provider_thread_id)');
  await ds.query('CREATE INDEX ea_message_from ON ea_message (from_addr)');

  await createTable(ds, pg, 'ea_email', {
    id: C.id,
    // draft -> pending_approval -> approved -> sending -> sent | failed, plus rejected and cancelled. Enforced by trigger.
    status: same("VARCHAR(20) NOT NULL DEFAULT 'draft'"),
    kind: same("VARCHAR(12) NOT NULL DEFAULT 'reply'"),
    draft_key: same('VARCHAR(190) NULL UNIQUE'),
    recipient: same('VARCHAR(190) NOT NULL'),
    subject: same('VARCHAR(500) NOT NULL'),
    body: C.textReq,
    attachment_hashes: same("TEXT NOT NULL"),
    is_promotional: C.bool,
    rfc_message_id: same('VARCHAR(300) NOT NULL'),
    in_reply_to: same('VARCHAR(300) NULL'),
    refs: C.text,
    provider_thread_id: same('VARCHAR(40) NULL'),
    source_message_id: same('INT NULL'),
    prospect_id: same('INT NULL'),
    step: same('INT NULL'),
    language: same('VARCHAR(5) NULL'),
    validator_warnings: C.text,
    sources: C.text,
    suggested_attachments: C.text,
    needs_human: C.bool,
    human_reason: same('VARCHAR(500) NULL'),
    ai_generated: C.boolTrue,
    approved_by: same('INT NULL'),
    approved_at: C.ts,
    approved_hash: same('CHAR(64) NULL'),
    review_note: C.text,
    reviewed_by: same('INT NULL'),
    provider_message_id: same('VARCHAR(40) NULL'),
    sending_at: C.ts,
    sent_at: C.ts,
    failure_reason: same('VARCHAR(500) NULL'),
    bounced_at: C.ts,
    created_at: C.tsNow,
    updated_at: C.tsNow,
  });
  await ds.query('CREATE INDEX ea_email_status ON ea_email (status)');
  await ds.query('CREATE INDEX ea_email_thread ON ea_email (provider_thread_id)');
  await ds.query('CREATE INDEX ea_email_recipient ON ea_email (recipient)');

  await createTable(ds, pg, 'ea_attachment', {
    id: C.id,
    email_id: same('INT NOT NULL'),
    filename: same('VARCHAR(180) NOT NULL'),
    content_type: same('VARCHAR(120) NOT NULL'),
    size_bytes: same('INT NOT NULL'),
    sha256: same('CHAR(64) NOT NULL'),
    content: C.bytes,
    uploaded_by: same('INT NOT NULL'),
    created_at: C.tsNow,
  }, ['FOREIGN KEY (email_id) REFERENCES ea_email (id)']);
  await ds.query('CREATE INDEX ea_attachment_email ON ea_attachment (email_id)');

  await createTable(ds, pg, 'ea_suppression', {
    id: C.id,
    address: same('VARCHAR(190) NOT NULL UNIQUE'),
    reason: same('VARCHAR(30) NOT NULL'),
    source: same('VARCHAR(200) NULL'),
    created_by: same('INT NULL'),
    created_at: C.tsNow,
  });

  await createTable(ds, pg, 'ea_audit_log', {
    id: C.id,
    action: same('VARCHAR(50) NOT NULL'),
    entity: same('VARCHAR(30) NOT NULL'),
    entity_id: same('INT NULL'),
    actor_kind: same('VARCHAR(10) NOT NULL'),
    actor_user_id: same('INT NULL'),
    details: C.text,
    created_at: C.tsNow,
  });

  await createTable(ds, pg, 'ea_ai_usage', {
    id: C.id,
    month: same('VARCHAR(7) NOT NULL'),
    purpose: same('VARCHAR(20) NOT NULL'),
    model: same('VARCHAR(60) NOT NULL'),
    input_tokens: same('INT NOT NULL DEFAULT 0'),
    output_tokens: same('INT NOT NULL DEFAULT 0'),
    cache_read_tokens: same('INT NOT NULL DEFAULT 0'),
    cache_write_tokens: same('INT NOT NULL DEFAULT 0'),
    web_searches: same('INT NOT NULL DEFAULT 0'),
    cost_usd: same('DECIMAL(10,5) NOT NULL DEFAULT 0'),
    ref: same('VARCHAR(60) NULL'),
    created_at: C.tsNow,
  });
  await ds.query('CREATE INDEX ea_ai_usage_month ON ea_ai_usage (month)');

  await createTable(ds, pg, 'ea_daily_send', {
    day: same('VARCHAR(10) PRIMARY KEY'),
    sent_count: same('INT NOT NULL DEFAULT 0'),
  });

  await createTable(ds, pg, 'ea_kb_entry', {
    id: C.id,
    title: same('VARCHAR(200) NOT NULL'),
    body: C.textReq,
    active: C.boolTrue,
    updated_by: same('INT NULL'),
    updated_at: C.tsNow,
  });
}

/** Postgres: shared helper functions and triggers. */
async function createPgTriggers(ds: DataSource) {
  await ds.query(`
    CREATE FUNCTION ea_content_hash(r TEXT, s TEXT, b TEXT, a TEXT) RETURNS TEXT AS $$
      SELECT encode(sha256(convert_to(
        'v1|' || length(r) || ':' || r || '|' || length(s) || ':' || s || '|' || length(b) || ':' || b || '|' || length(a) || ':' || a,
        'UTF8')), 'hex')
    $$ LANGUAGE SQL IMMUTABLE
  `);
  await ds.query(`
    CREATE FUNCTION ea_active_approver(uid INT) RETURNS BOOLEAN AS $$
      SELECT EXISTS (SELECT 1 FROM "user" u WHERE u.id = uid AND u.role::text = 'SUPER_ADMIN' AND u.disabled_at IS NULL)
    $$ LANGUAGE SQL STABLE
  `);
  await ds.query(`
    CREATE FUNCTION ea_email_guard() RETURNS TRIGGER AS $$
    DECLARE
      actor_kind TEXT := COALESCE(current_setting('app.ea_actor_kind', TRUE), '');
      actor_id TEXT := COALESCE(current_setting('app.ea_actor_id', TRUE), '');
      new_hash TEXT := ea_content_hash(NEW.recipient, NEW.subject, NEW.body, NEW.attachment_hashes);
      old_hash TEXT;
      voided BOOLEAN := FALSE;
    BEGIN
      IF TG_OP = 'INSERT' THEN
        IF NEW.status NOT IN ('draft', 'pending_approval') THEN
          RAISE EXCEPTION 'ea_email: new emails must start as draft or pending_approval';
        END IF;
        IF NEW.approved_by IS NOT NULL OR NEW.approved_at IS NOT NULL OR NEW.approved_hash IS NOT NULL THEN
          RAISE EXCEPTION 'ea_email: approval cannot be set on insert';
        END IF;
        RETURN NEW;
      END IF;

      old_hash := ea_content_hash(OLD.recipient, OLD.subject, OLD.body, OLD.attachment_hashes);
      IF new_hash <> old_hash THEN
        IF OLD.status IN ('sending', 'sent', 'rejected', 'cancelled') THEN
          RAISE EXCEPTION 'ea_email: content is locked once %', OLD.status;
        END IF;
        IF OLD.status = 'approved' THEN
          NEW.status := 'pending_approval';
          voided := TRUE;
        END IF;
      END IF;

      IF NEW.status <> OLD.status AND NOT (
        (OLD.status = 'draft' AND NEW.status IN ('pending_approval', 'rejected', 'cancelled')) OR
        (OLD.status = 'pending_approval' AND NEW.status IN ('approved', 'rejected', 'cancelled')) OR
        (OLD.status = 'approved' AND NEW.status IN ('sending', 'pending_approval', 'cancelled')) OR
        (OLD.status = 'sending' AND NEW.status IN ('sent', 'failed')) OR
        (OLD.status = 'failed' AND NEW.status = 'pending_approval')
      ) THEN
        RAISE EXCEPTION 'ea_email: illegal transition % -> %', OLD.status, NEW.status;
      END IF;

      IF NEW.status = 'approved' AND OLD.status <> 'approved' THEN
        IF actor_kind <> 'human' OR actor_id !~ '^[0-9]+$' OR NOT ea_active_approver(actor_id::INT) THEN
          RAISE EXCEPTION 'ea_email: approval requires a signed-in super admin';
        END IF;
        NEW.approved_by := actor_id::INT;
        NEW.approved_at := NOW();
        NEW.approved_hash := new_hash;
      ELSIF NEW.status = 'pending_approval' AND OLD.status IN ('approved', 'failed') THEN
        IF OLD.status = 'failed' AND (actor_kind <> 'human' OR actor_id !~ '^[0-9]+$' OR NOT ea_active_approver(actor_id::INT)) THEN
          RAISE EXCEPTION 'ea_email: reopening a failed email requires a signed-in super admin';
        END IF;
        NEW.approved_by := NULL;
        NEW.approved_at := NULL;
        NEW.approved_hash := NULL;
      ELSIF NEW.approved_by IS DISTINCT FROM OLD.approved_by OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
         OR NEW.approved_hash IS DISTINCT FROM OLD.approved_hash THEN
        RAISE EXCEPTION 'ea_email: approval fields can only be set by approving';
      END IF;

      IF NEW.status = 'sending' AND OLD.status <> 'sending' THEN
        IF OLD.approved_hash IS NULL OR new_hash <> OLD.approved_hash THEN
          RAISE EXCEPTION 'ea_email: content does not match what was approved';
        END IF;
        IF NOT ea_active_approver(OLD.approved_by) THEN
          RAISE EXCEPTION 'ea_email: approver no longer holds the role';
        END IF;
      END IF;

      NEW.updated_at := NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);
  await ds.query('CREATE TRIGGER ea_email_guard_trg BEFORE INSERT OR UPDATE ON ea_email FOR EACH ROW EXECUTE FUNCTION ea_email_guard()');

  await ds.query(`
    CREATE FUNCTION ea_attachment_sync() RETURNS TRIGGER AS $$
    DECLARE target INT := CASE WHEN TG_OP = 'DELETE' THEN OLD.email_id ELSE NEW.email_id END;
    BEGIN
      UPDATE ea_email SET attachment_hashes = COALESCE(
        (SELECT string_agg(sha256, ',' ORDER BY sha256) FROM ea_attachment WHERE email_id = target), '')
      WHERE id = target;
      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql
  `);
  await ds.query('CREATE TRIGGER ea_attachment_sync_trg AFTER INSERT OR DELETE ON ea_attachment FOR EACH ROW EXECUTE FUNCTION ea_attachment_sync()');

  await ds.query(`
    CREATE FUNCTION ea_refuse() RETURNS TRIGGER AS $$
    BEGIN RAISE EXCEPTION '%', TG_ARGV[0]; END;
    $$ LANGUAGE plpgsql
  `);
  await ds.query(`CREATE TRIGGER ea_audit_append_only BEFORE UPDATE OR DELETE ON ea_audit_log FOR EACH ROW EXECUTE FUNCTION ea_refuse('ea_audit_log is append-only')`);
  await ds.query(`CREATE TRIGGER ea_email_no_delete BEFORE DELETE ON ea_email FOR EACH ROW EXECUTE FUNCTION ea_refuse('ea_email rows cannot be deleted')`);
}

const MY_FAIL = (msg: string) => `SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '${msg}'`;

/** MySQL/MariaDB: the same rules, with session variables in place of set_config. */
async function createMyTriggers(ds: DataSource) {
  await ds.query(`
    CREATE FUNCTION ea_content_hash(r TEXT CHARACTER SET utf8mb4, s TEXT CHARACTER SET utf8mb4, b MEDIUMTEXT CHARACTER SET utf8mb4, a TEXT CHARACTER SET utf8mb4)
    RETURNS CHAR(64) CHARACTER SET ascii DETERMINISTIC
    RETURN SHA2(CONCAT('v1|', CHAR_LENGTH(r), ':', r, '|', CHAR_LENGTH(s), ':', s, '|', CHAR_LENGTH(b), ':', b, '|', CHAR_LENGTH(a), ':', a), 256)
  `);
  await ds.query(`
    CREATE FUNCTION ea_active_approver(uid INT) RETURNS TINYINT(1) READS SQL DATA
    RETURN EXISTS (SELECT 1 FROM \`user\` u WHERE u.id = uid AND u.role = 'SUPER_ADMIN' AND u.disabled_at IS NULL)
  `);
  await ds.query(`
    CREATE TRIGGER ea_email_guard_ins BEFORE INSERT ON ea_email FOR EACH ROW
    BEGIN
      IF NEW.status NOT IN ('draft', 'pending_approval') THEN ${MY_FAIL('ea_email: new emails must start as draft or pending_approval')}; END IF;
      IF NEW.approved_by IS NOT NULL OR NEW.approved_at IS NOT NULL OR NEW.approved_hash IS NOT NULL THEN ${MY_FAIL('ea_email: approval cannot be set on insert')}; END IF;
    END
  `);
  const isApprover = `(COALESCE(@ea_actor_kind, '') = 'human' AND COALESCE(@ea_actor_id, '') REGEXP '^[0-9]+$' AND ea_active_approver(CAST(@ea_actor_id AS UNSIGNED)))`;
  await ds.query(`
    CREATE TRIGGER ea_email_guard_upd BEFORE UPDATE ON ea_email FOR EACH ROW
    BEGIN
      DECLARE new_hash CHAR(64) CHARACTER SET ascii DEFAULT ea_content_hash(NEW.recipient, NEW.subject, NEW.body, NEW.attachment_hashes);
      DECLARE old_hash CHAR(64) CHARACTER SET ascii DEFAULT ea_content_hash(OLD.recipient, OLD.subject, OLD.body, OLD.attachment_hashes);
      IF new_hash <> old_hash THEN
        IF OLD.status IN ('sending', 'sent', 'rejected', 'cancelled') THEN ${MY_FAIL('ea_email: content is locked')}; END IF;
        IF OLD.status = 'approved' THEN SET NEW.status = 'pending_approval'; END IF;
      END IF;

      IF NEW.status <> OLD.status AND NOT (
        (OLD.status = 'draft' AND NEW.status IN ('pending_approval', 'rejected', 'cancelled')) OR
        (OLD.status = 'pending_approval' AND NEW.status IN ('approved', 'rejected', 'cancelled')) OR
        (OLD.status = 'approved' AND NEW.status IN ('sending', 'pending_approval', 'cancelled')) OR
        (OLD.status = 'sending' AND NEW.status IN ('sent', 'failed')) OR
        (OLD.status = 'failed' AND NEW.status = 'pending_approval')
      ) THEN ${MY_FAIL('ea_email: illegal transition')}; END IF;

      IF NEW.status = 'approved' AND OLD.status <> 'approved' THEN
        IF NOT ${isApprover} THEN ${MY_FAIL('ea_email: approval requires a signed-in super admin')}; END IF;
        SET NEW.approved_by = CAST(@ea_actor_id AS UNSIGNED), NEW.approved_at = CURRENT_TIMESTAMP(3), NEW.approved_hash = new_hash;
      ELSEIF NEW.status = 'pending_approval' AND OLD.status IN ('approved', 'failed') THEN
        IF OLD.status = 'failed' AND NOT ${isApprover} THEN ${MY_FAIL('ea_email: reopening a failed email requires a signed-in super admin')}; END IF;
        SET NEW.approved_by = NULL, NEW.approved_at = NULL, NEW.approved_hash = NULL;
      ELSEIF NOT (NEW.approved_by <=> OLD.approved_by) OR NOT (NEW.approved_at <=> OLD.approved_at) OR NOT (NEW.approved_hash <=> OLD.approved_hash) THEN
        ${MY_FAIL('ea_email: approval fields can only be set by approving')};
      END IF;

      IF NEW.status = 'sending' AND OLD.status <> 'sending' THEN
        IF OLD.approved_hash IS NULL OR new_hash <> OLD.approved_hash THEN ${MY_FAIL('ea_email: content does not match what was approved')}; END IF;
        IF NOT ea_active_approver(OLD.approved_by) THEN ${MY_FAIL('ea_email: approver no longer holds the role')}; END IF;
      END IF;

      SET NEW.updated_at = CURRENT_TIMESTAMP(3);
    END
  `);

  const syncSql = (ref: string) => `
    UPDATE ea_email SET attachment_hashes = COALESCE(
      (SELECT GROUP_CONCAT(sha256 ORDER BY sha256 SEPARATOR ',') FROM ea_attachment WHERE email_id = ${ref}), '')
    WHERE id = ${ref}`;
  await ds.query(`CREATE TRIGGER ea_attachment_sync_ins AFTER INSERT ON ea_attachment FOR EACH ROW ${syncSql('NEW.email_id')}`);
  await ds.query(`CREATE TRIGGER ea_attachment_sync_del AFTER DELETE ON ea_attachment FOR EACH ROW ${syncSql('OLD.email_id')}`);

  await ds.query(`CREATE TRIGGER ea_audit_no_update BEFORE UPDATE ON ea_audit_log FOR EACH ROW ${MY_FAIL('ea_audit_log is append-only')}`);
  await ds.query(`CREATE TRIGGER ea_audit_no_delete BEFORE DELETE ON ea_audit_log FOR EACH ROW ${MY_FAIL('ea_audit_log is append-only')}`);
  await ds.query(`CREATE TRIGGER ea_email_no_delete BEFORE DELETE ON ea_email FOR EACH ROW ${MY_FAIL('ea_email rows cannot be deleted')}`);
}

async function dropEverything(ds: DataSource, pg: boolean) {
  if (pg) {
    for (const t of TABLES) await ds.query(`DROP TABLE IF EXISTS ${t} CASCADE`);
    await ds.query('DROP FUNCTION IF EXISTS ea_refuse()');
    await ds.query('DROP FUNCTION IF EXISTS ea_attachment_sync()');
    await ds.query('DROP FUNCTION IF EXISTS ea_email_guard()');
    await ds.query('DROP FUNCTION IF EXISTS ea_active_approver(INT)');
    await ds.query('DROP FUNCTION IF EXISTS ea_content_hash(TEXT, TEXT, TEXT, TEXT)');
    return;
  }
  // Dropping a table drops its triggers
  for (const t of TABLES) await ds.query(`DROP TABLE IF EXISTS ${t}`);
  await ds.query('DROP FUNCTION IF EXISTS ea_active_approver');
  await ds.query('DROP FUNCTION IF EXISTS ea_content_hash');
}

export const EMAIL_AGENT_MIGRATIONS: Migration[] = [
  {
    id: '400_email_agent',
    up: async (ds, dialect) => {
      const pg = dialect === 'postgres';
      // Clears a half-applied earlier attempt: the runner only records a migration once all of it succeeded
      await dropEverything(ds, pg);
      await createSchema(ds, pg);
      if (pg) await createPgTriggers(ds); else await createMyTriggers(ds);
    },
    down: async (ds, dialect) => dropEverything(ds, dialect === 'postgres'),
  },
];
