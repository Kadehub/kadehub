import type { Migration } from './migrations';
import { addColumn, tableExists } from './migration-utils';

/** COD orders schema changes (ids 110-139). Additive and idempotent: create-if-missing / add-column-if-missing only. */
export const COD_ORDER_MIGRATIONS: Migration[] = [
  {
    id: '110_cod_orders_payment_credit',
    up: async (ds, dialect) => {
      const pg = dialect === 'postgres';
      const ts = pg ? 'TIMESTAMP NULL' : 'DATETIME NULL';

      // Payment terms, customer extras and fulfilment fields on orders (all optional / defaulted)
      await addColumn(ds, 'cod_order', 'payment_type', "VARCHAR(10) NOT NULL DEFAULT 'cod'");      // cod | pay_now | credit
      await addColumn(ds, 'cod_order', 'customer_type', "VARCHAR(10) NOT NULL DEFAULT 'retail'");  // retail | wholesale
      await addColumn(ds, 'cod_order', 'customer_email', 'VARCHAR(255) NULL');
      await addColumn(ds, 'cod_order', 'po_number', 'VARCHAR(100) NULL');
      await addColumn(ds, 'cod_order', 'tracking_number', 'VARCHAR(100) NULL');
      await addColumn(ds, 'cod_order', 'confirmation_sent_at', ts);
      await addColumn(ds, 'cod_order', 'created_by', 'INT NULL');
      await addColumn(ds, 'cod_order', 'reordered_from_order_id', 'INT NULL');
      await addColumn(ds, 'cod_order', 'credit_period_days', 'INT NULL');
      await addColumn(ds, 'cod_order', 'payment_due_date', 'DATE NULL');
      await addColumn(ds, 'cod_order', 'credit_note', 'TEXT NULL');
      await addColumn(ds, 'cod_order', 'returned_at', ts);

      if (pg) await ds.query('CREATE INDEX IF NOT EXISTS cod_order_payment_idx ON cod_order (tenant_id, payment_type)');
      else await ds.query('CREATE INDEX cod_order_payment_idx ON `cod_order` (tenant_id, payment_type)').catch(() => {});

      // Payments against credit orders
      if (!(await tableExists(ds, 'cod_credit_payment'))) {
        await ds.query(pg ? `
          CREATE TABLE cod_credit_payment (
            id SERIAL PRIMARY KEY,
            tenant_id INT NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
            order_id INT NOT NULL REFERENCES cod_order(id) ON DELETE CASCADE,
            amount DECIMAL(14,2) NOT NULL CHECK (amount > 0),
            payment_date DATE NOT NULL,
            method VARCHAR(20) NOT NULL DEFAULT 'cash',
            notes TEXT NULL,
            created_by INT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
          )` : `
          CREATE TABLE \`cod_credit_payment\` (
            \`id\` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
            \`tenant_id\` INT NOT NULL,
            \`order_id\` INT NOT NULL,
            \`amount\` DECIMAL(14,2) NOT NULL,
            \`payment_date\` DATE NOT NULL,
            \`method\` VARCHAR(20) NOT NULL DEFAULT 'cash',
            \`notes\` TEXT NULL,
            \`created_by\` INT NULL,
            \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (\`tenant_id\`) REFERENCES \`tenant\` (\`id\`) ON DELETE CASCADE,
            FOREIGN KEY (\`order_id\`) REFERENCES \`cod_order\` (\`id\`) ON DELETE CASCADE
          )`);
      }
      if (pg) await ds.query('CREATE INDEX IF NOT EXISTS cod_credit_payment_order_idx ON cod_credit_payment (tenant_id, order_id)');
      else await ds.query('CREATE INDEX cod_credit_payment_order_idx ON `cod_credit_payment` (tenant_id, order_id)').catch(() => {});
    },
  },
];
