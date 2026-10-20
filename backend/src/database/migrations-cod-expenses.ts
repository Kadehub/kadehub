import type { DataSource } from 'typeorm';
import type { Migration } from './migrations';
import { addColumn, tableExists } from './migration-utils';

/** COD expenses schema changes (ids 140-169). Additive and idempotent: create-if-missing / add-column-if-missing only. */

async function createIndex(ds: DataSource, pg: boolean, name: string, table: string, cols: string, unique = false) {
  const u = unique ? 'UNIQUE ' : '';
  if (pg) await ds.query(`CREATE ${u}INDEX IF NOT EXISTS ${name} ON ${table} (${cols})`);
  else await ds.query(`CREATE ${u}INDEX ${name} ON \`${table}\` (${cols})`).catch(() => {}); // already there
}

export const COD_EXPENSE_MIGRATIONS: Migration[] = [
  {
    id: '140_cod_expense_details',
    up: async (ds, dialect) => {
      const pg = dialect === 'postgres';
      await addColumn(ds, 'cod_expense', 'payment_method', 'VARCHAR(20) NULL');
      await addColumn(ds, 'cod_expense', 'vendor', 'VARCHAR(150) NULL');
      await addColumn(ds, 'cod_expense', 'reference', 'VARCHAR(100) NULL');
      await createIndex(ds, pg, 'cod_expense_category_idx', 'cod_expense', 'tenant_id, category');
    },
  },
  {
    id: '141_cod_personal_finance',
    up: async (ds, dialect) => {
      const pg = dialect === 'postgres';
      if (!(await tableExists(ds, 'cod_personal_expense'))) {
        await ds.query(pg ? `
          CREATE TABLE cod_personal_expense (
            id SERIAL PRIMARY KEY,
            tenant_id INT NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
            user_id INT NULL,
            title VARCHAR(255) NOT NULL DEFAULT '',
            category VARCHAR(20) NOT NULL DEFAULT 'Other',
            amount DECIMAL(14,2) NOT NULL DEFAULT 0,
            expense_date DATE NOT NULL,
            payment_method VARCHAR(20) NULL,
            notes TEXT NULL,
            client_ref VARCHAR(36) NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
          )` : `
          CREATE TABLE \`cod_personal_expense\` (
            \`id\` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
            \`tenant_id\` INT NOT NULL,
            \`user_id\` INT NULL,
            \`title\` VARCHAR(255) NOT NULL DEFAULT '',
            \`category\` VARCHAR(20) NOT NULL DEFAULT 'Other',
            \`amount\` DECIMAL(14,2) NOT NULL DEFAULT 0,
            \`expense_date\` DATE NOT NULL,
            \`payment_method\` VARCHAR(20) NULL,
            \`notes\` TEXT NULL,
            \`client_ref\` VARCHAR(36) NULL,
            \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (\`tenant_id\`) REFERENCES \`tenant\` (\`id\`) ON DELETE CASCADE
          )`);
      }
      await createIndex(ds, pg, 'cod_personal_expense_date_idx', 'cod_personal_expense', 'tenant_id, expense_date');
      // A double tap / retry carries the same client_ref: the second insert hits this and is treated as success
      await createIndex(ds, pg, 'cod_personal_expense_client_ref_key', 'cod_personal_expense', 'tenant_id, client_ref', true);

      if (!(await tableExists(ds, 'cod_personal_settings'))) {
        await ds.query(pg ? `
          CREATE TABLE cod_personal_settings (
            id SERIAL PRIMARY KEY,
            tenant_id INT NOT NULL UNIQUE REFERENCES tenant(id) ON DELETE CASCADE,
            monthly_budget DECIMAL(14,2) NULL,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
          )` : `
          CREATE TABLE \`cod_personal_settings\` (
            \`id\` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
            \`tenant_id\` INT NOT NULL UNIQUE,
            \`monthly_budget\` DECIMAL(14,2) NULL,
            \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (\`tenant_id\`) REFERENCES \`tenant\` (\`id\`) ON DELETE CASCADE
          )`);
      }
    },
  },
];
