import { DataSource } from 'typeorm';
import { Logger } from '@nestjs/common';
import { MIGRATIONS } from './migrations';

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

  for (const migration of MIGRATIONS) {
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
