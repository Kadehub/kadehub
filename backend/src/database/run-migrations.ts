import { DataSource } from 'typeorm';
import { Logger } from '@nestjs/common';
import { MIGRATIONS } from './migrations';
import { COD_MIGRATIONS } from './migrations-cod';
import { TASKS_MIGRATIONS } from './migrations-tasks';
import { HR_MIGRATIONS } from './migrations-hr';
import { EMAIL_AGENT_MIGRATIONS } from './migrations-email-agent';

const logger = new Logger('Migrations');

export async function runPendingMigrations(ds: DataSource) {
  if (process.env.SKIP_DB_MIGRATIONS === 'true') {
    logger.warn('SKIP_DB_MIGRATIONS=true — skipping');
    return;
  }

  const dialect = ds.options.type as string;
  await ds.query(`
    CREATE TABLE IF NOT EXISTS schema_migration (
      id VARCHAR(120) PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const appliedRows: Array<{ id: string }> = await ds.query('SELECT id FROM schema_migration');
  const applied = new Set(appliedRows.map(r => r.id));

  for (const migration of [...MIGRATIONS, ...COD_MIGRATIONS, ...TASKS_MIGRATIONS, ...HR_MIGRATIONS, ...EMAIL_AGENT_MIGRATIONS]) {
    if (applied.has(migration.id)) continue;
    logger.log(`Applying ${migration.id}…`);
    try {
      await migration.up(ds, dialect);
      if (dialect === 'postgres') {
        await ds.query('INSERT INTO schema_migration (id) VALUES ($1)', [migration.id]);
      } else {
        await ds.query('INSERT INTO schema_migration (id) VALUES (?)', [migration.id]);
      }
      logger.log(`Applied ${migration.id}`);
    } catch (err) {
      logger.error(`Failed ${migration.id}: ${err.message}`);
      throw err;
    }
  }
}

/** Undoes one migration that has a `down`. Never called at startup: for tests and deliberate manual rollback. */
export async function rollbackMigration(ds: DataSource, id: string) {
  const migration = [...MIGRATIONS, ...COD_MIGRATIONS, ...TASKS_MIGRATIONS, ...HR_MIGRATIONS, ...EMAIL_AGENT_MIGRATIONS].find(m => m.id === id);
  if (!migration?.down) throw new Error(`Migration ${id} has no down step`);
  const dialect = ds.options.type as string;
  await migration.down(ds, dialect);
  await ds.query(`DELETE FROM schema_migration WHERE id = ${dialect === 'postgres' ? '$1' : '?'}`, [id]);
}
